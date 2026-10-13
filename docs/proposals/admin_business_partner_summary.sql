-- REVIEW ONLY. This is not a migration and has not been applied.
-- Verify the deployed columns and ADMIN authorization before deployment.
-- Text IDs accommodate both legacy UUIDs and newer text identifiers.
-- Only sources evidenced by the admin checkout are implemented here.
create or replace function public.admin_get_business_partner_summary(
  p_business_ids text[],
  p_start timestamptz,
  p_end timestamptz,
  p_previous_start timestamptz,
  p_timezone text default 'Asia/Shanghai'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  unavailable jsonb := pg_catalog.jsonb_build_object(
    'available', false, 'value', null,
    'reason', 'Source schema and admin coverage need verification'
  );
  result jsonb;
begin
  if not coalesce(public.is_admin(), false) or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'ADMIN' and p.status::text = 'ACTIVE'
  ) then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;
  if p_business_ids is null or pg_catalog.cardinality(p_business_ids) > 100 then
    raise exception using errcode = '22023', message = 'Supply at most 100 business IDs';
  end if;
  if p_end is null or (p_start is not null and p_start >= p_end)
     or (p_previous_start is not null and (p_start is null or p_previous_start >= p_start)) then
    raise exception using errcode = '22023', message = 'Invalid reporting range';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using errcode = '22023', message = 'Unknown reporting timezone';
  end if;

  -- Authorization alone is not proof of unfiltered source coverage. Require
  -- the definer to bypass RLS, or to own each RLS table without FORCE RLS.
  -- A less privileged deployment must not report filtered-empty data as zero.
  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles executor
    where executor.rolname = current_user and n.nspname = 'public'
      and c.relname in ('businesses', 'transactions', 'business_members', 'content_items', 'purchase_requests', 'business_bp_wallets')
      and c.relrowsecurity
      and not (executor.rolsuper or executor.rolbypassrls or (c.relowner = executor.oid and not c.relforcerowsecurity))
  ) then
    raise exception using errcode = '42501', message = 'Complete admin summary coverage could not be established';
  end if;

  with requested as (
    select b.id::text as business_id
    from public.businesses b
    where b.id::text = any(p_business_ids)
  ), shared_rows as (
    select t.business_id::text as business_id, t.customer_id::text as customer_id,
      t.transaction_type::text as kind, t.status::text as status, t.amount_bp, t.created_at
    from public.transactions t join requested r on r.business_id = t.business_id::text
    where t.created_at < p_end
      and (coalesce(p_previous_start, p_start) is null or t.created_at >= coalesce(p_previous_start, p_start))
      and t.transaction_type::text in ('PURCHASE', 'REFUND')
  ), current_sales as (
    select * from shared_rows
    where kind = 'PURCHASE' and status in ('COMPLETED', 'REFUNDED')
      and (p_start is null or created_at >= p_start)
  ), sale_totals as (
    select business_id, sum(amount_bp) as gross, count(*) as sale_count,
      count(*) filter (where customer_id is null) as guest_sales, max(created_at) as last_sale
    from current_sales group by business_id
  ), refund_totals as (
    select business_id, sum(amount_bp) as refunds from shared_rows
    where kind = 'REFUND' and status = 'COMPLETED' and (p_start is null or created_at >= p_start)
    group by business_id
  ), buyer_sales as (
    select business_id, customer_id, count(*) as sales
    from current_sales where customer_id is not null group by business_id, customer_id
  ), buyer_totals as (
    select business_id, count(*) as buyers, count(*) filter (where sales >= 2) as repeat_buyers
    from buyer_sales group by business_id
  ), previous_totals as (
    select business_id, sum(case
      when kind = 'PURCHASE' and status in ('COMPLETED', 'REFUNDED') then amount_bp
      when kind = 'REFUND' and status = 'COMPLETED' then -amount_bp else 0 end) as net
    from shared_rows where p_previous_start is not null and created_at >= p_previous_start and created_at < p_start
    group by business_id
  ), staff as (
    select m.business_id::text as business_id, count(*) as active_staff
    from public.business_members m join requested r on r.business_id = m.business_id::text
    where m.status::text = 'ACTIVE' group by m.business_id
  ), posts as (
    select c.business_id::text as business_id, count(*) as published_posts
    from public.content_items c join requested r on r.business_id = c.business_id::text
    where c.status::text = 'PUBLISHED' group by c.business_id
  ), pending_purchases as (
    select q.business_id::text as business_id, count(*) as requests, sum(q.amount) as amount
    from public.purchase_requests q join requested r on r.business_id = q.business_id::text
    where q.status::text = 'PENDING' group by q.business_id
  )
  select pg_catalog.jsonb_build_object(
    'access_verified', true,
    'window', pg_catalog.jsonb_build_object('start', p_start, 'end', p_end, 'previous_start', p_previous_start, 'timezone', p_timezone, 'timestamp_basis', 'created_at'),
    'businesses', coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'business_id', r.business_id,
      'last_shared_sale', s.last_sale,
      'metrics', pg_catalog.jsonb_build_object(
        'shared_bp_balance', pg_catalog.jsonb_build_object('available', w.business_id is not null, 'value', w.balance, 'unit', 'BP', 'reason', case when w.business_id is null then 'No shared wallet record' end),
        'shared_gross', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(s.gross, 0), 'unit', 'BP'),
        'shared_refunds', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(f.refunds, 0), 'unit', 'BP'),
        'shared_net', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(s.gross, 0) - coalesce(f.refunds, 0), 'unit', 'BP'),
        'shared_sale_count', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(s.sale_count, 0)),
        'shared_customers', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(b.buyers, 0)),
        'shared_repeat_customers', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(b.repeat_buyers, 0)),
        'shared_repeat_rate', pg_catalog.jsonb_build_object('available', coalesce(b.buyers, 0) > 0, 'value', b.repeat_buyers * 100.0 / nullif(b.buyers, 0), 'unit', '%', 'reason', 'Undefined without identified buyers'),
        'shared_guest_sales', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(s.guest_sales, 0)),
        'shared_net_change', pg_catalog.jsonb_build_object('available', p_previous_start is not null and coalesce(pr.net, 0) <> 0, 'value', ((coalesce(s.gross, 0) - coalesce(f.refunds, 0)) - pr.net) * 100.0 / nullif(abs(pr.net), 0), 'unit', '%', 'reason', 'No nonzero comparison baseline'),
        'active_staff', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(st.active_staff, 0)),
        'published_posts', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(po.published_posts, 0)),
        'pending_purchase_count', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(pp.requests, 0)),
        'pending_purchase_amount', pg_catalog.jsonb_build_object('available', true, 'value', coalesce(pp.amount, 0), 'unit', 'BP'),
        'active_stations', unavailable, 'sessions', unavailable, 'current_promotions', unavailable,
        'pending_settlement_count', unavailable, 'pending_settlement_amount', unavailable,
        'cash_gross', unavailable, 'cash_refunds', unavailable, 'cash_net', unavailable,
        'customized_gross', unavailable, 'customized_refunds', unavailable, 'customized_net', unavailable,
        'customized_bp_balance', unavailable
      )
    ) order by r.business_id), '[]'::jsonb)
  ) into result
  from requested r
  left join sale_totals s on s.business_id = r.business_id
  left join refund_totals f on f.business_id = r.business_id
  left join buyer_totals b on b.business_id = r.business_id
  left join previous_totals pr on pr.business_id = r.business_id
  left join staff st on st.business_id = r.business_id
  left join posts po on po.business_id = r.business_id
  left join pending_purchases pp on pp.business_id = r.business_id
  left join public.business_bp_wallets w on w.business_id::text = r.business_id;
  return result;
end;
$$;

revoke all on function public.admin_get_business_partner_summary(text[], timestamptz, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_get_business_partner_summary(text[], timestamptz, timestamptz, timestamptz, text) to authenticated;
