// 宝贝学习乐园 · 图片体积优化（一次性维护脚本）
// 用法：npm i -D sharp && node scripts/optimize-images.mjs
// 仅处理被 git 跟踪的 public/**/*.{jpg,png}（不触碰 2.3GB 未跟踪生成资源）。
// 就地重编码，保持原文件名与代码中所有引用不变：
//   - 照片最大边 1280px，mozjpeg quality 82
//   - 图标(public/icons/*)最大边 512px，png 调色板量化 quality 85
// 仅当压缩后更小才写回，避免质量回退。

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(fileURLToPath(import.meta.url), '../..');
const files = execSync('git ls-files', { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(jpe?g|png)$/i.test(f) && f.startsWith('public/'));

let totalBefore = 0;
let totalAfter = 0;
let changed = 0;
let skipped = 0;

for (const rel of files) {
  const p = path.join(root, rel);
  const before = fs.statSync(p).size;
  const isIcon = rel.includes('/icons/');
  const maxDim = isIcon ? 512 : 1280;
  const img = sharp(p);
  const meta = await img.metadata();
  const resize =
    (meta.width || 0) > maxDim || (meta.height || 0) > maxDim
      ? { width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true }
      : undefined;
  const lower = rel.toLowerCase();
  let buf;
  if (lower.endsWith('.png')) {
    buf = await img.resize(resize).png({ palette: true, quality: 85, compressionLevel: 9, effort: 10 }).toBuffer();
  } else {
    buf = await img.resize(resize).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }
  if (buf.length < before) {
    fs.writeFileSync(p, buf);
    totalBefore += before;
    totalAfter += buf.length;
    changed++;
    console.log(`✓ ${rel}: ${(before / 1024).toFixed(0)}KB -> ${(buf.length / 1024).toFixed(0)}KB`);
  } else {
    skipped++;
    console.log(`· ${rel}: 已最优(${(before / 1024).toFixed(0)}KB), 跳过`);
  }
}

console.log(
  `\n完成：处理 ${files.length} 个文件，${changed} 个压缩，${skipped} 个跳过；` +
    `总体积 ${(totalBefore / 1048576).toFixed(1)}MB -> ${(totalAfter / 1048576).toFixed(1)}MB`
);
