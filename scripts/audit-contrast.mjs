#!/usr/bin/env node
/**
 * 对比度铁律守卫（Design System v1）
 * --------------------------------------------------------------------------
 * 规则：浅/中饱和背景色上【禁止】使用 text-white（白字压浅色 → 对比度 < WCAG 2.1 AA）。
 * 主色上的字必须使用 text-candy-*-on 深字令牌（pink/blue/yellow/green/purple/orange）。
 *
 * 扫描 src 下所有 .tsx 文件中的 text-white，若其 className 窗口内存在「浅/中饱和背景类」
 * （bg-/from-/via-/to- 配合 amber/orange/.../candy-main 等），即判定为铁律违规。
 *
 * 退出码：发现违规 → 1（CI 门禁失败）；否则 → 0。
 * 用法：node scripts/audit-contrast.mjs
 */
import { globSync } from 'node:fs';
import { readFileSync, writeFileSync } from 'node:fs';

// 浅/中饱和 Tailwind 色族与判定为「浅」的色阶范围（含此范围即视为不可压白字）
const RANGES = {
  amber: [50, 600], orange: [50, 500], yellow: [50, 500], lime: [50, 500],
  pink: [50, 500], rose: [50, 500], red: [50, 500],
  emerald: [50, 600], teal: [50, 600], green: [50, 600], sky: [50, 600],
  blue: [50, 500], indigo: [50, 500], purple: [50, 500], violet: [50, 500],
  fuchsia: [50, 500], cyan: [50, 500],
};

const shades = ([lo, hi]) => {
  const out = [];
  for (let s = lo; s <= hi; s += 50) out.push(s);
  return out;
};

const parts = [];
for (const [fam, range] of Object.entries(RANGES)) {
  for (const s of shades(range)) {
    parts.push(`bg-${fam}-${s}`, `from-${fam}-${s}`, `via-${fam}-${s}`, `to-${fam}-${s}`);
  }
}
// 设计系统 candy 主色/柔色（排除 -deep 深态，深态压白字合规）
for (const c of ['pink', 'blue', 'yellow', 'green', 'purple', 'orange']) {
  parts.push(`bg-candy-${c}(?!-deep)\\b`, `from-candy-${c}\\b`, `via-candy-${c}\\b`, `to-candy-${c}\\b`);
}

const bgRe = new RegExp(parts.join('|'), 'g');
// 仅判定「基础白字」：排除 hover:/focus:/active:/group-hover: 等状态前缀后的白字
// （如 text-candy-pink-on hover:text-white 深态悬停白字属合规，不应误报）
const baseWhiteRe = /(^|[^:\w])text-white\b/;
const SKIP_RE = /text-(4xl|5xl)\b/; // 装饰性巨型图标（emoji/播放键），白字为常规做法，不计入铁律

const files = globSync('src/**/*.tsx', {
  ignore: ['**/__tests__/**', '**/*.test.tsx', '**/*.spec.tsx'],
});

const violations = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!baseWhiteRe.test(line)) continue;
    if (SKIP_RE.test(line)) continue; // 巨型图标豁免
    bgRe.lastIndex = 0;
    if (bgRe.test(line)) {
      violations.push({ file, line: i + 1, text: line.trim().slice(0, 130) });
    }
  }
}

// ── 基线模式（与 lint:budget 同构：只许降不许涨，用于 CI 门禁不阻断历史债务）──
const baselineArg = process.argv.find((a) => a.startsWith('--baseline='));
if (baselineArg) {
  const bp = baselineArg.split('=')[1];
  let baseline = null;
  try { baseline = JSON.parse(readFileSync(bp, 'utf8')).count; } catch { baseline = null; } // 文件缺失 → 首次播种
  if (baseline === null) {
    writeFileSync(bp, JSON.stringify({ count: violations.length, updated: new Date().toISOString(), seeded: true }, null, 2));
    console.log(`✅ 对比度铁律基线已初始化：${violations.length} 处（CI 只许降不许涨，减项会刷新基线）`);
    process.exit(0);
  }
  if (violations.length > baseline) {
    console.log(`\n❌ 对比度铁律新增违规：${violations.length} > 基线 ${baseline}（只许降不许涨）\n`);
    for (const v of violations) console.log(`  ${v.file}:${v.line}`);
    process.exit(1);
  }
  writeFileSync(bp, JSON.stringify({ count: violations.length, updated: new Date().toISOString() }, null, 2));
  console.log(`✅ 对比度铁律：当前 ${violations.length} 处 ≤ 基线 ${baseline}（已刷新基线文件）`);
  process.exit(0);
}

if (violations.length) {
  console.log(`\n❌ 对比度铁律违规：${violations.length} 处（白字压浅/中饱和背景，< WCAG AA）\n`);
  for (const v of violations) console.log(`  ${v.file}:${v.line}\n    ${v.text}\n`);
  process.exit(1);
}
console.log('✅ 对比度铁律：0 违规（白字仅用于深背景，浅色背景统一用 text-candy-*-on 深字）');
process.exit(0);
