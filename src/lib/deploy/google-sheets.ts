import { withRetry } from '@/lib/utils/retry';
import { getSheets } from '@/lib/google/auth';
import { makeTabName } from '@/lib/utils/slugify';

const HEADER = ['timestamp', 'name', 'email', 'phone', 'klass', 'sessions', 'sessionIds', 'meta'];

export async function addTabToMasterSheet(slug: string): Promise<{ tabName: string; sheetId: number }> {
  const sheetId = process.env.GOOGLE_MASTER_SHEET_ID!;
  const sheets = getSheets();
  const tabName = makeTabName(slug);

  return withRetry(async () => {
    // Add new sheet (tab)
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: tabName, gridProperties: { rowCount: 2000, columnCount: HEADER.length } },
            },
          },
        ],
      },
    });

    const newSheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId;
    if (newSheetId === undefined || newSheetId === null) {
      throw new Error('addSheet returned no sheetId');
    }

    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    });

    // Bold header
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId: newSheetId, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      },
    });

    return { tabName, sheetId: newSheetId };
  }, `addTabToMasterSheet(${slug})`);
}
