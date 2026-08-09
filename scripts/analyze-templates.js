// 개발용 분석 스크립트: 기존 도안들의 실제 채색 가능 영역 개수를 측정한다.
// 로컬 Edge를 헤드리스로 띄워 index.html을 로드하고, app.js가 노출하는
// window.__debugOpenTemplate(id) 훅으로 각 도안을 열어 영역 수를 수집한다.
//
// 실행: node scripts/analyze-templates.js
const path = require('path');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = process.env.LOCAL_SERVER_URL || ('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new'
  });
  try {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('[page]', msg.text()));
    page.on('pageerror', (err) => console.error('[pageerror]', err));
    await page.goto(INDEX_URL, { waitUntil: 'load' });

    const ids = await page.evaluate(() => COLORING_TEMPLATES.map((t) => t.id));

    const results = [];
    for (const id of ids) {
      const info = await page.evaluate((tplId) => window.__debugOpenTemplate(tplId), id);
      results.push(info);
    }

    results.sort((a, b) => a.regionCount - b.regionCount);
    console.log('\n=== 영역 개수 오름차순 ===');
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.id.padEnd(10)} regions=${r.regionCount}`);
    });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
