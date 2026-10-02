create sequence if not exists public.nfc_card_code_sequence as bigint;

do $$
declare
  next_serial bigint;
begin
  select coalesce(max(substring(card_code from 7 for 9)::bigint), 0) + 1
  into next_serial
  from public.nfc_cards
  where card_code ~ '^400001[0-9]{10}$';

  perform setval('public.nfc_card_code_sequence'::regclass, next_serial, false);
end
$$;

create or replace function public.admin_generate_nfc_card_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  serial_number bigint;
  card_code_base text;
  generated_card_code text;
  digit_sum integer;
  digit integer;
  digit_position integer;
  multiplier integer;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  loop
    serial_number := nextval('public.nfc_card_code_sequence'::regclass);

    if serial_number > 999999999 then
      raise exception 'BuzzTap NFC card code sequence is exhausted';
    end if;

    card_code_base := '400001' || lpad(serial_number::text, 9, '0');
    digit_sum := 0;

    for digit_position in reverse 15..1 loop
      digit := substring(card_code_base from digit_position for 1)::integer;
      multiplier := case when (15 - digit_position) % 2 = 0 then 2 else 1 end;
      digit := digit * multiplier;

      if digit > 9 then
        digit := digit - 9;
      end if;

      digit_sum := digit_sum + digit;
    end loop;

    generated_card_code := card_code_base || ((10 - digit_sum % 10) % 10)::text;

    if not exists (
      select 1
      from public.nfc_cards
      where card_code = generated_card_code
    ) then
      return generated_card_code;
    end if;
  end loop;
end;
$$;

revoke all on function public.admin_generate_nfc_card_code() from public;
grant execute on function public.admin_generate_nfc_card_code() to authenticated;

notify pgrst, 'reload schema';