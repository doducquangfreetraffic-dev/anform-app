import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { deployForm } from '@/lib/deploy/orchestrator';

export const maxDuration = 300;

const schema = z.object({ formId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Load form (RLS scopes to owner)
  const { data: formRaw } = await supabase
    .from('forms')
    .select('*')
    .eq('id', parsed.data.formId)
    .single();
  if (!formRaw) {
    return NextResponse.json({ error: 'form not found' }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = formRaw as any;
  if (!form.current_html) {
    return NextResponse.json({ error: 'Form chưa có HTML — generate trước' }, { status: 400 });
  }

  const result = await deployForm({
    formId: form.id,
    slug: form.slug,
    html: form.current_html,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
