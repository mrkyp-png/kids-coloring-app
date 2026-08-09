const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.goto(INDEX_URL, { waitUntil: 'load' });
  for (const id of process.argv.slice(2)) {
    const info = await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), id);
    console.log(id, JSON.stringify(info.targetColors), 'sizes=' + JSON.stringify(info.sizes));
  }
  await browser.close();
})();
