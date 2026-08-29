#!/usr/bin/env node
/**
 * 对比度 sweep（按模块收割，可重复执行）
 * --------------------------------------------------------------------------
 * 把指定模块中「基础白字压浅/中饱和背景」的 AA 违规，统一改为
 * text-candy-*-on 深字令牌（与设计系统 v1 一致）。仅处理 audit-contrast.mjs 判定为
 * 同行的违规，且豁免 text-4xl/5xl 装饰性巨型图标；只替换【基础白字】
 * （hover:/focus:/active: 前缀的白字保留，因深态悬停本就用白字）。
 *
 * 用法：
 *   node scripts/fix-contrast-in-scope.mjs                 # 默认 today + hanzi
 *   node scripts/fix-contrast-in-scope.mjs science pet     # 收割指定模块
 *   node scripts/fix-contrast-in-scope.mjs --all           # 全量收割（慎用，改动面大）
 *
 * 每次执行后应重跑 `npm run audit:contrast` 刷新基线（只许降不许涨）。
 */
import { globSync } from 'node:fs';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
let SCOPE;
if (args.includes('--all')) {
  SCOPE = ['src/modules', 'src/components'];
} else if (args.includes('--components')) {
  SCOPE = ['src/components'];
} else if (args.length) {
  // 支持模块名（science pet）与目录路径（src/components/quiz）混用
  SCOPE = args.map((m) => (m.startsWith('src/') ? m : `src/modules/${m}`));
} else {
  SCOPE = ['src/modules/today', 'src/modules/hanzi'];
}
console.log(`🎯 sweep 范围：${SCOPE.join(', ')}`);

const SHADES = (a, b) => { const o = []; for (let s = a; s <= b; s += 50) o.push(s); return o; };
const RANGES = {
  amber: [50, 600], orange: [50, 500], yellow: [50, 500], lime: [50, 500],
  pink: [50, 500], rose: [50, 500], red: [50, 500],
  emerald: [50, 600], teal: [50, 600], green: [50, 600], sky: [50, 600],
  blue: [50, 500], indigo: [50, 500], purple: [50, 500], violet: [50, 500],
  fuchsia: [50, 500], cyan: [50, 500],
};
const parts = [];
for (const [f, r] of Object.entries(RANGES)) {
  for (const s of SHADES(r[0], r[1])) parts.push(`bg-${f}-${s}`, `from-${f}-${s}`, `via-${f}-${s}`, `to-${f}-${s}`);
}
for (const c of ['pink', 'blue', 'yellow', 'green', 'purple', 'orange']) {
  parts.push(`bg-candy-${c}(?!-deep)\\b`, `from-candy-${c}(?!-deep)\\b`, `via-candy-${c}(?!-deep)\\b`, `to-candy-${c}(?!-deep)\\b`);
}
const bgRe = new RegExp(parts.join('|'), 'g');
const baseWhiteRe = /(^|[^:\w])text-white\b/;
const SKIP_RE = /text-(4xl|5xl)\b/;

const FAM_MAP = {
  amber: 'orange', orange: 'orange', yellow: 'orange', lime: 'orange',
  pink: 'pink', rose: 'pink', red: 'pink',
  emerald: 'green', green: 'green', teal: 'green',
  sky: 'blue', blue: 'blue', indigo: 'blue', cyan: 'blue',
  purple: 'purple', violet: 'purple', fuchsia: 'purple',
};
const CANDY_MAP = { pink: 'pink', blue: 'blue', yellow: 'orange', green: 'green', purple: 'purple', orange: 'orange' };

function mapOn(line) {
  // 注意：必须是 (?:bg|from|via|to) 而非 b(?:g|from|via|to) —— 后者只匹配 bg-*，
  // 会把 from-/via-/to- 渐变背景漏掉（曾导致渐变上的白字违规全部漏修）。
  const candyM = line.match(/(?:bg|from|via|to)-candy-(pink|blue|yellow|green|purple|orange)(?!-deep)\b/);
  if (candyM) return CANDY_MAP[candyM[1]];
  for (const fam of Object.keys(FAM_MAP)) {
    if (new RegExp(`\\b(?:bg|from|via|to)-${fam}-\\d`).test(line)) return FAM_MAP[fam];
  }
  return null;
}

let total = 0;
const changed = [];
for (const dir of SCOPE) {
  for (const file of globSync(`${dir}/**/*.tsx`, { ignore: ['**/__tests__/**', '**/*.test.tsx', '**/*.spec.tsx'] })) {
    const lines = readFileSync(file, 'utf8').split('\n');
    let dirty = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!baseWhiteRe.test(line) || SKIP_RE.test(line)) continue;
      bgRe.lastIndex = 0;
      if (!bgRe.test(line)) continue;
      const on = mapOn(line);
      if (!on) continue;
      const fixed = line.replace(/(^|[^:\w])text-white\b/g, (_m, p1) => `${p1}text-candy-${on}-on`);
      if (fixed !== line) { lines[i] = fixed; dirty = true; total++; changed.push(`${file.replace('src/', '')}:${i + 1} → text-candy-${on}-on`); }
    }
    if (dirty) writeFileSync(file, lines.join('\n'));
  }
}
console.log(`\n🔧 重设计核心面对比度 sweep 完成：修复 ${total} 处\n`);
for (const c of changed) console.log('  ' + c);
