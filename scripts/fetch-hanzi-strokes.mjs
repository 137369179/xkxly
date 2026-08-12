/**
 * 抓取 hanzi-writer-data 真实笔顺数据 → public/data/hanzi-strokes.json
 * ------------------------------------------------------------------
 * 数据源：https://github.com/chanind/hanzi-writer-data（Make Me a Hanzi 项目）
 * 坐标系：1024×1024，y 轴向下（渲染时需 scale(1,-1) translate(0,-900) 翻转）
 * 输出格式（紧凑）：
 *   { "永": { "s": ["M ...", ...], "m": [[[x,y],...], ...] } }
 *   s = 每笔的 SVG path；m = 每笔的中线采样点（用于跟写判定）
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HANZI_DATA } from '../src/data/hanzi.ts';
import { HANZI_500 } from '../src/data/hanzi500.ts';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../public/data/hanzi-strokes.json');
const CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1';

// 收集所有需要的汉字（去重）
const chars = new Set();
for (const h of HANZI_DATA) chars.add(h.c);
for (const h of HANZI_500) chars.add(h.char);
// 形近字组（concept.ts SIMILAR_GROUPS）也纳入，保证辨析题可展示笔顺
const SIMILAR = '人入八木本禾大天夫刀力九田由甲日目白土士干己已乙王玉主千于石右古去云丢';
for (const c of SIMILAR) chars.add(c);

const list = [...chars];
console.log(`共需抓取 ${list.length} 个汉字的笔顺数据`);

const result = {};
const missing = [];
let done = 0;

// 并发 8 路，避免打爆 CDN
async function fetchOne(c) {
  const url = `${CDN}/${encodeURIComponent(c)}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      missing.push(c);
      return;
    }
    const j = await res.json();
    if (!j.strokes?.length || !j.medians?.length) {
      missing.push(c);
      return;
    }
    result[c] = { s: j.strokes, m: j.medians };
  } catch {
    missing.push(c);
  } finally {
    done++;
    if (done % 50 === 0) console.log(`进度 ${done}/${list.length}`);
  }
}

const CONCURRENCY = 8;
for (let i = 0; i < list.length; i += CONCURRENCY) {
  await Promise.all(list.slice(i, i + CONCURRENCY).map(fetchOne));
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(result));
const kb = Math.round(JSON.stringify(result).length / 1024);
console.log(`✅ 完成：${Object.keys(result).length} 字 → ${OUT}（约 ${kb}KB）`);
if (missing.length) console.log(`⚠️ 缺失 ${missing.length} 字：${missing.join(' ')}`);
