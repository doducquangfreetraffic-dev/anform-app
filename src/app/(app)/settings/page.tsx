import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
          <Row label="Role" value="Owner" />
        </CardContent>
      </Card>

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
