import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/whitelist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, FileText, CheckCircle2, Inbox, User } from 'lucide-react';
import type { Database } from '@/types/database';

type OwnerJoin = { email: string; full_name: string | null; avatar_url: string | null } | null;

type FormSummary = Pick<
  Database['public']['Tables']['forms']['Row'],
  'id' | 'title' | 'slug' | 'status' | 'submission_count' | 'created_at' | 'deployment_status' | 'form_url' | 'owner_id'
> & { owner: OwnerJoin };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await getUserRole(user?.email);
  const isAdmin = role === 'admin';

  // For admin, RLS lets these queries return all forms.
  // For member, RLS restricts to own forms.
  const [{ data: recentRaw }, { data: aggRaw }, { data: ownAggRaw }] = await Promise.all([
    supabase
      .from('forms')
      .select(
        'id, title, slug, status, submission_count, created_at, deployment_status, form_url, owner_id, owner:profiles!owner_id(email, full_name, avatar_url)',
      )
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('forms')
      .select('id, status, submission_count'),
    isAdmin && user
      ? supabase
          .from('forms')
          .select('id')
          .eq('owner_id', user.id)
      : Promise.resolve({ data: null }),
  ]);

  const recent = (recentRaw ?? []) as unknown as FormSummary[];
  const all = (aggRaw ?? []) as Pick<FormSummary, 'id' | 'status' | 'submission_count'>[];
  const totalForms = all.length;
  const deployedForms = all.filter((f) => f.status === 'deployed').length;
  const totalSubmissions = all.reduce((s, f) => s + (f.submission_count || 0), 0);
  const ownCount = isAdmin ? (ownAggRaw?.length ?? 0) : totalForms;

  const greeting = (() => {
    const h = new Date().getHours() + 7; // VN UTC+7
    if (h < 12 || h >= 24) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  })();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-forest">
          {greeting}, {user?.user_metadata?.full_name || 'bạn'} 🌿
        </h1>
        <p className="text-muted-brand mt-1">
          {isAdmin
            ? 'Tổng quan toàn team. Nhấn vào form bất kỳ để xem hoặc thao tác.'
            : 'Đây là tổng quan các form bạn đã tạo.'}
        </p>
      </header>

      <div
        className={`grid grid-cols-1 gap-4 ${
          isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'
        }`}
      >
        <StatCard
          icon={<FileText />}
          label={isAdmin ? 'Tổng form (toàn team)' : 'Tổng số form'}
          value={totalForms}
        />
        <StatCard
          icon={<CheckCircle2 />}
          label="Đã triển khai"
          value={deployedForms}
        />
        <StatCard
          icon={<Inbox />}
          label="Lượt đăng ký"
          value={totalSubmissions}
        />
        {isAdmin && (
          <StatCard icon={<User />} label="Forms của tôi" value={ownCount} />
        )}
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-forest">
          {isAdmin ? 'Form mới nhất (toàn team)' : 'Form gần đây'}
        </h2>
        <div className="flex gap-3">
          <Link href="/forms">
            <Button variant="outline" className="border-soft-line">
              Xem tất cả
            </Button>
          </Link>
          <Link href="/forms/new">
            <Button className="bg-honey hover:bg-honey-light text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tạo form mới
            </Button>
          </Link>
        </div>
      </div>

      {totalForms === 0 ? (
        <Card className="border-dashed border-2 border-soft-line bg-surface">
          <CardContent className="py-16 text-center space-y-4">
            <div className="text-6xl">🌱</div>
            <h3 className="text-xl font-semibold text-forest">Chưa có form nào</h3>
            <p className="text-muted-brand">Bắt đầu bằng cách tạo form đầu tiên.</p>
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
          {recent.map((form) => {
            const isOthers = isAdmin && form.owner_id !== user?.id;
            return (
              <Card
                key={form.id}
                className={`hover:shadow-md transition ${
                  isOthers ? 'border-l-4 border-l-honey' : ''
                }`}
              >
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/forms/${form.id}`}
                      className="font-medium text-forest hover:underline"
                    >
                      {form.title}
                    </Link>
                    <div className="text-sm text-muted-brand mt-1 truncate">
                      {form.status === 'deployed' && form.form_url ? (
                        <a
                          href={form.form_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {form.form_url}
                        </a>
                      ) : (
                        <span>Bản nháp</span>
                      )}
                      {' · '}
                      <span>{form.submission_count || 0} đăng ký</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 min-w-0 max-w-[160px]">
                      <Avatar className="w-6 h-6 shrink-0">
                        {form.owner?.avatar_url ? (
                          <AvatarImage
                            src={form.owner.avatar_url}
                            alt={form.owner.full_name ?? form.owner.email}
                          />
                        ) : null}
                        <AvatarFallback className="bg-paper text-forest text-[10px]">
                          {(form.owner?.full_name || form.owner?.email || '?')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-ink truncate">
                        {form.owner?.full_name || form.owner?.email || '—'}
                      </span>
                    </div>
                  )}

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
                      form.status === 'deployed'
                        ? 'bg-forest/10 text-forest'
                        : 'bg-honey/20 text-honey'
                    }`}
                  >
                    {form.status === 'deployed' ? 'Đã live' : 'Nháp'}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-brand">
          {label}
        </CardTitle>
        <span className="text-honey">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-forest">{value}</div>
      </CardContent>
    </Card>
  );
}
