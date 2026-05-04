import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendSubmissionToTab, type SubmissionPayload } from '@/lib/deploy/google-sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  let payload: SubmissionPayload;
  try {
    const raw = await req.text();
    payload = raw ? (JSON.parse(raw) as SubmissionPayload) : {};
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  const admin = createAdminClient();
  const formRes = await admin
    .from('forms')
    .select('id, sheet_tab_name, status')
    .eq('slug', slug)
    .single();
  const form = formRes.data as { id: string; sheet_tab_name: string | null; status: string } | null;
  if (!form) return jsonResponse({ ok: false, error: 'form_not_found' }, 404);
  if (!form.sheet_tab_name) return jsonResponse({ ok: false, error: 'form_not_provisioned' }, 409);

  // Skip the health-check ping that the deployer uses to verify the endpoint.
  const meta = (payload.meta ?? {}) as Record<string, unknown>;
  const isHealthCheck = meta.__healthcheck === true;

  let sheetOk = false;
  let sheetErr: string | null = null;
  if (!isHealthCheck) {
    try {
      await appendSubmissionToTab({ tabName: form.sheet_tab_name, payload });
      sheetOk = true;
    } catch (err) {
      sheetErr = err instanceof Error ? err.message : String(err);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertRes = await (admin.from('submissions') as any).insert({
      form_id: form.id,
      data: payload ?? {},
      ip_address:
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        null,
      user_agent: req.headers.get('user-agent'),
    });

    if (!insertRes.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.rpc as any)('increment_submission_count', { form_id_in: form.id });
    }
  }

  if (!isHealthCheck && !sheetOk) {
    return jsonResponse({ ok: false, error: 'sheet_append_failed', detail: sheetErr }, 502);
  }

  return jsonResponse({ ok: true, healthcheck: isHealthCheck });
}
