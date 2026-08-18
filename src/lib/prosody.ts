import type { DeepPoem } from '@/types';
import { yunBuShort } from '@/data/pingShuiYun';

/** 平仄单元格 */
export interface ProsodyCell {
  c: string;
  /** 拼音（带声调符号），标点为空 */
  p: string;
  /** 平 / 仄 / 空（标点或非汉字） */
  level: '平' | '仄' | '';
  /** 是否为古入声字（今读已派入平声，格律上仍作仄） */
  ru: boolean;
}

export interface Couplet {
  label: string;
  /** 行下标（0 起） */
  lines: [number, number];
}

/** 出律类型 */
export type FaultType =
  | '孤平'
  | '三平调'
  | '三仄尾'
  | '失韵'
  | '失对'
  | '失粘'
  | '出律';

/** 一处格律违规 */
export interface ProsodyFault {
  /** 行下标（0 起） */
  line: number;
  type: FaultType;
  /** 文字说明 */
  detail: string;
  /** 涉及字在 grid 行内的下标（用于高亮） */
  at?: number[];
}

export interface Prosody {
  /** 逐句逐字的平仄网格 */
  grid: ProsodyCell[][];
  /** 每句韵脚字（无则空串） */
  rhymeFeet: string[];
  /** 各句是否处于押韵位置 */
  rhymingLines: boolean[];
  /** 押韵位置但今读韵母已变（古今音变） */
  driftLines: boolean[];
  /** 韵辙名，如「怀来辙（-ai）」 */
  rhymeGroup: string;
  /** 平水韵韵部（精确用韵），如「下平七阳」；未收录字降级为空串 */
  yunBu: string;
  /** 对仗联（仅律诗） */
  couplets: Couplet[];
  /** 给读者的说明 */
  note: string;
  /** 押韵判定方式 */
  rhymeBasis: '偶句定位' | '同韵归并' | '平水韵';
  /** 近体诗标准平仄谱（含「·」表示一三五不论之灵活位）；非近体诗为空数组 */
  standardGrid: ('平' | '仄' | '·')[][];
  /** 起式与用韵：如「仄起首句入韵·七言绝句」；非近体诗为空串 */
  pattern: string;
  /** 格律引擎判读附注（合律结论 / 检出违规概述） */
  prosodicNote: string;
  /** 检出的出律项（合律则为空数组） */
  faults: ProsodyFault[];
}

/** 平仄谱单元：平 / 仄 / 中（灵活，一三五不论） */
type T = '平' | '仄' | '·';

/**
 * 近体诗标准谱式（首联四句基准，律诗整篇为基准重复一次）。
 * 已按「一三五不论，二四六分明」将非节奏点标为「·」。
 * 键名：起式(ze=仄起 / ping=平起) + 用韵(bu=首句不入韵 / ru=首句入韵)。
 */
const WU_BASE: Record<string, T[][]> = {
  'ze-bu': [
    ['·', '仄', '平', '平', '仄'],
    ['·', '平', '平', '仄', '平'],
    ['·', '平', '平', '仄', '仄'],
    ['·', '仄', '仄', '平', '平'],
  ],
  'ze-ru': [
    ['·', '仄', '仄', '平', '平'],
    ['·', '平', '平', '仄', '平'],
    ['·', '平', '平', '仄', '仄'],
    ['·', '仄', '仄', '平', '平'],
  ],
  'ping-bu': [
    ['·', '平', '平', '仄', '仄'],
    ['·', '仄', '仄', '平', '平'],
    ['·', '仄', '平', '平', '仄'],
    ['·', '平', '平', '仄', '平'],
  ],
  'ping-ru': [
    ['·', '平', '平', '仄', '平'],
    ['·', '仄', '仄', '平', '平'],
    ['·', '仄', '平', '平', '仄'],
    ['·', '平', '平', '仄', '平'],
  ],
};

