import { createAdminClient } from '@/lib/supabase/admin';
import { addTabToMasterSheet } from './google-sheets';
import { createAndDeployScript } from './apps-script';
import { pushFormHtml, ensureVercelConfig } from './github';
import { verifyFormLive } from './verify';
import { HTML_PLACEHOLDER_APPS_SCRIPT, HTML_PLACEHOLDER_FORM_SLUG } from '@/lib/ai/prompts';

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/webhooks/submission`;

  // 1. Ensure vercel.json (idempotent)
  try {
    await ensureVercelConfig();
    await logStep(opts.formId, 'ensure_vercel_config', 'success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push('vercel_config: ' + msg);
    await logStep(opts.formId, 'ensure_vercel_config', 'failed', msg);
  }

  // 2. Add tab to Master Sheet
  let tabName = '';
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

  // 3. Create + deploy Apps Script
  let appsScriptUrl = '';
  let appsScriptId = '';
  let appsScriptOk = false;
  try {
    const r = await createAndDeployScript({
      formSlug: opts.slug,
      sheetId: process.env.GOOGLE_MASTER_SHEET_ID!,
      tabName,
      webhookUrl,
    });
    appsScriptUrl = r.webAppUrl;
    appsScriptId = r.scriptId;
    appsScriptOk = true;
    await logStep(opts.formId, 'apps_script_deploy', 'success', `scriptId=${appsScriptId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push('apps_script: ' + msg);
    await logStep(opts.formId, 'apps_script_deploy', 'failed', msg);
    // continue — push HTML with placeholder so user can retry
  }

  // 4. Replace placeholders in HTML
  let finalHtml = opts.html;
  if (appsScriptOk) {
    finalHtml = finalHtml.split(HTML_PLACEHOLDER_APPS_SCRIPT).join(appsScriptUrl);
  }
  finalHtml = finalHtml.split(HTML_PLACEHOLDER_FORM_SLUG).join(opts.slug);

  // 5. Push HTML to anform-form-deployments
  try {
    await pushFormHtml({ slug: opts.slug, html: finalHtml });
    await logStep(opts.formId, 'push_html', 'success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push('github_push: ' + msg);
    await logStep(opts.formId, 'push_html', 'failed', msg);
    return { ok: false, errors };
  }

  // 6. Verify
  const live = await verifyFormLive(opts.slug, 150000);
  await logStep(opts.formId, 'verify', live ? 'success' : 'failed', live ? 'live' : 'timeout');

  const formUrl = `${process.env.ANFORM_FORMS_BASE_URL ?? 'https://form.anvui.edu.vn'}/${opts.slug}/`;

  // 7. Update form row
  const updates: Record<string, unknown> = {
    apps_script_url: appsScriptOk ? appsScriptUrl : null,
    apps_script_id: appsScriptOk ? appsScriptId : null,
    sheet_tab_name: tabName,
    form_url: formUrl,
    status: live && appsScriptOk ? 'deployed' : 'draft',
    deployment_status: !appsScriptOk
      ? 'apps_script_failed'
      : live
        ? 'deployed'
        : 'verify_failed',
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('forms') as any).update(updates).eq('id', opts.formId);

  return {
    ok: live && appsScriptOk,
    formUrl,
    appsScriptUrl: appsScriptOk ? appsScriptUrl : undefined,
    appsScriptId: appsScriptOk ? appsScriptId : undefined,
    sheetTabName: tabName,
    errors: errors.length ? errors : undefined,
  };
}
