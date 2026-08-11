// PWA 아이콘(icon-192.png, icon-512.png) 생성 스크립트.
// 2026-08-11: "앱 이미지도 캐릭터 있어야지" 요청으로, 예전 색깔 점 4개짜리 아이콘(순수 zlib
// 픽셀 인코딩 방식)에서 요정(fairygirl) 캐릭터가 들어간 아이콘으로 교체. Puppeteer로 실제
// 브랜드색 배경 + 흰 원 배지 + 캐릭터 SVG를 그려서 스크린샷으로 PNG를 뽑는다.
// manifest.json이 이 파일들을 purpose:"maskable"로도 쓰기 때문에, 배경은 모서리까지 꽉 채우고
// (투명/둥근모서리 없음) 실제 캐릭터는 중앙 80% 안전영역에만 두었다 — OS가 자기 모양(원/스퀴클
// 등)으로 마스킹해도 중요한 부분이 안 잘리게 하는 maskable 아이콘 스펙 규칙.
// 실행: node scripts/make-icons.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function buildHtml(size) {
  // maskable 안전영역(중앙 80% 지름) 안에 배지+캐릭터를 담는다.
  const badgeSize = Math.round(size * 0.62);
  const imgSize = Math.round(size * 0.53);
  const imgPath = path.join(__dirname, '..', 'assets', 'emoji', 'boss-fairygirl-icon.svg').replace(/\\/g, '/');
  // 2026-08-11: "캐릭터만 있으니 밋밋하다" -> 반짝이(✨) 4개로 포인트 추가(처음 2개 요청 후 "4개
  // 정도 추가해" 추가 요청). 배지(원, 반지름 0.31*size) 바로 바깥, maskable 안전영역(반지름
  // 0.4*size) 안쪽인 반지름 0.36*size 위치에 90도씩 4개(정사각형 대각선 방향).
  const sparkleRadius = size * 0.36;
  const sparkleSize = Math.round(size * 0.075);
  const angles = [45, 135, 225, 315];
  const sparkles = angles.map((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    const dx = Math.round(sparkleRadius * Math.cos(rad));
    const dy = Math.round(sparkleRadius * Math.sin(rad));
    return `<span class="sparkle" style="top: calc(50% - ${sparkleSize / 2}px + ${dy}px); left: calc(50% - ${sparkleSize / 2}px + ${dx}px);">✨</span>`;
  }).join('\n      ');
  return `<!DOCTYPE html><html><head><style>
    html, body { margin:0; padding:0; }
    #icon {
      position: relative;
      width: ${size}px; height: ${size}px;
      background: #6C5CE7; /* 모서리까지 꽉 채움 — maskable 배경 규칙 */
      display: flex; align-items: center; justify-content: center;
    }
    #badge {
      width: ${badgeSize}px; height: ${badgeSize}px;
      border-radius: 50%;
      background: #FFFFFF;
      display: flex; align-items: center; justify-content: center;
    }
    #badge img { width: ${imgSize}px; height: ${imgSize}px; object-fit: contain; }
    .sparkle {
      position: absolute;
      font-size: ${sparkleSize}px;
      line-height: 1;
    }
  </style></head><body>
    <div id="icon">
      ${sparkles}
      <div id="badge"><img src="file:///${imgPath}"></div>
    </div>
  </body></html>`;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: false });
  const page = await browser.newPage();
  const outDir = process.argv[2] || path.join(__dirname, '..', 'icons');
  for (const size of [192, 512]) {
    await page.setViewport({ width: size, height: size });
    const html = buildHtml(size);
    const tmpFile = path.join(require('os').tmpdir(), 'icon-tmp-' + size + '.html');
    fs.writeFileSync(tmpFile, html);
    await page.goto('file:///' + tmpFile.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 150));
    const outPath = path.join(outDir, 'icon-' + size + '.png');
    await page.screenshot({ path: outPath });
    console.log('wrote', outPath);
  }
  await browser.close();
})();
