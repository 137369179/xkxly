// 增补必读名篇：把数据集中缺失的「词/曲/律诗/用典」代表作补进去，
// 用 pinyin-pro 逐字注音 + 必要的破读校正，合并回 src/data/poems.json，
// 之后需再跑 enrich-poems.mjs 重新生成 poems-deep.json。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUNCT = /[，。？！、；：「」『』《》〈〉·—…“”‘’（）]/;

// 仅列出新增诗篇需要的破读校正
const OVERRIDES = [
  { ctx: '羽扇纶巾', char: '纶', py: 'guān' },
  { ctx: '路转溪桥忽见', char: '见', py: 'xiàn' },
  { ctx: '溪头卧剥莲蓬', char: '剥', py: 'bāo' },
  { ctx: '溪头卧剥莲蓬', char: '莲', py: 'lián' },
  { ctx: '最喜小儿亡赖', char: '亡', py: 'wú' },
  { ctx: '高处不胜寒', char: '胜', py: 'shèng' },
  { ctx: '浑欲不胜簪', char: '胜', py: 'shèng' },
  { ctx: '一尊还酹江月', char: '还', py: 'huán' },
  { ctx: '低绮户', char: '绮', py: 'qǐ' },
];
const RULES = OVERRIDES.map((ov, i) => {
  const positions = [];
  for (let k = 0; k < ov.ctx.length; k++) if (ov.ctx[k] === ov.char) positions.push(k);
  if (!positions.length) throw new Error(`覆盖表第 ${i} 条错误：「${ov.char}」不在「${ov.ctx}」`);
  return { ...ov, offset: positions[ov.nth ?? 0] };
});
const hit = new Array(RULES.length).fill(0);

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
      if (chars[target] && chars[target].c === rule.char) {
        chars[target].p = rule.py;
        hit[ri]++;
      }
      from = at + 1;
    }
  });
  return chars;
}

