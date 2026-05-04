-- ANFORM Phase 8.7: Cover Image with Color-Aware Design
-- Adds cover columns to forms, plus storage RLS for the form-covers bucket.
-- Idempotent — safe to re-run.

-- 1. forms columns ────────────────────────────────────────
alter table public.forms add column if not exists cover_image_url text;
alter table public.forms add column if not exists cover_palette jsonb;
alter table public.forms add column if not exists cover_analysis jsonb;
alter table public.forms add column if not exists cover_uploaded_at timestamptz;
alter table public.forms add column if not exists cover_style text;

create index if not exists forms_has_cover_idx on public.forms(id)
  where cover_image_url is not null;

comment on column public.forms.cover_palette is
  'JSON: {primary, secondary, accent, bg_main, bg_tint, text_main, text_muted, contrast_mode}';
comment on column public.forms.cover_analysis is
  'JSON: {dominant_colors[], mood, style, subject, contrast_zones, suggested_tone, ...}';
comment on column public.forms.cover_style is
  'Style hint for AI generator: auto | minimal | bold | editorial | playful';

-- 2. Storage RLS for form-covers bucket ────────────────────
-- Bucket itself is created via service-role API in scripts/setup-storage.mjs.
-- Public read so deployed forms can <img src> the URL.
-- Authenticated users may write/delete only inside their own UID folder.

drop policy if exists "form_covers_public_read" on storage.objects;
create policy "form_covers_public_read" on storage.objects
  for select using (bucket_id = 'form-covers');

drop policy if exists "form_covers_owner_insert" on storage.objects;
create policy "form_covers_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'form-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "form_covers_owner_update" on storage.objects;
create policy "form_covers_owner_update" on storage.objects
  for update using (
    bucket_id = 'form-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "form_covers_owner_delete" on storage.objects;
create policy "form_covers_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'form-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
