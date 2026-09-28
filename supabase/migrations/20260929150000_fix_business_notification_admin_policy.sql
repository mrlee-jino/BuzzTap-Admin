drop policy if exists "Admins can send business notifications"
  on public.business_notifications;

create policy "Admins can send business notifications"
on public.business_notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = 'ADMIN'
      and profile.status = 'ACTIVE'
  )
  and created_by = (select auth.uid())
);
