import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Inbox } from 'lucide-react';
import HtmlPreview from '@/components/form-preview/HtmlPreview';
import GenerateButton from './GenerateButton';
import DeployButton from './DeployButton';
import type { Database } from '@/types/database';
import type { FormBrief } from '@/types/form-brief';

type FormRow = Database['public']['Tables']['forms']['Row'];

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('forms').select('*').eq('id', id).single();
  if (error || !data) notFound();
  const form = data as unknown as FormRow;
  const brief = form.brief as unknown as FormBrief;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-forest truncate">{form.title}</h1>
            <Badge
              variant="secondary"
              className={form.status === 'deployed' ? 'bg-forest/10 text-forest' : 'bg-honey/20 text-honey'}
            >
              {form.status === 'deployed' ? 'Đã live' : 'Nháp'}
            </Badge>
          </div>
          <p className="text-sm text-muted-brand">/{form.slug}</p>
          {form.status === 'deployed' && form.form_url && (
            <a
              href={form.form_url}
              target="_blank"
              rel="noreferrer"
              className="text-honey hover:underline text-sm inline-flex items-center gap-1 mt-1"
            >
              {form.form_url}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <Link href={`/forms/${form.id}/submissions`}>
          <button className="px-4 py-2 rounded-lg border border-soft-line hover:bg-paper text-sm flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            {form.submission_count} đăng ký
          </button>
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-forest">Brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DefRow label="Tagline" value={brief.subtitle} />
              <DefRow label="Tổ chức" value={brief.organizerName} />
              <DefRow label="Số buổi" value={`${brief.sessions.length}`} />
              <DefRow label="Học viên có sẵn" value={`${brief.database.length} dòng`} />
              <DefRow label="Theme" value={brief.branding.preset} />
              <DefRow label="Kiểm tra trùng" value={brief.settings.duplicateCheck} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-forest">Hành động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <GenerateButton formId={form.id} hasHtml={!!form.current_html} />
              <DeployButton
                formId={form.id}
                hasHtml={!!form.current_html}
                isDeployed={form.status === 'deployed'}
              />
              {form.deployment_status === 'apps_script_failed' && (
                <p className="text-xs text-red-600">
                  Apps Script deploy fail — nhấn lại nút Deploy để retry.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-forest">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <HtmlPreview html={form.current_html} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DefRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-brand">{label}</span>
      <span className="text-ink text-right truncate">{value}</span>
    </div>
  );
}
