import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/whitelist';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import AddMemberForm from '@/components/team/AddMemberForm';
import TeamMembersTable, { type TeamMemberRow } from '@/components/team/TeamMembersTable';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');

  const role = await getUserRole(user.email);
  if (role !== 'admin') redirect('/dashboard');

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('team_members') as any)
    .select('email, role, status, added_at, last_login_at, notes')
    .order('added_at', { ascending: true });

  const members = (data ?? []) as TeamMemberRow[];
  const adminCount = members.filter((m) => m.role === 'admin' && m.status === 'active').length;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-forest flex items-center gap-2">
          <Users className="w-6 h-6" />
          Thành viên
        </h1>
        <p className="text-sm text-muted-brand mt-1">
          Quản lý ai có thể đăng nhập ANFORM. Thay đổi có hiệu lực trong 60 giây.
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-forest mb-3">Thêm thành viên</h2>
          <AddMemberForm />
          <p className="text-xs text-muted-brand mt-3">
            Thành viên sau khi được thêm sẽ đăng nhập bằng Google với email này. Họ cần biết URL ANFORM trước.
          </p>
        </CardContent>
      </Card>

      {adminCount <= 1 && (
        <Card className="border-honey/50 bg-honey-light/20">
          <CardContent className="p-4 text-sm text-forest">
            Bạn đang là admin duy nhất — thêm ít nhất 1 admin nữa để tránh khóa quyền.
          </CardContent>
        </Card>
      )}

      <TeamMembersTable
        initialMembers={members}
        currentEmail={user.email.toLowerCase().trim()}
      />
    </div>
  );
}
