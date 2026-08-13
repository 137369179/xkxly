/**
 * 融合 hanzi-study 上游笔顺数据 → 扩充 public/data/hanzi-strokes.json
 * ------------------------------------------------------------------
 * 数据源：luomor-web/hanzi-study 的 js/lib/dataWriter.js(422字) + dataWriter1.js(826字)，
 *         其底层同源 Make Me a Hanzi / hanzi-writer-data（与本项目 fetch-hanzi-strokes.mjs
 *         抓取的 318 字逐字一致，坐标 1024×1024、y 轴向上）。
 *
 * 上游格式：window.writerData = { "字": { strokes:[path...], medians:[[[x,y]...]], radStrokes:[idx...] } }
 * 本项目格式：{ "字": { s:[path...], m:[[[x,y]...]], r?:[idx...] } }
 *   映射：strokes→s、medians→m、radStrokes→r（可选，喂给「部首魔法」高亮部首笔画）。
 *
 * 合并策略（union 去重，安全优先）：
 *   - 已存在于 hanzi-strokes.json 的字，s/m 以现有为准（当前已从 CDN 校验过的真相源）；
 *   - 仅上游有的字，从上游补入 s/m；
 *   - r(radStrokes) 一律以上游为准（现有 318 字未存该字段，借此补齐）。
 *
 * 用法：
 *   node scripts/gen-hanzi-strokes-expanded.mjs [上游目录]
 *   默认上游目录：<repo>/../hanzi-study-reference/js/lib
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, '../public/data/hanzi-strokes.json');
const UPSTREAM = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dir, '../../hanzi-study-reference/js/lib');

/**
 * 从 window.<varName> = {...} 形式的 JS 文本中提取并 JSON.parse 出对象。
 * 取「最后一次出现的赋值」以兼容 dataWriter1.js 开头 setTimeout 里的引用。
 */
function parseWindowAssign(file, varName) {
  const src = readFileSync(file, 'utf8');
  const re = new RegExp(`window\\.${varName}\\s*=\\s*(\\{[\\s\\S]*\\})\\s*;?\\s*$`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`${file} 未找到 window.${varName} = {...}`);
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`${file} 的 ${varName} JSON 解析失败: ${e.message}`);
  }
}

const existing = JSON.parse(readFileSync(OUT, 'utf8'));
const before = Object.keys(existing).length;

const writerData = parseWindowAssign(join(UPSTREAM, 'dataWriter.js'), 'writerData');
const writerData1 = parseWindowAssign(join(UPSTREAM, 'dataWriter1.js'), 'writerData1');
const upstream = { ...writerData, ...writerData1 };

const merged = { ...existing };
let added = 0;
let withRad = 0;
let skipped = 0;

for (const [ch, u] of Object.entries(upstream)) {
  const strokes = u?.strokes;
  const medians = u?.medians;
  if (!Array.isArray(strokes) || strokes.length === 0 || !Array.isArray(medians)) {
    skipped++;
    continue;
  }
  const isNew = !merged[ch];
  const entry = {
    // 现有字 s/m 优先；仅上游有的字才用上游 s/m
    s: isNew ? strokes : merged[ch].s,
    m: isNew ? medians : merged[ch].m,
  };
  // radStrokes 以上游为准（现有 318 字未存，借此补齐）
  if (Array.isArray(u.radStrokes) && u.radStrokes.length > 0) {
    entry.r = u.radStrokes;
    withRad++;
  }
  merged[ch] = entry;
  if (isNew) added++;
}

// 键排序保证输出确定性
const sorted = {};
for (const k of Object.keys(merged).sort()) sorted[k] = merged[k];

writeFileSync(OUT, JSON.stringify(sorted));

const after = Object.keys(sorted).length;
console.log('=== 笔顺数据融合完成 ===');
console.log(`上游 dataWriter.js   : ${Object.keys(writerData).length} 字`);
console.log(`上游 dataWriter1.js  : ${Object.keys(writerData1).length} 字`);
console.log(`上游合并(去重后)     : ${Object.keys(upstream).length} 字`);
console.log(`现有 hanzi-strokes   : ${before} 字`);
console.log(`本次新增             : +${added} 字`);
console.log(`跳过(空数据)         : ${skipped} 字`);
console.log(`融合后总计           : ${after} 字`);
console.log(`含部首笔画(r)字段    : ${withRad} 字`);
console.log(`输出                  : ${OUT}`);
