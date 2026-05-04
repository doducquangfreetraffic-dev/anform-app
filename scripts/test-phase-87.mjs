// Phase 8.7 smoke: storage bucket, schema columns, storage RLS, real Vision API call.
// Costs ~1 Sonnet 4.6 vision call (~$0.005).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

let pass = 0;
let fail = 0;
function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.log(`  ✗ ${label}  ${detail}`);
    fail++;
  }
}

// ─── Test 1: Storage bucket ───────────────────────────────
console.log('═══ Test 1: form-covers bucket ═══');
{
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb.storage.getBucket('form-covers');
  check('bucket exists', !!data && !error, error?.message ?? '');
  check('bucket is public', data?.public === true);
  check(
    'mime allowlist correct',
    Array.isArray(data?.allowed_mime_types) &&
      ['image/jpeg', 'image/png', 'image/webp'].every((m) =>
        data.allowed_mime_types.includes(m),
      ),
  );
  check(
    'file size limit = 5 MB',
    data?.file_size_limit === 5 * 1024 * 1024,
    `got ${data?.file_size_limit}`,
  );
}

// ─── Test 2: forms cover_* columns ─────────────────────────
console.log('\n═══ Test 2: forms.cover_* columns ═══');
{
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(
    `${url}/rest/v1/forms?select=id,cover_image_url,cover_palette,cover_analysis,cover_uploaded_at,cover_style&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  check('GET /forms with cover_* selector OK', r.ok, `status ${r.status}`);
  const rows = await r.json();
  if (Array.isArray(rows) && rows[0]) {
    const row = rows[0];
    for (const k of [
      'cover_image_url',
      'cover_palette',
      'cover_analysis',
      'cover_uploaded_at',
      'cover_style',
    ]) {
      check(`column ${k} present`, Object.prototype.hasOwnProperty.call(row, k));
    }
  } else {
    check('forms row available', false, 'no row to check');
  }
}

// ─── Test 3: Storage RLS — anon insert blocked ─────────────
console.log('\n═══ Test 3: storage RLS ═══');
{
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // anon list = should succeed (200) for public bucket
  const listR = await fetch(`${url}/storage/v1/object/list/form-covers`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix: '', limit: 1 }),
  });
  check('anon list returns 200', listR.status === 200, `got ${listR.status}`);

  // anon INSERT to a path = should be denied (no auth.uid())
  const putR = await fetch(`${url}/storage/v1/object/form-covers/anon-attempt.txt`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'text/plain',
    },
    body: 'should not be allowed',
  });
  check(
    'anon INSERT denied by RLS',
    putR.status === 400 || putR.status === 401 || putR.status === 403,
    `got ${putR.status}`,
  );
}

// ─── Test 4: Real Vision API call (direct) ────────────────
console.log('\n═══ Test 4: Vision API (Sonnet 4.6, real call) ═══');
{
  const sample =
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80';
  // ↑ public Unsplash photo — orange/desk vibe

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const t0 = Date.now();
  let res;
  try {
    res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text:
            'Phân tích ảnh và trả về JSON duy nhất với schema: ' +
            '{"dominant_colors":["#hex","#hex","#hex","#hex","#hex"],' +
            '"mood":"warm|cool|neutral|dark|light|vibrant",' +
            '"style":"photo|illustration|abstract|minimal|gradient",' +
            '"subject":"people|object|landscape|text|abstract|product",' +
            '"suggested_text_color":"white|black|auto",' +
            '"contrast_zones":{"top":"dark|light|mixed","center":"dark|light|mixed","bottom":"dark|light|mixed"},' +
            '"suggested_tone":"corporate|playful|editorial|minimal|luxurious",' +
            '"has_text_in_image":true|false,' +
            '"primary_orientation":"landscape|portrait|square"}. JSON only, no markdown.',
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: sample } },
            { type: 'text', text: 'Analyze. JSON only.' },
          ],
        },
      ],
    });
  } catch (e) {
    check('vision call succeeded', false, e?.message ?? String(e));
    console.log(`\n${fail === 0 ? '✅' : '❌'} Phase 8.7 smoke: ${pass} passed, ${fail} failed`);
    process.exit(1);
  }
  const dt = Date.now() - t0;
  check(`vision call returned (${dt} ms)`, true);

  const block = res.content[0];
  check('content[0] is text', block?.type === 'text');
  let raw = (block.text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  if (!raw.startsWith('{')) {
    const i = raw.indexOf('{');
    const j = raw.lastIndexOf('}');
    if (i >= 0 && j > i) raw = raw.slice(i, j + 1);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    check('output parses as JSON', false, `${e.message}; raw="${raw.slice(0, 80)}"`);
    console.log(`\n${fail === 0 ? '✅' : '❌'} Phase 8.7 smoke: ${pass} passed, ${fail} failed`);
    process.exit(1);
  }
  check('output parses as JSON', true);
  check(
    'dominant_colors is array of hex',
    Array.isArray(parsed.dominant_colors) &&
      parsed.dominant_colors.length >= 1 &&
      parsed.dominant_colors.every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)),
    JSON.stringify(parsed.dominant_colors),
  );
  check(
    'mood ∈ enum',
    ['warm', 'cool', 'neutral', 'dark', 'light', 'vibrant'].includes(parsed.mood),
    parsed.mood,
  );
  check(
    'subject ∈ enum',
    ['people', 'object', 'landscape', 'text', 'abstract', 'product'].includes(parsed.subject),
    parsed.subject,
  );
  check(
    'contrast_zones has top/center/bottom',
    parsed.contrast_zones &&
      ['top', 'center', 'bottom'].every((k) =>
        ['dark', 'light', 'mixed'].includes(parsed.contrast_zones[k]),
      ),
    JSON.stringify(parsed.contrast_zones),
  );
  check(
    'suggested_tone ∈ enum',
    ['corporate', 'playful', 'editorial', 'minimal', 'luxurious'].includes(parsed.suggested_tone),
    parsed.suggested_tone,
  );

  console.log('\n  Sample parsed output:');
  console.log(`    dominant_colors: ${parsed.dominant_colors.join(', ')}`);
  console.log(`    mood/style/subject/tone: ${parsed.mood} / ${parsed.style} / ${parsed.subject} / ${parsed.suggested_tone}`);
  console.log(`    cache_read_input_tokens: ${res.usage?.cache_read_input_tokens ?? 0}`);
  console.log(`    cache_creation_input_tokens: ${res.usage?.cache_creation_input_tokens ?? 0}`);
}

console.log(`\n${fail === 0 ? '✅' : '❌'} Phase 8.7 smoke: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
