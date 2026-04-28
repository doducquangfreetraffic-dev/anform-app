# BUILD_NEEDS_ATTENTION

These steps require manual action because the build does not have credentials for the corresponding Management/Admin APIs.

## 1. Enable Google OAuth provider in Supabase

**Why automated path failed:** Need a Supabase Personal Access Token (`sbp_…`) to use the Management API. Only the project's anon + service_role keys were provided.

**Manual steps (~5 min):**
1. Open https://supabase.com/dashboard/project/knzctiuwakvzuoznidod/auth/providers
2. Find **Google** in the list → toggle **Enabled**
3. Fill in:
   - **Client ID** (for OAuth): `794577666498-67edclimkabg2q7fsolvac3mkbshprb4.apps.googleusercontent.com`
   - **Client Secret**: copy `GOOGLE_CLIENT_SECRET` from `~/.anform-tokens.env`
   - **Authorized Client IDs**: same as Client ID above
   - Leave "Skip nonce check" unchecked
4. Click **Save**
5. In **Authentication → URL Configuration**:
   - **Site URL**: `https://anform.anvui.edu.vn`
   - **Redirect URLs** → Add both:
     - `http://localhost:3000/api/auth/callback`
     - `https://anform.anvui.edu.vn/api/auth/callback`
6. Save

## 2. Add ANFORM redirect to Google OAuth client

**Why:** The OAuth client used to generate `GOOGLE_REFRESH_TOKEN` is "Desktop app" type. For Supabase web sign-in, Supabase will use its own OAuth callback at `https://knzctiuwakvzuoznidod.supabase.co/auth/v1/callback`. This requires a **Web** OAuth client in Google Cloud.

**Manual steps (~5 min):**
1. Open https://console.cloud.google.com/apis/credentials (project: ANFORM)
2. **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `anform-web`
5. **Authorized redirect URIs** → Add:
   - `https://knzctiuwakvzuoznidod.supabase.co/auth/v1/callback`
6. Create → copy the new **Client ID** and **Client Secret**
7. Use **these** values in step 1 above (Supabase Auth → Google provider) — **not** the Desktop app client.
8. (Keep the Desktop app credentials for `GOOGLE_REFRESH_TOKEN` — that's used for Sheets/Drive/Apps Script API calls, separate from web auth.)

## After completing both steps

Test sign-in:
```bash
cd ~/Desktop/anform-app
npm run dev
# Open http://localhost:3000 → "Đăng nhập với Google"
# Sign in with: doducquang.freetraffic@gmail.com OR angiaododucquang@lophocanvui.com
# Expected: redirect to /dashboard
# If your email is not whitelisted: redirect to /access-denied
```