const QI_BASE: Record<string, T[][]> = {
  'ze-bu': [
    ['·', '仄', '·', '平', '平', '仄', '仄'],
    ['·', '平', '·', '仄', '仄', '平', '平'],
    ['·', '平', '·', '仄', '平', '平', '仄'],
    ['·', '仄', '·', '平', '仄', '仄', '平'],
  ],
  'ze-ru': [
    ['·', '仄', '·', '平', '仄', '仄', '平'],
    ['·', '平', '·', '仄', '仄', '平', '平'],
    ['·', '平', '·', '仄', '平', '平', '仄'],
    ['·', '仄', '·', '平', '仄', '仄', '平'],
  ],
  'ping-bu': [
    ['·', '平', '·', '仄', '平', '平', '仄'],
    ['·', '仄', '·', '平', '仄', '仄', '平'],
    ['·', '仄', '·', '平', '平', '仄', '仄'],
    ['·', '平', '·', '仄', '仄', '平', '平'],
  ],
  'ping-ru': [
    ['·', '平', '·', '仄', '仄', '平', '平'],
    ['·', '仄', '·', '平', '仄', '仄', '平'],
    ['·', '仄', '·', '平', '平', '仄', '仄'],
    ['·', '平', '·', '仄', '仄', '平', '平'],
  ],
};

/** 近体诗节奏点（0 起内容字下标）：五言取二、四；七言取二、四、六 */
function rhythmPoints(n: number): number[] {
  return n === 5 ? [1, 3] : [1, 3, 5];
}

/** 推导近体诗标准平仄谱（律诗为基准重复一次） */
export function buildStandardGrid(
  genreLen: 5 | 7,
  qi: '仄' | '平',
  ru: boolean,
  isLv: boolean,
): ('平' | '仄' | '·')[][] {
  const qk = qi === '平' ? 'ping' : 'ze';
  const base = (genreLen === 5 ? WU_BASE : QI_BASE)[`${qk}-${ru ? 'ru' : 'bu'}`] ?? [];
  return isLv ? [...base, ...base] : base;
}

// 带声调符号的元音 -> 声调数字
const TONE_MAP: Record<string, number> = {
  ā: 1, ē: 1, ī: 1, ō: 1, ū: 1, ǖ: 1,
  á: 2, é: 2, í: 2, ó: 2, ú: 2, ǘ: 2,
  ǎ: 3, ě: 3, ǐ: 3, ǒ: 3, ǔ: 3, ǚ: 3,
  à: 4, è: 4, ì: 4, ò: 4, ù: 4, ǜ: 4,
};

/**
 * 常用古入声字表（平水韵入声，今普通话多派入阴平/阳平）。
 * 只需收录「今读一声/二声」的字即可纠偏；今读三四声者本已归仄，收录亦无害。
 */
const RUSHENG = new Set(
  (
    '一七八十不' +
    // 屋沃觉
    '屋木目服福幅腹复覆竹筑读独毒秃谷哭鹿禄绿熟塾束速宿肃粟族卒逐轴菊陆育郁祝叔淑俗伏牧睦穆仆扑' +
    '沃玉狱足曲局欲烛属续浴辱蜀嘱粥' +
    '觉角岳学握剥朔卓桌捉琢雹乐' +
    // 质物月曷黠屑
    '日室实质疾术述律出恤密蜜匹吉秩失悉膝漆溢逸必毕栗乙壹虱' +
    '物佛弗拂屈掘崛勿讫迄倔' +
    '月骨忽突兀越曰阙谒歇竭发伐罚阀筏没殁厥' +
    '曷割葛渴喝遏泼末沫抹达挞獭辣撒萨擦察掇夺脱阔活括撮' +
    '八杀刹扎札轧猾滑刮刷黠拔跋' +
    '屑节洁结杰揭折舌设涉蝶谍迭跌铁灭撇别瞥裂列烈劣切窃绝决诀抉缺血穴雪说悦阅哲辙撤撷缬颉荚' +
    // 药陌锡职
    '药薄泊落洛络骆各阁恶鹤涸削却脚约酌灼若弱索昨作错凿略掠爵嚼谑郭霍鹊雀' +
    '陌白百伯迫拍魄客格隔革击石硕席惜昔夕析锡尺赤斥拆摘宅泽择责册策测侧塞色额碧壁璧劈辟僻逆极籍迹绩积益亦易译驿液腋疫役隙剧觅脉获' +
    '激溺笛敌涤滴剔踢惕寂戚檄历沥' +
    '职织直值植殖食蚀息熄媳识式拭轼饰刻克得德特勒肋墨默黑棘逼匿贼则惑或国域亿忆抑翼弋' +
    // 缉合叶洽
    '缉及级急汲集辑立粒泣湿十什拾习袭邑执蛰汁揖掬' +
    '合盒阖塔榻踏答搭纳杂匝腊蜡磕' +
    '叶帖贴牒碟挟侠峡狭洽恰甲押鸭匣闸插捷睫妾接摄慑猎夹'
  ).split(''),
);

