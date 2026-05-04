import { createAdminClient } from '@/lib/supabase/admin';
import { addTabToMasterSheet } from './google-sheets';
import { pushFormHtml, ensureVercelConfig } from './github';
import { verifyFormLive, verifySubmitEndpoint } from './verify';
import {
  HTML_PLACEHOLDER_APPS_SCRIPT,
  HTML_PLACEHOLDER_SUBMIT_URL,
  HTML_PLACEHOLDER_FORM_SLUG,
} from '@/lib/ai/prompts';

function getAnformBaseUrl(): string {
  const explicit = process.env.ANFORM_PUBLIC_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const next = process.env.NEXT_PUBLIC_APP_URL;
  if (next && !next.startsWith('http://localhost')) return next.replace(/\/$/, '');
  return 'https://anform.anvui.edu.vn';
}

export function buildSubmitUrl(slug: string): string {
  return `${getAnformBaseUrl()}/api/forms/submit/${slug}`;
}

interface DeployResult {
  ok: boolean;
  formUrl?: string;
  appsScriptUrl?: string;
  appsScriptId?: string;
  sheetTabName?: string;
  errors?: string[];
}

async function logStep(formId: string, step: string, status: 'success' | 'failed' | 'retrying', message?: string, payload?: unknown) {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('deploy_logs') as any).insert({
    form_id: formId,
    step,
    status,
    message: message?.slice(0, 1000),
    payload: (payload ?? null) as unknown,
  });
}

export async function deployForm(opts: {
  formId: string;
  slug: string;
  html: string;
}): Promise<DeployResult> {
  const errors: string[] = [];
  const admin = createAdminClient();
  const submitUrl = buildSubmitUrl(opts.slug);

  // 1. Ensure vercel.json (idempotent)
  try {
    await ensureVercelConfig();
    await logStep(opts.formId, 'ensure_vercel_config', 'success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push('vercel_config: ' + msg);
    await logStep(opts.formId, 'ensure_vercel_config', 'failed', msg);
  }

  // 2. Add tab to Master Sheet (idempotent — reuse if existing form has tab)
  let tabName = '';
  const existingForm = await admin
    .from('forms')
    .select('sheet_tab_name')
    .eq('id', opts.formId)
    .single();
  const existingTab = (existingForm.data as { sheet_tab_name?: string | null } | null)
    ?.sheet_tab_name;
  if (existingTab) {
    tabName = existingTab;
    await logStep(opts.formId, 'add_sheet_tab', 'success', `reused tabName=${tabName}`);
  } else {
    try {
      const r = await addTabToMasterSheet(opts.slug);
      tabName = r.tabName;
      await logStep(opts.formId, 'add_sheet_tab', 'success', `tabName=${tabName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push('sheet_tab: ' + msg);
      await logStep(opts.formId, 'add_sheet_tab', 'failed', msg);
      return { ok: false, errors };
    }
  }

  // Persist tab name now so the submit endpoint can find it during verification.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('forms') as any).update({ sheet_tab_name: tabName }).eq('id', opts.formId);

  // 3. Replace placeholders in HTML — submit URL replaces the legacy Apps Script
  // placeholder so previously-generated templates keep working.
  let finalHtml = opts.html;
  finalHtml = finalHtml.split(HTML_PLACEHOLDER_SUBMIT_URL).join(submitUrl);
  finalHtml = finalHtml.split(HTML_PLACEHOLDER_APPS_SCRIPT).join(submitUrl);
  finalHtml = finalHtml.split(HTML_PLACEHOLDER_FORM_SLUG).join(opts.slug);

  // 4. Push HTML to anform-form-deployments
  try {
    await pushFormHtml({ slug: opts.slug, html: finalHtml });
    await logStep(opts.formId, 'push_html', 'success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push('github_push: ' + msg);
    await logStep(opts.formId, 'push_html', 'failed', msg);
    return { ok: false, errors };
  }

  // 5. Verify form HTML is live
  const live = await verifyFormLive(opts.slug, 150000);
  await logStep(opts.formId, 'verify_html', live ? 'success' : 'failed', live ? 'live' : 'timeout');

  // 6. Verify submit endpoint actually accepts a POST (catches Apps Script /
  // route mis-deploys before a real user hits the form).
  const submitCheck = await verifySubmitEndpoint(submitUrl);
  await logStep(
    opts.formId,
    'verify_submit',
    submitCheck.ok ? 'success' : 'failed',
    submitCheck.ok ? 'ok' : submitCheck.error,
  );

  const formUrl = `${process.env.ANFORM_FORMS_BASE_URL ?? 'https://form.anvui.edu.vn'}/${opts.slug}/`;
  const allOk = live && submitCheck.ok;

  // 7. Update form row
  const updates: Record<string, unknown> = {
    apps_script_url: submitUrl, // Reused column — now stores the submit endpoint.
    sheet_tab_name: tabName,
    form_url: formUrl,
    status: allOk ? 'deployed' : 'draft',
    deployment_status: !live ? 'verify_failed' : !submitCheck.ok ? 'submit_failed' : 'deployed',
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('forms') as any).update(updates).eq('id', opts.formId);

  return {
    ok: allOk,
    formUrl,
    appsScriptUrl: submitUrl,
    sheetTabName: tabName,
    errors: errors.length ? errors : undefined,
  };
}
