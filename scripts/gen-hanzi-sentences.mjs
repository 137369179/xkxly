// 数据生成脚本（一次性）：把上游 luomor-web/hanzi-study 的汉字语料
// （window.dataList = [{w, p, s, y}]，1305 字，含拼音/组词/例句）转换为
// 本项目可用的 TS 数据集。运行后产物为 src/data/hanziSentences.ts。
// 上游仅提供 p(组词)/s(例句)/y(拼音)，无字源/部首/笔画；本项目自有
// HANZI_DATA（300 精编字含 etymology）与之互补，模块侧运行时做融合。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC = '/tmp/hanzi-study-upstream/js/lib/dataList.js';
const OUT = path.resolve(__dirname, '../src/data/hanziSentences.ts');

const raw = fs.readFileSync(SRC, 'utf8');
const body = raw.replace(/^window\.dataList\s*=\s*/, '').replace(/;\s*$/, '');
const dataList = eval('(' + body + ')');

const seen = new Set();
const out = [];
for (const it of dataList) {
  if (it.isTest) continue;
  if (!it.w || !it.y) continue;
  if (seen.has(it.w)) continue;
  seen.add(it.w);
  out.push({ c: it.w, pinyin: it.y, word: it.p || '', sentence: it.s || '' });
}

out.sort((a, b) => a.c.localeCompare(b.c, 'zh'));

const esc = (s) => (s || '').replace(/'/g, "\\'");
const header = `/**
 * 汉字广度语料（融合来源：luomor-web/hanzi-study，1305 字）
 * ------------------------------------------------------------------
 * 由 scripts/gen-hanzi-sentences.mjs 从上游 dataList.js 自动生成。
 * 每条含：c 汉字 / pinyin 拼音(带调) / word 常用组词 / sentence 生活例句。
 * 上游无字源/部首/笔画，故与本项目 HANZI_DATA（精编 300 字，含 etymology）
 * 在模块侧运行时融合，互为补充：精编字优先用自家数据，其余用本表广度覆盖。
 */
export interface HanziSentence {
  /** 汉字 */
  c: string;
  /** 拼音（带声调） */
  pinyin: string;
  /** 常用组词 */
  word: string;
  /** 生活化例句 */
  sentence: string;
}

export const HANZI_SENTENCES: HanziSentence[] = [
${out.map((o) => `  { c: '${o.c}', pinyin: '${o.pinyin}', word: '${esc(o.word)}', sentence: '${esc(o.sentence)}' },`).join('\n')}
];

const _byChar = new Map(HANZI_SENTENCES.map((h) => [h.c, h]));

/** 按汉字查例句（融合表内查找），找不到返回 undefined */
export function getSentenceByChar(c: string): HanziSentence | undefined {
  return _byChar.get(c);
}

export const HANZI_SENTENCES_COUNT = HANZI_SENTENCES.length;
`;

fs.writeFileSync(OUT, header, 'utf8');
console.log(`Wrote ${out.length} hanzi sentences to ${OUT}`);
