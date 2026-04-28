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
- [ ] Phase 5: AI HTML generation
- [ ] Phase 6: Auto-deploy engine
- [ ] Phase 7: Submissions dashboard
- [ ] Phase 8: Production deploy
