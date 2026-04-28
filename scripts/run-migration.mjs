// Run SQL migration via direct Postgres connection.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve as dnsResolve } from 'node:dns/promises';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

const SQL_FILE = process.argv[2] || join(__dirname, '..', 'supabase', 'migrations', '001_initial.sql');
const sql = readFileSync(SQL_FILE, 'utf-8');
console.log(`📄 Loaded ${SQL_FILE} (${sql.length} bytes)`);

const project = process.env.SUPABASE_PROJECT_ID;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!project || !password) {
  console.error('❌ Missing SUPABASE_PROJECT_ID or SUPABASE_DB_PASSWORD');
  process.exit(1);
}

// Resolve direct host to IPv6 (Supabase only exposes IPv6 for direct)
let directIPv6 = null;
try {
  const ipv6 = await dnsResolve(`db.${project}.supabase.co`, 'AAAA');
  directIPv6 = ipv6[0];
  console.log(`✓ Direct IPv6: ${directIPv6}`);
} catch {}

const candidates = [];

// 1. Direct via IPv6
if (directIPv6) {
  candidates.push({ host: directIPv6, port: 5432, user: 'postgres', label: 'direct-ipv6' });
}

// 2. Pooler — try both old (aws-0) and new (aws-1) format, multiple regions
const regions = ['ap-southeast-1', 'us-east-1', 'us-east-2', 'us-west-1', 'eu-west-1', 'eu-central-1', 'ap-northeast-1', 'ap-southeast-2'];
for (const r of regions) {
  for (const prefix of ['aws-0', 'aws-1']) {
    candidates.push({
      host: `${prefix}-${r}.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${project}`,
      label: `pooler-${prefix}-${r}-tx`,
    });
  }
}

async function tryRun() {
  for (const c of candidates) {
    const client = new Client({
      host: c.host,
      port: c.port,
      user: c.user,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
      query_timeout: 120000,
      statement_timeout: 120000,
    });
    try {
      console.log(`→ ${c.label} (${c.host}:${c.port})`);
      await client.connect();
      console.log(`  ✓ Connected`);
      await client.query(sql);
      console.log(`  ✓ Migration applied`);
      await client.end();
      return c.label;
    } catch (err) {
      const msg = (err.message || '').slice(0, 200);
      console.log(`  ✗ ${msg}`);
      try { await client.end(); } catch {}
    }
  }
  throw new Error('All connection candidates failed');
}

try {
  const used = await tryRun();
  console.log(`\n✅ Migration complete via ${used}`);
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
}
