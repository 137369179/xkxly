/**
 * 抓取汉字字理数据（六书 + 部件拆分 + 派生字）→ src/data/hanziEtymology.ts
 * ------------------------------------------------------------------
 * 数据源：Make Me a Hanzi `dictionary.txt`（Arphic 宽松许可）
 *   每行一个 JSON：{ character, definition, pinyin, decomposition, etymology, radical }
 *   - etymology.type: 'pictographic' | 'ideographic' | 'pictophonetic'
 *   - etymology.phonetic / semantic: 形声字的声旁 / 形旁
 *   - decomposition: IDS 表意文字描述序列，如 '⿰氵青'
 *
 * 处理要点：
 *   1. MMAH 只有 3 类 type，而六书教学需区分「指事」与「会意」——
 *      用 decomposition 消歧：ideographic 且有 ≥2 个真实部件 → 会意，否则 → 指事。
 *   2. 人工校订表 CURATED 优先级最高（覆盖自动判定），因六书判定有学术争议。
 *   3. derived（派生字）由 components 反向聚合，且只在本项目字库内取值，
 *      保证「字族树」上每个字都可点击进入学习流。
 *
 * 用法：node scripts/fetch-hanzi-etymology.mjs
 *      （首次下载约 10MB 字典并缓存到 /tmp，后续复用）
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { HANZI_DATA } from '../src/data/hanzi.ts';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../src/data/hanziEtymology.ts');
const CACHE = join(tmpdir(), 'mmah-dictionary.txt');
const SRC_URL = 'https://cdn.jsdelivr.net/gh/skishore/makemeahanzi@master/dictionary.txt';

// ---------------------------------------------------------------- 1. 取字典
async function loadDictionary() {
  if (existsSync(CACHE)) {
    const txt = readFileSync(CACHE, 'utf8');
    if (txt.length > 1_000_000) {
      console.log(`使用缓存字典 ${CACHE}（${Math.round(txt.length / 1024 / 1024)}MB）`);
      return txt;
    }
  }
  console.log('下载 Make Me a Hanzi 字典…');
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
  const txt = await res.text();
  writeFileSync(CACHE, txt);
  console.log(`下载完成（${Math.round(txt.length / 1024 / 1024)}MB），已缓存`);
  return txt;
}

// ---------------------------------------------------------------- 2. IDS 解析
/** 二元表意描述符（左右/上下/包围…） */
const IDS2 = new Set(['⿰', '⿱', '⿴', '⿵', '⿶', '⿷', '⿸', '⿹', '⿺', '⿻']);
/** 三元表意描述符（左中右/上中下） */
const IDS3 = new Set(['⿲', '⿳']);
const isCjk = (ch) => /[\u2e80-\u2fdf\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch);

/** 把 IDS 字符串解析为树 */
function parseIds(str) {
  const chars = [...String(str || '')];
  let i = 0;
  function node() {
    if (i >= chars.length) return null;
    const ch = chars[i++];
    if (IDS2.has(ch)) {
      const a = node();
      const b = node();
      return { op: ch, kids: [a, b].filter(Boolean) };
    }
    if (IDS3.has(ch)) {
      const a = node();
      const b = node();
      const c = node();
      return { op: ch, kids: [a, b, c].filter(Boolean) };
    }
    return { leaf: ch };
  }
  return node();
}

/** 收集一棵子树里的所有叶子字符 */
function leaves(n, acc = []) {
  if (!n) return acc;
  if (n.leaf) {
    acc.push(n.leaf);
    return acc;
  }
  for (const k of n.kids) leaves(k, acc);
  return acc;
}

/**
 * 取「直接部件」：根节点的各个子树。
 * 子树若本身是复合结构（无单字可表示），退化为其叶子字符展开。
 * 例：'⿰氵青' → ['氵','青']；'⿱⿰木木木'(森) → ['木','木','木'] 去重后 ['木']
 */
function directComponents(decomposition) {
  const root = parseIds(decomposition);
  if (!root || root.leaf) return [];           // 独体字：无拆分
  const out = [];
  for (const kid of root.kids) {
    const ls = leaves(kid).filter((c) => isCjk(c) && c !== '？');
    if (kid.leaf && isCjk(kid.leaf)) out.push(kid.leaf);
    else out.push(...ls);
  }
  // 注意：**不去重**——重复部件本身就是教学核心
  // （林 = 木+木「两棵树」，森 = 木+木+木「三棵树」，去重会毁掉这个讲法）
  return out.slice(0, 4);
}

