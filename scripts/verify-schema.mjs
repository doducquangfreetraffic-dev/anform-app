import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

const project = process.env.SUPABASE_PROJECT_ID;
const password = process.env.SUPABASE_DB_PASSWORD;

const client = new Client({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: `postgres.${project}`,
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const tables = await client.query(`
  select table_name from information_schema.tables
  where table_schema='public' order by table_name
`);
console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

const policies = await client.query(`
  select tablename, policyname from pg_policies where schemaname='public' order by tablename
`);
console.log('Policies:');
policies.rows.forEach(p => console.log(`  ${p.tablename}: ${p.policyname}`));

const triggers = await client.query(`
  select trigger_name, event_object_table from information_schema.triggers
  where trigger_schema in ('public','auth') order by trigger_name
`);
console.log('Triggers:');
triggers.rows.forEach(t => console.log(`  ${t.event_object_table}: ${t.trigger_name}`));

await client.end();
console.log('✓ Schema verification done');
