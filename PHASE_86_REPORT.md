# Phase 8.6 Complete — Admin Sees All Forms

Date: 2026-05-04
Commits: `b1b28f2` → `2a88a3b` (6 commits, all on `main`, pushed)
Smoke test: `27 passed, 0 failed` (`scripts/test-phase-86.mjs`)

## What's New

| Layer       | Change                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| RLS         | Old `forms_owner_all` (and the equivalents on submissions / deploy_logs / form_versions) replaced with admin-or-owner SELECT/UPDATE/DELETE. New `profiles_admin_select_all` so admin views can show owner email/name. |
| Schema      | New `admin_audit_log` table — admin-only SELECT, service-role INSERT.                                                                |
| Audit lib   | `src/lib/audit.ts` — fire-and-forget `logAdminAction()` using service-role client. Never blocks the request.                         |
| Forms API   | `GET /api/forms?filter=all\|mine` (admin gets `all` by default; member always own). Returns owner profile join + role + filter.       |
| Form API    | `GET/PATCH/DELETE /api/forms/[id]` and `POST /api/forms/deploy` audit-log when an admin acts on someone else's form.                  |
| Forms list  | Server-rendered `?filter=all\|mine` tabs (admin only). Owner avatar column when admin viewing all. Honey accent on cards not owned. |
| Form detail | Honey banner "Bạn đang xem form của X — mọi thao tác sẽ được ghi vào audit log" when admin viewing others' form.                  |
| Dashboard   | Admin sees 4 cards (team total / deployed / submissions / **my forms**), recent forms shows owner avatar + accent. Member unchanged. |
| Audit page  | New `/settings/audit` lists 100 latest entries with action badge + clickable form slug (greys out if form deleted).                  |
| Sidebar     | "Audit log" admin nav link added; Settings page also has a card linking there.                                                       |

## How to Use

1. Admin (An Giáo / Quang) login to https://anform.anvui.edu.vn
2. **Sidebar → Forms** opens at `?filter=all` — sees every form in the team. Toggle "Của tôi" tab to scope to own.
3. Click any form → can view, edit, deploy, delete. If it's not the admin's own form:
   - Banner appears at top: "Bạn đang xem form của X..."
   - Card on the list view has a honey left-border + "của người khác" tag
   - The action is recorded in `admin_audit_log` (visible at /settings/audit)
4. **Sidebar → Audit log** — review who did what when, links back to forms.

## URLs

- All forms (admin default): https://anform.anvui.edu.vn/forms
- My forms only: https://anform.anvui.edu.vn/forms?filter=mine
- Audit log: https://anform.anvui.edu.vn/settings/audit

## Use Cases Covered

- Admin oversight: spot bad forms before they go public.
- Backup deploy: member nghỉ phép → admin deploys their form (logged).
- Audit "who did what when" with link back to the form.

## What's Not in Scope (push to Phase 9)

- Slack/email notifications on member-creates-form events.
- Audit log search/filter/pagination beyond the latest 100 entries.
- "Transfer ownership" action (currently no way to reassign `owner_id`).
- CSV export of the audit log itself.

## Known Limits / Gotchas

- Audit insert is fire-and-forget — if Supabase is briefly unreachable the action still proceeds and the audit row is silently dropped (logged to server console only).
- `view_form` is logged on every page load by an admin viewing someone else's form. If the same admin opens the same form 5 times in a row, that's 5 audit rows. Acceptable for now (gives a true activity trail), but may want dedup window in Phase 9.
- Form deletion sets `target_form_id` to `NULL` (FK `on delete set null`), but `target_form_slug` is preserved as text — audit page shows it greyed-out + struck-through so the history isn't lost.

## Deploy Status

All 6 commits pushed to `main` at `2a88a3b`. Vercel auto-deploy triggered for the ANFORM app (project `prj_B1G0V3WTgcZ10vQgJ7Tq0DUxlFpS`). Verify at https://anform.anvui.edu.vn after ~60–90 s.

## Smoke Test Output

Run `node scripts/test-phase-86.mjs` for the full check (27 assertions: `is_admin()` per member, all 9 new policies present, all 4 old policies dropped, audit table shape + RLS enabled, forms still queryable). Test passed at the time of the push.
