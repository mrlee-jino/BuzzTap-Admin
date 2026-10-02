create or replace function public.admin_generate_nfc_card_uid()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid_date date;
  uid_prefix text;
  uid_number integer;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  uid_date := (statement_timestamp() at time zone 'Asia/Manila')::date;
  uid_prefix := to_char(uid_date, 'DDMM-YYYY-');

  select candidate.number
  into uid_number
  from pg_catalog.generate_series(1, 9999) as candidate(number)
  where not exists (
    select 1
    from public.nfc_cards
    where card_uid = uid_prefix || lpad(candidate.number::text, 4, '0')
  )
  order by candidate.number
  limit 1;

  if uid_number is null then
    raise exception 'Daily NFC card UID sequence is exhausted';
  end if;

  return uid_prefix || lpad(uid_number::text, 4, '0');
end;
$$;

revoke all on function public.admin_generate_nfc_card_uid() from public;
grant execute on function public.admin_generate_nfc_card_uid() to authenticated;

notify pgrst, 'reload schema';