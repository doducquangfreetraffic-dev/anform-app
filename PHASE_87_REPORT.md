# Phase 8.7 Complete — Cover Image with Color-Aware Design

Date: 2026-05-04
Commits: `884ccd9` → `edc7dac` (5 commits, all on `main`, pushed)
Smoke: `20 / 20 passing` (`scripts/test-phase-87.mjs` — includes a real Sonnet 4.6 vision call)
Vercel: `READY` on the ANFORM app project (`prj_B1G0V3WTgcZ10vQgJ7Tq0DUxlFpS`)

## What's New

| Layer        | Change |
| ------------ | ------ |
| DB           | `forms.cover_image_url`, `cover_palette` (jsonb), `cover_analysis` (jsonb), `cover_uploaded_at`, `cover_style` |
| Storage      | New `form-covers` bucket — public read, 5 MB cap, JPG/PNG/WebP. Storage RLS: public SELECT, owner-folder INSERT/UPDATE/DELETE (`(storage.foldername(name))[1] = auth.uid()::text`). |
| Wizard       | `Step4Branding` adds an optional cover section: drag-drop upload (`react-dropzone`) + 5 style choices (auto / minimal / bold / editorial / playful). Existing presets keep working — cover is purely additive. |
| Vision lib   | `src/lib/cover-analysis.ts` — Sonnet 4.6 vision call with image-URL source. Long deterministic system prompt (~2.4K tokens, eligible for prompt caching). Strict JSON output with enum coercion + hex validation. 1 h in-memory LRU. `paletteFromAnalysis()` derives an 8-field `FormPalette`. |
| API          | `POST /api/forms/analyze-cover { imageUrl } → { analysis, palette, cached }` for previews, and `POST /api/forms/generate` now auto-analyzes when `brief.branding.coverImageUrl` is set, threading palette + analysis into the prompt and persisting `cover_*` columns on the form row. |
| Generator    | Prompt builder injects a hard PALETTE block (forces AI to use exact hex), full ANALYSIS context, and HERO directives (overlay vs stack-below, `has_text_in_image` branch, mobile fallback to stacked layout). When no cover, falls back to `brief.branding` — backward-compatible. |
| Backward compat | Existing forms (no cover) work unchanged. Cover analysis failure is non-fatal — the generate route logs and falls back to the brief's theme so the form still ships. |

## How to Use

1. Wizard → **Step 4 Thương hiệu** → scroll to **Ảnh bìa form (tùy chọn)**
2. Drag-drop or click to upload (JPG/PNG/WebP, ≤ 5 MB, 16:9 recommended)
3. Pick a style (default `Auto` — AI matches the image's tone)
4. Continue through wizard, save the form
5. Open the form detail page → **Generate** → Opus 4.7 builds HTML using the palette extracted from the image
6. **Deploy** as usual

When no cover is uploaded, behavior is identical to before — the chosen branding preset (An Giáo / Forest / Honey / Minimal / Custom) drives the design.

## URLs

- Wizard: https://anform.anvui.edu.vn/forms/new
- Cover analysis API: https://anform.anvui.edu.vn/api/forms/analyze-cover
- Storage public CDN base: `https://<project>.supabase.co/storage/v1/object/public/form-covers/<uid>/<ts>.<ext>`

## Cost

- **Vision analysis** (Sonnet 4.6, ~2.4 K input tokens system + ~600 image tokens + ~500 output): ~**$0.005 per unique image**, regardless of how many times the form is regenerated against it (1 h in-memory cache).
- **HTML generation** (Opus 4.7, with palette+analysis context added to the prompt): adds ~1 K tokens per call → ~**+$0.005 vs no-cover** at typical effort. Total per-form cost with cover ≈ **+$0.01** over a no-cover generate.
- **Storage**: free tier (Supabase free plan covers ~1 GB; covers are tiny).
- **Prompt caching**: the Vision system prompt is sized to clear Sonnet 4.6's 2 K minimum and should cache after the first request. Verify in production with `usage.cache_read_input_tokens` once real traffic flows.

## Verification

- `node scripts/test-phase-87.mjs` — 20 assertions, all green. Verifies bucket config, schema columns, anon-RLS denial of writes, real Sonnet 4.6 vision call against an Unsplash sample (returns a JSON object with valid hex colors + enums).
- Sample analysis output from the smoke run (Unsplash photo, real call):
  - `dominant_colors`: `#1e2130, #c8c8c8, #4a9eff, #f0c040, #3a7d44`
  - `mood / style / subject / tone`: `cool / photo / object / corporate`
- Build is clean: `npm run build` succeeds with no errors or new warnings.

## Use Cases

- **HBCompro 2026 main register** — upload poster (cam-vàng) → form khớp tone cam-vàng tự động.
- **Webinar AI Agent** — upload futuristic image (xanh-tím) → form vibe tech.
- **Khảo sát học viên cũ** — upload group photo → warm/personal feel.
- **Lead-magnet ebook** — upload book cover → form matches the ebook's design.

## Limitations / Notes

- **In-memory cache only** — cache is per Vercel instance, not shared across cold starts. Repeat analyses across deploys/regions will pay the API cost again. Acceptable for MVP; can add Supabase-backed cache later if hot.
- **No image cropping** — user must crop client-side before upload. 16:9 is the recommended ratio.
- **No GIF / video / SVG** — only the three raster formats whitelisted on the bucket.
- **Apps Script API toggle** still required for end-to-end deploy success — see `DEPLOY_DEBUG_REPORT.md`. This phase doesn't change that.
- **`view_form` audit row will fire** when an admin opens a member's form (Phase 8.6 behavior, not affected here).
- **Cover URL persistence**: even if vision analysis fails, `cover_image_url` + `cover_uploaded_at` + `cover_style` are still written so the row stays consistent — `cover_palette` / `cover_analysis` are left null in that case and the prompt falls back to the brief's theme.

## Files Changed

- `supabase/migrations/004_form_covers.sql`
- `scripts/setup-storage.mjs` (new — idempotent bucket creator)
- `scripts/test-phase-87.mjs` (new — smoke test)
- `src/types/database.ts` (cover_* fields)
- `src/types/form-brief.ts` (`coverImageUrl`, `coverStyle` on `BrandingTheme`)
- `src/components/cover/CoverUpload.tsx` (new)
- `src/components/form-wizard/steps/Step4Branding.tsx`
- `src/lib/cover-analysis.ts` (new)
- `src/app/api/forms/analyze-cover/route.ts` (new)
- `src/app/api/forms/generate/route.ts`
- `src/lib/ai/prompts.ts`
- `package.json` (`react-dropzone`)
