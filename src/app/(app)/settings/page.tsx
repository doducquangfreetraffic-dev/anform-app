import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/whitelist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight } from 'lucide-react';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await getUserRole(user?.email);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-forest">Cài đặt</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-forest text-base">Tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Email" value={user?.email} />
          <Row label="Tên" value={user?.user_metadata?.full_name as string | undefined} />
          <div className="flex justify-between gap-4">
            <span className="text-muted-brand">Vai trò</span>
            <Badge
              variant={role === 'admin' ? 'default' : 'secondary'}
              className={role === 'admin' ? 'bg-forest text-white' : ''}
            >
              {role === 'admin' ? 'Quản trị' : role === 'member' ? 'Thành viên' : '—'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-forest text-base">Quản trị</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Link
              href="/settings/team"
              className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-paper transition"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-forest" />
                <div>
                  <div className="text-sm font-medium text-ink">Thành viên</div>
                  <div className="text-xs text-muted-brand">Thêm/xóa email được phép đăng nhập</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-brand" />
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-forest text-base">Hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="App URL" value={process.env.NEXT_PUBLIC_APP_URL} />
          <Row label="Forms domain" value="form.anvui.edu.vn" />
          <Row label="Master Sheet" value="ANFORM Master Submissions" />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-brand">{label}</span>
      <span className="text-ink">{value ?? '—'}</span>
    </div>
  );
}
