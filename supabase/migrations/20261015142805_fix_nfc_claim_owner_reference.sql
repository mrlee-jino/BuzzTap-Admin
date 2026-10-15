create or replace function public.claim_nfc_card(p_card_code text)
returns public.nfc_cards language plpgsql security definer set search_path = '' as $$
declare card public.nfc_cards; v_customer_id uuid := (select auth.uid());
begin
  if v_customer_id is null then raise exception using errcode='42501', message='Sign in to claim a card'; end if;
  perform 1 from public.profiles where id = v_customer_id and role='CUSTOMER' and status='ACTIVE' for update;
  if not found then raise exception using errcode='42501', message='An active customer account is required'; end if;
  if nullif(trim(p_card_code),'') is null then raise exception 'Scan or enter the card code'; end if;
  select * into card from public.nfc_cards where card_code=trim(p_card_code) for update;
  if not found then raise exception 'Card is not available for claiming'; end if;
  if card.status <> 'ACTIVE' then raise exception 'Card is not available for claiming'; end if;
  if card.customer_id = v_customer_id then return card; end if;
  if card.customer_id is not null then raise exception 'This card has already been claimed'; end if;
  update public.nfc_cards set customer_id=v_customer_id, updated_at=now()
    where id=card.id returning * into card;
  insert into public.audit_logs (actor_user_id,action,target_type,target_id,details)
  values (v_customer_id,'NFC_CARD_CLAIMED','NFC_CARD',card.id,jsonb_build_object('card_code',card.card_code,'customer_id',v_customer_id));
  return card;
end;
$$;
revoke all on function public.claim_nfc_card(text) from public, anon;
grant execute on function public.claim_nfc_card(text) to authenticated;
notify pgrst, 'reload schema';
