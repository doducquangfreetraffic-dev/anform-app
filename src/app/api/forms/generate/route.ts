import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateHtml } from '@/lib/ai/anthropic';
import { SYSTEM_PROMPT, buildUserPrompt, extractHtml } from '@/lib/ai/prompts';
import type { FormBrief } from '@/types/form-brief';

export const maxDuration = 300; // 5 min for Opus generation

const schema = z.object({
  formId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Load form
  const { data: formRaw, error: loadErr } = await supabase
    .from('forms')
    .select('*')
    .eq('id', parsed.data.formId)
    .single();
  if (loadErr || !formRaw) {
    return NextResponse.json({ error: 'form not found' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = formRaw as any;
  const brief = form.brief as FormBrief;

  let html: string;
  try {
    const raw = await generateHtml({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(brief, form.slug),
      maxTokens: 16000,
    });
    html = extractHtml(raw);
    if (!html.toLowerCase().startsWith('<!doctype html')) {
      throw new Error('AI did not return valid HTML');
    }
    if (html.length < 5000) {
      throw new Error(`HTML too short (${html.length} bytes)`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 502 });
  }

  // Save to forms table + record version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase.from('forms') as any)
    .update({ current_html: html })
    .eq('id', form.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { data: latestRaw } = await supabase
    .from('form_versions')
    .select('version_number')
    .eq('form_id', form.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const latest = latestRaw as { version_number: number } | null;
  const nextVersion = (latest?.version_number ?? 0) + 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('form_versions') as any).insert({
    form_id: form.id,
    version_number: nextVersion,
    brief: brief as unknown,
    html,
  });

  return NextResponse.json({
    ok: true,
    bytes: html.length,
    version: nextVersion,
  });
}
