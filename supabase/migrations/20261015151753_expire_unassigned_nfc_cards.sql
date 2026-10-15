alter table public.nfc_cards add column expires_at timestamptz;
update public.nfc_cards set expires_at = now() + interval '30 days' where customer_id is null;
create index nfc_cards_unassigned_expiry_idx on public.nfc_cards(expires_at) where customer_id is null;

create function app_private.enforce_nfc_card_expiry()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and OLD.customer_id is null and NEW.customer_id is not null
     and OLD.expires_at <= clock_timestamp() then
    raise exception 'This unassigned card has expired and cannot be claimed or assigned';
  end if;
  if NEW.customer_id is not null then
    NEW.expires_at := null;
  else
    NEW.expires_at := coalesce(NEW.expires_at, clock_timestamp() + interval '30 days');
    if TG_OP = 'INSERT' and NEW.expires_at <= clock_timestamp() then
      raise exception 'Expiration must be in the future';
    end if;
  end if;
  return NEW;
end;
$$;
revoke all on function app_private.enforce_nfc_card_expiry() from public, anon, authenticated;
create trigger nfc_cards_enforce_expiry before insert or update on public.nfc_cards
for each row execute function app_private.enforce_nfc_card_expiry();

create function public.admin_register_nfc_card(
  p_customer_id uuid, p_card_code text, p_expires_at timestamptz default null, p_reason text default null
) returns public.nfc_cards language plpgsql security definer set search_path = '' as $$
declare card public.nfc_cards;
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception using errcode='42501', message='Active admin access required';
  end if;
  if p_customer_id is null and (p_expires_at is null or p_expires_at <= clock_timestamp()) then
    raise exception 'Choose a future expiration date for an unassigned card';
  end if;
  card := public.admin_assign_nfc_card(p_customer_id,p_card_code,null,p_reason);
  if card.customer_id is null then
    update public.nfc_cards set expires_at=p_expires_at where id=card.id returning * into card;
  end if;
  return card;
end;
$$;
revoke all on function public.admin_register_nfc_card(uuid,text,timestamptz,text) from public, anon;
grant execute on function public.admin_register_nfc_card(uuid,text,timestamptz,text) to authenticated;

create function public.admin_delete_unassigned_nfc_card(p_card_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare card public.nfc_cards;
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception using errcode='42501', message='Active admin access required';
  end if;
  select * into card from public.nfc_cards where id=p_card_id for update;
  if not found then raise exception 'Card no longer exists'; end if;
  if card.customer_id is not null then raise exception 'Assigned cards cannot be deleted'; end if;
  insert into public.audit_logs(actor_user_id,action,target_type,target_id,details)
  values ((select auth.uid()),'NFC_CARD_DELETED','NFC_CARD',card.id,
    jsonb_build_object('card_code',card.card_code,'expires_at',card.expires_at,'reason',p_reason));
  delete from public.nfc_cards where id=card.id;
end;
$$;
revoke all on function public.admin_delete_unassigned_nfc_card(uuid,text) from public, anon;
grant execute on function public.admin_delete_unassigned_nfc_card(uuid,text) to authenticated;

create function app_private.delete_expired_unassigned_nfc_cards()
returns integer language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  with expired as (
    select id from public.nfc_cards where customer_id is null and expires_at <= clock_timestamp()
    order by expires_at limit 1000 for update skip locked
  ), deleted as (
    delete from public.nfc_cards c using expired e
    where c.id=e.id and c.customer_id is null returning c.*
  )
  insert into public.audit_logs(actor_user_id,action,target_type,target_id,details)
  select null,'NFC_CARD_EXPIRED','NFC_CARD',id,
    jsonb_build_object('card_code',card_code,'expires_at',expires_at) from deleted;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function app_private.delete_expired_unassigned_nfc_cards() from public, anon, authenticated;
create extension if not exists pg_cron;
select cron.schedule('delete-expired-unassigned-nfc-cards','* * * * *',
  'select app_private.delete_expired_unassigned_nfc_cards()');
notify pgrst, 'reload schema';
