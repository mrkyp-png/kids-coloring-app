// goal-previews.json을 읽어 레벨별 색상 검토용 정적 HTML 갤러리를 생성한다.
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'goal-previews.json'), 'utf8'));

const byLevel = {};
data.forEach((t) => { (byLevel[t.difficulty] = byLevel[t.difficulty] || []).push(t); });

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

const CATEGORY_NAMES = {
  1: 'Sky & Simple Shapes', 2: 'Fruits', 3: 'Land Animals', 4: 'Birds & Farm Animals',
  5: 'Sea Creatures', 6: 'Bugs', 7: 'Vehicles', 8: 'Desserts & Treats',
  9: 'Plants & Nature', 10: 'Everyday Objects'
};

const navLinks = Array.from({ length: 10 }, (_, i) => i + 1)
  .map((lv) => `<a href="#lv${lv}">${lv}</a>`)
  .join('');

const sections = Array.from({ length: 10 }, (_, i) => i + 1).map((lv) => {
  const items = byLevel[lv] || [];
  const cards = items.map((t) => `
      <figure class="card">
        <img src="${t.dataUrl}" alt="${esc(t.name)} goal colors" width="90" height="90" loading="lazy">
        <figcaption>${esc(t.emoji)} ${esc(t.name)}</figcaption>
      </figure>`).join('');
  return `
    <section class="level-section" id="lv${lv}">
      <h2><span class="lv-badge">${lv}</span>Level ${lv} · ${esc(CATEGORY_NAMES[lv] || '')} <span class="count">${items.length} pictures</span></h2>
      <div class="card-grid">${cards}
      </div>
    </section>`;
}).join('\n');

const html = `<!doctype html>
<title>Color Review — Coloring Fun</title>
<meta name="description" content="Goal-color review grid for all 100 coloring templates, grouped by level">
<style>
:root {
  --bg: #FFF8ED;
  --surface: #FFFFFF;
  --surface-2: #FBF3E4;
  --ink: #3A3A3A;
  --muted: #8A7F6E;
  --brand: #6C5CE7;
  --brand-soft: #EFE9FF;
  --border: #EEE2CC;
  --shadow: 0 4px 14px rgba(60, 40, 10, 0.08);
  --radius: 14px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #1C1810;
    --surface: #26211A;
    --surface-2: #211D17;
    --ink: #F2EADA;
    --muted: #A79A82;
    --brand: #A594FF;
    --brand-soft: #332B55;
    --border: #3A3226;
    --shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
}
:root[data-theme="dark"] {
  --bg: #1C1810;
  --surface: #26211A;
  --surface-2: #211D17;
  --ink: #F2EADA;
  --muted: #A79A82;
  --brand: #A594FF;
  --brand-soft: #332B55;
  --border: #3A3226;
  --shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
}
header.top {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 14px 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 14px;
}
header.top h1 {
  font-size: 1.15rem;
  margin: 0;
  color: var(--brand);
  white-space: nowrap;
}
header.top p {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
  flex: 1 1 auto;
  min-width: 200px;
}
nav.jump {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
nav.jump a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 0.8rem;
  font-weight: 700;
  text-decoration: none;
}
main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 80px;
}
.level-section {
  scroll-margin-top: 70px;
  margin-bottom: 40px;
}
.level-section h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  margin: 0 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.lv-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 800;
}
.count {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 400;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}
.card {
  margin: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.card img {
  width: 74px;
  height: 74px;
  object-fit: contain;
  background: var(--surface-2);
  border-radius: 10px;
}
.card figcaption {
  font-size: 0.78rem;
  text-align: center;
  color: var(--ink);
}
</style>
<header class="top">
  <h1>🎨 Color Review</h1>
  <p>Current auto-assigned goal colors for all 100 templates, grouped by level. Point out which ones to fix.</p>
  <nav class="jump">${navLinks}</nav>
</header>
<main>
${sections}
</main>
`;

fs.writeFileSync(path.resolve(__dirname, '..', 'color-review.html'), html, 'utf8');
console.log('wrote color-review.html,', html.length, 'bytes');
