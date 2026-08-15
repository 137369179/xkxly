/**
 * 生成 PWA 全套图标：从单一矢量真相源 (src/assets/brand/pwa-logo.svg) 派生所有尺寸。
 * 设计原则（与 BabyModuleIcons 同体系）：矢量优先、单一来源、统一儿童风格。
 *
 * 产出 (public/icons/)：
 *   icon-144.png / icon-192.png / icon-512.png  any 图标（透明背景）
 *   icon-maskable-192.png / -512.png           maskable 图标（铺满浅粉圆角背景 + 中心 80% 安全区）
 *   apple-touch-icon.png                       180 主屏图标（maskable 背景版，iOS 不裁关键内容）
 *   favicon.png                                32 通用 favicon
 *
 * 运行：node scripts/gen-pwa-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src/assets/brand/pwa-logo.svg');
const OUT = path.join(ROOT, 'public/icons');

const svg = fs.readFileSync(SRC, 'utf8');
const m = svg.match(/<g id="logo">([\s\S]*?)<\/g>/);
if (!m) {
  console.error('✗ 未能从 pwa-logo.svg 提取 <g id="logo"> 内容');
  process.exit(1);
}
const logo = m[1];

// any：透明背景，内容居中
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${logo}</svg>`;
// maskable：铺满浅粉圆角背景，内容缩放至中心 80% 安全区（每边留 10%）
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#FFE0EF"/><g transform="translate(51.2,51.2) scale(0.8)">${logo}</g></svg>`;

const targets = [
  { svg: anySvg, size: 144, file: 'icon-144.png', purpose: 'any' },
  { svg: anySvg, size: 192, file: 'icon-192.png', purpose: 'any' },
  { svg: anySvg, size: 512, file: 'icon-512.png', purpose: 'any' },
  { svg: maskableSvg, size: 192, file: 'icon-maskable-192.png', purpose: 'maskable' },
  { svg: maskableSvg, size: 512, file: 'icon-maskable-512.png', purpose: 'maskable' },
  { svg: maskableSvg, size: 180, file: 'apple-touch-icon.png', purpose: 'apple-touch' },
  { svg: anySvg, size: 32, file: 'favicon.png', purpose: 'favicon' },
];

fs.mkdirSync(OUT, { recursive: true });

let ok = 0;
for (const t of targets) {
  const out = path.join(OUT, t.file);
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`✓ ${t.file.padEnd(24)} ${meta.width}x${meta.height}  ${meta.format}  [${t.purpose}]`);
  ok++;
}
console.log(`\n完成：${ok}/${targets.length} 个图标已生成至 public/icons/`);
