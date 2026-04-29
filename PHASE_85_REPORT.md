# Phase 8.5 Complete — Team Management UI

Date: 2026-04-29
Final commit: `0e81379` (deployed READY on Vercel)

## What's New

- New Supabase table `team_members` (email PK, role admin/member, status active/suspended, audit fields)
- Helper SQL function `is_admin(email)` + RLS policies (admin-only read/insert/update; cannot delete self)
- 2 initial admins seeded from `WHITELIST_EMAIL_1`, `WHITELIST_EMAIL_2`
- DB-backed `whitelist.ts` with 60s in-memory cache + env fallback (Edge-safe)
- `getUserRole()` + `recordLogin()` helpers
- Admin-only page `/settings/team` with:
  - Add member form (react-hook-form + zod)
  - Members table with optimistic role/status toggles
  - Confirm modal for delete
  - Self-protection (cannot demote/suspend/delete own row)
- API routes:
  - `GET/POST /api/team/members`
  - `PATCH/DELETE /api/team/members/[email]`
  - All require admin role; all invalidate whitelist cache after mutation
- Sidebar shows "Thành viên" only when `role === 'admin'`
- `/settings` page shows current user's role badge + admin link

## URLs

- Team management: https://anform.anvui.edu.vn/settings/team
- Settings: https://anform.anvui.edu.vn/settings

## How to Use

1. Log in to https://anform.anvui.edu.vn with an admin email
2. Sidebar → "Thành viên" (or Cài đặt → Quản trị → Thành viên)
3. Enter email + pick "Thành viên" or "Quản trị"
4. Click "Thêm" — new email can sign in within 60 seconds (no redeploy)
5. Use shield/pause/trash icons to promote/suspend/remove members

## Roles

- **Admin** — full access + manage team
- **Member** — create forms + view own submissions (no team management)

## Verification

- DB migration applied via pooler-aws-1-ap-southeast-1
- Smoke test (`scripts/test-team.mjs`) — 11/11 pass
- Production build — clean (Next.js 16.2.4, TypeScript)
- ANFORM 307 (auth redirect ✓)
- HBCompro form 200 (untouched ✓)
- ANVUI Talks 200 (untouched ✓)

## Files Changed (commits)

- `decd3a3` Phase 8.5.1 — migration + seed script
- `78ff280` Phase 8.5.2 — DB-backed whitelist + roles
- `16654ed` Phase 8.5.3 — team UI + APIs
- `b941b79` Phase 8.5.4 — settings page link
- `0e81379` Phase 8.5.5 — smoke tests

## Limitations (Phase 9 candidates)

- No invite email — admin must share ANFORM URL out-of-band
- No audit log UI (added_by/added_at recorded but not surfaced)
- No bulk import (CSV)
- No 2FA
- `WHITELIST_EMAIL_*` env vars still respected as fallback if DB unreachable; safe to remove from Vercel after a few days of stable operation
