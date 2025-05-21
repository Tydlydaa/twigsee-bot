// bot/index.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

(async () => {
  console.log("GOOGLE_CREDENTIALS_JSON exists?", !!process.env.GOOGLE_CREDENTIALS_JSON);

  const email = process.env.TWIGSEE_EMAIL;
  const password = process.env.TWIGSEE_PASSWORD;
  const downloadPath = path.resolve(__dirname, 'downloads');

  if (!fs.existsSync(downloadPath)) {
    console.log("📁 Vytvářím složku downloads...");
    fs.mkdirSync(downloadPath, { recursive: true });
  }

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

  console.log("Spouštím prohlížeč...");
  await page.goto('https://admin.twigsee.com');
  await new Promise(resolve => setTimeout(resolve, 1000));

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

  const testSchool = "Dětská skupina Školička Keltičkova";

  // 🗓️ Vygeneruj pracovní dny v květnu 2025
  const testDates = [];
  for (let d = dayjs('2025-05-01'); d.isBefore('2025-06-01'); d = d.add(1, 'day')) {
    const day = d.day(); // 0 = neděle, 6 = sobota
    if (day !== 0 && day !== 6) {
      testDates.push(d);
    }
  }

  for (const targetDate of testDates) {
    const date = targetDate.format('DD.MM.YYYY');
    const dateLabel = targetDate.format('YYYY-MM-DD');
    const schoolName = testSchool;

    console.log(`Zpracovávám školku: ${schoolName} pro datum: ${date}`);

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
      console.error(`⛔ Chyba při zpracování: ${schoolName} – ${date}`, err.message);
    }
  }

  await browser.close();
  console.log("✅ Hotovo. Prohlížeč zavřen.");
})();
