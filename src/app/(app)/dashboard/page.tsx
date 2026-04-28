import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, CheckCircle2, Inbox } from 'lucide-react';
import type { Database } from '@/types/database';

type FormSummary = Pick<
  Database['public']['Tables']['forms']['Row'],
  'id' | 'title' | 'slug' | 'status' | 'submission_count' | 'created_at' | 'deployment_status' | 'form_url'
>;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: formsRaw } = await supabase
    .from('forms')
    .select('id, title, slug, status, submission_count, created_at, deployment_status, form_url')
    .order('created_at', { ascending: false })
    .limit(5);

  const forms = (formsRaw ?? []) as FormSummary[];
  const totalForms = forms.length;
  const deployedForms = forms.filter((f) => f.status === 'deployed').length;
  const totalSubmissions = forms.reduce((s, f) => s + (f.submission_count || 0), 0);

  const greeting = (() => {
    const h = new Date().getHours() + 7; // VN UTC+7
    if (h < 12 || h >= 24) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  })();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-forest">{greeting}, {user?.user_metadata?.full_name || 'bạn'} 🌿</h1>
        <p className="text-muted-brand mt-1">Đây là tổng quan các form bạn đã tạo.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<FileText />} label="Tổng số form" value={totalForms} />
        <StatCard icon={<CheckCircle2 />} label="Đã triển khai" value={deployedForms} />
        <StatCard icon={<Inbox />} label="Lượt đăng ký" value={totalSubmissions} />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-forest">Form gần đây</h2>
        <Link href="/forms/new">
          <Button className="bg-honey hover:bg-honey-light text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tạo form mới
          </Button>
        </Link>
      </div>

      {totalForms === 0 ? (
        <Card className="border-dashed border-2 border-soft-line bg-surface">
          <CardContent className="py-16 text-center space-y-4">
            <div className="text-6xl">🌱</div>
            <h3 className="text-xl font-semibold text-forest">Chưa có form nào</h3>
            <p className="text-muted-brand">Bắt đầu bằng cách tạo form đầu tiên của bạn.</p>
            <Link href="/forms/new">
              <Button className="bg-forest hover:bg-forest-dark text-white">
                <Plus className="w-4 h-4 mr-2" />
                Tạo form mới
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {forms.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex-1">
                  <Link href={`/forms/${form.id}`} className="font-medium text-forest hover:underline">
                    {form.title}
                  </Link>
                  <div className="text-sm text-muted-brand mt-1">
                    {form.status === 'deployed' && form.form_url ? (
                      <a href={form.form_url} target="_blank" rel="noreferrer" className="hover:underline">
                        {form.form_url}
                      </a>
                    ) : (
                      <span>Bản nháp</span>
                    )}
                    {' · '}
                    <span>{form.submission_count || 0} đăng ký</span>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  form.status === 'deployed' ? 'bg-forest/10 text-forest' : 'bg-honey/20 text-honey'
                }`}>
                  {form.status === 'deployed' ? 'Đã live' : 'Nháp'}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-brand">{label}</CardTitle>
        <span className="text-honey">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-forest">{value}</div>
      </CardContent>
    </Card>
  );
}
