/**
 * 古诗拼音生成管线
 * data/poems.merged.json  →（pinyin-pro 逐字标注 + 古诗破读音覆盖）→ src/data/poems.json
 *
 * 为什么需要覆盖表：
 * pinyin-pro 基于现代汉语词库分词，对绝大多数字准确，但古诗中存在大量「破读」
 * （如「风吹草低见牛羊」的「见」读 xiàn、「可汗」读 kè hán），必须人工校正。
 *
 * 覆盖表用「上下文 + 目标字」定位，而不是手写下标 —— 下标极易数错，
 * 而目标字可以在生成时自校验：定位不到就报错，绝不会静默打错字。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 破读音覆盖表（以现行中小学语文教材注音为准）
 * ctx  : 诗句上下文片段
 * char : 要改音的那个字（必须出现在 ctx 中）
 * nth  : 该字在 ctx 中的第几次出现，默认 0（第一次）
 * py   : 正确读音
 */
const OVERRIDES = [
  // —— 通假 / 古音破读 ——
  { ctx: '风吹草低见牛羊', char: '见', py: 'xiàn' },
  { ctx: '曲项向天歌', char: '曲', py: 'qū' },
  { ctx: '一行白鹭上青天', char: '行', py: 'háng' },
  { ctx: '可汗大点兵', char: '汗', py: 'hán' },
  { ctx: '可汗问所欲', char: '汗', py: 'hán' },
  { ctx: '单于夜遁逃', char: '单', py: 'chán' },
  { ctx: '燕山胡骑', char: '燕', py: 'yān' },
  { ctx: '燕然未勒', char: '燕', py: 'yān' },
  { ctx: '塞上燕脂', char: '燕', py: 'yān' },
  { ctx: '没在石棱中', char: '没', py: 'mò' },
  { ctx: '古木阴中系短篷', char: '系', py: 'jì' },
  { ctx: '知有儿童挑促织', char: '挑', py: 'tiǎo' },
  { ctx: '客舍青青柳色新', char: '舍', py: 'shè' },
  { ctx: '策勋十二转', char: '转', py: 'zhuǎn' },
  { ctx: '赏赐百千强', char: '强', py: 'qiáng' },
  { ctx: '不闻机杼声', char: '杼', py: 'zhù' },
  { ctx: '此曲只应天上有', char: '曲', py: 'qǔ' },
  { ctx: '此曲只应天上有', char: '应', py: 'yīng' },
  { ctx: '应傍战场开', char: '应', py: 'yīng' },
  { ctx: '天似穹庐', char: '似', py: 'sì' },
  { ctx: '笼盖四野', char: '笼', py: 'lǒng' },

  // —— 朝 zhāo ——
  { ctx: '朝辞白帝', char: '朝', py: 'zhāo' },
  { ctx: '朝如青丝暮成雪', char: '朝', py: 'zhāo' },

  // —— 重 chóng / zhòng ——
  { ctx: '万重山', char: '重', py: 'chóng' },
  { ctx: '山重水复', char: '重', py: 'chóng' },
  { ctx: '数重山', char: '重', py: 'chóng' },
  { ctx: '花重锦官城', char: '重', py: 'zhòng' },

  // —— 数 shù ——
  { ctx: '墙角数枝梅', char: '数', py: 'shù' },
  { ctx: '数重山', char: '数', py: 'shù' },

  // —— 发 fà / fā，少 shào / shǎo ——
  { ctx: '白发三千丈', char: '发', py: 'fà' },
  { ctx: '白发谁家翁媪', char: '发', py: 'fà' },
  { ctx: '春来发几枝', char: '发', py: 'fā' },
  { ctx: '少小离家老大回', char: '少', py: 'shào' },
  { ctx: '花落知多少', char: '少', py: 'shǎo' },
  { ctx: '遍插茱萸少一人', char: '少', py: 'shǎo' },
  { ctx: '乡村四月闲人少', char: '少', py: 'shǎo' },

  // —— 还 huán / hái ——
  { ctx: '明月何时照我还', char: '还', py: 'huán' },
  { ctx: '万里长征人未还', char: '还', py: 'huán' },
  { ctx: '不破楼兰终不还', char: '还', py: 'huán' },
  { ctx: '春去花还在', char: '还', py: 'hái' },
  { ctx: '千磨万击还坚劲', char: '还', py: 'hái' },

  // —— 更 gèng ——
  { ctx: '更上一层楼', char: '更', py: 'gèng' },
  { ctx: '劝君更尽一杯酒', char: '更', py: 'gèng' },

  // —— 教 jiào / 兴 xìng ——
  { ctx: '不教胡马度阴山', char: '教', py: 'jiào' },
  { ctx: '兴尽晚回舟', char: '兴', py: 'xìng' },

  // —— 为 wèi / wéi ——
  { ctx: '为有暗香来', char: '为', py: 'wèi' },
  { ctx: '为有源头活水来', char: '为', py: 'wèi' },
  { ctx: '独在异乡为异客', char: '为', py: 'wéi' },
  { ctx: '死亦为鬼雄', char: '为', py: 'wéi' },
  { ctx: '漉菽以为汁', char: '为', py: 'wéi' },

  // —— 那 nǎ / 得 dé ——
  { ctx: '问渠那得清如许', char: '那', py: 'nǎ' },
  { ctx: '问渠那得清如许', char: '得', py: 'dé' },

  // —— 长 cháng / zhǎng ——
  { ctx: '草长莺飞', char: '长', py: 'zhǎng' },
  { ctx: '弹琴复长啸', char: '长', py: 'cháng' },

  // —— 露 lù / 角 jiǎo ——
  { ctx: '小荷才露尖尖角', char: '露', py: 'lù' },
  { ctx: '小荷才露尖尖角', char: '角', py: 'jiǎo' },
  { ctx: '露似真珠月似弓', char: '露', py: 'lù' },
  { ctx: '墙角数枝梅', char: '角', py: 'jiǎo' },
  { ctx: '角声满天秋色里', char: '角', py: 'jiǎo' },

  // —— 好 hǎo ——
  { ctx: '好雨知时节', char: '好', py: 'hǎo' },
  { ctx: '水光潋滟晴方好', char: '好', py: 'hǎo' },
  { ctx: '不要人夸好颜色', char: '好', py: 'hǎo' },

  // —— 相 xiāng ——
  { ctx: '相看两不厌', char: '相', py: 'xiāng' },
  { ctx: '此物最相思', char: '相', py: 'xiāng' },
  { ctx: '明月来相照', char: '相', py: 'xiāng' },
  { ctx: '相煎何太急', char: '相', py: 'xiāng' },
  { ctx: '淡妆浓抹总相宜', char: '相', py: 'xiāng' },

  // —— 看 kàn ——
  { ctx: '横看成岭侧成峰', char: '看', py: 'kàn' },
  { ctx: '远看山有色', char: '看', py: 'kàn' },
  { ctx: '晓看红湿处', char: '看', py: 'kàn' },
  { ctx: '相看两不厌', char: '看', py: 'kàn' },
  { ctx: '出门看火伴', char: '看', py: 'kàn' },

  // —— 中 zhōng ——
  { ctx: '只缘身在此山中', char: '中', py: 'zhōng' },
  { ctx: '豆在釜中泣', char: '中', py: 'zhōng' },
  { ctx: '立根原在破岩中', char: '中', py: 'zhōng' },
  { ctx: '谁知盘中餐', char: '中', py: 'zhōng' },
  { ctx: '爆竹声中一岁除', char: '中', py: 'zhōng' },
  { ctx: '毕竟西湖六月中', char: '中', py: 'zhōng' },

  // —— 处 chù ——
  { ctx: '处处闻啼鸟', char: '处', nth: 0, py: 'chù' },
  { ctx: '处处闻啼鸟', char: '处', nth: 1, py: 'chù' },
  { ctx: '白云生处有人家', char: '处', py: 'chù' },
  { ctx: '借问酒家何处有', char: '处', py: 'chù' },
  { ctx: '飞入菜花无处寻', char: '处', py: 'chù' },
  { ctx: '晓看红湿处', char: '处', py: 'chù' },

  // —— 尽 jìn / 散 sàn / 种 zhòng ——
  { ctx: '野火烧不尽', char: '尽', py: 'jìn' },
  { ctx: '孤帆远影碧空尽', char: '尽', py: 'jìn' },
  { ctx: '劝君更尽一杯酒', char: '尽', py: 'jìn' },
  { ctx: '儿童散学归来早', char: '散', py: 'sàn' },
  { ctx: '春种一粒粟', char: '种', py: 'zhòng' },

  // —— 斜 xié / 间 jiān / 当 dāng ——
  { ctx: '入竹万竿斜', char: '斜', py: 'xié' },
  { ctx: '远上寒山石径斜', char: '斜', py: 'xié' },
  { ctx: '要留清白在人间', char: '间', py: 'jiān' },
  { ctx: '京口瓜洲一水间', char: '间', py: 'jiān' },
  { ctx: '鱼戏莲叶间', char: '间', py: 'jiān' },
  { ctx: '锄禾日当午', char: '当', py: 'dāng' },
  { ctx: '当窗理云鬓', char: '当', py: 'dāng' },
  { ctx: '生当作人杰', char: '当', py: 'dāng' },

  // —— 其他 ——
  { ctx: '正是河豚欲上时', char: '正', py: 'zhèng' },
  { ctx: '才了蚕桑又插田', char: '了', py: 'liǎo' },
  { ctx: '解落三秋叶', char: '解', py: 'jiě' },
  { ctx: '不解藏踪迹', char: '解', py: 'jiě' },
  { ctx: '任尔东西南北风', char: '任', py: 'rèn' },
  { ctx: '千磨万击还坚劲', char: '劲', py: 'jìng' },
  { ctx: '牧童骑黄牛', char: '骑', py: 'qí' },
  { ctx: '秋收万颗子', char: '子', py: 'zǐ' },
  { ctx: '愿君多采撷', char: '撷', py: 'xié' },
  { ctx: '同行十二年', char: '行', py: 'xíng' },
  { ctx: '路上行人欲断魂', char: '行', py: 'xíng' },
  { ctx: '将军百战死', char: '将', py: 'jiāng' },
];

