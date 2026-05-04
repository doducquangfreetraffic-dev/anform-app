#!/usr/bin/env node
// Repoint a deployed form's HTML so it POSTs to ANFORM's submit endpoint
// instead of the broken Apps Script web app. Idempotent — safe to re-run.
//
// Usage:
//   node scripts/repoint-form-to-anform-submit.mjs <slug>

import { Octokit } from '@octokit/rest';
import { google } from 'googleapis';
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

// Allow running with the user's tokens env if .env.local lacks GitHub creds.
const tokensEnv = path.join(homedir(), '.anform-tokens.env');
if (existsSync(tokensEnv)) dotenvConfig({ path: tokensEnv, override: false });
dotenvConfig({ path: path.join(process.cwd(), '.env.local'), override: false });

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/repoint-form-to-anform-submit.mjs <slug>');
  process.exit(1);
}

const ANFORM_BASE = (
  process.env.ANFORM_PUBLIC_URL ||
  (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.startsWith('http://localhost')
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'https://anform.anvui.edu.vn')
).replace(/\/$/, '');
const SUBMIT_URL = `${ANFORM_BASE}/api/forms/submit/${slug}`;

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GH_OWNER = process.env.GITHUB_OWNER;
const GH_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'anform-form-deployments';

if (!SUPA || !SR) {
  console.error('Missing SUPABASE env');
  process.exit(1);
}
if (!GH_OWNER || !GH_TOKEN) {
  console.error('Missing GITHUB_OWNER / GITHUB_TOKEN env');
  process.exit(1);
}

async function fetchJson(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

async function loadForm() {
  const url = `${SUPA}/rest/v1/forms?slug=eq.${encodeURIComponent(slug)}&select=id,slug,sheet_tab_name,apps_script_url,form_url`;
  const arr = await fetchJson(url, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  if (!arr.length) throw new Error(`form not found for slug ${slug}`);
  return arr[0];
}

async function ensureMasterSheetTab(tabName) {
  if (!process.env.GOOGLE_REFRESH_TOKEN || !process.env.GOOGLE_MASTER_SHEET_ID) {
    console.warn('skip sheet tab check (no google env)');
    return;
  }
  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const sheets = google.sheets({ version: 'v4', auth: oauth });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_MASTER_SHEET_ID,
    fields: 'sheets.properties.title',
  });
  const found = (meta.data.sheets || []).some((s) => s.properties?.title === tabName);
  if (!found) throw new Error(`sheet tab "${tabName}" missing on master sheet`);
  console.log(`✓ sheet tab "${tabName}" exists`);
}

async function patchHtml() {
  const gh = new Octokit({ auth: GH_TOKEN });
  const filePath = `${slug}/index.html`;
  const cur = await gh.repos.getContent({ owner: GH_OWNER, repo: REPO, path: filePath });
  if (Array.isArray(cur.data) || cur.data.type !== 'file') {
    throw new Error('expected file');
  }
  const sha = cur.data.sha;
  const html = Buffer.from(cur.data.content, 'base64').toString('utf-8');

  const before = html;
  // Replace any existing Apps Script URL constant. We only touch the JS string —
  // never markup — so keep the regex tight.
  const replaced = html.replace(
    /(['"`])https:\/\/script\.google\.com\/macros\/s\/[^'"`]+\/exec\1/g,
    `$1${SUBMIT_URL}$1`,
  );

  if (replaced === before) {
    console.log('no Apps Script URL found in HTML — already migrated?');
    return false;
  }

  const res = await gh.repos.createOrUpdateFileContents({
    owner: GH_OWNER,
    repo: REPO,
    path: filePath,
    message: `fix(${slug}): repoint submit URL to ANFORM endpoint`,
    content: Buffer.from(replaced, 'utf-8').toString('base64'),
    sha,
  });
  console.log(`✓ HTML patched. commit=${res.data.commit.sha}`);
  return true;
}

async function patchFormRow(formId) {
  const url = `${SUPA}/rest/v1/forms?id=eq.${formId}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ apps_script_url: SUBMIT_URL, deployment_status: 'deployed' }),
  });
  if (!r.ok) throw new Error(`patch form: ${r.status} ${await r.text()}`);
  console.log('✓ form row updated (apps_script_url → submit endpoint)');
}

async function main() {
  console.log(`> Submit URL: ${SUBMIT_URL}`);
  const form = await loadForm();
  console.log(`> Form: ${form.id} (slug=${form.slug}, tab=${form.sheet_tab_name})`);
  await ensureMasterSheetTab(form.sheet_tab_name);
  await patchHtml();
  await patchFormRow(form.id);
  console.log('Done. Wait ~30-60s for Vercel rebuild, then test.');
}

main().catch((e) => {
  console.error('FAILED:', e.message ?? e);
  process.exit(1);
});
