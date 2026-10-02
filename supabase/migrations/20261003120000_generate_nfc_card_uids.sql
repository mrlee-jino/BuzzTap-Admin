create table if not exists public.nfc_card_uid_counters (
  issue_date date primary key,
  last_number integer not null check (last_number between 1 and 9999)
);

alter table public.nfc_card_uid_counters enable row level security;
revoke all on table public.nfc_card_uid_counters from public, anon, authenticated;

create or replace function public.admin_generate_nfc_card_uid()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid_date date;
  uid_number integer;
  generated_card_uid text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  uid_date := (statement_timestamp() at time zone 'Asia/Manila')::date;

  loop
    insert into public.nfc_card_uid_counters as counters (issue_date, last_number)
    values (uid_date, 1)
    on conflict (issue_date) do update
      set last_number = counters.last_number + 1
      where counters.last_number < 9999
    returning last_number into uid_number;

    if uid_number is null then
      raise exception 'Daily NFC card UID sequence is exhausted';
    end if;

    generated_card_uid := to_char(uid_date, 'DDMM-YYYY-') || lpad(uid_number::text, 4, '0');

    exit when not exists (
      select 1
      from public.nfc_cards
      where card_uid = generated_card_uid
    );
  end loop;

  return generated_card_uid;
end;
$$;

revoke all on function public.admin_generate_nfc_card_uid() from public;
grant execute on function public.admin_generate_nfc_card_uid() to authenticated;

notify pgrst, 'reload schema';