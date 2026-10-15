-- Run as database owner; all fixtures and counter changes are rolled back.
begin;
create temporary table account_number_test_profiles (like public.profiles including defaults) on commit drop;
create trigger test_account_number before insert or update on account_number_test_profiles
for each row execute function app_private.set_customer_account_number();

do $$
declare
  first_number text;
  next_number text;
  other_region text;
  different_date text;
  locked boolean := false;
begin
  delete from app_private.account_region_counters where region in ('98', '99');
  insert into account_number_test_profiles (id, full_name, role, created_at, account_region)
  values (gen_random_uuid(), 'Account test', 'CUSTOMER', '2099-01-01 20:00:00+00', '98')
  returning account_number into first_number;
  if first_number <> '2099010298000001' then raise exception 'First number/timezone test failed: %', first_number; end if;

  update app_private.account_region_counters set last_number = 999999 where region = '98';
  insert into account_number_test_profiles (id, full_name, role, created_at, account_region)
  values (gen_random_uuid(), 'Account test', 'CUSTOMER', '2099-01-01 20:00:00+00', '98')
  returning account_number into next_number;
  if next_number <> '2099010298000002' then raise exception 'Rollover collision test failed: %', next_number; end if;

  insert into account_number_test_profiles (id, full_name, role, created_at, account_region)
  values (gen_random_uuid(), 'Account test', 'CUSTOMER', '2099-01-01 20:00:00+00', '99')
  returning account_number into other_region;
  if other_region <> '2099010299000001' then raise exception 'Regional independence test failed'; end if;

  update app_private.account_region_counters set last_number = 999999 where region = '98';
  insert into account_number_test_profiles (id, full_name, role, created_at, account_region)
  values (gen_random_uuid(), 'Account test', 'CUSTOMER', '2099-01-03 00:00:00+08', '98')
  returning account_number into different_date;
  if different_date <> '2099010398000001' then raise exception 'Rollover on new date test failed'; end if;

  begin
    update account_number_test_profiles set account_region = '97' where account_number = first_number;
  exception when others then locked := true;
  end;
  if not locked then raise exception 'Account immutability test failed'; end if;
  if has_function_privilege('anon', 'public.admin_assign_customer_account_number(uuid,text)', 'EXECUTE') then
    raise exception 'Anon access test failed';
  end if;
  begin
    perform public.admin_assign_customer_account_number(gen_random_uuid(), '13');
    raise exception 'Authorization test failed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select 'PASS: registration timezone, first sequence, independent regions, rollover, collision skipping, immutability and unauthorized access' as result;
rollback;
