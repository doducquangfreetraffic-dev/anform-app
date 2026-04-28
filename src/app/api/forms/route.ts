import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/slugify';
import { DEFAULT_BRIEF, type FormBrief } from '@/types/form-brief';

const createSchema = z.object({
  title: z.string().min(1, 'Tiêu đề bắt buộc').max(200),
  brief: z.unknown().optional(),
});

// GET /api/forms — list forms for current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('forms')
    .select('id, title, slug, status, deployment_status, form_url, submission_count, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ forms: data ?? [] });
}

// POST /api/forms — create new form (draft)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const brief = (parsed.data.brief ?? DEFAULT_BRIEF) as FormBrief;
  const baseSlug = slugify(parsed.data.title);

  // Find a non-conflicting slug
  let finalSlug = baseSlug;
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
    const { data: existing } = await supabase
      .from('forms')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!existing) {
      finalSlug = candidate;
      break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('forms') as any)
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      slug: finalSlug,
      brief: { ...brief, title: parsed.data.title },
      status: 'draft',
      deployment_status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ form: data });
}
