// bot/index.js (Puppeteer skript pro víc školek)
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

(async () => {
  const email = process.env.TWIGSEE_EMAIL;
  const password = process.env.TWIGSEE_PASSWORD;
  const downloadPath = path.resolve(__dirname, 'downloads');
  const date = dayjs().subtract(1, 'day').format('DD.MM.YYYY');
  const dateLabel = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log("Logging in...");
  await page.goto('https://admin.twigsee.com');
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('input[type="submit"]')
  ]);

  await page.goto('https://admin.twigsee.com/user-admin/choice-school');
  await page.waitForSelector('.select2-selection');
  await page.click('.select2-selection');
  await page.waitForSelector('.select2-results__option');

  const options = await page.$$('.select2-results__option');
  const ignored = ['Vyberte', 'Choose', 'Select', 'Zvolte'];
  const schoolNames = [];
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent.trim());
    if (text && !ignored.includes(text)) schoolNames.push(text);
  }
  console.log('Zjištěné školky:', schoolNames);

  for (const schoolName of schoolNames) {
    console.log(`Zpracovávám školku: ${schoolName}`);

    try {
      await page.goto('https://admin.twigsee.com/user-admin/choice-school');
      await page.waitForSelector('.select2-selection');
      await page.click('.select2-selection');
      await page.waitForSelector('.select2-results__option');

      const options = await page.$$('.select2-results__option');
      for (const option of options) {
        const text = await option.evaluate(el => el.textContent.trim());
        if (text === schoolName) {
          await option.click();
          break;
        }
      }

      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      await page.goto('https://admin.twigsee.com/child-attendance/list');
      await page.waitForSelector('a.btn-export');
      const href = await page.$eval('a.btn-export', el => el.getAttribute('href'));
      const exportUrl = `https://admin.twigsee.com${href}?chiatt__date=${date}`;

      const buffer = await page.evaluate(async (url) => {
        const res = await fetch(url, { credentials: 'include' });
        const arrayBuffer = await res.arrayBuffer();
        return Array.from(new Uint8Array(arrayBuffer));
      }, exportUrl);

      const fileName = `dochazka_${dateLabel}_${schoolName.replace(/\s+/g, '_')}.xls`;
      fs.writeFileSync(path.join(downloadPath, fileName), Buffer.from(buffer));
      console.log(`✔ Staženo: ${fileName}`);
    } catch (err) {
      console.error(`⛔ Chyba při zpracování školky ${schoolName}:`, err.message);
    }
  }

  await browser.close();
})();
