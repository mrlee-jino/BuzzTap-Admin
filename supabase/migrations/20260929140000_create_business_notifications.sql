create table if not exists public.business_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists business_notifications_business_created_idx
  on public.business_notifications (business_id, created_at desc);

alter table public.business_notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_notifications'
      and policyname = 'Admins can send business notifications'
  ) then
    create policy "Admins can send business notifications"
    on public.business_notifications
    for insert
    to authenticated
    with check (
      (select public.is_admin())
      and created_by = (select auth.uid())
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_notifications'
      and policyname = 'Business members can read their notifications'
  ) then
    create policy "Business members can read their notifications"
    on public.business_notifications
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.business_members as member
        where member.business_id = business_notifications.business_id
          and member.user_id = (select auth.uid())
      )
    );
  end if;
end
$$;
