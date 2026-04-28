// Phase 8: Deploy this app to Vercel as project "anform-app".
// Idempotent — safe to re-run.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

const VT = process.env.VERCEL_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = 'anform-app';
const projectName = 'anform-app';

if (!VT) {
  console.error('❌ VERCEL_TOKEN missing');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${VT}`, 'Content-Type': 'application/json' };

async function api(path, init = {}) {
  const url = `https://api.vercel.com${path}`;
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

// 1. Create or get the project
console.log('→ Step 1: Ensure Vercel project exists');
let projectId;
{
  const get = await api(`/v9/projects/${projectName}`);
  if (get.ok) {
    projectId = get.body.id;
    console.log(`  ✓ Already exists: ${projectId}`);
  } else if (get.status === 404) {
    console.log('  • Not found, creating…');
    const create = await api('/v10/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        framework: 'nextjs',
        gitRepository: { type: 'github', repo: `${owner}/${repo}` },
      }),
    });
    if (!create.ok) {
      console.error('  ❌ Create failed:', JSON.stringify(create.body).slice(0, 500));
      process.exit(1);
    }
    projectId = create.body.id;
    console.log(`  ✓ Created: ${projectId}`);
  } else {
    console.error('  ❌ Unexpected:', get.status, JSON.stringify(get.body).slice(0, 300));
    process.exit(1);
  }
}

// 2. Set env vars
console.log('→ Step 2: Set environment variables');
const ENV_KEYS_ENCRYPTED = [
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROJECT_ID',
  'SUPABASE_DB_PASSWORD',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
  'GOOGLE_MASTER_SHEET_ID',
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'VERCEL_TOKEN',
  'VERCEL_DEPLOYMENT_PROJECT_ID',
  'WHITELIST_EMAIL_1',
  'WHITELIST_EMAIL_2',
  'ZALO_NOTIFY_PHONE',
];

let envSet = 0;
let envSkipped = 0;
for (const key of ENV_KEYS_ENCRYPTED) {
  const value = process.env[key];
  if (!value) {
    console.log(`  ⚠ ${key} missing locally — skip`);
    continue;
  }
  // Try create
  const create = await api(`/v10/projects/${projectId}/env`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      value,
      target: ['production', 'preview', 'development'],
      type: 'encrypted',
    }),
  });
  if (create.ok) {
    envSet++;
  } else if (create.status === 400 && JSON.stringify(create.body).includes('already exists')) {
    envSkipped++;
  } else {
    console.log(`  ⚠ ${key}: ${create.status} ${JSON.stringify(create.body).slice(0, 200)}`);
  }
}
console.log(`  ✓ Env vars: ${envSet} new, ${envSkipped} already exist`);

// Special prod-only NEXT_PUBLIC_APP_URL
{
  const create = await api(`/v10/projects/${projectId}/env`, {
    method: 'POST',
    body: JSON.stringify({
      key: 'NEXT_PUBLIC_APP_URL',
      value: 'https://anform.anvui.edu.vn',
      target: ['production'],
      type: 'plain',
    }),
  });
  if (create.ok) {
    console.log('  ✓ NEXT_PUBLIC_APP_URL set (prod)');
  }
}
{
  const create = await api(`/v10/projects/${projectId}/env`, {
    method: 'POST',
    body: JSON.stringify({
      key: 'ANFORM_FORMS_BASE_URL',
      value: 'https://form.anvui.edu.vn',
      target: ['production', 'preview', 'development'],
      type: 'plain',
    }),
  });
  if (create.ok) {
    console.log('  ✓ ANFORM_FORMS_BASE_URL set');
  }
}

// 3. Add custom domain
console.log('→ Step 3: Add domain anform.anvui.edu.vn');
{
  const dom = await api(`/v10/projects/${projectId}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: 'anform.anvui.edu.vn' }),
  });
  if (dom.ok) {
    console.log('  ✓ Domain attached');
  } else if (dom.status === 409 || JSON.stringify(dom.body).includes('already')) {
    console.log('  ✓ Domain already attached');
  } else {
    console.log(`  ⚠ Domain: ${dom.status} ${JSON.stringify(dom.body).slice(0, 300)}`);
  }
}

// 4. Resolve GitHub repo ID
console.log('→ Step 4a: Resolve GitHub repo ID');
let repoId;
{
  const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
  });
  if (!ghRes.ok) {
    console.error('  ❌ GitHub repo lookup failed:', ghRes.status);
    process.exit(1);
  }
  const ghBody = await ghRes.json();
  repoId = ghBody.id;
  console.log(`  ✓ Repo ID: ${repoId}`);
}

// 5. Trigger production deployment
console.log('→ Step 4b: Trigger production deployment');
{
  const deploy = await api('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: projectName,
      project: projectId,
      target: 'production',
      gitSource: { type: 'github', repoId, ref: 'main' },
    }),
  });
  if (!deploy.ok) {
    console.error(`  ❌ Deploy trigger failed: ${deploy.status} ${JSON.stringify(deploy.body).slice(0, 600)}`);
    process.exit(1);
  }
  const dep = deploy.body;
  console.log(`  ✓ Deployment ID: ${dep.id}`);
  console.log(`  ✓ URL: https://${dep.url}`);

  // 5. Poll until READY (or fail)
  console.log('→ Step 5: Wait for build…');
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 6 * 60 * 1000) {
      console.log('  ⚠ Timeout 6 min — deploy still in progress, check Vercel dashboard');
      break;
    }
    const st = await api(`/v13/deployments/${dep.id}`);
    if (!st.ok) {
      console.log(`  ⚠ Status check ${st.status}`);
      break;
    }
    const state = st.body.readyState || st.body.state;
    process.stdout.write(`\r  state=${state}        `);
    if (state === 'READY') {
      console.log('\n  ✓ Build ready');
      break;
    }
    if (state === 'ERROR' || state === 'CANCELED') {
      console.log(`\n  ❌ Build ${state}`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
}

console.log('\n✅ Phase 8 complete');
console.log(`Project ID: ${projectId}`);
console.log('App URL: https://anform.anvui.edu.vn (after DNS propagation)');
console.log('Deployment URL: see Vercel dashboard');