// ---------------------------------------------------------------- 3. 六书判定
/**
 * 人工校订表（最高优先级）。
 * 来源：src/data/hanzi500.ts 的 CATEGORY_OVERRIDES（已人工撰写，抽样校验 100% 正确）
 * + 本轮补充的常见字。六书判定存在学术争议，此表即教研口径的单一真相源。
 */
const CURATED = {
  // 象形：描画事物形状
  人: 'pictographic', 山: 'pictographic', 日: 'pictographic', 月: 'pictographic',
  水: 'pictographic', 火: 'pictographic', 木: 'pictographic', 田: 'pictographic',
  石: 'pictographic', 子: 'pictographic', 女: 'pictographic', 心: 'pictographic',
  云: 'pictographic', 雨: 'pictographic', 门: 'pictographic', 自: 'pictographic',
  又: 'pictographic', 飞: 'pictographic', 州: 'pictographic', 气: 'pictographic',
  面: 'pictographic', 夕: 'pictographic', 牛: 'pictographic', 鱼: 'pictographic',
  鸟: 'pictographic', 马: 'pictographic', 舟: 'pictographic', 竹: 'pictographic',
  豆: 'pictographic', 燕: 'pictographic', 衣: 'pictographic', 白: 'pictographic',
  目: 'pictographic', 耳: 'pictographic', 手: 'pictographic', 口: 'pictographic',
  风: 'pictographic', 花: 'pictophonetic',
  玉: 'pictographic',   // 三块玉用绳子串起来的样子（MMAH 判为会意，不合主流字理书）
  // 指事：符号或在象形上加标记表抽象义
  一: 'ideographic', 二: 'ideographic', 三: 'ideographic', 上: 'ideographic',
  下: 'ideographic', 中: 'ideographic', 十: 'ideographic', 千: 'ideographic',
  入: 'ideographic', 半: 'ideographic', 天: 'ideographic', 本: 'ideographic',
  不: 'ideographic', 大: 'ideographic', 小: 'ideographic',
  // 会意：多部件合起来表意
  明: 'compound-ideographic', 春: 'compound-ideographic', 秋: 'compound-ideographic',
  家: 'compound-ideographic', 看: 'compound-ideographic', 见: 'compound-ideographic',
  相: 'compound-ideographic', 采: 'compound-ideographic', 林: 'compound-ideographic',
  好: 'compound-ideographic', 尘: 'compound-ideographic', 泪: 'compound-ideographic',
  寒: 'compound-ideographic', 光: 'compound-ideographic', 鸣: 'compound-ideographic',
  暮: 'compound-ideographic', 朝: 'compound-ideographic', 望: 'compound-ideographic',
  思: 'compound-ideographic', 知: 'compound-ideographic', 归: 'compound-ideographic',
  尽: 'compound-ideographic', 得: 'compound-ideographic', 香: 'compound-ideographic',
  书: 'compound-ideographic', 星: 'compound-ideographic', 出: 'compound-ideographic',
  多: 'compound-ideographic', 莫: 'compound-ideographic', 北: 'compound-ideographic',
  从: 'compound-ideographic', 步: 'compound-ideographic', 休: 'compound-ideographic',
  森: 'compound-ideographic', 众: 'compound-ideographic', 男: 'compound-ideographic',
  // 有 = 又(手) + 肉：手里拿着肉就是"有"。MMAH 判为形声（月声）不合主流字理书
  有: 'compound-ideographic',
  // 形声：形旁表义 + 声旁表音
  清: 'pictophonetic', 江: 'pictophonetic', 河: 'pictophonetic', 时: 'pictophonetic',
  妈: 'pictophonetic', 晴: 'pictophonetic', 请: 'pictophonetic', 睛: 'pictophonetic',
  情: 'pictophonetic', 草: 'pictophonetic', 树: 'pictophonetic', 问: 'pictophonetic',
  // ---- 本轮人工校订：脚本判定为低置信的 28 字 ----
  何: 'pictophonetic', 成: 'pictophonetic', 微: 'pictophonetic', 留: 'pictophonetic',
  叶: 'pictophonetic', 当: 'pictophonetic', 应: 'pictophonetic',
  无: 'pictographic', 万: 'pictographic', 方: 'pictographic', 于: 'pictographic',
  已: 'ideographic',
  青: 'compound-ideographic', 去: 'compound-ideographic', 前: 'compound-ideographic',
  更: 'compound-ideographic', 向: 'compound-ideographic', 若: 'compound-ideographic',
  事: 'compound-ideographic', 兮: 'compound-ideographic', 与: 'compound-ideographic',
  为: 'compound-ideographic', 乡: 'compound-ideographic', 发: 'compound-ideographic',
  关: 'compound-ideographic', 台: 'compound-ideographic', 后: 'compound-ideographic',
  乱: 'compound-ideographic',
};

