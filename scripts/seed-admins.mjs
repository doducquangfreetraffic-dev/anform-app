// Seed initial admins into team_members from WHITELIST_EMAIL_* env vars.
// Idempotent: re-runnable without dupes.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const initialAdmins = [];
for (let i = 1; i <= 10; i++) {
  const e = process.env[`WHITELIST_EMAIL_${i}`];
  if (e) initialAdmins.push(e.toLowerCase().trim());
}

if (initialAdmins.length === 0) {
  console.error('❌ No WHITELIST_EMAIL_* env vars found');
  process.exit(1);
}

console.log(`Seeding ${initialAdmins.length} admin(s)...`);

for (const email of initialAdmins) {
  const { error } = await supabase.from('team_members').upsert(
    {
      email,
      role: 'admin',
      status: 'active',
      notes: 'Seeded from initial whitelist (Phase 8.5)',
    },
    { onConflict: 'email', ignoreDuplicates: false },
  );
  if (error) {
    console.error(`✗ ${email}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${email}`);
}

const { data, error } = await supabase
  .from('team_members')
  .select('email, role, status')
  .order('added_at', { ascending: true });

if (error) {
  console.error(`❌ Verify failed: ${error.message}`);
  process.exit(1);
}

console.log(`\n📋 team_members (${data.length} rows):`);
data.forEach((r) => console.log(`   ${r.role.padEnd(6)} ${r.status.padEnd(9)} ${r.email}`));
