drop policy if exists "Admins can read purchase requests"
  on public.purchase_requests;

create policy "Admins can read purchase requests"
on public.purchase_requests
for select
to authenticated
using ((select public.is_admin()));

notify pgrst, 'reload schema';