/**
 * 六书归类存疑的字：多为**简化字**，其现代字形已看不出造字理据
 * （六书分析针对的是繁体本字，如 无←無 / 关←關 / 发←發）。
 * 这类字仍给出最可辩护的归类，但打 uncertain 标记，
 * UI 层据此弱化表述（不说"这是形声字"，改说"这个字比较特别"），避免教错。
 */
const UNCERTAIN = new Set([
  '无', '万', '与', '乡', '发', '关', '台', '后', '乱', '为',
  '应', '当', '叶', '兮', '于', '已',
]);

/** MMAH type → 六书；ideographic 需用部件数消歧（指事 vs 会意） */
function decideLiushu(char, entry, components) {
  if (CURATED[char]) return { liushu: CURATED[char], confident: true, src: 'curated' };
  const type = entry?.etymology?.type;
  if (type === 'pictographic') return { liushu: 'pictographic', confident: true, src: 'mmah' };
  if (type === 'pictophonetic') return { liushu: 'pictophonetic', confident: true, src: 'mmah' };
  if (type === 'ideographic') {
    // 有 2 个以上真实部件 → 会意；否则 → 指事
    return components.length >= 2
      ? { liushu: 'compound-ideographic', confident: true, src: 'mmah+ids' }
      : { liushu: 'ideographic', confident: true, src: 'mmah+ids' };
  }
  // MMAH 无 etymology：按部件数与形声线索启发式推断，标记为低置信待人工校订
  if (components.length >= 2) {
    return { liushu: 'compound-ideographic', confident: false, src: 'guess-ids' };
  }
  return { liushu: 'pictographic', confident: false, src: 'guess-single' };
}

// ---------------------------------------------------------------- 4. 主流程
const dictText = await loadDictionary();
const dict = new Map();
for (const line of dictText.split('\n')) {
  if (!line) continue;
  try {
    const j = JSON.parse(line);
    if (j.character) dict.set(j.character, j);
  } catch {
    /* 跳过坏行 */
  }
}
console.log(`字典条目：${dict.size}`);

/** 项目字库（教学顺序 = HANZI_DATA 顺序，已按 level→freq 排好） */
const pool = HANZI_DATA.map((h) => h.c);
const poolSet = new Set(pool);
const orderOf = new Map(pool.map((c, i) => [c, i]));

/**
 * 「可教学部件」白名单（人工校订）
 * ------------------------------------------------------------------
 * MMAH 的 decomposition 是**字形笔画切分**，会拆出大量孩子读不出、
 * 讲不通的构形符与笔画（⺊ 龶 丷 亠 丶 丨 匕 冂 彐 丿 厶 冖 兀 夂 疋 乂 乚 幺 爫 …）。
 * 直接展示「⺊ + 一 = 上」只会制造困惑。
 *
 * 本白名单只收**孩子能读出来、且拆解讲得通**的部件：
 *   ① 常用独体字（木、日、月、口、手、心、火、水…）
 *   ② 常见部首变体（氵、艹、亻、扌、讠、犭、钅、纟、忄、辶、刂、阝、宀、灬、衤…）
 *   ③ 其他常用成字部件（早、化、青、里、成、每、各、相…）
 * 判据来自对 300 字全部 236 个部件的逐一过目（脚本可复现该清单）。
 */
