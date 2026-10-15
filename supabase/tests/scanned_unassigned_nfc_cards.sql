-- Uses existing active accounts; all test cards and audit entries are rolled back.
begin;
do $$
declare
  admin_id uuid;
  first_customer uuid;
  second_customer uuid;
  code text := 'test-scan-' || gen_random_uuid()::text;
  card public.nfc_cards;
  rejected boolean;
begin
  select id into admin_id from public.profiles where role='ADMIN' and status='ACTIVE' limit 1;
  select id into first_customer from public.profiles where role='CUSTOMER' and status='ACTIVE' order by id limit 1;
  select id into second_customer from public.profiles where role='CUSTOMER' and status='ACTIVE' and id<>first_customer order by id limit 1;
  if admin_id is null or first_customer is null or second_customer is null then
    raise exception 'Tests require an active admin and two active customers';
  end if;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  card := public.admin_assign_nfc_card(null, '  ' || code || '  ', null, 'Rollback test');
  if card.customer_id is not null or card.card_code<>code then raise exception 'Unassigned scanner registration failed'; end if;
  rejected := false;
  begin
    perform public.admin_assign_nfc_card(null,code,null,null);
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'Duplicate registration must fail'; end if;

  perform set_config('request.jwt.claim.sub',first_customer::text,true);
  card := public.claim_nfc_card(code);
  if card.customer_id<>first_customer then raise exception 'Claim did not bind authenticated customer'; end if;
  card := public.claim_nfc_card(code);
  if card.customer_id<>first_customer then raise exception 'Claim retry changed owner'; end if;

  perform set_config('request.jwt.claim.sub',second_customer::text,true);
  rejected := false;
  begin perform public.claim_nfc_card(code); exception when others then rejected := true; end;
  if not rejected then raise exception 'Second customer stole a claimed card'; end if;

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  rejected := false;
  begin perform public.admin_assign_nfc_card(second_customer,code,null,null); exception when others then rejected := true; end;
  if not rejected then raise exception 'Assignment overwrote existing owner'; end if;
  card := public.admin_assign_nfc_card(null,code || '-admin',null,null);
  card := public.admin_assign_nfc_card(second_customer,code || '-admin',null,null);
  if card.customer_id<>second_customer then raise exception 'Assigning registered inventory failed'; end if;

  card := public.admin_assign_nfc_card(null,code || '-blocked',null,null);
  update public.nfc_cards set status='BLOCKED' where id=card.id;
  perform set_config('request.jwt.claim.sub',first_customer::text,true);
  rejected := false;
  begin perform public.claim_nfc_card(code || '-blocked'); exception when others then rejected := true; end;
  if not rejected then raise exception 'Blocked card was claimable'; end if;

  perform set_config('request.jwt.claim.sub','',true);
  rejected := false;
  begin perform public.claim_nfc_card(code); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Unsigned claim allowed'; end if;
  if has_function_privilege('anon','public.claim_nfc_card(text)','EXECUTE') then raise exception 'Anonymous RPC access allowed'; end if;
end;
$$;
select 'PASS: scanner registration, duplicate prevention, self-claim, idempotence, exclusive ownership, admin assignment, blocked cards and authorization' as result;
rollback;
