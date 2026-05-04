import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/whitelist';
import { slugify } from '@/lib/utils/slugify';
import { DEFAULT_BRIEF, type FormBrief } from '@/types/form-brief';

const createSchema = z.object({
  title: z.string().min(1, 'Tiêu đề bắt buộc').max(200),
  brief: z.unknown().optional(),
});

// GET /api/forms — admin: ?filter=all (default) | ?filter=mine ; member: always own
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const role = await getUserRole(user.email);
  const requested = req.nextUrl.searchParams.get('filter');
  const filter: 'all' | 'mine' =
    role === 'admin' ? (requested === 'mine' ? 'mine' : 'all') : 'mine';

  let query = supabase
    .from('forms')
    .select(
      'id, title, slug, status, deployment_status, form_url, submission_count, owner_id, created_at, updated_at, owner:profiles!owner_id(email, full_name, avatar_url)',
    )
    .order('updated_at', { ascending: false });

  if (filter === 'mine') {
    query = query.eq('owner_id', user.id);
  }
  // else 'all' — RLS allows admins to see all rows.

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    forms: data ?? [],
    role,
    filter,
    total: data?.length ?? 0,
  });
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
