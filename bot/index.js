// bot/index.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

(async () => {
  console.log("GOOGLE_CREDENTIALS_JSON exists?", !!process.env.GOOGLE_CREDENTIALS_JSON);

  const email = process.env.TWIGSEE_EMAIL;
  const password = process.env.TWIGSEE_PASSWORD;
  const schoolName = process.env.SCHOOL_NAME;
  const downloadPath = path.resolve(__dirname, 'downloads');

  if (!fs.existsSync(downloadPath)) {
    console.log("📁 Vytvářím složku downloads...");
    fs.mkdirSync(downloadPath, { recursive: true });
  }

  const yesterday = dayjs().subtract(1, 'day').format('DD.MM.YYYY');
  const fileDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  console.log("Spouštím prohlížeč...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  console.log("Otevírám přihlašovací stránku...");
  await page.goto('https://admin.twigsee.com');
  await page.waitForTimeout(1000);

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

  await page.goto('https://admin.twigsee.com/user-admin/choice-school');

  await page.waitForSelector('.select2-selection');
  await page.click('.select2-selection');
  await page.waitForSelector('.select2-results__option');

  const schoolNames = await page.$$eval('.select2-results__option', options =>
    options.map(opt => opt.textContent.trim()).filter(name => name && name !== 'Vyberte')
  );

  console.log("Zjištěné školky:", schoolNames);

  for (const fullName of schoolNames) {
    console.log(`Zpracovávám školku: ${fullName}`);
    await page.goto('https://admin.twigsee.com/user-admin/choice-school');
    await page.waitForSelector('.select2-selection');
    await page.click('.select2-selection');
    await page.waitForSelector('.select2-results__option');

    const options = await page.$$('.select2-results__option');
    for (const option of options) {
      const text = await option.evaluate(el => el.textContent.trim());
      if (text === fullName) {
        await option.click();
        break;
      }
    }

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.goto('https://admin.twigsee.com/child-attendance/list');
    await page.waitForTimeout(2000);

    const href = await page.$eval('a.btn-export', el => el.getAttribute('href'));
    const exportUrl = `https://admin.twigsee.com${href}`;
    const filePath = path.join(downloadPath, `dochazka_${fileDate}_${fullName.replace(/\s+/g, '_')}.xls`);

    const viewSource = await page.goto(exportUrl);
    fs.writeFileSync(filePath, await viewSource.buffer());
    console.log(`✔ Staženo: ${path.basename(filePath)}`);
  }

  await browser.close();
  console.log("Hotovo. Prohlížeč zavřen.");
})();
