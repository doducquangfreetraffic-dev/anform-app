import { createClient } from '@supabase/supabase-js';

export type TeamRole = 'admin' | 'member';

const CACHE_TTL_MS = 60 * 1000;

interface CacheEntry {
  emails: Map<string, TeamRole>;
  expires: number;
}

let cache: CacheEntry | null = null;

function envWhitelist(): Map<string, TeamRole> {
  const m = new Map<string, TeamRole>();
  for (let i = 1; i <= 10; i++) {
    const e = process.env[`WHITELIST_EMAIL_${i}`];
    if (e) m.set(e.toLowerCase().trim(), 'admin');
  }
  return m;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function loadFromDb(): Promise<Map<string, TeamRole> | null> {
  try {
    const { data, error } = await adminClient()
      .from('team_members')
      .select('email, role')
      .eq('status', 'active');
    if (error || !data) return null;
    const m = new Map<string, TeamRole>();
    for (const row of data) {
      m.set(String(row.email).toLowerCase().trim(), row.role as TeamRole);
    }
    return m;
  } catch {
    return null;
  }
}

async function getActiveMap(): Promise<Map<string, TeamRole>> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.emails;

  const fromDb = await loadFromDb();
  if (fromDb && fromDb.size > 0) {
    cache = { emails: fromDb, expires: now + CACHE_TTL_MS };
    return fromDb;
  }

  // Fallback to env whitelist if DB unreachable or empty.
  const fallback = envWhitelist();
  cache = { emails: fallback, expires: now + 5_000 }; // shorter cache on fallback
  return fallback;
}

export async function isWhitelisted(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const map = await getActiveMap();
  return map.has(email.toLowerCase().trim());
}

export async function getUserRole(
  email: string | null | undefined,
): Promise<TeamRole | null> {
  if (!email) return null;
  const map = await getActiveMap();
  return map.get(email.toLowerCase().trim()) ?? null;
}

export async function getWhitelist(): Promise<string[]> {
  const map = await getActiveMap();
  return [...map.keys()];
}

export async function recordLogin(email: string | null | undefined): Promise<void> {
  if (!email) return;
  try {
    await adminClient()
      .from('team_members')
      .update({ last_login_at: new Date().toISOString() })
      .eq('email', email.toLowerCase().trim());
  } catch {
    // Best-effort: never block login on telemetry write.
  }
}

export function invalidateWhitelistCache(): void {
  cache = null;
}
