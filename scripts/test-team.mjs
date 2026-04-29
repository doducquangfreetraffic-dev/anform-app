// Smoke tests for team_members table + isWhitelisted-style behavior.
// Uses service role (bypasses RLS) to validate schema + helper function.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

let pass = 0;
let fail = 0;
function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}${detail ? ' — ' + detail : ''}`);
    pass++;
  } else {
    console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

console.log('Test 1: list current members');
{
  const { data, error } = await supabase
    .from('team_members')
    .select('email, role, status');
  check('select succeeded', !error, error?.message);
  check('has at least 2 admins seeded', (data ?? []).filter(m => m.role === 'admin' && m.status === 'active').length >= 2);
}

const testEmail = `test-${Date.now()}@example.com`;
console.log(`\nTest 2: insert ${testEmail}`);
{
  const { error } = await supabase
    .from('team_members')
    .insert({ email: testEmail, role: 'member', notes: 'auto-test' });
  check('insert ok', !error, error?.message);

  const { data } = await supabase
    .from('team_members')
    .select('email, role, status')
    .eq('email', testEmail)
    .maybeSingle();
  check('row visible after insert', data?.email === testEmail);
  check('default status active', data?.status === 'active');
}

console.log('\nTest 3: update role + suspend');
{
  const { error: e1 } = await supabase
    .from('team_members')
    .update({ role: 'admin' })
    .eq('email', testEmail);
  check('promote to admin', !e1, e1?.message);

  const { error: e2 } = await supabase
    .from('team_members')
    .update({ status: 'suspended' })
    .eq('email', testEmail);
  check('suspend', !e2, e2?.message);
}

console.log('\nTest 4: is_admin() helper');
{
  const { data, error } = await supabase.rpc('is_admin', { check_email: testEmail });
  check('rpc call succeeded', !error, error?.message);
  // suspended → is_admin should return false
  check('suspended admin returns false', data === false);
}

console.log('\nTest 5: cleanup');
{
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('email', testEmail);
  check('delete ok', !error, error?.message);

  const { data } = await supabase
    .from('team_members')
    .select('email')
    .eq('email', testEmail)
    .maybeSingle();
  check('row gone', !data);
}

console.log(`\nResult: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
