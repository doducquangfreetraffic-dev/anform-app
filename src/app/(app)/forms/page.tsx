import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ExternalLink } from 'lucide-react';
import type { Database } from '@/types/database';

type FormRow = Pick<
  Database['public']['Tables']['forms']['Row'],
  'id' | 'title' | 'slug' | 'status' | 'deployment_status' | 'form_url' | 'submission_count' | 'updated_at'
>;

export default async function FormsListPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('forms')
    .select('id, title, slug, status, deployment_status, form_url, submission_count, updated_at')
    .order('updated_at', { ascending: false });

  const forms = (data ?? []) as FormRow[];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-forest">Forms</h1>
          <p className="text-muted-brand mt-1">{forms.length} form đã tạo</p>
        </div>
        <Link href="/forms/new">
          <Button className="bg-honey hover:bg-honey-light text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tạo form mới
          </Button>
        </Link>
      </header>

      {forms.length === 0 ? (
        <Card className="border-dashed border-2 border-soft-line bg-surface">
          <CardContent className="py-16 text-center space-y-4">
            <div className="text-6xl">🌱</div>
            <h2 className="text-xl font-semibold text-forest">Chưa có form nào</h2>
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
          {forms.map((form) => (
            <Card key={form.id}>
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <Link href={`/forms/${form.id}`} className="flex-1 min-w-0">
                  <div className="font-medium text-forest hover:underline">{form.title}</div>
                  <div className="text-xs text-muted-brand mt-1 flex items-center gap-2">
                    <span>{form.slug}</span>
                    <span>·</span>
                    <span>{form.submission_count || 0} đăng ký</span>
                    <span>·</span>
                    <span>cập nhật {new Date(form.updated_at).toLocaleString('vi-VN')}</span>
                  </div>
                </Link>
                {form.status === 'deployed' && form.form_url && (
                  <a
                    href={form.form_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-honey hover:text-honey-light"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
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
