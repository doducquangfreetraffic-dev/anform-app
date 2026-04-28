import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import ExportButton from './ExportButton';
import RealtimeRefresh from './RealtimeRefresh';
import type { Database } from '@/types/database';

type SubmissionRow = Database['public']['Tables']['submissions']['Row'];

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: formRaw } = await supabase
    .from('forms')
    .select('id, title, slug, submission_count')
    .eq('id', id)
    .single();
  if (!formRaw) notFound();
  const form = formRaw as { id: string; title: string; slug: string; submission_count: number };

  const { data: subRaw } = await supabase
    .from('submissions')
    .select('*')
    .eq('form_id', id)
    .order('created_at', { ascending: false })
    .limit(500);

  const submissions = (subRaw ?? []) as unknown as SubmissionRow[];

  // Collect unique top-level keys of `data` for table columns
  const keySet = new Set<string>();
  submissions.forEach((s) => {
    const d = s.data as Record<string, unknown>;
    Object.keys(d ?? {}).forEach((k) => keySet.add(k));
  });
  const PRIORITY = ['name', 'email', 'phone', 'klass', 'sessions', 'sessionIds'];
  const cols = [
    ...PRIORITY.filter((k) => keySet.has(k)),
    ...Array.from(keySet).filter((k) => !PRIORITY.includes(k) && k !== 'meta' && k !== 'timestamp'),
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <RealtimeRefresh formId={form.id} />

      <header className="flex justify-between items-start">
        <div>
          <Link
            href={`/forms/${form.id}`}
            className="text-sm text-muted-brand hover:text-forest inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3 h-3" />
            {form.title}
          </Link>
          <h1 className="text-2xl font-bold text-forest">Đăng ký</h1>
          <p className="text-sm text-muted-brand mt-1">
            {submissions.length} dòng (tối đa 500 mới nhất). Tổng: {form.submission_count}.
          </p>
        </div>
        <ExportButton formId={form.id} formSlug={form.slug} />
      </header>

      {submissions.length === 0 ? (
        <Card className="border-dashed border-2 border-soft-line bg-surface">
          <CardContent className="py-16 text-center space-y-3">
            <div className="text-5xl">📭</div>
            <h2 className="text-lg font-semibold text-forest">Chưa có ai đăng ký</h2>
            <p className="text-sm text-muted-brand">Trang sẽ tự cập nhật khi có dòng mới.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Thời gian</TableHead>
                  {cols.map((c) => (
                    <TableHead key={c} className="text-xs capitalize">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => {
                  const d = (s.data ?? {}) as Record<string, unknown>;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-brand">
                        {new Date(s.created_at).toLocaleString('vi-VN')}
                      </TableCell>
                      {cols.map((c) => (
                        <TableCell key={c} className="text-sm">
                          {String(d[c] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
