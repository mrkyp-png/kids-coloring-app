const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.goto(INDEX_URL, { waitUntil: 'load' });
  const ids = process.argv.slice(2);
  for (const id of ids) {
    const info = await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), id);
    const sorted = info.sizes.slice().sort((a, b) => a - b);
    console.log(id, 'count=', info.regionCount, 'sizes(sorted)=', sorted.join(','));
  }
  await browser.close();
})();
