// 검증 스크립트 전용 초경량 정적 서버 (file:// 프로토콜에서 이미지 로드시 발생하는
// canvas cross-origin taint 문제를 피하려고 http:// origin으로 서빙한다).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 8843;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg'
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const full = path.join(ROOT, p);
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-store' // 미리보기는 항상 최신 파일을 봐야 하므로 브라우저 캐시 금지
    });
    res.end(data);
  });
}).listen(PORT, () => console.log('serving on http://localhost:' + PORT));
