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

  // 🧩 Nastavení složky pro stahování
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  console.log("Otevírám přihlašovací stránku...");
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

  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.goto('https://admin.twigsee.com/user-admin/choice-school');

  console.log("Vyhledávám výběr školky...");
  await page.waitForSelector('.select2-selection');
  await page.click('.select2-selection');

  console.log("Čekám na otevření dropdownu...");
  await page.waitForSelector('.select2-results__option');

  console.log("Hledám školku v seznamu...");
  const options = await page.$$('.select2-results__option');
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent.trim());
    if (text.includes(schoolName)) {
      console.log(`Klikám na: ${text}`);
      await option.click();
      break;
    }
  }

  console.log("Školka vybrána.");
  console.log(`Vybral jsem školku: ${schoolName}`);

  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log("Přepínám na stránku s docházkou...");
  await page.goto('https://admin.twigsee.com/child-attendance/list');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 📸 Screenshot pro ladění
  await page.screenshot({ path: 'export-screen.png' });

  console.log("Klikám na tlačítko Export...");
  await page.waitForSelector('a.btn-export');

 await page.click('a.btn-export');
await new Promise(resolve => setTimeout(resolve, 3000));
await page.screenshot({ path: 'after-export-click.png' });
console.log("Kliknutí na Export provedeno, čekal jsem 3 sekundy.");

  console.log(`Soubor exportován: ${path.join(downloadPath, downloadedFile)}`);

  await browser.close();
  console.log("Hotovo. Prohlížeč zavřen.");
})();
