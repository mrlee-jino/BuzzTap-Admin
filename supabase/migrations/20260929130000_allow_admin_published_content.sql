alter table public.content_items
  alter column business_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'content_items'
      and policyname = 'Admins can publish BuzzTap content'
  ) then
    create policy "Admins can publish BuzzTap content"
    on public.content_items
    for insert
    to authenticated
    with check (
      (select public.is_admin())
      and created_by = (select auth.uid())
      and status = 'PUBLISHED'
    );
  end if;
end
$$;
