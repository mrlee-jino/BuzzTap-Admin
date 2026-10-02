do $$
declare
  constraint_name text;
  constraint_definition text;
  check_expression text;
begin
  select constraint_row.conname,
         pg_catalog.pg_get_constraintdef(constraint_row.oid)
  into constraint_name, constraint_definition
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.transactions'::regclass
    and constraint_row.conname = 'transactions_transaction_type_check'
    and constraint_row.contype = 'c';

  if constraint_definition is not null
     and pg_catalog.strpos(constraint_definition, 'BUSINESS_PURCHASE') = 0 then
    if pg_catalog.left(constraint_definition, 7) <> 'CHECK ('
       or pg_catalog.right(constraint_definition, 1) <> ')' then
      raise exception 'Unexpected transaction type constraint definition: %', constraint_definition;
    end if;

    check_expression := pg_catalog.substring(
      constraint_definition,
      8,
      pg_catalog.char_length(constraint_definition) - 8
    );

    execute pg_catalog.format(
      'alter table public.transactions drop constraint %I',
      constraint_name
    );

    execute pg_catalog.format(
      'alter table public.transactions add constraint %I check ((%s) or (transaction_type)::text = %L)',
      constraint_name,
      check_expression,
      'BUSINESS_PURCHASE'
    );
  end if;
end
$$;

create table if not exists public.business_bp_wallets (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bp_business_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  purchase_request_id uuid not null unique references public.purchase_requests(id),
  actor_user_id uuid references auth.users(id) on delete set null,
  transaction_code text not null unique,
  amount bigint not null check (amount > 0),
  business_balance_before bigint not null check (business_balance_before >= 0),
  business_balance_after bigint not null check (business_balance_after >= 0),
  treasury_balance_before bigint not null check (treasury_balance_before >= 0),
  treasury_balance_after bigint not null check (treasury_balance_after >= 0),
  reason text not null,
  reference text,
  created_at timestamptz not null default now()
);

alter table public.transactions alter column customer_id drop not null;

alter table public.business_bp_wallets enable row level security;
alter table public.bp_business_wallet_ledger enable row level security;
revoke all on table public.business_bp_wallets, public.bp_business_wallet_ledger from public, anon, authenticated;
grant select on table public.business_bp_wallets, public.bp_business_wallet_ledger to authenticated;

drop policy if exists "Admins can read business BP wallets" on public.business_bp_wallets;
create policy "Admins can read business BP wallets"
on public.business_bp_wallets for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read business BP ledger" on public.bp_business_wallet_ledger;
create policy "Admins can read business BP ledger"
on public.bp_business_wallet_ledger for select to authenticated
using ((select public.is_admin()));

create or replace function public.admin_get_bp_treasury_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  initial_amount bigint;
  available_amount bigint;
  customer_balance_total bigint;
  business_balance_total bigint;
  loaded_customer_total bigint;
  loaded_business_total bigint;
  funded_customer_count bigint;
  funded_business_count bigint;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  select initial_supply, available_balance
  into initial_amount, available_amount
  from public.bp_treasury_state
  where singleton = true;

  select coalesce(sum(balance), 0), count(*) filter (where balance > 0)
  into customer_balance_total, funded_customer_count
  from public.customer_bp_wallets;

  select coalesce(sum(balance), 0), count(*) filter (where balance > 0)
  into business_balance_total, funded_business_count
  from public.business_bp_wallets;

  select coalesce(sum(amount), 0)
  into loaded_customer_total
  from public.bp_wallet_ledger;

  select coalesce(sum(amount), 0)
  into loaded_business_total
  from public.bp_business_wallet_ledger;

  return pg_catalog.jsonb_build_object(
    'initial_supply', initial_amount,
    'available_balance', available_amount,
    'customer_balance_total', customer_balance_total,
    'business_balance_total', business_balance_total,
    'total_wallet_balance', customer_balance_total + business_balance_total,
    'total_loaded', loaded_customer_total + loaded_business_total,
    'funded_customer_count', funded_customer_count,
    'funded_business_count', funded_business_count
  );
