import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Server-only — uses service role to bypass RLS.
// Use for: webhook handlers, scheduled jobs, server-side mutations.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
