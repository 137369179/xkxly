// 构建时生成 PWA 预缓存清单（public/precache-manifest.json）
// ==================================================================
// 解决的问题（来自 sw.js 头部的两条 ⚠️ 警告）：
//   1. CACHE_NAME / RUNTIME_BUCKETS 版本号需每次部署手动 bump —— 易忘，
//      导致用户长期停留在旧缓存。
//   2. PRECACHE_URLS 需手动与 public/ 实际文件同步 —— 易遗漏新图标。
//
// 本脚本把"版本号"与"预缓存清单"都改为**构建时自动派生**：
//   - version = sha256(排序后的 [url:size, ...]) 的前 8 位 → 任何预缓存资源
//     内容/体积变化都会自动产生新版本，activate 时旧桶被清理。
//   - urls = 自动扫描 public/ 下稳定的 App Shell 资源（manifest / 字体 /
//     png 图标 / 精选 jpg），无需手维护。
//
// 设计取舍：
//   - 只预缓存"稳定路径"资源（public/ 内、不带 hash 的文件）。带 hash 的
//     /assets/*.js|css 由 SW 运行时 cache-first 处理，无需预缓存。
//   - 故意**不**预缓存 data/（JSON 走 stale-while-revalidate）和大型模块
//     图片（words/english/storybook/rewards 等，运行时 LRU 缓存），保持安装
//     体积轻量、首屏快。
//
// 导出 buildManifest(publicDir) 供单元测试（纯函数，不写文件）。

import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 精选预缓存的 jpg（原 PRECACHE_URLS 的意图 + 自动包含全部字体/png 图标）。
 * 路径相对于 public/ 根：root 级放根下，icons/ 下放 icons/ 下。
 */
const CORE_JPG = [
  'certificate_bg.jpg', // root
  'hero_banner.jpg', // root
  'icons/letters.jpg',
  'icons/words.jpg',
  'icons/fun.jpg',
  'icons/adventure.jpg',
];

/** 扫描目录下（递归）匹配某扩展名的文件，返回相对 public 的 url 路径 */
function walk(dir, predicate, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === '.DS_Store') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, predicate, base, out);
    } else if (predicate(name, full)) {
      out.push('/' + relative(base, full).split('\\').join('/'));
    }
  }
  return out;
}

/**
 * 派生稳定版本号：对 [url:byteSize, ...] 排序后 sha256 取前 8 位。
 * 资源内容或体积变化 → 版本变化 → 旧缓存桶被清理。
 * @param {string[]} urls
 * @param {(url: string) => number} sizeOf
 * @returns {string}
 */
export function deriveVersion(urls, sizeOf) {
  const parts = urls
    .map((u) => `${u}:${sizeOf(u)}`)
    .sort()
    .join('|');
  return 'baby-park-v' + createHash('sha256').update(parts).digest('hex').slice(0, 8);
}

/**
 * 构建预缓存清单（纯函数，不写磁盘）
 * @param {string} publicDir public/ 绝对路径
 * @returns {{ version: string, urls: string[] }}
 */
export function buildManifest(publicDir) {
  const urls = new Set();
  urls.add('/manifest.json');

  // 全部字体（woff2/ttf/otf...）
  walk(join(publicDir, 'fonts'), (n) => /\.(woff2?|ttf|eot|otf)$/i.test(n), publicDir).forEach(
    (u) => urls.add(u),
  );

  // 全部 png 图标（导航/壳层图标，稳定且小）
  walk(join(publicDir, 'icons'), (n) => n.toLowerCase().endsWith('.png'), publicDir).forEach(
    (u) => urls.add(u),
  );

  // 精选 jpg（壳层 + 关键图）
  for (const rel of CORE_JPG) {
    const full = join(publicDir, rel);
    if (existsSync(full)) urls.add('/' + rel.split('\\').join('/'));
  }

  const sorted = [...urls].sort();
  const sizeOf = (u) => {
    try {
      return statSync(join(publicDir, u)).size;
    } catch {
      return 0;
    }
  };
  return { version: deriveVersion(sorted, sizeOf), urls: sorted };
}

// CLI 入口：直接 node scripts/gen-sw-precache.mjs
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const publicDir = join(root, 'public');
  const manifest = buildManifest(publicDir);
  const outPath = join(publicDir, 'precache-manifest.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(
    `[gen-sw-precache] version=${manifest.version} urls=${manifest.urls.length} -> ${outPath}`,
  );
}
