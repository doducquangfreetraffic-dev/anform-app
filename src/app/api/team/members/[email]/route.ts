import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole, invalidateWhitelistCache } from '@/lib/whitelist';

const patchSchema = z.object({
  role: z.enum(['admin', 'member']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  notes: z.string().max(500).nullable().optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const role = await getUserRole(user.email);
  if (role !== 'admin') return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { user, currentEmail: user.email.toLowerCase().trim() };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ email: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { email: rawEmail } = await ctx.params;
  const email = decodeURIComponent(rawEmail).toLowerCase().trim();

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Cannot demote/suspend self.
  if (email === auth.currentEmail) {
    if (parsed.data.role && parsed.data.role !== 'admin') {
      return NextResponse.json({ error: 'Không thể tự hạ vai trò' }, { status: 400 });
    }
    if (parsed.data.status && parsed.data.status !== 'active') {
      return NextResponse.json({ error: 'Không thể tự ngừng hoạt động' }, { status: 400 });
    }
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) update.role = parsed.data.role;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Không có gì để cập nhật' }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('team_members') as any)
    .update(update)
    .eq('email', email)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy thành viên' }, { status: 404 });

  invalidateWhitelistCache();
  return NextResponse.json({ member: data });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ email: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { email: rawEmail } = await ctx.params;
  const email = decodeURIComponent(rawEmail).toLowerCase().trim();

  if (email === auth.currentEmail) {
    return NextResponse.json({ error: 'Không thể xóa chính mình' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('team_members').delete().eq('email', email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateWhitelistCache();
  return NextResponse.json({ ok: true });
}