const TEACHABLE_COMPONENTS = (
  // 常用独体字 / 数字 / 方位
  '一二三十千人大小上下不天日月山水火土木禾米竹田石玉王白青子女牛马鸟鱼虫豕' +
  '口目耳手足心又寸力刀弓车舟衣巾门户方生工干十七八九几儿元兀' +
  // 常见部首变体
  '氵艹亻扌讠犭钅纟饣宀灬忄辶刂阝彳攵欠攴衤礻穴广疒勹匚囗' +
  // 其他常用成字部件
  '早化里成每各相莫去关取立音见皮页石占分右友何路色只北仓民卒尸尧吾' +
  '主川度黄尤臣舌公未才了尺由两录旦谷对曲曰亡乍余斗以走己亲至因瓜支' +
  '奚连秋昭予巴景兆少唐帝免京夭凡乔氏可士矢卯从戈酉古止雨青隹丁' +
  // 高价值声旁（本身不在 300 字库，但拆解讲得通且是真实汉字）
  // 落=艹+洛、楼=木+娄、道=辶+首、歌=欠+哥、地=土+也、忽=心+勿、恨=忄+艮
  '洛娄首哥也勿艮'
).split('');

/**
 * 字形变体归一：部首变体 → 孩子认得的本字。
 * ⺼（肉月）是「胜/肥/胖」里的肉旁，字形与「月」同，教学上就讲「月」。
 */
const GLYPH_ALIAS = {
  '⺼': '月',   // 肉月，教学上就讲「月」
  '⺗': '心',   // 心字底
  '爫': '手',   // 爪/手，采 = 手 + 木「用手在树上采果子」
  '⺄': '', '⺊': '', '⺌': '', '⺍': '',
};
const alias = (g) => (g in GLYPH_ALIAS ? GLYPH_ALIAS[g] : g);

/**
 * **绝不可**作为教学部件的笔画与构形碎片。
 * 必须显式黑名单，因为 `teachable` 会并入「字库自带部首」——
 * 而 hanzi.ts 里 千 的部首标作「丿」、为/玉 标作「丶」，
 * 这些笔画会顺着并集漏进白名单，生成「千 = 丿 + 十」这种讲不通的式子。
 * （该缺陷正是由 hanziEtymology.test.ts 的不变量测试抓出来的。）
 */
const NEVER_TEACHABLE = new Set(
  '丿丶乚乙亅亠冖冂匕厶卜⺊龶丷彐夂疋乂幺爫⺍⺌⺗丨卩勹匚⺼'.split('')
);

const teachable = new Set([
  ...TEACHABLE_COMPONENTS,
  ...pool,                              // 项目 300 字必然可教
  ...HANZI_DATA.map((h) => h.radical),  // 字库自身标注的部首
]);
for (const g of NEVER_TEACHABLE) teachable.delete(g);

/**
 * 部件**全部**可教学才保留；只要有一个读不出就整组清空。
 * 理由：拆解教学是「X + Y = Z」的等式，任一项不可读则整句讲不通，
 * 宁可只展示六书徽章、不展示拆解，也不能给孩子一个讲不通的式子。
 */
function keepIfTeachable(components) {
  if (!components.length) return [];
  if (!components.every((x) => teachable.has(x))) return [];
  // 过滤后不足 2 个部件 → 清空。合体字只展示一个部件（如 春 → ['日']）
  // 等式不成立、讲不通，宁可只显示六书徽章。
  return components.length >= 2 ? components : [];
}

// ------------------------------------------------- 3.5 声旁「表音有效性」校验
/**
 * 【核心教学正确性】形声字的声旁在现代普通话里**未必还表音**。
 * 抽样 111 个形声字：仅 40 个声旁与本字同音，25 个同韵母，12 个同声母，
 * **27 个已完全不表音**（时=日+寸 shí≠cùn、江=氵+工 jiāng≠gōng、树=木+对）。
 * 洪恩/悟空一类产品常不加区分地讲"右边告诉我们读音"——对这 27 个字就是**教错**。
 *
 * 本脚本因此对每个声旁做读音关系判定，只在关系成立时才写入 phonetic 字段，
 * 并附 soundRel 供 UI 精确措辞（同音 / 同韵母 / 同声母），做不到就不说。
 */
const TONE_MARKS = /[\u0300-\u036f]/g;
const toneless = (py) =>
  String(py || '').normalize('NFD').replace(TONE_MARKS, '').replace(/ü/g, 'v').toLowerCase().trim();
