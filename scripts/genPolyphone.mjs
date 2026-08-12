/**
 * 开发期脚本：生成静态多音字纠音表
 * ------------------------------------------------------------
 * 为什么要有它：
 *   Web Speech API 不接受拼音输入，多音字只能听凭各家引擎自带 G2P，
 *   「远上寒山石径斜」「万里长征人未还」这类诗词读音经常出错。
 *   而本项目古诗数据已带权威逐字拼音（DeepPoem.lines[].chars[].p）。
 *
 * 解决手法：同音字替换 —— 只替换「送进 TTS 的文本」，页面显示不变。
 *   还(huán) → 环，见(xiàn) → 现，亡(wú) → 吴 …… 发音一致，读音立刻正确。
 *
 * 为什么不在运行时用 pinyin-pro：
 *   pinyin-pro 全量词典 ~500KB，对儿童站的首屏是不可接受的负担。
 *   多音字集合是封闭的，开发期算好静态表（~10KB）即可，运行时零依赖。
 *
 * 替代字如何挑：
 *   优先从语料自身的高频字里选「只有一个读音」的字 —— 语料里出现过，
 *   说明是常用字，TTS 引擎一定认识，不会出现生僻字被读错的二次事故。
 *
 * 用法：node scripts/genPolyphone.mjs
 */
import { pinyin } from 'pinyin-pro';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const norm = (s) => (s || '').trim().toLowerCase();
const isHan = (c) => /[\u4e00-\u9fa5]/.test(c);

/** 人工兜底替代字：语料里挑不出时使用（脚本会用 pinyin-pro 校验默认读音是否真的相符） */
const MANUAL_SUB = {
  huán: '环', wéi: '围', xiàn: '现', qū: '驱', zhāo: '招', mò: '末',
  zhòng: '众', shào: '绍', dāng: '珰', nǎ: '哪', liǎo: '蓼', jìng: '竟',
  lǒng: '拢', yīng: '英', chóng: '虫', wú: '吴', xìng: '幸', jì: '记',
  tiǎo: '窕', guān: '关', cháng: '肠', zhǎng: '掌', xíng: '形', háng: '杭',
  hái: '孩', yuè: '月', chā: '插', chà: '岔', chāi: '钗', tiáo: '迢',
  diào: '掉', dōu: '兜', dū: '督', dé: '德', sī: '私', kàn: '瞰',
  shǔ: '暑', shù: '树', xié: '协', xiá: '霞', cuī: '催', qiāng: '枪',
  yǎ: '雅', cī: '疵', juǎn: '锩', nìng: '佞', fà: '珐', xuán: '悬',
  xiǎn: '显', qiǎng: '抢', jiàng: '匠', pián: '骈', shuò: '朔',
  sài: '赛', sǎo: '嫂', tāo: '涛', zàng: '葬', zēng: '增', áng: '昂',
};

/* ---------- 声调剥离：用于区分「真·换音节」与「仅变调」---------- */
const TONE_MAP = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i', ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v',
  ü: 'v', ń: 'n', ň: 'n', ǹ: 'n', ḿ: 'm',
};
const stripTone = (s) => [...s].map((c) => TONE_MAP[c] ?? c).join('');
/** 带调号的字符（注意：ü 本身不是声调，要排除） */
const TONED = new Set('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ');
/** 是否带声调（轻声无调号，如 shang / tou / le / de） */
const hasTone = (s) => [...s].some((c) => TONED.has(c));

/* ---------- 1. 读语料，统计字频 ---------- */
const poems = JSON.parse(readFileSync(resolve(ROOT, 'src/data/poems-deep.json'), 'utf8'));
const freq = new Map();
/** 语料中出现过的 (字, 标注拼音) 组合 */
const annotated = new Map();

for (const p of poems) {
  for (const l of p.lines) {
    for (const ch of l.chars) {
      if (!isHan(ch.c)) continue;
      freq.set(ch.c, (freq.get(ch.c) || 0) + 1);
      if (ch.p) {
        const k = ch.c + '|' + norm(ch.p);
        annotated.set(k, (annotated.get(k) || 0) + 1);
      }
    }
  }
}

/* ---------- 2. 找出语料里的多音字，记录其默认读音 ---------- */
const readingsOf = (c) => pinyin(c, { multiple: true, type: 'array', toneType: 'symbol' }).map(norm);
const defaultOf = (c) => norm(pinyin(c, { toneType: 'symbol' }));

/**
 * 判定「这个标注读音是否值得纠正」。
 *
 * 只纠真正换了音节的多音字（还 huán / 见 xiàn / 亡 wú），放过两类假阳性：
 *   1. 轻声：上 shang、头 tou、了 le —— 无调号，引擎按词典自会处理；
 *   2. 变调：不 bú vs bù、一 yì vs yī —— 音节相同仅声调不同，属连读变调，
 *      硬替换反而会破坏引擎自身的变调规则。
 * 判不准时一律不动，宁可少纠，不可纠错。
 */
