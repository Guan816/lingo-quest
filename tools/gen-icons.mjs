/**
 * 生成 PWA 图标（纯 Node 实现，不依赖任何图像库）。
 * 用法：node tools/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/icons');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function inRoundRect(x, y, x0, y0, w, h, r) {
  if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return 0;
  const dx = Math.min(x - x0, x0 + w - 1 - x);
  const dy = Math.min(y - y0, y0 + h - 1 - y);
  if (dx < r && dy < r) {
    const d = Math.hypot(r - dx, r - dy);
    if (d > r) return 0;
    if (d > r - 1) return (r - d) / 1; // 边缘柔化
  }
  return 1;
}

/** 在 size×size 画布上采样一个像素，返回 [r,g,b,a] */
function sample(u, v) {
  // 背景：左上 #5d8bff → 右下 #2849e0
  const t = Math.min(1, Math.max(0, (u + v) / 2));
  let r = lerp(0x5d, 0x28, t);
  let g = lerp(0x8b, 0x49, t);
  let b = lerp(0xff, 0xe0, t);

  // 对话气泡：白色圆角矩形 + 左下小三角
  const bx = 0.2;
  const by = 0.26;
  const bw = 0.6;
  const bh = 0.42;
  const br = 0.08;
  let a = 1;

  if (inRoundRect(u, v, bx, by, bw, bh, br) > 0) {
    r = 0xff;
    g = 0xff;
    b = 0xff;
    // 三个点
    const cy = by + bh / 2;
    for (let i = 0; i < 3; i++) {
      const cx = bx + bw * (0.26 + i * 0.24);
      const d = Math.hypot(u - cx, v - cy);
      if (d < bw * 0.062) {
        r = 0x3b;
        g = 0x66;
        b = 0xf6;
      }
    }
  } else {
    // 尾巴：三角形
    const tx0 = bx + bw * 0.18;
    const tx1 = bx + bw * 0.34;
    const tyTop = by + bh - 0.005;
    const tyTip = by + bh + 0.1;
    if (v >= tyTop && v <= tyTip && u >= tx0 && u <= tx1) {
      const k = (v - tyTop) / (tyTip - tyTop);
      const half = (tx1 - tx0) / 2;
      const mid = (tx0 + tx1) / 2;
      if (Math.abs(u - mid) <= half * (1 - k)) {
        r = 0xff;
        g = 0xff;
        b = 0xff;
      }
    }
    // 圆角外透明
    if (!inRoundRect(u, v, 0, 0, 1, 1, 0.22)) a = 0;
  }

  return [Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255)];
}

function render(size) {
  const ss = 2; // 2x 超采样抗锯齿
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x + (sx + 0.5) / ss) / size;
          const v = (y + (sy + 0.5) / ss) / size;
          const c = sample(u, v);
          r += c[0];
          g += c[1];
          b += c[2];
          a += c[3];
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      buf[i] = Math.round(r / n);
      buf[i + 1] = Math.round(g / n);
      buf[i + 2] = Math.round(b / n);
      buf[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, buf);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const file = resolve(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, render(size));
  console.log(`generated ${file}`);
}