/** 由拼音（含声调符号）判定平仄：一二声为平，三四声为仄，轻声归平（近似） */
export function levelOf(pinyin: string): '平' | '仄' | '' {
  if (!pinyin) return '';
  for (const ch of pinyin) {
    const t = TONE_MAP[ch];
    if (t !== undefined) return t <= 2 ? '平' : '仄';
  }
  return '平'; // 无声调（轻声/儿化等）按平处理
}

/** 结合入声字表的权威平仄判定 */
export function levelOfChar(c: string, pinyin: string): { level: '平' | '仄' | ''; ru: boolean } {
  if (!pinyin || !/[\u4e00-\u9fa5]/.test(c)) return { level: '', ru: false };
  if (RUSHENG.has(c)) return { level: '仄', ru: true };
  return { level: levelOf(pinyin), ru: false };
}

/** 现代十三辙：韵母 -> 韵辙基 */
const ZHE: Record<string, string> = {
  a: 'a', ia: 'a', ua: 'a',
  o: 'o', e: 'o', uo: 'o',
  ie: 'ie', üe: 'ie',
  ai: 'ai', uai: 'ai',
  ei: 'ei', ui: 'ei', uei: 'ei',
  ao: 'ao', iao: 'ao',
  ou: 'ou', iu: 'ou', iou: 'ou',
  an: 'an', ian: 'an', uan: 'an', üan: 'an',
  en: 'en', in: 'en', un: 'en', uen: 'en', ün: 'en',
  ang: 'ang', iang: 'ang', uang: 'ang',
  eng: 'eng', ing: 'eng', ong: 'eng', iong: 'eng', ueng: 'eng',
  i: 'i', ü: 'i', er: 'i',
  u: 'u',
};

const ZHE_NAME: Record<string, string> = {
  a: '发花辙（-a）',
  o: '梭波辙（-o/-e）',
  ie: '乜斜辙（-ie/-üe）',
  ai: '怀来辙（-ai）',
  ei: '灰堆辙（-ei）',
  ao: '遥条辙（-ao）',
  ou: '由求辙（-ou）',
  an: '言前辙（-an）',
  en: '人辰辙（-en/-in）',
  ang: '江阳辙（-ang）',
  eng: '中东辙（-eng/-ong）',
  i: '一七辙（-i/-ü）',
  u: '姑苏辙（-u）',
};

/** 取韵辙基（去声调、去介音、按十三辙归并） */
export function rhymeBase(pinyin: string): string {
  if (!pinyin) return '';
  const hasU = /[üǖǘǚǜ]/.test(pinyin);
  let t = pinyin
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/^[jqxy]u/.test(t)) t = t.replace(/^([jqxy])u/, '$1ü');
  else if (hasU) t = t.replace('u', 'ü');
  // y 开头且后接 e（如「夜 ye」），其韵母实为 ie（乜斜辙），
  // 否则会被误判为 e -> 梭波辙
  if (/^ye/.test(t)) t = 'i' + t.slice(1);
  const i = t.search(/[aeiouü]/);
  const f = i >= 0 ? t.slice(i) : t;
  return ZHE[f] ?? f;
}

/** 取一句的韵脚字与其拼音 */
function rhymeFoot(line: { chars: { c: string; p: string }[] }): { c: string; p: string } {
  for (let k = line.chars.length - 1; k >= 0; k--) {
    const ch = line.chars[k];
    if (ch === undefined) continue;
    if (ch.p && /[\u4e00-\u9fa5]/.test(ch.c)) return ch;
  }
  return { c: '', p: '' };
}

/**
 * 在近体诗上检出平仄大忌（孤平 / 三平调 / 三仄尾 / 失韵 / 落平）。
 * 注：失对、失粘（粘对出入）不在此列——唐人律诗常有拗救，宜作"拗"在谱中可视化呈现，
 * 而非一律判为出律；故仅将公认的"大忌"列为硬伤。
 * @param cl     每句内容字的平仄（已剔除标点）
 * @param cidx   每句内容字在 grid 行内的真实下标（用于高亮）
 * @param rhyme  各句是否押韵（平收）
 */
