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
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const downloadDir = path.resolve(__dirname, '../bot/downloads');

if (!fs.existsSync(downloadDir)) {
  console.log("📁 Vytvářím chybějící složku downloads...");
  fs.mkdirSync(downloadDir, { recursive: true });
}

const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.xls'));
if (files.length === 0) {
  console.log('⚠️ Žádné soubory k nahrání. Končím.');
  process.exit(0);
}

const cleanName = (fullName) => {
  return fullName.replace(/^(Dětská skupina|Lesní mateřská škola)\s+/, '').trim();
};

const getSheet = async (name) => {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: name } } }],
      },
    });
    console.log(`🆕 Vytvořen sheet: ${name}`);
  } catch (e) {
    if (!e.message.includes('already exists')) console.error(e);
  }
};

const appendToSheet = async (sheetName, rows) => {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
};

const upsertStatRow = async (headers, row) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Statistiky!A1:Z1000',
  });
  const rows = response.data.values || [];
  const headerRow = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.length > 1 ? rows.slice(1) : [];

  const rowKey = row.slice(0, 2).join('||');
  const existingIndex = dataRows.findIndex(r => r.slice(0, 2).join('||') === rowKey);

  const allHeaders = Array.from(new Set([...headerRow, ...headers]));
  const newRow = new Array(allHeaders.length).fill('');
  for (let i = 0; i < allHeaders.length; i++) {
    const header = allHeaders[i];
    const indexInNew = headers.indexOf(header);
    if (indexInNew >= 0) newRow[i] = row[indexInNew];
  }

  const updateValues = [allHeaders, ...dataRows];
  if (existingIndex >= 0) {
    updateValues[existingIndex + 1] = newRow;
  } else {
    updateValues.push(newRow);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Statistiky!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: updateValues },
  });
};

(async () => {
  await getSheet('Statistiky');

  for (const file of files) {
    const workbook = XLSX.readFile(path.join(downloadDir, file));
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const match = file.match(/^dochazka_(\d{4}-\d{2}-\d{2})_(.+)\.xls$/);
    if (!match) continue;
    const [_, date, fullNameRaw] = match;
    const fullName = fullNameRaw.replace(/_/g, ' ');
    const sheetTab = cleanName(fullName);

    const output = data.slice(1).map(row => [date, ...row]);
    const header = ["Datum", ...(data[0] || [])];

    await getSheet(sheetTab);
    await appendToSheet(sheetTab, [header, ...output]);
    console.log(`✔ Data z ${file} nahrána do listu ${sheetTab}`);

    const statusIndex = header.indexOf("Status");
    const counts = {};
    for (const row of output) {
      const status = row[statusIndex];
      if (!counts[status]) counts[status] = 0;
      counts[status]++;
    }

    const statHeaders = ["Datum", "Školka", ...Object.keys(counts)];
    const statRow = [date, sheetTab, ...Object.values(counts)];
    await upsertStatRow(statHeaders, statRow);
    console.log(`📊 Statistiky pro ${sheetTab} (${date}) zapsány.`);
  }
})();
