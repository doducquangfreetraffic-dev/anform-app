import { withRetry } from '@/lib/utils/retry';
import { getScript } from '@/lib/google/auth';

const APPSSCRIPT_MANIFEST = JSON.stringify(
  {
    timeZone: 'Asia/Ho_Chi_Minh',
    dependencies: {},
    exceptionLogging: 'STACKDRIVER',
    runtimeVersion: 'V8',
    webapp: { access: 'ANYONE_ANONYMOUS', executeAs: 'USER_DEPLOYING' },
  },
  null,
  2,
);

function buildCodeFile(opts: { sheetId: string; tabName: string; webhookUrl: string; formSlug: string }): string {
  // Use plain string concat — keep template safe from accidental backtick collisions in JSON.
  return `// ANFORM Apps Script — ${opts.formSlug}
// Auto-generated. Do not edit; will be overwritten on next deploy.

const SHEET_ID = ${JSON.stringify(opts.sheetId)};
const TAB_NAME = ${JSON.stringify(opts.tabName)};
const WEBHOOK_URL = ${JSON.stringify(opts.webhookUrl)};
const FORM_SLUG = ${JSON.stringify(opts.formSlug)};

function doGet(e) {
  return ContentService
    .createTextOutput('ANFORM endpoint live: ' + FORM_SLUG)
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    const data = JSON.parse(raw);

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
    if (!sheet) throw new Error('Tab not found: ' + TAB_NAME);

    const row = [
      data.timestamp || new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.klass || '',
      data.sessions || '',
      data.sessionIds || '',
      JSON.stringify(data.meta || {}),
    ];
    sheet.appendRow(row);

    // Best-effort webhook (don't fail registration if webhook fails)
    if (WEBHOOK_URL) {
      try {
        UrlFetchApp.fetch(WEBHOOK_URL, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ formSlug: FORM_SLUG, data: data }),
          muteHttpExceptions: true,
        });
      } catch (whErr) {
        // log only
        Logger.log('webhook failed: ' + whErr);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}

export async function createAndDeployScript(opts: {
  formSlug: string;
  sheetId: string;
  tabName: string;
  webhookUrl: string;
}): Promise<{ scriptId: string; webAppUrl: string; deploymentId: string }> {
  return withRetry(async () => {
    const script = getScript();

    // 1. Create project
    const project = await script.projects.create({
      requestBody: { title: `ANFORM-${opts.formSlug}` },
    });
    const scriptId = project.data.scriptId;
    if (!scriptId) throw new Error('No scriptId in project response');

    // 2. Update content (Code.gs + appsscript.json)
    await script.projects.updateContent({
      scriptId,
      requestBody: {
        files: [
          {
            name: 'Code',
            type: 'SERVER_JS',
            source: buildCodeFile(opts),
          },
          {
            name: 'appsscript',
            type: 'JSON',
            source: APPSSCRIPT_MANIFEST,
          },
        ],
      },
    });

    // 3. Create version
    const version = await script.projects.versions.create({
      scriptId,
      requestBody: { description: 'ANFORM v1' },
    });
    const versionNumber = version.data.versionNumber;
    if (!versionNumber) throw new Error('No versionNumber in version response');

    // 4. Deploy as web app
    const deployment = await script.projects.deployments.create({
      scriptId,
      requestBody: {
        versionNumber,
        manifestFileName: 'appsscript',
        description: 'ANFORM web app',
      },
    });
    const deploymentId = deployment.data.deploymentId;
    if (!deploymentId) throw new Error('No deploymentId in deployment response');

    const webAppUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;
    return { scriptId, webAppUrl, deploymentId };
  }, `createAndDeployScript(${opts.formSlug})`);
}