/** 声母表（zh/ch/sh 必须排在 z/c/s 之前） */
const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
function splitSyllable(py) {
  const s = toneless(py);
  for (const i of INITIALS) if (s.startsWith(i)) return [i, s.slice(i.length)];
  return ['', s];
}
/** 从字典取首选读音（带声调，用于展示） */
const dictPinyin = (ch) => String(dict.get(ch)?.pinyin?.[0] ?? '');

/**
 * 判定声旁与本字的读音关系。
 * @param targetToneless 本字无声调拼音（取自 hanzi.ts 的 p 字段，是教学读音，比字典首选更准）
 */
function soundRelation(targetToneless, phoneticGlyph) {
  const pPy = dictPinyin(phoneticGlyph);
  if (!pPy || !targetToneless) return null;
  const t = toneless(targetToneless);
  const p = toneless(pPy);
  if (t === p) return { rel: 'exact', pinyin: pPy };
  const [ti, tf] = splitSyllable(t);
  const [pi, pf] = splitSyllable(p);
  if (tf && tf === pf) return { rel: 'rhyme', pinyin: pPy };
  if (ti && ti === pi) return { rel: 'initial', pinyin: pPy };
  return null;   // 已不表音 → 绝不声称
}

/**
 * 声旁归属存疑的字：MMAH 的 phonetic/semantic 标注与主流字理书不一致
 * （多为「声旁其实是另一个已简化/隐没的构件」），即使读音关系凑巧成立也不采信。
 *   有 = 又 + 肉（会意，非 月 声）  可 = 口 + 丂（声旁是丂，非口）
 *   此 = 止 + 匕（MMAH 形/声标反）  萧：MMAH 把 艹 当声旁（明显错）
 */
const PHONETIC_SUSPECT = new Set(['有', '可', '此', '叶', '萧', '当', '觉', '成']);

/** 形旁在前（左/上）是最常见的形声结构；若 IDS 串里能定位则按真实字形顺序 */
function orderPair(decomposition, a, b) {
  const s = String(decomposition || '');
  const ia = s.indexOf(a);
  const ib = s.indexOf(b);
  if (ia >= 0 && ib >= 0 && ia !== ib) return ia < ib ? [a, b] : [b, a];
  return [a, b];
}

const records = [];
const lowConfidence = [];
const noDict = [];
/** 审计用：被丢弃的声旁（不表音 / 字形读不出 / 标注存疑） */
const droppedPhonetic = [];
const soundStat = { exact: 0, rhyme: 0, initial: 0, dropped: 0 };

for (const h of HANZI_DATA) {
  const c = h.c;
  const entry = dict.get(c);
  if (!entry) noDict.push(c);
  // 字形变体先归一（⺼→月），否则「胜=⺼+生」会因 ⺼ 读不出而整组丢弃
  let components = (entry ? directComponents(entry.decomposition) : []).map(alias).filter(Boolean);
  const { liushu, confident, src } = decideLiushu(c, entry, components);

  // 【教学正确性】象形字是「整体一幅画」，不可拆分部件。
  // MMAH 的 decomposition 是**字形笔画切分**，会把 日 切成 口+一、山 切成 凵+丨——
  // 这是图形描述而非造字理据，直接展示会教错孩子。故象形字一律清空部件。
  // 指事字保留（本 = 木 + 一「在树根处加标记」，标记位置本身有教学意义）。
  if (liushu === 'pictographic') components = [];
  // 生僻构形符过滤（⺊/龶 之类孩子不认识的部件，整组丢弃）
  components = keepIfTeachable(components);

  const rec = { c, liushu, components };
  // 形声字记形旁（表义）/ 声旁（表音）
  const ety = entry?.etymology;
  if (liushu === 'pictophonetic') {
    let sem = alias(ety?.semantic ?? '');
    let phon = alias(ety?.phonetic ?? '');
    // MMAH 缺 semantic 时用**部首**兜底：形声字的部首即形旁（照=灬形+昭声，花=艹形+化声）。
    // 不能用位置推断（形旁可在左/上/下，如 照 的 灬 在下）。
    if (!sem && teachable.has(h.radical)) sem = h.radical;
    // 缺 phonetic 且已是两部件拆解时，另一个部件即声旁
    if (!phon && rec.components.length === 2 && sem) {
      phon = rec.components.find((x) => x !== sem) ?? '';
    }
    const semOk = !!sem && teachable.has(sem);
    const phonReadable = !!phon && teachable.has(phon);

    // ① 补齐拆解：MMAH 的 IDS 是**笔画切分**，常把声旁再拆碎导致整组被丢
    //    （地→土+乙+丿、楼→木+米+女…）。若「形旁 + 声旁」两者都可教学，
    //    直接用这对最讲得通的拆解补上。
    if (!rec.components.length && semOk && phonReadable) {
      rec.components = orderPair(entry?.decomposition, sem, phon);
    }

    // ② 形旁：必须可教学，且必须出现在展示的拆解里（否则孩子看不到指的是哪块）
    if (semOk && (!rec.components.length || rec.components.includes(sem))) rec.semantic = sem;

    // ③ 声旁：可教学 + 在拆解里 + 标注可信 + **读音关系确实成立**，四者皆满足才写
    const suspect = PHONETIC_SUSPECT.has(c);
    const inComps = rec.components.includes(phon);
    const sr = phonReadable && inComps && !suspect ? soundRelation(h.p, phon) : null;
    if (sr) {
      rec.phonetic = phon;
      rec.phoneticPinyin = sr.pinyin;
      rec.soundRel = sr.rel;
      soundStat[sr.rel]++;
    } else if (phon) {
      soundStat.dropped++;
      const why = suspect ? '标注存疑' : !phonReadable ? '字形读不出' : !inComps ? '不在拆解中' : '已不表音';
      droppedPhonetic.push(`${c}←${phon}(${why})`);
    }
  }
  if (UNCERTAIN.has(c)) rec.uncertain = true;
  records.push(rec);
  if (!confident) lowConfidence.push(`${c}(${src})`);
}

