// 순수 Node.js(zlib만 사용)로 PWA 아이콘 PNG를 직접 인코딩하는 스크립트.
// 외부 패키지 의존성 없이 실행 가능: node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- CRC32 ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: none
    rgba.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, y * rowBytes + rowBytes);
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------- 아이콘 드로잉 ----------
function roundedBoxSDF(px, py, halfSize, cornerR) {
  const ax = Math.max(Math.abs(px) - halfSize + cornerR, 0);
  const ay = Math.max(Math.abs(py) - halfSize + cornerR, 0);
  const outside = Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(ax, ay), 0) - cornerR;
  return outside; // <= 0 이면 내부
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const bg = hexToRgb('#6C5CE7');
  const white = [255, 255, 255];
  const dots = [
    { angle: 45, color: hexToRgb('#FF5B5B') },
    { angle: 135, color: hexToRgb('#4D96FF') },
    { angle: 225, color: hexToRgb('#8BD17C') },
    { angle: 315, color: hexToRgb('#FFD166') }
  ];

  const half = size / 2;
  const cornerR = size * 0.22;
  const cx = size / 2, cy = size / 2;
  const rWhite = size * 0.34;
  const rDot = size * 0.115;
  const dotDist = size * 0.19;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const px = x + 0.5 - half;
      const py = y + 0.5 - half;
      const inBox = roundedBoxSDF(px, py, half, cornerR) <= 0;

      let color = null;
      let alpha = 0;

      if (inBox) {
        color = bg;
        alpha = 255;

        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const distCenter = Math.sqrt(dx * dx + dy * dy);
        if (distCenter <= rWhite) {
          color = white;
          for (const d of dots) {
            const rad = (d.angle * Math.PI) / 180;
            const ddx = dotDist * Math.cos(rad);
            const ddy = dotDist * Math.sin(rad);
            const dist = Math.sqrt((dx - ddx) * (dx - ddx) + (dy - ddy) * (dy - ddy));
            if (dist <= rDot) {
              color = d.color;
              break;
            }
          }
        }
      }

      buf[idx] = color ? color[0] : 0;
      buf[idx + 1] = color ? color[1] : 0;
      buf[idx + 2] = color ? color[2] : 0;
      buf[idx + 3] = alpha;
    }
  }
  return buf;
}

const outDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

[192, 512].forEach((size) => {
  const pixels = drawIcon(size);
  const png = encodePNG(size, size, pixels);
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log('wrote', outPath, png.length, 'bytes');
});
