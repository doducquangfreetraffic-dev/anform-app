import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/whitelist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, Trash2, Rocket, Inbox, Download, ShieldAlert } from 'lucide-react';
import type { Database } from '@/types/database';

type AuditRow = Database['public']['Tables']['admin_audit_log']['Row'];

const ACTION_META: Record<
  AuditRow['action'],
  { label: string; icon: React.ReactNode; tone: string }
> = {
  view_form: { label: 'Xem form', icon: <Eye className="w-3 h-3" />, tone: 'bg-blue-50 text-blue-700' },
  edit_form: { label: 'Sửa form', icon: <Pencil className="w-3 h-3" />, tone: 'bg-honey/20 text-honey' },
  deploy_form: { label: 'Deploy form', icon: <Rocket className="w-3 h-3" />, tone: 'bg-forest/10 text-forest' },
  delete_form: { label: 'Xóa form', icon: <Trash2 className="w-3 h-3" />, tone: 'bg-red-50 text-red-700' },
  view_submissions: { label: 'Xem submissions', icon: <Inbox className="w-3 h-3" />, tone: 'bg-purple-50 text-purple-700' },
  export_csv: { label: 'Xuất CSV', icon: <Download className="w-3 h-3" />, tone: 'bg-slate-100 text-slate-700' },
};

export default async function AuditLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await getUserRole(user?.email);
  if (role !== 'admin') redirect('/settings');

  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (data ?? []) as AuditRow[];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-honey" />
            <h1 className="text-2xl font-bold text-forest">Audit log</h1>
          </div>
          <p className="text-sm text-muted-brand mt-1">
            100 hoạt động gần nhất của admin trên forms không phải của họ.
          </p>
        </div>
        <Link
          href="/settings"
          className="text-sm text-muted-brand hover:text-forest"
        >
          ← Cài đặt
        </Link>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">
            Lỗi tải audit log: {error.message}
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-muted-brand mx-auto" />
            <p className="text-muted-brand">Chưa có hoạt động nào được ghi.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-forest text-base">
              {rows.length} hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-soft-line">
              {rows.map((r) => {
                const meta = ACTION_META[r.action];
                return (
                  <div key={r.id} className="px-6 py-3 hover:bg-paper transition">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`${meta.tone} flex items-center gap-1`}
                      >
                        {meta.icon}
                        {meta.label}
                      </Badge>
                      <span className="text-sm text-ink truncate max-w-[200px]">
                        {r.admin_email}
                      </span>
                      <span className="text-muted-brand text-xs">→</span>
                      {r.target_form_slug ? (
                        r.target_form_id ? (
                          <Link
                            href={`/forms/${r.target_form_id}`}
                            className="text-sm text-forest hover:underline truncate max-w-[280px]"
                          >
                            /{r.target_form_slug}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-brand line-through truncate">
                            /{r.target_form_slug}
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-muted-brand">—</span>
                      )}
                      {r.target_owner_email && (
                        <span className="text-xs text-muted-brand">
                          (chủ: {r.target_owner_email})
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-brand whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    {r.metadata && Object.keys(r.metadata as object).length > 0 && (
                      <div className="text-[11px] text-muted-brand mt-1 ml-1 font-mono">
                        {JSON.stringify(r.metadata)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