// 反向聚合 derived：谁把「我」当部件用了（只取项目字库内的字，保证可点击可学）
const derivedMap = new Map();
for (const r of records) {
  for (const comp of r.components) {
    if (!poolSet.has(comp)) continue;   // 部件本身不在字库 → 无法作为字族根
    if (comp === r.c) continue;
    if (!derivedMap.has(comp)) derivedMap.set(comp, []);
    derivedMap.get(comp).push(r.c);
  }
}
const MAX_DERIVED = 8;
for (const r of records) {
  const d = derivedMap.get(r.c);
  if (!d?.length) continue;
  // 按教学顺序排序（level→freq），取前 N 个最该先学的
  r.derived = [...new Set(d)]
    .sort((a, b) => (orderOf.get(a) ?? 1e9) - (orderOf.get(b) ?? 1e9))
    .slice(0, MAX_DERIVED);
}

// ---------------------------------------------------------------- 5. 生成 TS
const stat = {};
for (const r of records) stat[r.liushu] = (stat[r.liushu] || 0) + 1;
const withComp = records.filter((r) => r.components.length > 0).length;
const withDerived = records.filter((r) => r.derived?.length).length;

const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
const arr = (a) => `[${a.map(q).join(', ')}]`;
const lines = records.map((r) => {
  const parts = [`c: ${q(r.c)}`, `liushu: ${q(r.liushu)}`, `components: ${arr(r.components)}`];
  if (r.semantic) parts.push(`semantic: ${q(r.semantic)}`);
  if (r.phonetic) parts.push(`phonetic: ${q(r.phonetic)}`);
  if (r.phoneticPinyin) parts.push(`phoneticPinyin: ${q(r.phoneticPinyin)}`);
  if (r.soundRel) parts.push(`soundRel: ${q(r.soundRel)}`);
  if (r.derived?.length) parts.push(`derived: ${arr(r.derived)}`);
  if (r.uncertain) parts.push('uncertain: true');
  return `  { ${parts.join(', ')} },`;
});

