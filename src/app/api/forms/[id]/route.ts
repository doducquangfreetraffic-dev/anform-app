import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/whitelist';
import { logAdminAction } from '@/lib/audit';
import type { Database } from '@/types/database';

type FormUpdate = Database['public']['Tables']['forms']['Update'];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('forms')
    .select('*, owner:profiles!owner_id(email, full_name, avatar_url)')
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const isOwner = (data as { owner_id: string }).owner_id === user.id;
  const role = await getUserRole(user.email);

  if (role === 'admin' && !isOwner) {
    const ownerEmail = (data as { owner?: { email?: string } | null }).owner?.email;
    await logAdminAction({
      adminEmail: user.email!,
      action: 'view_form',
      formId: id,
      formSlug: (data as { slug?: string }).slug ?? null,
      targetOwnerEmail: ownerEmail ?? null,
    });
  }

  return NextResponse.json({ form: data, isOwner, role });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const ALLOWED: (keyof FormUpdate)[] = [
    'title',
    'brief',
    'current_html',
    'status',
    'deployment_status',
    'apps_script_id',
    'apps_script_url',
    'sheet_tab_name',
    'form_url',
  ];
  const updatable: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (body[k] !== undefined) updatable[k] = body[k];
  }

  // Audit if admin editing someone else's form
  const { data: existing } = await supabase
    .from('forms')
    .select('owner_id, slug, owner:profiles!owner_id(email)')
    .eq('id', id)
    .single();
  const role = await getUserRole(user.email);
  const isOwner = (existing as { owner_id?: string } | null)?.owner_id === user.id;
  if (role === 'admin' && !isOwner && existing) {
    const ownerEmail = (existing as { owner?: { email?: string } | null }).owner?.email;
    await logAdminAction({
      adminEmail: user.email!,
      action: 'edit_form',
      formId: id,
      formSlug: (existing as { slug?: string }).slug ?? null,
      targetOwnerEmail: ownerEmail ?? null,
      metadata: { fields: Object.keys(updatable) },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('forms') as any)
    .update(updatable)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ form: data });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('forms')
    .select('owner_id, slug, owner:profiles!owner_id(email)')
    .eq('id', id)
    .single();
  const role = await getUserRole(user.email);
  const isOwner = (existing as { owner_id?: string } | null)?.owner_id === user.id;
  if (role === 'admin' && !isOwner && existing) {
    const ownerEmail = (existing as { owner?: { email?: string } | null }).owner?.email;
    await logAdminAction({
      adminEmail: user.email!,
      action: 'delete_form',
      formId: id,
      formSlug: (existing as { slug?: string }).slug ?? null,
      targetOwnerEmail: ownerEmail ?? null,
    });
  }

  const { error } = await supabase.from('forms').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