function detectFaults(cl: string[][], cidx: number[][], rhyme: boolean[]): ProsodyFault[] {
  const faults: ProsodyFault[] = [];
  const last = (i: number) => (cl[i] ?? []).length - 1;

  cl.forEach((line, i) => {
    if (line.length < 2) return;
    const tail = line[last(i)];
    const isRhyme = rhyme[i];

    if (isRhyme) {
      // 押韵句：尾字必平；平收句检查孤平 / 三平调
      if (tail === '仄') {
        faults.push({ line: i, type: '失韵', detail: '押韵句尾字当用平声，今检为仄声。', at: [cidx[i]?.[last(i)] ?? -1] });
      }
      const body = line.slice(0, -1);
      const pingIdx = body.map((x, k) => (x === '平' ? k : -1)).filter((k) => k >= 0);
      // 孤平：除韵脚外仅一平，且该平不与韵脚相邻（如「仄平仄仄平」），
      // 而「仄仄仄平平」之尾平紧邻韵脚，属常格，非孤平。
      if (pingIdx.length === 1 && pingIdx[0] !== body.length - 1) {
        faults.push({
          line: i,
          type: '孤平',
          detail: '除韵脚外仅余一个平声且与韵脚不相邻，犯"孤平"（大忌），唐人多以拗救化解。',
          at: cidx[i]?.slice(0, -1),
        });
      }
      if (line.length >= 3 && line[last(i) - 2] === '平' && line[last(i) - 1] === '平' && tail === '平') {
        const row = cidx[i] ?? [];
        const li = last(i);
        faults.push({
          line: i,
          type: '三平调',
          detail: '句尾三字皆平，犯"三平调"（大忌）。',
          at: [row[li - 2] ?? -1, row[li - 1] ?? -1, row[li] ?? -1],
        });
      }
    } else {
      // 非押韵（仄收）句：尾字必仄，且忌三仄尾
      if (tail === '平') {
        faults.push({ line: i, type: '出律', detail: '非押韵句尾字当用仄声，今检为平声（落平）。', at: [cidx[i]?.[last(i)] ?? -1] });
      }
      if (line.length >= 3 && line[last(i) - 2] === '仄' && line[last(i) - 1] === '仄' && tail === '仄') {
        const row = cidx[i] ?? [];
        const li = last(i);
        faults.push({
          line: i,
          type: '三仄尾',
          detail: '仄收句尾三字皆仄，犯"三仄尾"。',
          at: [row[li - 2] ?? -1, row[li - 1] ?? -1, row[li] ?? -1],
        });
      }
    }
  });

  return faults;
}

/**
 * 一句实测平仄是否在节奏点（二四六字）全部符合标准谱的严格位（非「·」位）。
 * 全句符合则为律绝；有出入则属古绝（古体绝句），不强制粘对。
 */
function spectrumMatch(meas: string[], std: ('平' | '仄' | '·')[], gLen: number): boolean {
  const rp = rhythmPoints(gLen);
  for (const k of rp) {
    if (std[k] !== '·' && meas[k] && std[k] !== meas[k]) return false;
  }
  return true;
}

/**
 * 自动分析一首诗的格律。
 * - 平仄：现代声调 + 平水韵入声字表纠偏（入声归仄）。
 * - 押韵：近体诗按「偶句押韵（首句可入韵）」定位，兼标古今音变；其余按十三辙同韵归并。
 * - 对仗：律诗标注颔联／颈联；精选名篇可由作庭手工覆盖说明。
 * - 近体诗额外推导标准平仄谱、起式用韵、并检出孤平／三平调／三仄尾／失对／失粘等出律项。
 */
