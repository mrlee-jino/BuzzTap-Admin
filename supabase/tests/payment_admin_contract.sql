-- Read-only contract checks. RPC calls deliberately fail validation before writes.
begin;
select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role='ADMIN' and status='ACTIVE' limit 1), true);
set local role authenticated;
do $$
declare table_name text; rejected boolean;
begin
  if not public.is_admin() then raise exception 'An active admin fixture is required'; end if;
  foreach table_name in array array['customer_payment_requests','customer_payment_events','customer_payment_disputes','business_payment_controls','business_payment_control_events'] loop
    if not has_table_privilege('public.' || table_name,'SELECT') then raise exception 'Missing admin read access: %',table_name; end if;
    if has_table_privilege('public.' || table_name,'INSERT,UPDATE,DELETE,TRUNCATE') then raise exception 'Unexpected direct write access: %',table_name; end if;
  end loop;
  if has_table_privilege('public.customer_bp_wallets','INSERT,UPDATE,DELETE,TRUNCATE') then raise exception 'Direct wallet writes remain enabled'; end if;
  rejected := false;
  begin
    perform public.admin_review_payment_dispute(gen_random_uuid(),'OPEN','A valid customer-visible explanation.');
  exception when others then
    if SQLERRM like '%Review state and resolution%' then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'Invalid review state accepted'; end if;
  rejected := false;
  begin
    perform public.admin_set_business_points_payments(gen_random_uuid(),false,'bad');
  exception when others then
    if SQLERRM like '%Enabled flag and reason required%' then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'Short control reason accepted'; end if;
  if exists(select 1 from public.profiles where role='CUSTOMER' and status='ACTIVE') then
    perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='CUSTOMER' and status='ACTIVE' limit 1),true);
    rejected := false;
    begin
      perform public.admin_review_payment_dispute(gen_random_uuid(),'RESOLVED','A valid customer-visible explanation.');
    exception when insufficient_privilege then rejected := true;
    end;
    if not rejected then raise exception 'Customer can review a dispute'; end if;
    rejected := false;
    begin
      perform public.admin_set_business_points_payments(gen_random_uuid(),false,'Valid reason');
    exception when insufficient_privilege then rejected := true;
    end;
    if not rejected then raise exception 'Customer can change payment controls'; end if;
  end if;
end;
$$;
select 'PASS: admin read contract, direct financial writes denied, RPC reason/state validation, customer admin-action denial' as result;
rollback;
