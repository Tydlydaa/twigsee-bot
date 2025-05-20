const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

(async () => {
  const email = process.env.TWIGSEE_EMAIL;
  const password = process.env.TWIGSEE_PASSWORD;
  const schoolName = process.env.SCHOOL_NAME;
  const downloadPath = path.resolve(__dirname, 'downloads');
  const today = dayjs().format('DD.MM.YYYY');

  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

  console.log("Spouštím prohlížeč...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  console.log("Otevírám přihlašovací stránku...");
  await page.goto('https://admin.twigsee.com');
  await page.waitForTimeout(1000); // malá pauza na načtení skriptů

  console.log("Vyplňuji přihlašovací údaje...");
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);

  console.log("Čekám na tlačítko Přihlásit...");
  await page.waitForSelector('input[type="submit"]');
  console.log("Klikám na tlačítko Přihlásit...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('input[type="submit"]')
  ]);
  console.log("Přihlášení proběhlo.");

  console.log("Čekám na výběr školky...");
  await page.waitForSelector('select[name="sch__id"]');
  await page.select('select[name="sch__id"]', schoolName);
  console.log(`Vybral jsem školku: ${schoolName}`);

  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log("Přepínám na stránku s docházkou...");
  await page.goto('https://admin.twigsee.com/child-attendance/list');

  const exportUrl = `https://admin.twigsee.com/child-attendance/export/ajax/1?chiatt__date=${today}`;
  const downloadTarget = path.join(downloadPath, `dochazka_${today}.xls`);

  console.log(`Stahuji exportovaný soubor z: ${exportUrl}`);
  const downloadPage = await browser.newPage();
  const viewSource = await downloadPage.goto(exportUrl);
  fs.writeFileSync(downloadTarget, await viewSource.buffer());

  console.log(`Soubor uložen: ${downloadTarget}`);

  await browser.close();
  console.log("Hotovo. Prohlížeč zavřen.");
})();
