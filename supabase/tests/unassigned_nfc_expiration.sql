begin;
do $$
declare
  admin_id uuid;
  customer_id uuid;
  code text := 'expiry-test-' || gen_random_uuid()::text;
  card public.nfc_cards;
  expired_id uuid;
  claimed_id uuid;
  rejected boolean;
begin
  select id into admin_id from public.profiles where role='ADMIN' and status='ACTIVE' limit 1;
  select id into customer_id from public.profiles where role='CUSTOMER' and status='ACTIVE' limit 1;
  if admin_id is null or customer_id is null then raise exception 'Active test accounts required'; end if;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  rejected := false;
  begin
    perform public.admin_register_nfc_card(null,code,now()-interval '1 day',null);
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'Past expiry was accepted'; end if;
  card := public.admin_register_nfc_card(null,code,now()+interval '1 day',null);
  expired_id := card.id;
  update public.nfc_cards set expires_at=clock_timestamp()-interval '1 second' where id=expired_id;
  rejected := false;
  begin
    perform public.admin_assign_nfc_card(customer_id,code,null,null);
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'Admin assigned an expired card'; end if;
  perform set_config('request.jwt.claim.sub',customer_id::text,true);
  rejected := false;
  begin perform public.claim_nfc_card(code); exception when others then rejected := true; end;
  if not rejected then raise exception 'Customer claimed expired card'; end if;

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  card := public.admin_register_nfc_card(null,code || '-claimed',now()+interval '1 day',null);
  claimed_id := card.id;
  perform set_config('request.jwt.claim.sub',customer_id::text,true);
  card := public.claim_nfc_card(code || '-claimed');
  if card.expires_at is not null then raise exception 'Claim did not clear expiration'; end if;
  perform app_private.delete_expired_unassigned_nfc_cards();
  if exists(select 1 from public.nfc_cards where id=expired_id) then raise exception 'Cleanup did not delete expired card'; end if;
  if not exists(select 1 from public.nfc_cards where id=claimed_id) then raise exception 'Cleanup deleted an assigned card'; end if;

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  rejected := false;
  begin perform public.admin_delete_unassigned_nfc_card(claimed_id,null); exception when others then rejected := true; end;
  if not rejected then raise exception 'Manual deletion allowed assigned card'; end if;
  card := public.admin_register_nfc_card(null,code || '-manual',now()+interval '1 day',null);
  perform public.admin_delete_unassigned_nfc_card(card.id,'Rollback test');
  if exists(select 1 from public.nfc_cards where id=card.id) then raise exception 'Manual deletion failed'; end if;
  if not exists(select 1 from public.audit_logs where target_id=card.id and action='NFC_CARD_DELETED') then raise exception 'Missing deletion audit'; end if;
  perform set_config('request.jwt.claim.sub',customer_id::text,true);
  rejected := false;
  begin perform public.admin_delete_unassigned_nfc_card(gen_random_uuid(),null); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Non-admin deletion allowed'; end if;
end;
$$;
select 'PASS: future expiry, expired claim/assignment rejection, cleanup, claimed-card retention, manual deletion and admin authorization' as result;
rollback;