function worthFixing(annotatedPy, defaultPy) {
  if (!annotatedPy || !defaultPy || annotatedPy === defaultPy) return false;
  if (!hasTone(annotatedPy)) return false; // 轻声
  if (stripTone(annotatedPy) === stripTone(defaultPy)) return false; // 仅变调
  return true;
}

/** char -> 默认读音（仅收录「可能读错且能纠」的多音字） */
const DEFAULT_READING = {};
/** 需要被替代的目标读音集合 */
const needed = new Set();
/** 候选：char -> 该字需要纠正的读音列表 */
const fixable = new Map();

for (const c of freq.keys()) {
  const rs = readingsOf(c);
  if (rs.length <= 1) continue;
  const def = defaultOf(c);
  if (!def) continue;
  // 该多音字的所有「真·异音」读音都可能被标注到，全部纳入，未来新增诗也覆盖
  const targets = rs.filter((r) => worthFixing(r, def));
  if (!targets.length) continue;
  DEFAULT_READING[c] = def;
  fixable.set(c, targets);
  targets.forEach((r) => needed.add(r));
}
// 语料实际标注到的读音一定要覆盖（词典 multiple 可能漏收某些古音）
for (const k of annotated.keys()) {
  const [c, p] = k.split('|');
  const def = defaultOf(c);
  if (readingsOf(c).length <= 1) continue;
  if (!worthFixing(p, def)) continue;
  DEFAULT_READING[c] = def;
  needed.add(p);
}

/* ---------- 3. 为每个目标读音挑一个「常用 + 单读音」的替代字 ---------- */
// 候选池：语料高频字优先（一定是 TTS 认识的常用字）
const pool = [...freq.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([c]) => c)
  .filter((c) => readingsOf(c).length === 1);

const byReading = new Map();
for (const c of pool) {
  const r = defaultOf(c);
  if (!r) continue;
  if (!byReading.has(r)) byReading.set(r, c); // 频次最高者优先
}

const SUB = {};
const missing = [];
for (const r of [...needed].sort()) {
  const fromCorpus = byReading.get(r);
  const manual = MANUAL_SUB[r] && defaultOf(MANUAL_SUB[r]) === r ? MANUAL_SUB[r] : null;
  // 语料字优先（更常用），人工表兜底
  const pick = fromCorpus || manual;
  if (pick) SUB[r] = pick;
  else missing.push(r);
}
// 人工表里的条目即便语料没需求也补进去（通用文本可能用到），但不覆盖已选
for (const [r, c] of Object.entries(MANUAL_SUB)) {
  if (!SUB[r] && defaultOf(c) === r) SUB[r] = c;
}

/* ---------- 4. 自检 + 瘦身 ---------- */
// 若某多音字的所有异音都没有替代字，收进表也没用，剔除以减小体积
for (const [c, targets] of fixable) {
  if (!targets.some((r) => SUB[r])) delete DEFAULT_READING[c];
}

let checked = 0;
let bad = 0;
const samples = [];
for (const [k, n] of annotated) {
  const [c, p] = k.split('|');
  if (!worthFixing(p, defaultOf(c))) continue;
  checked += n;
  const sub = SUB[p];
  if (!sub || defaultOf(sub) !== p) {
    bad += n;
    console.warn('  ⚠️ 无有效替代：', c, p);
  } else if (samples.length < 12) {
    samples.push(`${c}(${defaultOf(c)}→${p}) ⇒ ${sub}`);
  }
}
console.log('纠音示例        ', samples.join('  '));

/* ---------- 5. 输出 TS 文件 ---------- */
const banner = `/**
 * 多音字纠音静态表 —— 由 scripts/genPolyphone.mjs 自动生成，请勿手改。
 *
 * DEFAULT_READING: 多音字 -> 语音引擎最可能采用的默认读音
 * SUB:             目标读音 -> 同音单读替代字（送进 TTS 用，页面显示不变）
 *
 * 生成于语料 ${poems.length} 首诗、${freq.size} 个不同汉字。
 * 运行时零依赖（不引入 pinyin-pro，避免 ~500KB 词典进包）。
 */
`;
const out =
  banner +
  `export const DEFAULT_READING: Record<string, string> = ${JSON.stringify(DEFAULT_READING)};\n\n` +
  `export const SUB: Record<string, string> = ${JSON.stringify(SUB)};\n`;

const target = resolve(ROOT, 'src/lib/tts/polyphoneData.ts');
writeFileSync(target, out, 'utf8');

console.log('语料诗数        ', poems.length);
console.log('不同汉字        ', freq.size);
console.log('多音字收录      ', Object.keys(DEFAULT_READING).length);
console.log('替代字表条目    ', Object.keys(SUB).length);
console.log('待替换字次(语料)', checked, '  无替代:', bad);
if (missing.length) console.log('缺替代读音      ', missing.join(' '));
console.log('输出            ', target, '≈', (out.length / 1024).toFixed(1), 'KB');