const PUNCT = /[，。？！、；：「」『』《》〈〉·—…“”‘’（）]/;

/** 预处理：把 ctx 中目标字的下标算好（在 ctx 内部），并做自校验 */
const RULES = OVERRIDES.map((ov, i) => {
  const positions = [];
  for (let k = 0; k < ov.ctx.length; k++) if (ov.ctx[k] === ov.char) positions.push(k);
  const nth = ov.nth ?? 0;
  if (positions.length === 0) {
    throw new Error(`覆盖表第 ${i} 条错误：「${ov.char}」不在「${ov.ctx}」中`);
  }
  if (nth >= positions.length) {
    throw new Error(`覆盖表第 ${i} 条错误：「${ov.ctx}」中「${ov.char}」只出现 ${positions.length} 次`);
  }
  return { ...ov, offset: positions[nth] };
});

const hitCount = new Array(RULES.length).fill(0);

/** 为一行文本生成逐字拼音 */
function annotate(text) {
  const detail = pinyin(text, { type: 'all' });
  const chars = detail.map((d) => ({
    c: d.origin,
    p: d.isZh && !PUNCT.test(d.origin) ? (d.pinyin ?? '') : '',
  }));

  RULES.forEach((rule, ri) => {
    let from = 0;
    for (;;) {
      const at = text.indexOf(rule.ctx, from);
      if (at === -1) break;
      const target = at + rule.offset;
      // 自校验：目标位置的字必须与规则声明的字一致
      if (chars[target] && chars[target].c === rule.char) {
        chars[target].p = rule.py;
        hitCount[ri]++;
      }
      from = at + 1;
    }
  });

  return chars;
}

