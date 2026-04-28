-- ANFORM Initial Schema
-- Phase 2: Tables, RLS, helper functions

-- 1. profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. forms ─────────────────────────────────────────────────
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text unique not null,
  brief jsonb not null default '{}'::jsonb,
  current_html text,
  status text not null default 'draft',  -- draft|deployed|archived
  deployment_status text default 'pending', -- pending|deployed|apps_script_failed|verify_failed
  apps_script_id text,
  apps_script_url text,
  sheet_tab_name text,
  form_url text,
  submission_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists forms_owner_idx on public.forms(owner_id);
create index if not exists forms_slug_idx on public.forms(slug);
create index if not exists forms_status_idx on public.forms(status);

-- 3. form_versions (history) ───────────────────────────────
create table if not exists public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  version_number int not null,
  brief jsonb not null,
  html text,
  created_at timestamptz default now()
);

create index if not exists form_versions_form_idx on public.form_versions(form_id);

-- 4. submissions ───────────────────────────────────────────
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  data jsonb not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists submissions_form_idx on public.submissions(form_id);
create index if not exists submissions_created_idx on public.submissions(created_at desc);

-- 5. deploy_logs ───────────────────────────────────────────
create table if not exists public.deploy_logs (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.forms(id) on delete cascade,
  step text not null,                -- create_sheet|create_script|push_html|verify
  status text not null,              -- success|failed|retrying
  message text,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists deploy_logs_form_idx on public.deploy_logs(form_id);
create index if not exists deploy_logs_created_idx on public.deploy_logs(created_at desc);

-- 6. updated_at trigger ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists forms_set_updated_at on public.forms;
create trigger forms_set_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

-- 7. submission count helper ───────────────────────────────
create or replace function public.increment_submission_count(form_id_in uuid)
returns void language plpgsql security definer as $$
begin
  update public.forms set submission_count = submission_count + 1 where id = form_id_in;
end;
$$;

-- 8. New user → profile trigger ────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9. RLS policies ──────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.forms enable row level security;
alter table public.form_versions enable row level security;
alter table public.submissions enable row level security;
alter table public.deploy_logs enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "forms_owner_all" on public.forms;
create policy "forms_owner_all" on public.forms
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "form_versions_owner" on public.form_versions;
create policy "form_versions_owner" on public.form_versions
  for all using (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

drop policy if exists "submissions_owner_read" on public.submissions;
create policy "submissions_owner_read" on public.submissions
  for select using (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );

-- Note: submissions INSERT happens server-side via service_role (Apps Script webhook)
-- so no RLS policy for INSERT — service_role bypasses RLS

drop policy if exists "deploy_logs_owner" on public.deploy_logs;
create policy "deploy_logs_owner" on public.deploy_logs
  for select using (
    exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
  );
