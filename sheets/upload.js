// sheets/upload.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { google } = require('googleapis');
const dayjs = require('dayjs');

const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_JSON, 'base64').toString('utf8'));
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '161OmOKLIaz4GHER5u8TPPDQB4yV0eX0R72EM-sQBhQA'; // TODO: replace manually or use env

const downloadDir = path.resolve(__dirname, '../bot/downloads');
const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.xls'));

const cleanName = (fullName) => {
  return fullName.replace(/^(Dětská skupina|Lesní mateřská škola)\s+/, '').trim();
};

(async () => {
  for (const file of files) {
    const workbook = XLSX.readFile(path.join(downloadDir, file));
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // získej název školky z jména souboru a datum z obsahu
    const match = file.match(/^dochazka_(\d{4}-\d{2}-\d{2})_(.+)\.xls$/);
    if (!match) continue;
    const [_, date, fullNameRaw] = match;
    const fullName = fullNameRaw.replace(/_/g, ' ');
    const sheetTab = cleanName(fullName);

    // doplníme sloupec Datum
    const output = data.slice(1).map(row => [date, ...row]);
    const header = ["Datum", ...(data[0] || [])];

    // vytvoř sheet pokud neexistuje
    try {
      await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: sheetTab } }
          }]
        }
      });
      console.log(`🆕 Vytvořen sheet: ${sheetTab}`);
    } catch (e) {
      // pravděpodobně už existuje
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetTab}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [header, ...output],
      },
    });

    console.log(`✅ Data z ${file} nahrána do listu ${sheetTab}`);
  }
})();