// —— 主流程 ——
const src = JSON.parse(fs.readFileSync(path.join(root, 'data', 'poems.merged.json'), 'utf8'));

const out = src.map((p, i) => ({
  id: `p${String(i + 1).padStart(3, '0')}`,
  title: p.title,
  titleChars: annotate(p.title),
  author: p.author,
  dynasty: p.dynasty,
  lines: p.lines.map((l) => ({ text: l, chars: annotate(l) })),
  tags: p.tags,
  level: p.level,
}));

const outPath = path.join(root, 'src', 'data', 'poems.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out), 'utf8');

// —— 质检 ——
const missing = [];
for (const p of out) {
  for (const l of p.lines) {
    for (const ch of l.chars) {
      if (!ch.p && /[\u4e00-\u9fa5]/.test(ch.c)) missing.push(`${p.title}:${ch.c}`);
    }
  }
}
const unused = RULES.map((r, i) => (hitCount[i] === 0 ? `${r.ctx}·${r.char}` : null)).filter(Boolean);

const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✅ 生成 ${out.length} 首古诗 → src/data/poems.json (${sizeKB} KB)`);
console.log(`   朝代分布: ${[...new Set(out.map((p) => p.dynasty))].join(' / ')}`);
console.log(`   缺拼音的汉字: ${missing.length ? missing.slice(0, 20).join(', ') : '无'}`);
console.log(`   破读音规则: ${RULES.length} 条，命中 ${RULES.length - unused.length} 条`);
if (unused.length) console.log(`   未命中(语料中无此句，正常): ${unused.join('、')}`);
