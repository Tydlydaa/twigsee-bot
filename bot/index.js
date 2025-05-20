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

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], defaultViewport: null });
  const page = await browser.newPage();

  await page.goto('https://admin.twigsee.com');
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);

  await page.waitForSelector('select[name="sch__id"]');
  await page.select('select[name="sch__id"]', schoolName); // may need logic here

  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.goto('https://admin.twigsee.com/child-attendance/list');

  const exportUrl = `https://admin.twigsee.com/child-attendance/export/ajax/1?chiatt__date=${today}`;
  const downloadTarget = path.join(downloadPath, `dochazka_${today}.xls`);

  const downloadPage = await browser.newPage();
  const viewSource = await downloadPage.goto(exportUrl);
  fs.writeFileSync(downloadTarget, await viewSource.buffer());

  await browser.close();
})();
