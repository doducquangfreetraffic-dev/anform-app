// Idempotently create the `form-covers` Supabase Storage bucket.
// Bucket policy (RLS) is set in supabase/migrations/004_form_covers.sql.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'form-covers';
const opts = {
  public: true,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

const { data: existing, error: getErr } = await supabase.storage.getBucket(BUCKET);
if (existing) {
  console.log(`✓ Bucket '${BUCKET}' already exists — updating settings`);
  const { error: updErr } = await supabase.storage.updateBucket(BUCKET, opts);
  if (updErr) {
    console.error('updateBucket failed:', updErr.message);
    process.exit(1);
  }
} else if (getErr && !/not.?found/i.test(getErr.message)) {
  console.error('getBucket failed:', getErr.message);
  process.exit(1);
} else {
  console.log(`→ Creating bucket '${BUCKET}' (public, 5MB cap, JPG/PNG/WebP)`);
  const { error: crtErr } = await supabase.storage.createBucket(BUCKET, opts);
  if (crtErr) {
    console.error('createBucket failed:', crtErr.message);
    process.exit(1);
  }
  console.log(`✓ Bucket '${BUCKET}' created`);
}

console.log('\nNext: run `node scripts/run-migration.mjs supabase/migrations/004_form_covers.sql` to apply storage RLS.');