const banner = `/**
 * 汉字字理数据（六书 + 部件拆分 + 派生字）—— 自动生成，请勿手改
 * ------------------------------------------------------------------
 * 生成器：scripts/fetch-hanzi-etymology.mjs
 * 数据源：Make Me a Hanzi dictionary.txt（Arphic 宽松许可）+ 人工校订表 CURATED
 * 覆盖：${records.length} 字（与 src/data/hanzi.ts 的 HANZI_DATA 一一对应）
 * 六书分布：${Object.entries(stat).map(([k, v]) => `${k}=${v}`).join(' ')}
 * 有部件拆分：${withComp} 字；有派生字（可作字族根）：${withDerived} 字
 * 声旁表音校验：同音 ${soundStat.exact} / 同韵 ${soundStat.rhyme} / 同声母 ${soundStat.initial}
 *              已不表音而丢弃 ${soundStat.dropped}
 *
 * 六书说明：
 *   pictographic         象形——描画事物形状（日、月、山、水）
 *   ideographic          指事——用符号/加标记表抽象义（上、下、一、本）
 *   compound-ideographic 会意——多部件合起来表意（休、明、林、森）
 *   pictophonetic        形声——形旁表义 + 声旁表音（清、江、妈、请）
 *
 * 【教学正确性约定】
 *   1. 象形字不给 components（象形是整体一幅画，拆笔画会教错）。
 *   2. components 里每一项都是孩子能读出的部件；凑不齐 2 项就整组不展示。
 *   3. phonetic 只在**读音关系确实成立**时才有值（见 soundRel）——
 *      形声字的声旁在现代普通话里未必还表音（时=日+寸、江=氵+工 已不表音），
 *      这类字只讲形旁表义，绝不声称"右边告诉我们读音"。
 */

export type Liushu =
  | 'pictographic'
  | 'ideographic'
  | 'compound-ideographic'
  | 'pictophonetic';

export interface HanziEtymology {
  /** 汉字（与 HANZI_DATA.c 对齐） */
  c: string;
  /** 六书类型 */
  liushu: Liushu;
  /**
   * 直接构成部件，如 清 → ['氵','青']、林 → ['木','木']（重复部件保留，是教学核心）。
   * 象形字与独体字为空数组（象形字是整体一幅画，不可拆）。
   */
  components: string[];
  /** 形声字的形旁（表义），如 清 → '氵'。必定同时出现在 components 里 */
  semantic?: string;
  /**
   * 形声字的声旁（表音），如 清 → '青'。
   * **仅在读音关系确实成立时才有值**（见 soundRel）；
   * 声旁已不表音的字（时/江/树/柳…）此字段为空，UI 不得声称声旁表音。
   */
  phonetic?: string;
  /** 声旁的读音（带声调），供 UI 直接说出「青 读 qīng」 */
  phoneticPinyin?: string;
  /**
   * 声旁与本字的读音关系：
   *   exact   同音（清 qīng ← 青 qīng）——可直接讲"声旁告诉我们读音"
   *   rhyme   同韵母（草 cǎo ← 早 zǎo）——讲"韵母一样"
   *   initial 同声母（沙 shā ← 少 shǎo）——讲"开头的音一样"
   */
  soundRel?: 'exact' | 'rhyme' | 'initial';
  /** 以本字为部件派生出的字（仅取本项目字库内、按教学顺序、最多 ${MAX_DERIVED} 个） */
  derived?: string[];
  /**
   * 六书归类存疑（多为简化字，现代字形已看不出造字理据）。
   * UI 应弱化表述，不做"这是 X 字"的断言。
   */
  uncertain?: boolean;
}

export const HANZI_ETYMOLOGY_LIST: HanziEtymology[] = [
${lines.join('\n')}
];

/** 字 → 字理，O(1) 查询 */
export const HANZI_ETYMOLOGY: Record<string, HanziEtymology> =
  Object.fromEntries(HANZI_ETYMOLOGY_LIST.map((e) => [e.c, e]));
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, banner);

console.log(`\n✅ 生成 ${OUT}`);
console.log(`   ${records.length} 字 / ${Math.round(banner.length / 1024)}KB`);
console.log(`   六书分布：${JSON.stringify(stat)}`);
console.log(`   有部件拆分 ${withComp} 字；可作字族根 ${withDerived} 字`);
console.log(`   声旁校验：${JSON.stringify(soundStat)}`);
if (droppedPhonetic.length) {
  console.log(`\nℹ️ 丢弃声旁 ${droppedPhonetic.length} 处（不表音/读不出/存疑，UI 只讲形旁表义）：`);
  console.log(`   ${droppedPhonetic.join(' ')}`);
}
if (noDict.length) console.log(`⚠️ 字典缺失 ${noDict.length} 字：${noDict.join(' ')}`);
if (lowConfidence.length) {
  console.log(`\n⚠️ 低置信 ${lowConfidence.length} 字，建议人工校订后加入 CURATED 表：`);
  console.log(`   ${lowConfidence.join(' ')}`);
}