// 新增名篇（展示 词/曲/律诗/用典）
const NEW = [
  { title: '悯农', author: '李绅', dynasty: '唐', tags: ['悯农', '劳动', '粮食'], level: 1,
    lines: ['锄禾日当午，', '汗滴禾下土。', '谁知盘中餐，', '粒粒皆辛苦。'] },
  { title: '凉州词', author: '王之涣', dynasty: '唐', tags: ['边塞', '思乡', '戍边'], level: 2,
    lines: ['黄河远上白云间，', '一片孤城万仞山。', '羌笛何须怨杨柳，', '春风不度玉门关。'] },
  { title: '绝句', author: '杜甫', dynasty: '唐', tags: ['春天', '山水', '色彩'], level: 2,
    lines: ['两个黄鹂鸣翠柳，', '一行白鹭上青天。', '窗含西岭千秋雪，', '门泊东吴万里船。'] },
  { title: '使至塞上', author: '王维', dynasty: '唐', tags: ['边塞', '山水', '大漠'], level: 4,
    lines: ['单车欲问边，', '属国过居延。', '征蓬出汉塞，', '归雁入胡天。', '大漠孤烟直，', '长河落日圆。', '萧关逢候骑，', '都护在燕然。'] },
  { title: '春望', author: '杜甫', dynasty: '唐', tags: ['忧国', '春天', '战乱'], level: 4,
    lines: ['国破山河在，', '城春草木深。', '感时花溅泪，', '恨别鸟惊心。', '烽火连三月，', '家书抵万金。', '白头搔更短，', '浑欲不胜簪。'] },
  { title: '登高', author: '杜甫', dynasty: '唐', tags: ['秋天', '悲秋', '登高'], level: 5,
    lines: ['风急天高猿啸哀，', '渚清沙白鸟飞回。', '无边落木萧萧下，', '不尽长江滚滚来。', '万里悲秋常作客，', '百年多病独登台。', '艰难苦恨繁霜鬓，', '潦倒新停浊酒杯。'] },
  { title: '游子吟', author: '孟郊', dynasty: '唐', tags: ['母爱', '亲情', '感恩'], level: 2,
    lines: ['慈母手中线，', '游子身上衣。', '临行密密缝，', '意恐迟迟归。', '谁言寸草心，', '报得三春晖。'] },
  { title: '古朗月行（节选）', author: '李白', dynasty: '唐', tags: ['月亮', '想象', '童年'], level: 2,
    lines: ['小时不识月，', '呼作白玉盘。', '又疑瑶台镜，', '飞在青云端。', '仙人垂两足，', '桂树何团团。', '白兔捣药成，', '问言与谁餐？'] },
  { title: '四时田园杂兴', author: '范成大', dynasty: '宋', tags: ['田园', '乡村', '劳动'], level: 2,
    lines: ['昼出耘田夜绩麻，', '村庄儿女各当家。', '童孙未解供耕织，', '也傍桑阴学种瓜。'] },
  { title: '水调歌头·明月几时有', author: '苏轼', dynasty: '宋', tags: ['月亮', '中秋', '哲理', '思念'], level: 4,
    lines: ['明月几时有？', '把酒问青天。', '不知天上宫阙，', '今夕是何年。', '我欲乘风归去，', '又恐琼楼玉宇，', '高处不胜寒。', '起舞弄清影，', '何似在人间。', '转朱阁，', '低绮户，', '照无眠。', '不应有恨，', '何事长向别时圆？', '人有悲欢离合，', '月有阴晴圆缺，', '此事古难全。', '但愿人长久，', '千里共婵娟。'] },
  { title: '念奴娇·赤壁怀古', author: '苏轼', dynasty: '宋', tags: ['怀古', '长江', '豪放', '用典'], level: 5,
    lines: ['大江东去，', '浪淘尽，', '千古风流人物。', '故垒西边，', '人道是，', '三国周郎赤壁。', '乱石穿空，', '惊涛拍岸，', '卷起千堆雪。', '江山如画，', '一时多少豪杰。', '遥想公瑾当年，', '小乔初嫁了，', '雄姿英发。', '羽扇纶巾，', '谈笑间，', '樯橹灰飞烟灭。', '故国神游，', '多情应笑我，', '早生华发。', '人生如梦，', '一尊还酹江月。'] },
  { title: '如梦令', author: '李清照', dynasty: '宋', tags: ['夏天', '闲适', '溪亭', '婉约'], level: 3,
    lines: ['常记溪亭日暮，', '沉醉不知归路。', '兴尽晚回舟，', '误入藕花深处。', '争渡，', '争渡，', '惊起一滩鸥鹭。'] },
  { title: '声声慢', author: '李清照', dynasty: '宋', tags: ['秋天', '愁绪', '婉约', '叠字'], level: 5,
    lines: ['寻寻觅觅，', '冷冷清清，', '凄凄惨惨戚戚。', '乍暖还寒时候，', '最难将息。', '三杯两盏淡酒，', '怎敌他、', '晚来风急？', '雁过也，', '正伤心，', '却是旧时相识。', '满地黄花堆积，', '憔悴损，', '如今有谁堪摘？', '守着窗儿，', '独自怎生得黑？', '梧桐更兼细雨，', '到黄昏、', '点点滴滴。', '这次第，', '怎一个愁字了得！'] },
  { title: '清平乐·村居', author: '辛弃疾', dynasty: '宋', tags: ['乡村', '田园', '亲情', '闲适'], level: 3,
    lines: ['茅檐低小，', '溪上青青草。', '醉里吴音相媚好，', '白发谁家翁媪？', '大儿锄豆溪东，', '中儿正织鸡笼。', '最喜小儿亡赖，', '溪头卧剥莲蓬。'] },
  { title: '西江月·夜行黄沙道中', author: '辛弃疾', dynasty: '宋', tags: ['夏天', '乡村', '月夜', '闲适'], level: 3,
    lines: ['明月别枝惊鹊，', '清风半夜鸣蝉。', '稻花香里说丰年，', '听取蛙声一片。', '七八个星天外，', '两三点雨山前。', '旧时茅店社林边，', '路转溪桥忽见。'] },
  { title: '天净沙·秋思', author: '马致远', dynasty: '元', tags: ['秋天', '羁旅', '乡愁', '意象'], level: 3,
    lines: ['枯藤老树昏鸦，', '小桥流水人家，', '古道西风瘦马。', '夕阳西下，', '断肠人在天涯。'] },
  { title: '山坡羊·潼关怀古', author: '张养浩', dynasty: '元', tags: ['怀古', '忧民', '历史', '兴亡'], level: 4,
    lines: ['峰峦如聚，', '波涛如怒，', '山河表里潼关路。', '望西都，', '意踌躇。', '伤心秦汉经行处，', '宫阙万间都做了土。', '兴，', '百姓苦；', '亡，', '百姓苦。'] },
];

const poems = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'poems.json'), 'utf8'));
const existing = new Set(poems.map((p) => p.title + p.author));
let n = poems.length;
const added = [];
for (const np of NEW) {
  if (existing.has(np.title + np.author)) {
    console.log('跳过已存在：', np.title);
    continue;
  }
  n++;
  const id = `pC${String(added.length + 1).padStart(2, '0')}`;
  poems.push({
    id,
    title: np.title,
    titleChars: annotate(np.title),
    author: np.author,
    dynasty: np.dynasty,
    lines: np.lines.map((l) => ({ text: l, chars: annotate(l) })),
    tags: np.tags,
    level: np.level,
  });
  added.push(np.title);
}

fs.writeFileSync(path.join(root, 'src', 'data', 'poems.json'), JSON.stringify(poems), 'utf8');
const unused = RULES.map((r, i) => (hit[i] === 0 ? `${r.ctx}·${r.char}` : null)).filter(Boolean);
console.log(`已新增 ${added.length} 首，总计 ${poems.length} 首：${added.join('、')}`);
if (unused.length) console.log('未命中覆盖：', unused.join('、'));
