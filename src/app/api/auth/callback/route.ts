import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isWhitelisted } from '@/lib/whitelist';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  if (!isWhitelisted(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/access-denied`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
