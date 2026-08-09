// 전체 도안 슬리버(1~9px 미세 조각) 스윕: 의도치 않은 겹침으로 생긴
// 눈에 안 보이는/탭 불가능한 조각이 있는지 전수 확인한다.
const path = require('path');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = process.env.LOCAL_SERVER_URL || ('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'));
const SLIVER_THRESHOLD = 10;

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.goto(INDEX_URL, { waitUntil: 'load' });
  const ids = await page.evaluate(() => COLORING_TEMPLATES.map((t) => t.id));

  const flagged = [];
  for (const id of ids) {
    const info = await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), id);
    const slivers = info.sizes.filter((s) => s < SLIVER_THRESHOLD);
    if (slivers.length > 0) {
      flagged.push({ id, regionCount: info.regionCount, slivers });
    }
  }

  if (flagged.length === 0) {
    console.log('슬리버 없음 - 전체 도안 깨끗함');
  } else {
    console.log('슬리버 의심 도안:');
    flagged.forEach((f) => console.log(' -', f.id, 'regions=' + f.regionCount, 'slivers=' + JSON.stringify(f.slivers)));
  }

  await browser.close();
})();
