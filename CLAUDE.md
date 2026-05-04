@AGENTS.md

# CLAUDE.md — ANFORM Build Memory

> Read at start of every phase. Durable context across an 8-12h build.

## EXISTING CODE TO PROTECT (NEVER TOUCH)
- Folder: `~/Desktop/anvuitalk/` (not present on this Mac, but live site is)
- GitHub repo: `doducquangfreetraffic-dev/anvuitalk`
- Sheet: `126K2WwQfxEWqZEBjm6Gl2ksULs346Vc_QIzPCt8X5WQ`
- Apps Script: `AKfycbzOc_VjkrF_37O0gLOTbcP1LNjIjWTZvMNqz6DCGGsafoDOlPvq6BF8DlOm2kJviZLa`
- Domain: `anvuitalks.anvui.edu.vn` (LIVE — 192 students)
- Vercel project: `anvuitalk`

## ANFORM ARCHITECTURE
- This app folder: `~/Desktop/anform-app/`
- This app domain: `anform.anvui.edu.vn` (deployed in Phase 8)
- Forms domain: `form.anvui.edu.vn/<slug>/` (auto-deployed per form)
- Forms repo: `anform-form-deployments` (one push = one form live)
- Master Sheet: `1W4w-ndV1nTGrVqGc8iQgp2LRSpl39chiSPxpnAHg0Fg`
- Supabase project: `knzctiuwakvzuoznidod`
- Vercel deploy project: `prj_IpUNkaEFRPda43ycMCqqujABuKou` (anform-deploys)

## SUBMISSION PIPELINE (since 2026-05-04)
- Forms POST `Content-Type: text/plain` to `https://anform.anvui.edu.vn/api/forms/submit/<slug>`.
- Endpoint appends to the form's master-sheet tab via Sheets API and inserts into `submissions`.
- Apps Script web apps were the original middleman but were dropped: scripts created
  via the API with `executeAs: USER_DEPLOYING` need an interactive scope grant
  (SpreadsheetApp + UrlFetchApp) before they can run for anonymous users —
  that grant cannot be performed from a refresh-token API call. Symptom is
  `<title>Truy cập bị từ chối</title>` HTML on POST. Don't reintroduce the
  Apps Script path without solving that auth bootstrap.
- Form HTML still uses placeholder `__APPS_SCRIPT_URL__` for backwards-compat;
  the orchestrator replaces it (and the new `__SUBMIT_URL__`) with the ANFORM
  endpoint.

## CONVENTIONS
- TypeScript strict, avoid `any`
- Vietnamese UI text (except "ANFORM" brand)
- Brand colors: forest `#1F4D2C`, honey `#A47E22`, paper `#F5EFE0`
- Font: Be Vietnam Pro
- Slug: lowercase, no diacritics, hyphenated, max 50 chars
- Sheet tab name: `<slug>-<6-digit-timestamp>`

## API RETRY POLICY
3 attempts, backoff 1s/3s/9s. Wrap with `withRetry()` helper.

## COMMIT FORMAT
"Phase N: <what was built>"

## NEVER STOP TO ASK
File ops, npm, git, tests, decisions about defaults — just do them.

## STOP ONLY FOR
- Pre-flight check fails (anvuitalk modified)
- Tokens validation fails
- Phase 8 success notification
- Unrecoverable error → write `BUILD_FAILED.md`

## PHASE STATUS
- [x] Phase 0: Validation passed
- [x] Phase 1: Project setup
- [x] Phase 2: Database schema (Supavisor pooler aws-1-ap-southeast-1)
- [x] Phase 3: Auth flow (Google provider config — manual step in BUILD_NEEDS_ATTENTION.md)
- [x] Phase 4: Form wizard UI (5 steps + API routes)
- [x] Phase 5: AI HTML generation (Opus 4.7, anti-zoom prompts, version history)
- [x] Phase 6: Auto-deploy engine (Sheets + Apps Script + GitHub + verify)
- [x] Phase 7: Submissions dashboard (table + realtime + CSV export)
- [x] Phase 8: Production deploy (anform.anvui.edu.vn live, prj_B1G0V3WTgcZ10vQgJ7Tq0DUxlFpS)
