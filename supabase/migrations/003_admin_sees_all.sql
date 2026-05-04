-- ANFORM Phase 8.6: Admin sees all forms
-- Replaces owner-only RLS with admin-or-owner across forms/submissions/deploy_logs.
-- Adds admin_audit_log table.
-- Idempotent: safe to re-run.

-- 1. forms ─────────────────────────────────────────────────
drop policy if exists "forms_owner_all" on public.forms;
drop policy if exists "forms_admin_or_owner_select" on public.forms;
drop policy if exists "forms_admin_or_owner_update" on public.forms;
drop policy if exists "forms_admin_or_owner_delete" on public.forms;
drop policy if exists "forms_owner_insert" on public.forms;

create policy "forms_admin_or_owner_select" on public.forms
  for select using (
    public.is_admin(auth.email()) or owner_id = auth.uid()
  );

create policy "forms_owner_insert" on public.forms
  for insert with check (owner_id = auth.uid());

create policy "forms_admin_or_owner_update" on public.forms
  for update using (
    public.is_admin(auth.email()) or owner_id = auth.uid()
  );

create policy "forms_admin_or_owner_delete" on public.forms
  for delete using (
    public.is_admin(auth.email()) or owner_id = auth.uid()
  );

-- 2. submissions ───────────────────────────────────────────
drop policy if exists "submissions_owner_read" on public.submissions;
drop policy if exists "submissions_admin_or_owner_select" on public.submissions;

create policy "submissions_admin_or_owner_select" on public.submissions
  for select using (
    public.is_admin(auth.email())
    or exists (
      select 1 from public.forms f
      where f.id = submissions.form_id and f.owner_id = auth.uid()
    )
  );

-- 3. deploy_logs ───────────────────────────────────────────
drop policy if exists "deploy_logs_owner" on public.deploy_logs;
drop policy if exists "deploy_logs_admin_or_owner_select" on public.deploy_logs;

create policy "deploy_logs_admin_or_owner_select" on public.deploy_logs
  for select using (
    public.is_admin(auth.email())
    or exists (
      select 1 from public.forms f
      where f.id = deploy_logs.form_id and f.owner_id = auth.uid()
    )
  );

-- 4. form_versions — admin or owner ───────────────────────
drop policy if exists "form_versions_owner" on public.form_versions;
drop policy if exists "form_versions_admin_or_owner" on public.form_versions;

create policy "form_versions_admin_or_owner" on public.form_versions
  for all using (
    public.is_admin(auth.email())
    or exists (
      select 1 from public.forms f
      where f.id = form_versions.form_id and f.owner_id = auth.uid()
    )
  );

-- 5. profiles — admin can read all (for owner column in admin views) ──
drop policy if exists "profiles_admin_select_all" on public.profiles;

create policy "profiles_admin_select_all" on public.profiles
  for select using (
    public.is_admin(auth.email()) or auth.uid() = id
  );

-- Note: original "profiles_self_read" stays — admins covered by the
-- `is_admin` branch in the new policy. Two SELECT policies = OR-combined.

-- 6. admin_audit_log ───────────────────────────────────────
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null check (action in (
    'view_form', 'edit_form', 'delete_form',
    'view_submissions', 'export_csv', 'deploy_form'
  )),
  target_form_id uuid references public.forms(id) on delete set null,
  target_form_slug text,
  target_owner_email text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_admin_idx on public.admin_audit_log(admin_email);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_log_form_idx on public.admin_audit_log(target_form_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "audit_admin_select" on public.admin_audit_log;
create policy "audit_admin_select" on public.admin_audit_log
  for select using (public.is_admin(auth.email()));

-- Insert via service_role (server-side audit lib bypasses RLS). No insert policy needed.
