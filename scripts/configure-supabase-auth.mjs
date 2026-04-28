// Try to enable Google OAuth in Supabase via Management API.
// Requires SUPABASE_ACCESS_TOKEN (Personal Access Token, format sbp_...).
// If not provided, prints manual instructions.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

const SBP = process.env.SUPABASE_ACCESS_TOKEN;
const project = process.env.SUPABASE_PROJECT_ID;
const clientId = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;

if (!SBP) {
  console.log('⚠ SUPABASE_ACCESS_TOKEN not set — auth provider must be configured manually.');
  console.log('');
  console.log('Manual steps:');
  console.log('  1. https://supabase.com/dashboard/project/' + project + '/auth/providers');
  console.log('  2. Enable Google provider');
  console.log('  3. Client ID:', clientId);
  console.log('  4. Client secret: <from .env.local GOOGLE_CLIENT_SECRET>');
  console.log('  5. Authorized Client IDs: same Client ID');
  console.log('  6. Skip nonce check: leave default');
  console.log('  7. Save');
  console.log('');
  console.log('Also set Site URL: https://anform.anvui.edu.vn');
  console.log('Redirect URLs to add:');
  console.log('  - http://localhost:3000/api/auth/callback');
  console.log('  - https://anform.anvui.edu.vn/api/auth/callback');
  process.exit(0);
}

const url = `https://api.supabase.com/v1/projects/${project}/config/auth`;
const body = {
  external_google_enabled: true,
  external_google_client_id: clientId,
  external_google_secret: secret,
  site_url: 'https://anform.anvui.edu.vn',
  uri_allow_list: [
    'http://localhost:3000/api/auth/callback',
    'https://anform.anvui.edu.vn/api/auth/callback',
  ].join(','),
};

const res = await fetch(url, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

if (res.ok) {
  console.log('✓ Google provider configured via Management API');
} else {
  const t = await res.text();
  console.error('❌ Management API failed:', res.status, t.slice(0, 400));
  process.exit(1);
}
