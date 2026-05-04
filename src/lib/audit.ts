import { createAdminClient } from './supabase/admin';
import type { Database } from '@/types/database';

type AuditInsert = Database['public']['Tables']['admin_audit_log']['Insert'];
type AuditAction = AuditInsert['action'];

export async function logAdminAction(entry: {
  adminEmail: string;
  action: AuditAction;
  formId?: string | null;
  formSlug?: string | null;
  targetOwnerEmail?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const row: AuditInsert = {
      admin_email: entry.adminEmail.toLowerCase().trim(),
      action: entry.action,
      target_form_id: entry.formId ?? null,
      target_form_slug: entry.formSlug ?? null,
      target_owner_email: entry.targetOwnerEmail?.toLowerCase().trim() ?? null,
      metadata: (entry.metadata ?? null) as AuditInsert['metadata'],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('admin_audit_log') as any).insert(row);
  } catch (e) {
    // Best-effort: never block the request on audit write failure.
    console.error('[audit]', e);
  }
}