export function analyzeProsody(poem: DeepPoem): Prosody {
  const lines = poem.lines;
  const grid: ProsodyCell[][] = lines.map((l) =>
    l.chars.map((ch) => {
      const { level, ru } = levelOfChar(ch.c, ch.p);
      return { c: ch.c, p: ch.p, level, ru };
    }),
  );

  const feet = lines.map((l) => rhymeFoot(l));
  const bases = feet.map((f) => rhymeBase(f.p));
  const rhymeFeet = feet.map((f) => f.c);

  const isJinti =
    (poem.genre === '五言绝句' || poem.genre === '七言绝句') && lines.length === 4
      ? true
      : (poem.genre === '五言律诗' || poem.genre === '七言律诗') && lines.length === 8;

  const count = (idxs: number[]) => {
    const freq: Record<string, number> = {};
    idxs.forEach((i) => {
      const b = bases[i];
      if (b) freq[b] = (freq[b] || 0) + 1;
    });
    let best = '';
    let max = 0;
    for (const [b, n] of Object.entries(freq)) {
      if (n > max) {
        max = n;
        best = b;
      }
    }
    return best;
  };

  let rhymingLines: boolean[];
  let driftLines: boolean[];
  let main: string;
  let mainBu = '';
  let rhymeGroup: string;
  let rhymeBasis: Prosody['rhymeBasis'];

  if (isJinti) {
    // 近体诗：偶句（下标 1,3,5,7）必押，首句可入韵。
    // 韵部判定优先用《平水韵》精确韵部（平声三十韵），不依赖现代十三辙近似。
    const even = lines.map((_, i) => i).filter((i) => i % 2 === 1);
    const mainModern = count(even); // 现代十三辙基准，用于「古今音变」标注

    // 平水韵：以偶句平收韵脚的韵部为主韵
    const evenBu = even.map((i) => (grid[i]?.some((c) => c.level === '平') ? yunBuShort(rhymeFeet[i] ?? '') : '')).filter(Boolean);
    const buFreq: Record<string, number> = {};
    evenBu.forEach((b) => (buFreq[b] = (buFreq[b] || 0) + 1));
    mainBu = '';
    let buMax = 0;
    for (const [b, n] of Object.entries(buFreq)) if (n > buMax) { buMax = n; mainBu = b; }

    rhymingLines = lines.map((_, i) => {
      if (i % 2 === 1) return true; // 偶句必押
      if (i === 0) {
        // 首句可入韵：平收即视为入韵（平水韵宽容，如「斜」与「家花」同麻韵）
        const tail0 = (grid[0] ?? []).filter((c) => c.level !== '').map((c) => c.level);
        return tail0.length ? tail0[tail0.length - 1] === '平' : false;
      }
      return false;
    });

    // 主韵：优先平水韵；偶句有未收录字时回退现代十三辙
    main = mainModern;
    if (mainBu) {
      rhymeGroup = `平水韵·${mainBu}`;
      rhymeBasis = '平水韵';
    } else {
      rhymeGroup = mainModern ? ZHE_NAME[mainModern] ?? `-${mainModern}` : '';
      rhymeBasis = '偶句定位';
    }
    // 古今音变：押韵位置而现代十三辙与主韵辙不同（平水韵同韵、今读已歧）
    driftLines = lines.map((_, i) => !!(rhymingLines[i] && !!bases[i] && bases[i] !== main));
  } else {
    main = count(lines.map((_, i) => i));
    rhymingLines = bases.map((b) => !!b && b === main);
    driftLines = lines.map(() => false);
    rhymeGroup = main ? ZHE_NAME[main] ?? `-${main}` : '';
    rhymeBasis = '同韵归并';
  }

  const yunBu = rhymeBasis === '平水韵' ? rhymeGroup.replace('平水韵·', '') : '';

  // 对仗：律诗（八句）标注颔联（3-4句）、颈联（5-6句）
  const couplets: Couplet[] = [];
  let note: string;
  if (poem.genre === '五言律诗' || poem.genre === '七言律诗') {
    couplets.push({ label: '颔联', lines: [2, 3] });
    couplets.push({ label: '颈联', lines: [4, 5] });
    note = '律诗八句四联，首联—颔联—颈联—尾联；其中颔联、颈联必须对仗：上下句字数相等、词性相对、平仄相反、句意相衬。';
  } else if (poem.genre === '五言绝句' || poem.genre === '七言绝句') {
    note = '绝句四句，二、四句押平声韵，首句可入韵；篇幅短小一般不强求对仗，重在意足韵圆。';
  } else if (poem.genre === '词') {
    note = '词依词牌填写，句式长短错落，平仄与韵位由词谱规定，一调一格。';
  } else if (poem.genre === '曲') {
    note = '散曲依曲牌，可加衬字，用韵较宽（中原音韵），平上去三声通押。';
  } else {
    note = '古体诗（含乐府、诗经）格律自由，句数不限、可换韵，不讲究严格对仗与固定平仄。';
  }

  // 若精选作庭提供了权威格律说明，优先采用
  if (poem.dossier?.prosodyManual) {
    const m = poem.dossier.prosodyManual;
    note = `${m.form}：${m.rhyme}${m.antithesis.length ? '；' + m.antithesis.join('；') : ''}`;
  }

  // —— 近体诗进阶：标准谱、起式用韵、出律检测 ——
  let standardGrid: ('平' | '仄' | '·')[][] = [];
  let pattern = '';
  let faults: ProsodyFault[] = [];
  let prosodicNote = '';

  if (isJinti) {
    const genreLen = (poem.genre ?? '')[0] === '五' ? 5 : 7;
    const isLv = lines.length === 8;
    const cl = grid.map((row) => row.filter((c) => c.level !== '').map((c) => c.level));
    const cidx = grid.map((row) => row.map((c, j) => (c.level !== '' ? j : -1)).filter((j) => j >= 0));
    const aligned = cl.length > 0 && cl.every((line) => line.length === genreLen);

    const qi: '仄' | '平' = cl[0]?.[1] === '平' ? '平' : '仄';
    const ru = rhymingLines[0] ?? false;

    pattern = `${qi}起首句${ru ? '入韵' : '不入韵'}·${poem.genre}`;

    // 落韵（出韵）：平水韵下，平收韵脚韵部与主韵部不一致
    const luoyun: ProsodyFault[] = [];
    if (mainBu) {
      rhymingLines.forEach((isR, i) => {
        if (!isR) return;
        const bu = yunBuShort(rhymeFeet[i] ?? '');
        if (bu && bu !== mainBu) {
          const at = (grid[i] ?? []).map((c, j) => (c.c === rhymeFeet[i] ? j : -1)).filter((j) => j >= 0);
          luoyun.push({
            line: i,
            type: '失韵',
            detail: `此句押韵而韵脚「${rhymeFeet[i]}」属${bu}，与主韵「${mainBu}」不同部，为落韵（邻韵通押／借韵）——唐人尤多此格，或首句借韵、或故意破格以求气脉，非必失误。`,
            at,
          });
        }
      });
    }

    if (aligned) {
      standardGrid = buildStandardGrid(genreLen, qi, ru, isLv);
      const matched = standardGrid.every((std, i) => spectrumMatch(cl[i] ?? [], std, genreLen));

      if (isLv) {
        // 律诗：整谱核对大忌
        faults = [...detectFaults(cl, cidx, rhymingLines), ...luoyun];
      } else if (matched) {
        // 绝句且符合律绝谱：作律绝处理（检大忌）
        faults = [...detectFaults(cl, cidx, rhymingLines), ...luoyun];
      } else {
        // 绝句但不合律绝谱：判为古绝（唐人古绝句，自由成趣，非误）
        faults = luoyun;
        prosodicNote =
          '此诗为「古绝」（古体绝句），不严格依律绝平仄谱，与标准谱在节奏点有出入，乃唐人写短章常见笔法，非失误；其韵脚、章法仍见匠心。';
      }
    } else {
      faults = luoyun;
    }

    if (isLv || !prosodicNote) {
      if (faults.length === 0) {
        prosodicNote = aligned
          ? '本诗合律：平仄、用韵、对仗与粘对均符合近体诗规范。'
          : '因录入行字数不齐，暂无法比对标准谱，请核对原文字数。';
      } else {
        const kinds = Array.from(new Set(faults.map((f) => f.type)));
        prosodicNote = `检出 ${faults.length} 处出律：${kinds.join('、')}（已在谱中标注，详见格律视图）。`;
      }
    }
  }

  return {
    grid,
    rhymeFeet,
    rhymingLines,
    driftLines,
    rhymeGroup,
    yunBu,
    couplets,
    note,
    rhymeBasis,
    standardGrid,
    pattern,
    prosodicNote,
    faults,
  };
}
