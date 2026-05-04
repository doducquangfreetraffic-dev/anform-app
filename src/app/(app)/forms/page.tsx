import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/whitelist';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, ExternalLink } from 'lucide-react';

type OwnerJoin = { email: string; full_name: string | null; avatar_url: string | null } | null;

type FormRow = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'deployed' | 'archived';
  deployment_status: string | null;
  form_url: string | null;
  submission_count: number;
  owner_id: string;
  updated_at: string;
  owner: OwnerJoin;
};

export default async function FormsListPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await getUserRole(user?.email);
  const sp = await searchParams;

  const filter: 'all' | 'mine' =
    role === 'admin' ? (sp.filter === 'mine' ? 'mine' : 'all') : 'mine';

  let query = supabase
    .from('forms')
    .select(
      'id, title, slug, status, deployment_status, form_url, submission_count, owner_id, updated_at, owner:profiles!owner_id(email, full_name, avatar_url)',
    )
    .order('updated_at', { ascending: false });

  if (filter === 'mine' && user) {
    query = query.eq('owner_id', user.id);
  }

  const { data } = await query;
  const forms = (data ?? []) as unknown as FormRow[];
  const showOwner = role === 'admin' && filter === 'all';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-forest">Forms</h1>
          <p className="text-muted-brand mt-1">
            {forms.length} form
            {role === 'admin' && filter === 'all' ? ' (toàn team)' : ' của bạn'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {role === 'admin' && (
            <FilterTabs current={filter} />
          )}
          <Link href="/forms/new">
            <Button className="bg-honey hover:bg-honey-light text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tạo form mới
            </Button>
          </Link>
        </div>
      </header>

      {forms.length === 0 ? (
        <Card className="border-dashed border-2 border-soft-line bg-surface">
          <CardContent className="py-16 text-center space-y-4">
            <div className="text-6xl">🌱</div>
            <h2 className="text-xl font-semibold text-forest">
              {filter === 'mine' ? 'Chưa có form nào của bạn' : 'Chưa có form nào'}
            </h2>
            <Link href="/forms/new">
              <Button className="bg-forest hover:bg-forest-dark text-white">
                <Plus className="w-4 h-4 mr-2" />
                Tạo form đầu tiên
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {forms.map((form) => {
            const isOthers = showOwner && form.owner_id !== user?.id;
            return (
              <Card
                key={form.id}
                className={isOthers ? 'border-l-4 border-l-honey' : ''}
              >
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <Link href={`/forms/${form.id}`} className="flex-1 min-w-0">
                    <div className="font-medium text-forest hover:underline">
                      {form.title}
                    </div>
                    <div className="text-xs text-muted-brand mt-1 flex items-center gap-2 flex-wrap">
                      <span>{form.slug}</span>
                      <span>·</span>
                      <span>{form.submission_count || 0} đăng ký</span>
                      <span>·</span>
                      <span>cập nhật {new Date(form.updated_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </Link>

                  {showOwner && (
                    <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
                      <Avatar className="w-7 h-7 shrink-0">
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
                      <div className="min-w-0">
                        <div className="text-xs text-ink truncate">
                          {form.owner?.full_name || form.owner?.email || '—'}
                        </div>
                        {isOthers && (
                          <div className="text-[10px] text-honey font-medium">
                            của người khác
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {form.status === 'deployed' && form.form_url && (
                    <a
                      href={form.form_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-honey hover:text-honey-light shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
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

function FilterTabs({ current }: { current: 'all' | 'mine' }) {
  const base =
    'px-3 py-1.5 text-sm rounded-md transition border';
  const active = 'bg-forest text-white border-forest';
  const inactive =
    'bg-white text-muted-brand border-soft-line hover:text-forest';
  return (
    <div className="flex items-center gap-1 bg-paper p-1 rounded-lg">
      <Link
        href="/forms?filter=all"
        className={`${base} ${current === 'all' ? active : inactive}`}
      >
        Tất cả forms
      </Link>
      <Link
        href="/forms?filter=mine"
        className={`${base} ${current === 'mine' ? active : inactive}`}
      >
        Của tôi
      </Link>
    </div>
  );
}
