alter table public.content_items
  add column if not exists rejection_reason text;

create policy "Admins can review submitted content"
on public.content_items
for select
to authenticated
using ((select public.is_admin()));

create policy "Admins can moderate submitted content"
on public.content_items
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));