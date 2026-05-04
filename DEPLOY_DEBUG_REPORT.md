# Deploy Fail Debug Report

Date: 2026-05-04
Form under test: `dang-ki-hoc-ngay-5-5-2026` (form_id `6a9bd042-593b-41a5-99ed-8427595df515`)
Attempts logged today: 3 (all same failure mode)

## Tokens Status

| Token / API           | Status | Notes                                                         |
| --------------------- | ------ | ------------------------------------------------------------- |
| GitHub                | OK     | login `doducquangfreetraffic-dev`, scope `repo`, repo `anform-form-deployments` accessible |
| Vercel                | OK     | project `prj_IpUNkaEFRPda43ycMCqqujABuKou` reachable, last 5 deploys all READY |
| Google refresh token  | OK     | Refreshes successfully                                        |
| Master Sheet (Sheets API) | OK | `GOOGLE_MASTER_SHEET_ID` readable (200)                        |
| **Apps Script API**   | **FAIL** | `POST /v1/projects` → **403 PERMISSION_DENIED** ("User has not enabled the Apps Script API") |
| Anthropic             | OK     | Test message returned 200                                     |
| Supabase              | OK     | `team_members` query returned 200                             |

## Root Cause

The **Google Apps Script API is disabled in the user settings** for the Google account that owns `GOOGLE_REFRESH_TOKEN`.

- `deploy_logs` shows `apps_script_deploy` step failing on every attempt with that exact message.
- Direct probe of `POST https://script.googleapis.com/v1/projects` with a freshly minted access token returned the same 403.
- The other 5 steps (`ensure_vercel_config`, `add_sheet_tab`, `push_html`, `verify`, sheet writes) all succeed — so the form HTML actually goes live on `form.anvui.edu.vn/<slug>/`. But because `orchestrator.ts` returns `ok = live && appsScriptOk`, the API responds 500 and the UI shows the generic "Deploy fail" toast even though most of the pipeline ran.
- This is a per-user-per-API toggle in Google account settings; no token regeneration, no env var change, no Vercel redeploy is needed.

## Fix Applied

No code or infrastructure change. Required manual action (single click):

1. Open https://script.google.com/home/usersettings while signed in to the Google account that authorized `GOOGLE_REFRESH_TOKEN` (the account that owns the Master Sheet — likely `doducquang.freetraffic@gmail.com`).
2. Toggle **Google Apps Script API** → **ON**.
3. Wait ~60 s for propagation.
4. In ANFORM, click **Deploy** again on the same form. No need to recreate the form.

Note: `~/.anform-tokens.env` has `MASTER_SHEET_ID=` empty — not actually used (the app reads `GOOGLE_MASTER_SHEET_ID` from `.env.local`), so harmless, but safe to delete the empty line.

## Verification

Pending the one toggle above. After enabling, run:

```bash
cd ~/Desktop/anform-app
set -a && source ~/.anform-tokens.env && source .env.local && set +a
AT=$(curl -s -X POST https://oauth2.googleapis.com/token \
  -d "grant_type=refresh_token" -d "refresh_token=$GOOGLE_REFRESH_TOKEN" \
  -d "client_id=$GOOGLE_CLIENT_ID" -d "client_secret=$GOOGLE_CLIENT_SECRET" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -X POST -H "Authorization: Bearer $AT" -H "Content-Type: application/json" \
  https://script.googleapis.com/v1/projects -d '{"title":"probe-DELETEME"}' \
  | python3 -m json.tool
```

Expect a JSON body with `scriptId` (not the 403). If you see one, immediately delete the probe project from `script.google.com`. Then click Deploy in ANFORM — it should finish in ~60–90 s and the toast should switch to success.

## Recommendations

1. **Surface the real error in the UI.** `route.ts` returns the orchestrator result with status 500, but the toast collapses every error into "Deploy fail". Reading `errors[0]` from the JSON body would have shown this in seconds. Worth threading the first `errors` entry through to the toast.
2. **Pre-flight check on Settings page.** A "Check integrations" button that runs the same `POST /v1/projects` probe (then deletes the project) would catch this for next time, alongside Sheets and GitHub probes.
3. **Don't return `ok: false` when the form is actually live.** Today's three "failed" attempts each pushed a working form to `form.anvui.edu.vn/dang-ki-hoc-ngay-5-5-2026/` — but submissions won't be captured because there's no Apps Script. Better to surface a partial-success state ("Form live, but submissions disabled — fix Apps Script") rather than a flat fail.
4. **Apps Script API is a per-account setting**, not project-level — once toggled on for that Google account it stays on. If the refresh token is ever regenerated for a different account, this will recur.
