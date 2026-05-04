// Smoke-test Phase 8.6: RLS policies, audit table, role helper.
// Uses direct PG so we can verify policy DDL and is_admin() output.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve as dnsResolve } from 'node:dns/promises';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

const project = process.env.SUPABASE_PROJECT_ID;
const password = process.env.SUPABASE_DB_PASSWORD;

let directIPv6 = null;
try {
  const ipv6 = await dnsResolve(`db.${project}.supabase.co`, 'AAAA');
  directIPv6 = ipv6[0];
} catch {}

const candidates = [];
if (directIPv6) {
  candidates.push({ host: directIPv6, port: 5432, user: 'postgres' });
}
for (const r of ['ap-southeast-1']) {
  for (const prefix of ['aws-1', 'aws-0']) {
    candidates.push({
      host: `${prefix}-${r}.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${project}`,
    });
  }
}

let client = null;
for (const c of candidates) {
  client = new Client({
    host: c.host,
    port: c.port,
    user: c.user,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    break;
  } catch {
    try { await client.end(); } catch {}
    client = null;
  }
}
if (!client) throw new Error('No PG connection');

let pass = 0;
let fail = 0;
function assert(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.log(`  ✗ ${label}  ${detail}`);
    fail++;
  }
}

console.log('═══ Test 1: is_admin() correctness ═══');
{
  const { rows } = await client.query(`
    select email, role, public.is_admin(email) as is_admin_flag
    from public.team_members
    where status = 'active'
    order by role, email
  `);
  for (const r of rows) {
    const expected = r.role === 'admin';
    assert(
      `${r.email} (role=${r.role}) → is_admin=${r.is_admin_flag}`,
      r.is_admin_flag === expected,
    );
  }
}

console.log('\n═══ Test 2: required policies present ═══');
{
  const expected = [
    ['forms', 'forms_admin_or_owner_select'],
    ['forms', 'forms_owner_insert'],
    ['forms', 'forms_admin_or_owner_update'],
    ['forms', 'forms_admin_or_owner_delete'],
    ['submissions', 'submissions_admin_or_owner_select'],
    ['deploy_logs', 'deploy_logs_admin_or_owner_select'],
    ['form_versions', 'form_versions_admin_or_owner'],
    ['profiles', 'profiles_admin_select_all'],
    ['admin_audit_log', 'audit_admin_select'],
  ];
  for (const [table, policy] of expected) {
    const { rows } = await client.query(
      `select 1 from pg_policies where schemaname='public' and tablename=$1 and policyname=$2`,
      [table, policy],
    );
    assert(`policy ${policy} on ${table}`, rows.length === 1);
  }
  // Old owner-only policies should be gone
  const removed = [
    ['forms', 'forms_owner_all'],
    ['submissions', 'submissions_owner_read'],
    ['deploy_logs', 'deploy_logs_owner'],
    ['form_versions', 'form_versions_owner'],
  ];
  for (const [table, policy] of removed) {
    const { rows } = await client.query(
      `select 1 from pg_policies where schemaname='public' and tablename=$1 and policyname=$2`,
      [table, policy],
    );
    assert(`old policy ${policy} on ${table} dropped`, rows.length === 0);
  }
}

console.log('\n═══ Test 3: admin_audit_log shape + RLS enabled ═══');
{
  const cols = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema='public' and table_name='admin_audit_log'
    order by ordinal_position
  `);
  const colNames = cols.rows.map((r) => r.column_name);
  for (const c of [
    'id', 'admin_email', 'action', 'target_form_id',
    'target_form_slug', 'target_owner_email', 'metadata', 'created_at',
  ]) {
    assert(`column ${c} present`, colNames.includes(c));
  }
  const rls = await client.query(
    `select relrowsecurity from pg_class where relname='admin_audit_log'`,
  );
  assert('RLS enabled on admin_audit_log', rls.rows[0]?.relrowsecurity === true);
}

console.log('\n═══ Test 4: forms select via service role (sanity) ═══');
{
  const { rows } = await client.query(
    `select count(*)::int as n from public.forms`,
  );
  assert(`forms table queryable, n=${rows[0].n}`, rows[0].n >= 0);
}

await client.end();
console.log(`\n${fail === 0 ? '✅' : '❌'} Phase 8.6 smoke: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
