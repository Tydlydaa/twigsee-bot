const fs = require('fs');
const { google } = require('googleapis');
const xlsx = require('xlsx');
const dayjs = require('dayjs');

async function uploadToSheet() {
  const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_JSON, 'base64').toString('utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = '161OmOKLIaz4GHER5u8TPPDQB4yV0eX0R72EM-sQBhQA';

  const today = dayjs().format('DD.MM.YYYY');
  const filePath = './bot/downloads/dochazka_' + today + '.xls';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const withDates = rows.map(row => [today, ...row]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'List1!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: withDates }
  });
}

uploadToSheet().catch(console.error);
