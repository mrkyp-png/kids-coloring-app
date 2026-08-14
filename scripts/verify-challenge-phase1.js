// 챌린지 모드 Phase 1(LEVEL 1~2)이 실제 UI에서 끝까지 동작하는지, 그리고 기존 Child 모드가
// 이번 변경으로 회귀되지 않았는지 헤드리스로 검증한다.
// 사용: LOCAL_SERVER_URL=http://localhost:8843/index.html node scripts/verify-challenge-phase1.js
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const INDEX_URL = process.env.LOCAL_SERVER_URL || 'http://localhost:8843/index.html';

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: 'new' });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await page.goto(INDEX_URL, { waitUntil: 'load' });
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'load' });
    // 2026-08-14: 챌린지 진입점이 맵 화면 -> 표지 화면(btn-cover-start-challenge)으로 이동.
    // 프로필이 없으면 이름 입력 모달을 거치므로 skip으로 넘긴 뒤 선택 화면 노출을 확인한다.
    await page.evaluate(() => document.getElementById('btn-cover-start-challenge').click());
    await page.evaluate(() => document.getElementById('player-entry-skip').click());

    // 1) 챌린지 선택 화면이 실제로 열리는지 확인
    const selectScreenOpen = await page.evaluate(() => !document.getElementById('challenge-select-screen').hidden);
    if (!selectScreenOpen) throw new Error('챌린지 선택 화면이 열리지 않음');

    // 2) Config 로드 확인
    const cfgOk = await page.evaluate(() => typeof CHALLENGE_CONFIG === 'object' && CHALLENGE_CONFIG.DIFFICULTY_TIME.easy === 30);
    if (!cfgOk) throw new Error('CHALLENGE_CONFIG 로드 실패');

    // 3) 엔진 재사용 확인(회귀 없이 challenge 옵션으로 열리는지)
    const openResult = await page.evaluate(() => window.__debugChallengeOpenTemplate('sun'));
    if (!openResult || openResult.regionCount <= 0) throw new Error('__debugChallengeOpenTemplate 실패');

    // 4) ColorTolerance 옵션이 기존 정확매치 판정을 깨지 않는지(둘 다 같은 도안, tolerance=0 결과가
    //    Child 원래 로직과 동일해야 함 - 완전 안 칠했으니 matched=0 total>0 이어야 정상)
    const exact = await page.evaluate(() => window.__debugComputeCompletion(0));
    if (!(exact.total > 0 && exact.matched === 0)) throw new Error('computeCompletion(0) 회귀 의심: ' + JSON.stringify(exact));

    // 5) Best Score 저장 확인 (직접 함수 호출로 로직만 검증 - 실제 10문제 풀이는 수동 QA에서)
    const bestScoreOk = await page.evaluate(() => {
      const before = Challenge.getBestScore('easy', 1);
      return typeof before === 'number';
    });
    if (!bestScoreOk) throw new Error('Challenge.getBestScore 실패');

    if (pageErrors.length) throw new Error('페이지 에러 발생: ' + pageErrors.join(' | '));

    console.log('✅ 챌린지 모드 Phase 1 기본 검증 통과');
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
