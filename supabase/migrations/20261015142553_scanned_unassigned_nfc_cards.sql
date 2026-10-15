-- Card codes come from physical cards. Existing unique constraint prevents reuse.
create or replace function public.admin_assign_nfc_card(
  p_customer_id uuid, p_card_code text, p_card_uid text, p_reason text default null
) returns public.nfc_cards language plpgsql security definer set search_path = '' as $$
declare card public.nfc_cards;
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Active admin access required';
  end if;
  if nullif(trim(p_card_code), '') is null then raise exception 'Scan or enter the card code'; end if;
  if p_customer_id is not null then
    perform 1 from public.profiles where id = p_customer_id and role = 'CUSTOMER'
      and status not in ('CLOSED', 'DELETED') for update;
    if not found then raise exception 'Eligible customer not found'; end if;
  end if;

  select * into card from public.nfc_cards where card_code = trim(p_card_code) for update;
  if found then
    if card.customer_id is not null then
      raise exception 'This card code already belongs to a customer. Use Transfer to change its owner.';
    end if;
    if card.status <> 'ACTIVE' then raise exception 'Only active, unassigned cards can be assigned'; end if;
    if p_customer_id is null then raise exception 'This card code is already registered and unassigned'; end if;
    update public.nfc_cards set customer_id = p_customer_id, updated_at = now()
      where id = card.id returning * into card;
  else
    insert into public.nfc_cards (card_code, card_uid, customer_id, status)
    values (trim(p_card_code), gen_random_uuid()::text, p_customer_id, 'ACTIVE') returning * into card;
  end if;
  insert into public.audit_logs (actor_user_id, action, target_type, target_id, details)
  values ((select auth.uid()), case when p_customer_id is null then 'NFC_CARD_REGISTERED' else 'NFC_CARD_ASSIGNED' end,
    'NFC_CARD', card.id, jsonb_build_object('card_code',card.card_code,'customer_id',card.customer_id,'reason',p_reason));
  return card;
end;
$$;
revoke all on function public.admin_assign_nfc_card(uuid,text,text,text) from public, anon;
grant execute on function public.admin_assign_nfc_card(uuid,text,text,text) to authenticated;

-- The customer's app calls this RPC using its signed-in session, never a supplied user ID.
create function public.claim_nfc_card(p_card_code text)
returns public.nfc_cards language plpgsql security definer set search_path = '' as $$
declare card public.nfc_cards; customer_id uuid := (select auth.uid());
begin
  if customer_id is null then raise exception using errcode='42501', message='Sign in to claim a card'; end if;
  perform 1 from public.profiles where id = customer_id and role='CUSTOMER' and status='ACTIVE' for update;
  if not found then raise exception using errcode='42501', message='An active customer account is required'; end if;
  if nullif(trim(p_card_code),'') is null then raise exception 'Scan or enter the card code'; end if;
  select * into card from public.nfc_cards where card_code=trim(p_card_code) for update;
  if not found then raise exception 'Card is not available for claiming'; end if;
  if card.status <> 'ACTIVE' then raise exception 'Card is not available for claiming'; end if;
  if card.customer_id = customer_id then return card; end if;
  if card.customer_id is not null then raise exception 'This card has already been claimed'; end if;
  update public.nfc_cards set customer_id=claim_nfc_card.customer_id, updated_at=now()
    where id=card.id returning * into card;
  insert into public.audit_logs (actor_user_id,action,target_type,target_id,details)
  values (customer_id,'NFC_CARD_CLAIMED','NFC_CARD',card.id,jsonb_build_object('card_code',card.card_code,'customer_id',customer_id));
  return card;
end;
$$;
revoke all on function public.claim_nfc_card(text) from public, anon;
grant execute on function public.claim_nfc_card(text) to authenticated;
revoke all on function public.admin_generate_nfc_card_code() from public, anon, authenticated;
notify pgrst, 'reload schema';