end;
$$;

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
  request_amount_numeric numeric;
  request_amount bigint;
  business_balance_before bigint;
  business_balance_after bigint;
  treasury_balance_before bigint;
  treasury_balance_after bigint;
  transaction_code text;
  transaction_id text;
  next_status text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_decision, '')));
  action_name text;
  action_time timestamptz := pg_catalog.clock_timestamp();
  reason_text text;
  request_reference text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if next_status not in ('APPROVED', 'REJECTED') then
    raise exception using errcode = '22023', message = 'Decision must be APPROVED or REJECTED';
  end if;

  select request.status, request.business_id, request.amount, request.notes, request.reference
  into current_status, request_business_id, request_amount_numeric, reason_text, request_reference
  from public.purchase_requests as request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Purchase request not found';
  end if;

  if pg_catalog.upper(coalesce(current_status, '')) not in ('PENDING', 'SUBMITTED') then
    raise exception using errcode = '22023', message = 'This purchase request has already been reviewed';
  end if;

  if next_status = 'APPROVED' then
    if request_amount_numeric is null
       or request_amount_numeric <= 0
       or request_amount_numeric <> pg_catalog.trunc(request_amount_numeric) then
      raise exception using errcode = '22023', message = 'Purchase request amount must be a positive whole number';
    end if;

    request_amount := request_amount_numeric::bigint;

    select treasury.available_balance
    into treasury_balance_before
    from public.bp_treasury_state as treasury
    where treasury.singleton = true
    for update;

    if not found then
      raise exception 'BP treasury state is not initialized';
    end if;

    if request_amount > treasury_balance_before then
      raise exception using errcode = '22023', message = pg_catalog.format('Insufficient BP reserve. Only %s BP is available.', treasury_balance_before);
    end if;

    insert into public.business_bp_wallets as wallet (business_id, balance, created_at, updated_at)
    values (request_business_id, request_amount, action_time, action_time)
    on conflict (business_id) do update
      set balance = wallet.balance + excluded.balance,
          updated_at = excluded.updated_at
    returning balance into business_balance_after;

    business_balance_before := business_balance_after - request_amount;
    treasury_balance_after := treasury_balance_before - request_amount;

    update public.bp_treasury_state
    set available_balance = treasury_balance_after,
        updated_at = action_time
    where singleton = true;

    transaction_code := 'BPBUY-' || pg_catalog.upper(pg_catalog.replace(gen_random_uuid()::text, '-', ''));
    reason_text := coalesce(nullif(pg_catalog.btrim(coalesce(reason_text, '')), ''), 'Approved BP purchase request');

    insert into public.transactions (
      transaction_code,
      customer_id,
      business_id,
      nfc_card_id,
      transaction_type,
      status,
      amount_bp,
      description,
      created_at,
      updated_at,
      completed_at
    ) values (
      transaction_code,
      null,
      request_business_id,
      null,
      'BUSINESS_PURCHASE',
      'COMPLETED',
      request_amount,
      pg_catalog.format('BP purchase request %s approved', p_request_id),
      action_time,
      action_time,
      action_time
    )
    returning id::text into transaction_id;

    insert into public.bp_business_wallet_ledger (
      business_id,
      purchase_request_id,
      actor_user_id,
      transaction_code,
      amount,
      business_balance_before,
      business_balance_after,
      treasury_balance_before,
      treasury_balance_after,
      reason,
      reference,
      created_at
    ) values (
      request_business_id,
      p_request_id,
      auth.uid(),
      transaction_code,
      request_amount,
      business_balance_before,
      business_balance_after,
      treasury_balance_before,
      treasury_balance_after,
      reason_text,
      nullif(pg_catalog.btrim(coalesce(request_reference, '')), ''),
      action_time
    );
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
      'amount', request_amount_numeric,
      'old_status', current_status,
      'new_status', next_status,
      'business_balance_before', business_balance_before,
      'business_balance_after', business_balance_after,
      'treasury_balance_before', treasury_balance_before,
      'treasury_balance_after', treasury_balance_after,
      'transaction_code', transaction_code,
      'transaction_id', transaction_id,
      'reference', request_reference
    ),
    action_time
  );

  return pg_catalog.jsonb_build_object(
    'id', p_request_id,
    'status', next_status,
    'transaction_code', transaction_code,
    'business_balance', business_balance_after,
    'treasury_available', treasury_balance_after
  );
end;
$$;

do $$
declare
  approved_request record;
  request_amount_numeric numeric;
  request_amount bigint;
  business_balance_before bigint;
  business_balance_after bigint;
  treasury_balance_before bigint;
  treasury_balance_after bigint;
  transaction_code text;
  transaction_id text;
  action_time timestamptz;
  reason_text text;
