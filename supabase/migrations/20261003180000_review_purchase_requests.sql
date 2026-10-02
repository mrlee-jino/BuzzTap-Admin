create or replace function public.admin_review_purchase_request(
  p_request_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  request_business_id uuid;
  request_amount bigint;
  next_status text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_decision, '')));
  action_name text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if next_status not in ('APPROVED', 'REJECTED') then
    raise exception using errcode = '22023', message = 'Decision must be APPROVED or REJECTED';
  end if;

  select request.status, request.business_id, request.amount
  into current_status, request_business_id, request_amount
  from public.purchase_requests as request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Purchase request not found';
  end if;

  if pg_catalog.upper(coalesce(current_status, '')) not in ('PENDING', 'SUBMITTED') then
    raise exception using errcode = '22023', message = 'This purchase request has already been reviewed';
  end if;

  update public.purchase_requests
  set status = next_status
  where id = p_request_id;

  action_name := case
    when next_status = 'APPROVED' then 'BP_PURCHASE_REQUEST_APPROVED'
    else 'BP_PURCHASE_REQUEST_REJECTED'
  end;

  insert into public.audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    details,
    created_at
  ) values (
    auth.uid(),
    action_name,
    'PURCHASE_REQUEST',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'business_id', request_business_id,
      'amount', request_amount,
      'old_status', current_status,
      'new_status', next_status
    ),
    pg_catalog.clock_timestamp()
  );

  return pg_catalog.jsonb_build_object(
    'id', p_request_id,
    'status', next_status
  );
end;
$$;

revoke all on function public.admin_review_purchase_request(uuid, text) from public;
grant execute on function public.admin_review_purchase_request(uuid, text) to authenticated;

notify pgrst, 'reload schema';