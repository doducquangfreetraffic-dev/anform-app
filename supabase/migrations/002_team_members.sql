-- ANFORM Phase 8.5: Team Members
-- DB-backed whitelist with admin/member roles. Replaces hardcoded WHITELIST_EMAIL_*.

-- 1. team_members table ────────────────────────────────────
create table if not exists public.team_members (
  email text primary key,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  last_login_at timestamptz,
  notes text
);

create index if not exists team_members_status_idx on public.team_members(status);
create index if not exists team_members_role_idx on public.team_members(role);

-- 2. is_admin() helper ─────────────────────────────────────
create or replace function public.is_admin(check_email text)
returns boolean language sql security definer stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.team_members
    where email = lower(trim(check_email))
      and role = 'admin'
      and status = 'active'
  );
$$;

-- 3. RLS ──────────────────────────────────────────────────
alter table public.team_members enable row level security;

drop policy if exists "team_members_admin_select" on public.team_members;
create policy "team_members_admin_select" on public.team_members
  for select using (public.is_admin(auth.email()));

drop policy if exists "team_members_admin_insert" on public.team_members;
create policy "team_members_admin_insert" on public.team_members
  for insert with check (public.is_admin(auth.email()));

drop policy if exists "team_members_admin_update" on public.team_members;
create policy "team_members_admin_update" on public.team_members
  for update using (public.is_admin(auth.email()));

-- Admin can delete others, but not self.
drop policy if exists "team_members_admin_delete_other" on public.team_members;
create policy "team_members_admin_delete_other" on public.team_members
  for delete using (
    public.is_admin(auth.email())
    and lower(trim(email)) <> lower(trim(auth.email()))
  );