begin
  for approved_request in
    select request.id, request.business_id, request.amount, request.notes, request.reference
    from public.purchase_requests as request
    where pg_catalog.upper(coalesce(request.status, '')) = 'APPROVED'
      and not exists (
        select 1
        from public.bp_business_wallet_ledger as ledger
        where ledger.purchase_request_id = request.id
      )
    order by request.created_at, request.id
  loop
    request_amount_numeric := approved_request.amount;

    if request_amount_numeric is null
       or request_amount_numeric <= 0
       or request_amount_numeric <> pg_catalog.trunc(request_amount_numeric) then
      raise exception 'Approved purchase request % has an invalid BP amount', approved_request.id;
    end if;

    request_amount := request_amount_numeric::bigint;

    select treasury.available_balance
    into treasury_balance_before
    from public.bp_treasury_state as treasury
    where treasury.singleton = true
    for update;

    if not found then
      raise exception 'BP treasury state is not initialized';
    end if;

    if request_amount > treasury_balance_before then
      raise exception 'Cannot backfill approved purchase request %: reserve has only % BP available', approved_request.id, treasury_balance_before;
    end if;

    action_time := pg_catalog.clock_timestamp();
    reason_text := coalesce(nullif(pg_catalog.btrim(coalesce(approved_request.notes, '')), ''), 'Approved BP purchase request backfill');

    insert into public.business_bp_wallets as wallet (business_id, balance, created_at, updated_at)
    values (approved_request.business_id, request_amount, action_time, action_time)
    on conflict (business_id) do update
      set balance = wallet.balance + excluded.balance,
          updated_at = excluded.updated_at
    returning balance into business_balance_after;

    business_balance_before := business_balance_after - request_amount;
    treasury_balance_after := treasury_balance_before - request_amount;

    update public.bp_treasury_state
    set available_balance = treasury_balance_after,
        updated_at = action_time
    where singleton = true;

    transaction_code := 'BPBUY-' || pg_catalog.upper(pg_catalog.replace(gen_random_uuid()::text, '-', ''));

    insert into public.transactions (
      transaction_code,
      customer_id,
      business_id,
      nfc_card_id,
      transaction_type,
      status,
      amount_bp,
      description,
      created_at,
      updated_at,
      completed_at
    ) values (
      transaction_code,
      null,
      approved_request.business_id,
      null,
      'BUSINESS_PURCHASE',
      'COMPLETED',
      request_amount,
      pg_catalog.format('Backfilled BP purchase request %s', approved_request.id),
      action_time,
      action_time,
      action_time
    )
    returning id::text into transaction_id;

    insert into public.bp_business_wallet_ledger (
      business_id,
      purchase_request_id,
      actor_user_id,
      transaction_code,
      amount,
      business_balance_before,
      business_balance_after,
      treasury_balance_before,
      treasury_balance_after,
      reason,
      reference,
      created_at
    ) values (
      approved_request.business_id,
      approved_request.id,
      null,
      transaction_code,
      request_amount,
      business_balance_before,
      business_balance_after,
      treasury_balance_before,
      treasury_balance_after,
      reason_text,
      nullif(pg_catalog.btrim(coalesce(approved_request.reference, '')), ''),
      action_time
    );

    insert into public.audit_logs (
      actor_user_id,
      action,
      target_type,
      target_id,
      details,
      created_at
    ) values (
      null,
      'BP_PURCHASE_REQUEST_CREDITED',
      'PURCHASE_REQUEST',
      approved_request.id,
      pg_catalog.jsonb_build_object(
        'business_id', approved_request.business_id,
        'amount', request_amount,
        'new_business_balance', business_balance_after,
        'treasury_before', treasury_balance_before,
        'treasury_after', treasury_balance_after,
        'transaction_code', transaction_code,
        'transaction_id', transaction_id,
        'backfilled', true
      ),
      action_time
    );
  end loop;
end
$$;

revoke all on function public.admin_review_purchase_request(uuid, text) from public;
grant execute on function public.admin_review_purchase_request(uuid, text) to authenticated;
revoke all on function public.admin_get_bp_treasury_summary() from public;
grant execute on function public.admin_get_bp_treasury_summary() to authenticated;

notify pgrst, 'reload schema';