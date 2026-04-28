import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { formSlug, data } = (body ?? {}) as { formSlug?: string; data?: unknown };
  if (!formSlug || typeof formSlug !== 'string') {
    return NextResponse.json({ error: 'missing formSlug' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: formRaw } = await admin.from('forms').select('id').eq('slug', formSlug).single();
  if (!formRaw) {
    return NextResponse.json({ error: 'form not found' }, { status: 404 });
  }
  const formId = (formRaw as { id: string }).id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertRes = await (admin.from('submissions') as any).insert({
    form_id: formId,
    data: data ?? {},
    ip_address:
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null,
    user_agent: req.headers.get('user-agent'),
  });

  if (insertRes.error) {
    return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
  }

  // Best-effort increment counter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.rpc as any)('increment_submission_count', { form_id_in: formId });

  return NextResponse.json({ ok: true });
}
