import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { analyzeCover, isCacheHit, paletteFromAnalysis } from '@/lib/cover-analysis';

export const maxDuration = 60;

const schema = z.object({
  imageUrl: z.string().url().refine((u) => /^https?:\/\//i.test(u), {
    message: 'imageUrl must be http(s)',
  }),
});

// POST /api/forms/analyze-cover
//   { imageUrl } → { analysis, palette, cached }
//
// Used by the wizard to preview the palette before generating the form.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { imageUrl } = parsed.data;

  const cached = isCacheHit(imageUrl);
  try {
    const analysis = await analyzeCover(imageUrl);
    const palette = paletteFromAnalysis(analysis);
    return NextResponse.json({ analysis, palette, cached });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
