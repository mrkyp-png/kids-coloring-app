const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = process.env.LOCAL_SERVER_URL || ('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.goto(INDEX_URL, { waitUntil: 'load' });
  const ids = await page.evaluate(() => COLORING_TEMPLATES.map((t) => t.id));
  let allOk = true;
  for (const id of ids) {
    const info = await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), id);
    const missing = info.targetColors.filter((c) => !info.paletteColors.includes(c));
    if (missing.length) {
      allOk = false;
      console.log('MISSING', id, missing);
    }
  }
  console.log(allOk ? 'ALL TARGET COLORS COVERED BY PALETTE' : 'SOME MISSING');
  await browser.close();
})();
