create table if not exists public.bp_treasury_state (
  singleton boolean primary key default true check (singleton),
  initial_supply bigint not null check (initial_supply = 100000),
  available_balance bigint not null check (available_balance >= 0 and available_balance <= initial_supply),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.bp_treasury_state (singleton, initial_supply, available_balance)
values (true, 100000, 100000)
on conflict (singleton) do nothing;

create table if not exists public.customer_bp_wallets (
  customer_id uuid primary key references public.profiles(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bp_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  actor_user_id uuid references auth.users(id) on delete set null,
  transaction_code text not null unique,
  amount bigint not null check (amount > 0),
  customer_balance_before bigint not null check (customer_balance_before >= 0),
  customer_balance_after bigint not null check (customer_balance_after >= 0),
  treasury_balance_before bigint not null check (treasury_balance_before >= 0),
  treasury_balance_after bigint not null check (treasury_balance_after >= 0),
  reason text not null,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.transactions alter column business_id drop not null;

alter table public.bp_treasury_state enable row level security;
alter table public.customer_bp_wallets enable row level security;
alter table public.bp_wallet_ledger enable row level security;

revoke all on table public.bp_treasury_state, public.customer_bp_wallets, public.bp_wallet_ledger from public, anon, authenticated;
grant select on table public.bp_treasury_state, public.customer_bp_wallets, public.bp_wallet_ledger to authenticated;

drop policy if exists "Admins can read BP treasury state" on public.bp_treasury_state;
create policy "Admins can read BP treasury state"
on public.bp_treasury_state for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read customer BP wallets" on public.customer_bp_wallets;
create policy "Admins can read customer BP wallets"
on public.customer_bp_wallets for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read BP wallet ledger" on public.bp_wallet_ledger;
create policy "Admins can read BP wallet ledger"
on public.bp_wallet_ledger for select to authenticated
using ((select public.is_admin()));

create or replace function public.admin_load_customer_bp(
  p_customer_id uuid,
  p_amount bigint,
  p_reason text,
  p_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_status text;
  available_before bigint;
  available_after bigint;
  customer_balance_before bigint;
  customer_balance_after bigint;
  transaction_code text;
  transaction_id text;
  action_time timestamptz := pg_catalog.clock_timestamp();
  clean_reason text := pg_catalog.btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'Load amount must be a whole number greater than zero';
  end if;

  if clean_reason = '' then
    raise exception using errcode = '22023', message = 'A reason is required for the audit record';
  end if;

  select profile.status
  into customer_status
  from public.profiles as profile
  where profile.id = p_customer_id
    and profile.role = 'CUSTOMER'
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Customer account was not found';
  end if;

  if pg_catalog.upper(coalesce(customer_status, '')) <> 'ACTIVE' then
    raise exception using errcode = '22023', message = 'BP can only be loaded to an active customer';
  end if;

  select treasury.available_balance
  into available_before
  from public.bp_treasury_state as treasury
  where treasury.singleton = true
  for update;

  if not found then
    raise exception 'BP treasury state is not initialized';
  end if;

  if p_amount > available_before then
    raise exception using errcode = '22023', message = pg_catalog.format('Insufficient BP reserve. Only %s BP is available.', available_before);
  end if;

  insert into public.customer_bp_wallets as wallet (customer_id, balance, created_at, updated_at)
  values (p_customer_id, p_amount, action_time, action_time)
  on conflict (customer_id) do update
    set balance = wallet.balance + excluded.balance,
        updated_at = excluded.updated_at
  returning balance into customer_balance_after;

  customer_balance_before := customer_balance_after - p_amount;
  available_after := available_before - p_amount;

  update public.bp_treasury_state
  set available_balance = available_after,
      updated_at = action_time
  where singleton = true;

  transaction_code := 'BPLOAD-' || pg_catalog.upper(pg_catalog.replace(gen_random_uuid()::text, '-', ''));

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
    p_customer_id,
    null,
    null,
    'CUSTOMER_LOAD',
    'COMPLETED',
    p_amount,
    pg_catalog.format('BP load: %s', clean_reason),
    action_time,
    action_time,
    action_time
  )
  returning id::text into transaction_id;

  insert into public.bp_wallet_ledger (
    customer_id,
    actor_user_id,
    transaction_code,
    amount,
    customer_balance_before,
    customer_balance_after,
    treasury_balance_before,
    treasury_balance_after,
    reason,
    reference,
    notes,
    created_at
  ) values (
    p_customer_id,
    auth.uid(),
    transaction_code,
    p_amount,
    customer_balance_before,
    customer_balance_after,
    available_before,
    available_after,
    clean_reason,
    nullif(pg_catalog.btrim(coalesce(p_reference, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_notes, '')), ''),
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
    auth.uid(),
    'CUSTOMER_BP_LOADED',
    'CUSTOMER',
    p_customer_id,
    pg_catalog.jsonb_build_object(
      'amount', p_amount,
      'old_balance', customer_balance_before,
      'new_balance', customer_balance_after,
      'treasury_before', available_before,
      'treasury_after', available_after,
      'reason', clean_reason,
      'reference', nullif(pg_catalog.btrim(coalesce(p_reference, '')), ''),
      'transaction_code', transaction_code,
      'transaction_id', transaction_id
    ),
    action_time
  );

  return pg_catalog.jsonb_build_object(
    'transaction_id', transaction_id,
    'transaction_code', transaction_code,
    'customer_balance', customer_balance_after,
    'treasury_available', available_after
  );
end;
$$;

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
  loaded_total bigint;
  funded_customer_count bigint;
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

  select coalesce(sum(amount), 0)
  into loaded_total
  from public.bp_wallet_ledger;

  return pg_catalog.jsonb_build_object(
    'initial_supply', initial_amount,
    'available_balance', available_amount,
    'customer_balance_total', customer_balance_total,
    'total_loaded', loaded_total,
    'funded_customer_count', funded_customer_count
  );
end;
$$;

revoke all on function public.admin_load_customer_bp(uuid, bigint, text, text, text) from public;
grant execute on function public.admin_load_customer_bp(uuid, bigint, text, text, text) to authenticated;
revoke all on function public.admin_get_bp_treasury_summary() from public;
grant execute on function public.admin_get_bp_treasury_summary() to authenticated;

notify pgrst, 'reload schema';