/**
 * 拼音数据库 — 宝贝学习乐园
 *
 * 包含：单韵母6个、声母23个、复韵母9个、鼻韵母9个、整体认读音节16个
 * 按小学拼音教学顺序排列
 */

// ─── 类型定义 ───

export interface PinyinEntry {
  /** 拼音字母 */
  p: string;
  /** 类型 */
  type: 'shengmu' | 'yunmu' | 'zhengti';
  /** 发音描述（儿童可懂） */
  sound: string;
  /** 口型描述 */
  mouth: string;
  /** 发音提示/顺口溜 */
  rhyme: string;
  /** 示例汉字 */
  examples: string[];
  /** 示例音节 */
  syllables: string[];
  /** 四声调示例（可选，仅单韵母） */
  tones?: string[];
  /** 排序序号 */
  order: number;
}

export interface PinyinGroup {
  id: string;
  name: string;
  emoji: string;
  tone: 'green' | 'blue' | 'yellow' | 'pink' | 'purple' | 'orange';
  desc: string;
  items: PinyinEntry[];
}

export interface SyllableCombo {
  shengmu: string;
  yunmu: string;
  result: string;
  hasTone: boolean;
}

// ─── 单韵母 6 个 ───

const DAN_YUNMU: PinyinEntry[] = [
  {
    p: 'a',
    type: 'yunmu',
    sound: '嘴巴张大 a a a',
    mouth: '嘴巴自然张开，舌头放平',
    rhyme: '张大嘴巴 a a a，医生检查说啊——',
    examples: ['阿', '啊'],
    syllables: ['ba', 'pa', 'ma'],
    tones: ['ā', 'á', 'ǎ', 'à'],
    order: 1,
  },
  {
    p: 'o',
    type: 'yunmu',
    sound: '嘴巴圆圆 o o o',
    mouth: '嘴唇收圆，像吹蜡烛',
    rhyme: '公鸡打鸣 o o o，太阳出来咯——',
    examples: ['哦', '喔'],
    syllables: ['bo', 'po', 'mo'],
    tones: ['ō', 'ó', 'ǒ', 'ò'],
    order: 2,
  },
  {
    p: 'e',
    type: 'yunmu',
    sound: '嘴巴扁扁 e e e',
    mouth: '嘴角向两边拉开，嘴巴扁扁的',
    rhyme: '白鹅游水 e e e，水波荡漾真美丽',
    examples: ['鹅', '饿'],
    syllables: ['he', 'she', 're'],
    tones: ['ē', 'é', 'ě', 'è'],
    order: 3,
  },
  {
    p: 'i',
    type: 'yunmu',
    sound: '牙齿对齐 i i i',
    mouth: '嘴角向两边拉紧，露出牙齿',
    rhyme: '衣服叔叔 i i i，穿衣戴帽真神气',
    examples: ['衣', '一'],
    syllables: ['bi', 'pi', 'mi'],
    tones: ['ī', 'í', 'ǐ', 'ì'],
    order: 4,
  },
  {
    p: 'u',
    type: 'yunmu',
    sound: '嘴巴突出 u u u',
    mouth: '嘴唇收圆向前突，像吹泡泡',
    rhyme: '乌鸦做窝 u u u，树枝搭成小房子',
    examples: ['乌', '五'],
    syllables: ['bu', 'pu', 'mu'],
    tones: ['ū', 'ú', 'ǔ', 'ù'],
    order: 5,
  },
  {
    p: 'ü',
    type: 'yunmu',
    sound: '嘴吹口哨 ü ü ü',
    mouth: '嘴唇收圆前突，比 u 更小更圆',
    rhyme: '小鱼吐泡 ü ü ü，水里游来又游去',
    examples: ['鱼', '雨'],
    syllables: ['nü', 'lü', 'ju'],
    tones: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
    order: 6,
  },
];

// ─── 声母 23 个 ───

const SHENGMU: PinyinEntry[] = [
  // b p m f
  {
    p: 'b',
    type: 'shengmu',
    sound: '像6字一样 b b b',
    mouth: '双唇紧闭，然后突然打开',
    rhyme: '像个6字 b b b，收听广播 b b b',
    examples: ['波', '拔', '白'],
    syllables: ['ba', 'bo', 'bi'],
    order: 7,
  },
  {
    p: 'p',
    type: 'shengmu',
    sound: '像9字一样 p p p',
    mouth: '双唇紧闭，突然打开并送气',
    rhyme: '像个9字 p p p，泼水飘洒 p p p',
    examples: ['坡', '泼', '皮'],
    syllables: ['pa', 'po', 'pi'],
    order: 8,
  },
  {
    p: 'm',
    type: 'shengmu',
    sound: '两个门洞 m m m',
    mouth: '双唇紧闭，气流从鼻腔出来',
    rhyme: '两个门洞 m m m，摸摸小脸 m m m',
    examples: ['摸', '马', '米'],
    syllables: ['ma', 'mo', 'mi'],
    order: 9,
  },
  {
    p: 'f',
    type: 'shengmu',
    sound: '像拐杖一样 f f f',
    mouth: '上齿咬下唇，气流从缝隙中摩擦而出',
    rhyme: '一根拐杖 f f f，佛像供奉 f f f',
    examples: ['佛', '发', '飞'],
    syllables: ['fa', 'fo', 'fu'],
    order: 10,
  },
  // d t n l
  {
    p: 'd',
    type: 'shengmu',
    sound: '像马蹄声 d d d',
    mouth: '舌尖抵住上牙龈，突然放开',
    rhyme: '马蹄声响 d d d，打个鼓点 d d d',
    examples: ['得', '大', '地'],
    syllables: ['da', 'de', 'di'],
    order: 11,
  },
  {
    p: 't',
    type: 'shengmu',
    sound: '像伞把一样 t t t',
    mouth: '舌尖抵住上牙龈，突然放开并送气',
    rhyme: '伞把朝下 t t t，兔跳蹦蹦 t t t',
    examples: ['特', '他', '提'],
    syllables: ['ta', 'te', 'ti'],
    order: 12,
  },
  {
    p: 'n',
    type: 'shengmu',
    sound: '像一个门洞 n n n',
    mouth: '舌尖抵住上牙龈，气流从鼻腔出来',
    rhyme: '一个门洞 n n n，牛儿吃草 n n n',
    examples: ['呢', '拿', '你'],
    syllables: ['na', 'ne', 'ni'],
    order: 13,
  },
  {
    p: 'l',
    type: 'shengmu',
    sound: '像一根棍子 l l l',
    mouth: '舌尖抵住上牙龈，气流从舌头两边出来',
    rhyme: '一根棍子 l l l，拉手唱歌 l l l',
    examples: ['乐', '拉', '里'],
    syllables: ['la', 'le', 'li'],
    order: 14,
  },
  // g k h
  {
    p: 'g',
    type: 'shengmu',
    sound: '像9字变体 g g g',
    mouth: '舌根抵住软腭，突然放开',
    rhyme: '9字弯弯 g g g，鸽子飞翔 g g g',
    examples: ['哥', '瓜', '个'],
    syllables: ['ga', 'ge', 'gu'],
    order: 15,
  },
  {
    p: 'k',
    type: 'shengmu',
    sound: '像机枪一样 k k k',
    mouth: '舌根抵住软腭，突然放开并送气',
    rhyme: '机枪上课 k k k，看看花开 k k k',
    examples: ['科', '卡', '口'],
    syllables: ['ka', 'ke', 'ku'],
    order: 16,
  },
  {
    p: 'h',
    type: 'shengmu',
    sound: '像椅子一样 h h h',
    mouth: '舌根靠近软腭，气流摩擦而出',
    rhyme: '像把椅子 h h h，喝水咕咚 h h h',
    examples: ['喝', '哈', '虎'],
    syllables: ['ha', 'he', 'hu'],
    order: 17,
  },
  // j q x
  {
    p: 'j',
    type: 'shengmu',
    sound: '像大写字母J j j',
    mouth: '舌面贴住硬腭，然后稍微放开摩擦出气',
    rhyme: '大写字母 j j j，母鸡下蛋 j j j',
    examples: ['机', '家', '姐'],
    syllables: ['ji', 'jia', 'jie'],
    order: 18,
  },
  {
    p: 'q',
    type: 'shengmu',
    sound: '像气球飞了 q q q',
    mouth: '舌面贴住硬腭，稍微放开摩擦送气',
    rhyme: '气球飞了 q q q，七朵鲜花 q q q',
    examples: ['七', '去', '前'],
    syllables: ['qi', 'qia', 'qie'],
    order: 19,
  },
  {
    p: 'x',
    type: 'shengmu',
    sound: '像叉号一样 x x x',
    mouth: '舌面靠近硬腭，气流从缝隙中摩擦而出',
    rhyme: '一个叉号 x x x，西瓜甜甜 x x x',
    examples: ['西', '下', '小'],
    syllables: ['xi', 'xia', 'xie'],
    order: 20,
  },
  // zh ch sh r
  {
    p: 'zh',
    type: 'shengmu',
    sound: '像蜘蛛织网 zh zh zh',
    mouth: '舌尖翘起抵住硬腭，然后稍微放开',
    rhyme: '蜘蛛织网 zh zh zh，知道知道 zh zh zh',
    examples: ['知', '竹', '中'],
    syllables: ['zha', 'zhe', 'zhi'],
    order: 21,
  },
  {
    p: 'ch',
    type: 'shengmu',
    sound: '像吃苹果 ch ch ch',
    mouth: '舌尖翘起抵住硬腭，稍微放开送气',
    rhyme: '吃苹果呀 ch ch ch，出门看看 ch ch ch',
    examples: ['吃', '车', '春'],
    syllables: ['cha', 'che', 'chi'],
    order: 22,
  },
  {
    p: 'sh',
    type: 'shengmu',
    sound: '像狮子吼叫 sh sh sh',
    mouth: '舌尖翘起靠近硬腭，气流摩擦而出',
    rhyme: '狮子吼叫 sh sh sh，树上果子 sh sh sh',
    examples: ['狮', '山', '上'],
    syllables: ['sha', 'she', 'shi'],
    order: 23,
  },
  {
    p: 'r',
    type: 'shengmu',
    sound: '像小树发芽 r r r',
    mouth: '舌尖翘起靠近硬腭，声带振动',
    rhyme: '小树发芽 r r r，日出东方 r r r',
    examples: ['日', '肉', '人'],
    syllables: ['ri', 're', 'ru'],
    order: 24,
  },
  // z c s
  {
    p: 'z',
    type: 'shengmu',
    sound: '像数字2字 z z z',
    mouth: '舌尖抵住上门齿背，然后稍微放开',
    rhyme: '像个2字 z z z，紫色花朵 z z z',
    examples: ['字', '左', '走'],
    syllables: ['za', 'ze', 'zi'],
    order: 25,
  },
  {
    p: 'c',
    type: 'shengmu',
    sound: '像一个刺猬 c c c',
    mouth: '舌尖抵住上门齿背，稍微放开送气',
    rhyme: '刺猬缩球 c c c，草地绿绿 c c c',
    examples: ['刺', '才', '从'],
    syllables: ['ca', 'ce', 'ci'],
    order: 26,
  },
  {
    p: 's',
    type: 'shengmu',
    sound: '像蚕吐丝 s s s',
    mouth: '舌尖靠近上门齿背，气流摩擦而出',
    rhyme: '蚕儿吐丝 s s s，四个太阳 s s s',
    examples: ['丝', '三', '四'],
    syllables: ['sa', 'se', 'si'],
    order: 27,
  },
  // y w
  {
    p: 'y',
    type: 'shengmu',
    sound: '像树杈一样 y y y',
    mouth: '嘴形像发 i，舌面抬高',
    rhyme: '像个树杈 y y y，衣服晾晒 y y y',
    examples: ['衣', '鸭', '雨'],
    syllables: ['ya', 'ye', 'yu'],
    order: 28,
  },
  {
    p: 'w',
    type: 'shengmu',
    sound: '像房屋屋顶 w w w',
    mouth: '嘴形像发 u，嘴唇收圆',
    rhyme: '房屋屋顶 w w w，乌鸦哇哇 w w w',
    examples: ['屋', '蛙', '五'],
    syllables: ['wa', 'wo', 'wu'],
    order: 29,
  },
];

// ─── 复韵母 9 个 ───

const FU_YUNMU: PinyinEntry[] = [
  {
    p: 'ai',
    type: 'yunmu',
    sound: 'a和i连起来读 ai ai ai',
    mouth: '先张大嘴巴发a，再收拢发i',
    rhyme: 'a加i，爱戴爱戴 ai ai ai',
    examples: ['爱', '白', '开'],
    syllables: ['bai', 'pai', 'mai'],
    tones: ['āi', 'ái', 'ǎi', 'ài'],
    order: 30,
  },
  {
    p: 'ei',
    type: 'yunmu',
    sound: 'e和i连起来读 ei ei ei',
    mouth: '先发e，再滑向i',
    rhyme: 'e加i，杯子杯子 ei ei ei',
    examples: ['欸', '杯', '飞'],
    syllables: ['bei', 'pei', 'mei'],
    tones: ['ēi', 'éi', 'ěi', 'èi'],
    order: 31,
  },
  {
    p: 'ui',
    type: 'yunmu',
    sound: 'u和i连起来读 ui ui ui',
    mouth: '先发u，再滑向i',
    rhyme: 'u加i，水流水流 ui ui ui',
    examples: ['围', '对', '回'],
    syllables: ['dui', 'tui', 'hui'],
    tones: ['uī', 'uí', 'uǐ', 'uì'],
    order: 32,
  },
  {
    p: 'ao',
    type: 'yunmu',
    sound: 'a和o连起来读 ao ao ao',
    mouth: '先发a，再收圆发o',
    rhyme: 'a加o，棉袄棉袄 ao ao ao',
    examples: ['袄', '包', '猫'],
    syllables: ['bao', 'pao', 'mao'],
    tones: ['āo', 'áo', 'ǎo', 'ào'],
    order: 33,
  },
  {
    p: 'ou',
    type: 'yunmu',
    sound: 'o和u连起来读 ou ou ou',
    mouth: '先发o，再滑向u',
    rhyme: 'o加u，莲藕莲藕 ou ou ou',
    examples: ['藕', '狗', '口'],
    syllables: ['gou', 'kou', 'hou'],
    tones: ['ōu', 'óu', 'ǒu', 'òu'],
    order: 34,
  },
  {
    p: 'iu',
    type: 'yunmu',
    sound: 'i和u连起来读 iu iu iu',
    mouth: '先发i，再滑向u',
    rhyme: 'i加u，邮票邮票 iu iu iu',
    examples: ['邮', '牛', '六'],
    syllables: ['niu', 'liu', 'jiu'],
    tones: ['iū', 'iú', 'iǔ', 'iù'],
    order: 35,
  },
  {
    p: 'ie',
    type: 'yunmu',
    sound: 'i和e连起来读 ie ie ie',
    mouth: '先发i，再滑向e',
    rhyme: 'i加e，椰树椰树 ie ie ie',
    examples: ['椰', '蝶', '写'],
    syllables: ['die', 'tie', 'nie'],
    tones: ['iē', 'ié', 'iě', 'iè'],
    order: 36,
  },
  {
    p: 'üe',
    type: 'yunmu',
    sound: 'ü和e连起来读 üe üe üe',
    mouth: '先发ü，再滑向e',
    rhyme: 'ü加e，月亮月亮 üe üe üe',
    examples: ['月', '雪', '约'],
    syllables: ['nüe', 'lüe', 'jue'],
    tones: ['üē', 'üé', 'üě', 'üè'],
    order: 37,
  },
  {
    p: 'er',
    type: 'yunmu',
    sound: 'e和r连起来读 er er er',
    mouth: '先发e，舌尖卷起',
    rhyme: 'e加r，耳朵耳朵 er er er',
    examples: ['耳', '二', '儿'],
    syllables: ['er'],
    tones: ['ēr', 'ér', 'ěr', 'èr'],
    order: 38,
  },
];

// ─── 鼻韵母 9 个 ───

// 前鼻韵母 5 个
const QIAN_BI_YUNMU: PinyinEntry[] = [
  {
    p: 'an',
    type: 'yunmu',
    sound: 'a加n，舌尖抵住上牙龈 an an an',
    mouth: '先发a，然后舌尖抵住上牙龈，气流从鼻腔出',
    rhyme: 'a加n，天安门 an an an',
    examples: ['安', '半', '山'],
    syllables: ['ban', 'pan', 'man'],
    tones: ['ān', 'án', 'ǎn', 'àn'],
    order: 39,
  },
  {
    p: 'en',
    type: 'yunmu',
    sound: 'e加n，舌尖抵住上牙龈 en en en',
    mouth: '先发e，然后舌尖抵住上牙龈，气流从鼻腔出',
    rhyme: 'e加n，摁门铃 en en en',
    examples: ['恩', '本', '门'],
    syllables: ['ben', 'pen', 'men'],
    tones: ['ēn', 'én', 'ěn', 'èn'],
    order: 40,
  },
  {
    p: 'in',
    type: 'yunmu',
    sound: 'i加n，舌尖抵住上牙龈 in in in',
    mouth: '先发i，然后舌尖抵住上牙龈，气流从鼻腔出',
    rhyme: 'i加n，树荫树荫 in in in',
    examples: ['音', '金', '心'],
    syllables: ['bin', 'pin', 'min'],
    tones: ['īn', 'ín', 'ǐn', 'ìn'],
    order: 41,
  },
  {
    p: 'un',
    type: 'yunmu',
    sound: 'u加n，舌尖抵住上牙龈 un un un',
    mouth: '先发u，然后舌尖抵住上牙龈，气流从鼻腔出',
    rhyme: 'u加n，春暖花开 un un un',
    examples: ['温', '春', '滚'],
    syllables: ['dun', 'tun', 'lun'],
    tones: ['ūn', 'ún', 'ǔn', 'ùn'],
    order: 42,
  },
  {
    p: 'ün',
    type: 'yunmu',
    sound: 'ü加n，舌尖抵住上牙龈 ün ün ün',
    mouth: '先发ü，然后舌尖抵住上牙龈，气流从鼻腔出',
    rhyme: 'ü加n，白云白云 ün ün ün',
    examples: ['云', '裙', '均'],
    syllables: ['jun', 'qun', 'xun'],
    tones: ['ǖn', 'ǘn', 'ǚn', 'ǜn'],
    order: 43,
  },
];

// 后鼻韵母 4 个
const HOU_BI_YUNMU: PinyinEntry[] = [
  {
    p: 'ang',
    type: 'yunmu',
    sound: 'a加ng，舌根抵住软腭 ang ang ang',
    mouth: '先发a，然后舌根抵住软腭，气流从鼻腔出',
    rhyme: 'a加ng，昂首挺胸 ang ang ang',
    examples: ['昂', '帮', '羊'],
    syllables: ['bang', 'pang', 'mang'],
    tones: ['āng', 'áng', 'ǎng', 'àng'],
    order: 44,
  },
  {
    p: 'eng',
    type: 'yunmu',
    sound: 'e加ng，舌根抵住软腭 eng eng eng',
    mouth: '先发e，然后舌根抵住软腭，气流从鼻腔出',
    rhyme: 'e加ng，风儿吹吹 eng eng eng',
    examples: ['风', '冷', '灯'],
    syllables: ['deng', 'teng', 'neng'],
    tones: ['ēng', 'éng', 'ěng', 'èng'],
    order: 45,
  },
  {
    p: 'ing',
    type: 'yunmu',
    sound: 'i加ng，舌根抵住软腭 ing ing ing',
    mouth: '先发i，然后舌根抵住软腭，气流从鼻腔出',
    rhyme: 'i加ng，老鹰老鹰 ing ing ing',
    examples: ['鹰', '星', '听'],
    syllables: ['bing', 'ping', 'ming'],
    tones: ['īng', 'íng', 'ǐng', 'ìng'],
    order: 46,
  },
  {
    p: 'ong',
    type: 'yunmu',
    sound: 'o加ng，舌根抵住软腭 ong ong ong',
    mouth: '先发o，然后舌根抵住软腭，气流从鼻腔出',
    rhyme: 'o加ng，咚咚敲门 ong ong ong',
    examples: ['东', '红', '中'],
    syllables: ['dong', 'tong', 'zhong'],
    tones: ['ōng', 'óng', 'ǒng', 'òng'],
    order: 47,
  },
];

// ─── 整体认读音节 16 个 ───

const ZHENGTI: PinyinEntry[] = [
  {
    p: 'zhi',
    type: 'zhengti',
    sound: '整体认读，不需要拼 zhi zhi zhi',
    mouth: '舌尖翘起抵住硬腭，发zh的音，延长i',
    rhyme: '蜘蛛织网 zhi zhi zhi，直接读出来',
    examples: ['织', '纸', '只'],
    syllables: ['zhi'],
    order: 48,
  },
  {
    p: 'chi',
    type: 'zhengti',
    sound: '整体认读，不需要拼 chi chi chi',
    mouth: '舌尖翘起抵住硬腭，发ch的音，延长i',
    rhyme: '吃苹果呀 chi chi chi，直接读出来',
    examples: ['吃', '池', '迟'],
    syllables: ['chi'],
    order: 49,
  },
  {
    p: 'shi',
    type: 'zhengti',
    sound: '整体认读，不需要拼 shi shi shi',
    mouth: '舌尖翘起靠近硬腭，发sh的音，延长i',
    rhyme: '狮子吼叫 shi shi shi，直接读出来',
    examples: ['狮', '石', '十'],
    syllables: ['shi'],
    order: 50,
  },
  {
    p: 'ri',
    type: 'zhengti',
    sound: '整体认读，不需要拼 ri ri ri',
    mouth: '舌尖翘起靠近硬腭，发r的音，延长i',
    rhyme: '日出东方 ri ri ri，直接读出来',
    examples: ['日', '入', '肉'],
    syllables: ['ri'],
    order: 51,
  },
  {
    p: 'zi',
    type: 'zhengti',
    sound: '整体认读，不需要拼 zi zi zi',
    mouth: '舌尖抵住上门齿背，发z的音，延长i',
    rhyme: '紫色花朵 zi zi zi，直接读出来',
    examples: ['字', '紫', '子'],
    syllables: ['zi'],
    order: 52,
  },
  {
    p: 'ci',
    type: 'zhengti',
    sound: '整体认读，不需要拼 ci ci ci',
    mouth: '舌尖抵住上门齿背，发c的音，延长i',
    rhyme: '刺猬缩球 ci ci ci，直接读出来',
    examples: ['刺', '词', '此'],
    syllables: ['ci'],
    order: 53,
  },
  {
    p: 'si',
    type: 'zhengti',
    sound: '整体认读，不需要拼 si si si',
    mouth: '舌尖靠近上门齿背，发s的音，延长i',
    rhyme: '蚕儿吐丝 si si si，直接读出来',
    examples: ['丝', '四', '死'],
    syllables: ['si'],
    order: 54,
  },
  {
    p: 'yi',
    type: 'zhengti',
    sound: '整体认读，不需要拼 yi yi yi',
    mouth: '嘴角向两边拉紧，发i的音',
    rhyme: '衣服叔叔 yi yi yi，直接读出来',
    examples: ['衣', '一', '医'],
    syllables: ['yi'],
    order: 55,
  },
  {
    p: 'wu',
    type: 'zhengti',
    sound: '整体认读，不需要拼 wu wu wu',
    mouth: '嘴唇收圆前突，发u的音',
    rhyme: '乌鸦做窝 wu wu wu，直接读出来',
    examples: ['乌', '五', '无'],
    syllables: ['wu'],
    order: 56,
  },
  {
    p: 'yu',
    type: 'zhengti',
    sound: '整体认读，不需要拼 yu yu yu',
    mouth: '嘴唇收圆前突，发ü的音',
    rhyme: '小鱼吐泡 yu yu yu，直接读出来',
    examples: ['鱼', '雨', '语'],
    syllables: ['yu'],
    order: 57,
  },
  {
    p: 'ye',
    type: 'zhengti',
    sound: '整体认读，不需要拼 ye ye ye',
    mouth: '先发i，再滑向e',
    rhyme: '椰树叶子 ye ye ye，直接读出来',
    examples: ['椰', '夜', '叶'],
    syllables: ['ye'],
    order: 58,
  },
  {
    p: 'yue',
    type: 'zhengti',
    sound: '整体认读，不需要拼 yue yue yue',
    mouth: '先发ü，再滑向e',
    rhyme: '月亮弯弯 yue yue yue，直接读出来',
    examples: ['月', '约', '乐'],
    syllables: ['yue'],
    order: 59,
  },
  {
    p: 'yuan',
    type: 'zhengti',
    sound: '整体认读，不需要拼 yuan yuan yuan',
    mouth: '先发ü，再滑向an',
    rhyme: '圆圆月亮 yuan yuan yuan，直接读出来',
    examples: ['圆', '远', '院'],
    syllables: ['yuan'],
    order: 60,
  },
  {
    p: 'yin',
    type: 'zhengti',
    sound: '整体认读，不需要拼 yin yin yin',
    mouth: '先发i，然后舌尖抵住上牙龈，气流从鼻腔出',
    rhyme: '树荫凉凉 yin yin yin，直接读出来',
    examples: ['音', '银', '引'],
    syllables: ['yin'],
    order: 61,
  },
  {
    p: 'yun',
    type: 'zhengti',
    sound: '整体认读，不需要拼 yun yun yun',
    mouth: '先发ü，然后舌尖抵住上牙龈，气流从鼻腔出',
    rhyme: '白云飘飘 yun yun yun，直接读出来',
    examples: ['云', '运', '晕'],
    syllables: ['yun'],
    order: 62,
  },
  {
    p: 'ying',
    type: 'zhengti',
    sound: '整体认读，不需要拼 ying ying ying',
    mouth: '先发i，然后舌根抵住软腭，气流从鼻腔出',
    rhyme: '老鹰飞翔 ying ying ying，直接读出来',
    examples: ['鹰', '应', '影'],
    syllables: ['ying'],
    order: 63,
  },
];

// ─── 拼读组合表 ───

/** b p m f 与 a o e i u 的拼读组合 */
export const COMBOS_BASIC: SyllableCombo[] = [
  // b 行
  { shengmu: 'b', yunmu: 'a', result: 'ba', hasTone: false },
  { shengmu: 'b', yunmu: 'o', result: 'bo', hasTone: false },
  { shengmu: 'b', yunmu: 'e', result: 'be', hasTone: false },
  { shengmu: 'b', yunmu: 'i', result: 'bi', hasTone: false },
  { shengmu: 'b', yunmu: 'u', result: 'bu', hasTone: false },
  // p 行
  { shengmu: 'p', yunmu: 'a', result: 'pa', hasTone: false },
  { shengmu: 'p', yunmu: 'o', result: 'po', hasTone: false },
  { shengmu: 'p', yunmu: 'e', result: 'pe', hasTone: false },
  { shengmu: 'p', yunmu: 'i', result: 'pi', hasTone: false },
  { shengmu: 'p', yunmu: 'u', result: 'pu', hasTone: false },
  // m 行
  { shengmu: 'm', yunmu: 'a', result: 'ma', hasTone: false },
  { shengmu: 'm', yunmu: 'o', result: 'mo', hasTone: false },
  { shengmu: 'm', yunmu: 'e', result: 'me', hasTone: false },
  { shengmu: 'm', yunmu: 'i', result: 'mi', hasTone: false },
  { shengmu: 'm', yunmu: 'u', result: 'mu', hasTone: false },
  // f 行
  { shengmu: 'f', yunmu: 'a', result: 'fa', hasTone: false },
  { shengmu: 'f', yunmu: 'o', result: 'fo', hasTone: false },
  { shengmu: 'f', yunmu: 'e', result: 'fe', hasTone: false },
  { shengmu: 'f', yunmu: 'i', result: 'fi', hasTone: false },
  { shengmu: 'f', yunmu: 'u', result: 'fu', hasTone: false },
];

/** d t n l 与 a o e i u ü 的拼读组合 */
export const COMBOS_DTNL: SyllableCombo[] = [
  // d 行
  { shengmu: 'd', yunmu: 'a', result: 'da', hasTone: false },
  { shengmu: 'd', yunmu: 'o', result: 'do', hasTone: false },
  { shengmu: 'd', yunmu: 'e', result: 'de', hasTone: false },
  { shengmu: 'd', yunmu: 'i', result: 'di', hasTone: false },
  { shengmu: 'd', yunmu: 'u', result: 'du', hasTone: false },
  // t 行
  { shengmu: 't', yunmu: 'a', result: 'ta', hasTone: false },
  { shengmu: 't', yunmu: 'e', result: 'te', hasTone: false },
  { shengmu: 't', yunmu: 'i', result: 'ti', hasTone: false },
  { shengmu: 't', yunmu: 'u', result: 'tu', hasTone: false },
  // n 行
  { shengmu: 'n', yunmu: 'a', result: 'na', hasTone: false },
  { shengmu: 'n', yunmu: 'e', result: 'ne', hasTone: false },
  { shengmu: 'n', yunmu: 'i', result: 'ni', hasTone: false },
  { shengmu: 'n', yunmu: 'u', result: 'nu', hasTone: false },
  { shengmu: 'n', yunmu: 'ü', result: 'nü', hasTone: false },
  // l 行
  { shengmu: 'l', yunmu: 'a', result: 'la', hasTone: false },
  { shengmu: 'l', yunmu: 'e', result: 'le', hasTone: false },
  { shengmu: 'l', yunmu: 'i', result: 'li', hasTone: false },
  { shengmu: 'l', yunmu: 'u', result: 'lu', hasTone: false },
  { shengmu: 'l', yunmu: 'ü', result: 'lü', hasTone: false },
];

/** g k h 与 a e u 的拼读组合 */
export const COMBOS_GKH: SyllableCombo[] = [
  { shengmu: 'g', yunmu: 'a', result: 'ga', hasTone: false },
  { shengmu: 'g', yunmu: 'e', result: 'ge', hasTone: false },
  { shengmu: 'g', yunmu: 'u', result: 'gu', hasTone: false },
  { shengmu: 'k', yunmu: 'a', result: 'ka', hasTone: false },
  { shengmu: 'k', yunmu: 'e', result: 'ke', hasTone: false },
  { shengmu: 'k', yunmu: 'u', result: 'ku', hasTone: false },
  { shengmu: 'h', yunmu: 'a', result: 'ha', hasTone: false },
  { shengmu: 'h', yunmu: 'e', result: 'he', hasTone: false },
  { shengmu: 'h', yunmu: 'u', result: 'hu', hasTone: false },
];

/** j q x 与 i ü 的拼读组合 */
export const COMBOS_JQX: SyllableCombo[] = [
  { shengmu: 'j', yunmu: 'i', result: 'ji', hasTone: false },
  { shengmu: 'j', yunmu: 'ü', result: 'ju', hasTone: false },
  { shengmu: 'q', yunmu: 'i', result: 'qi', hasTone: false },
  { shengmu: 'q', yunmu: 'ü', result: 'qu', hasTone: false },
  { shengmu: 'x', yunmu: 'i', result: 'xi', hasTone: false },
  { shengmu: 'x', yunmu: 'ü', result: 'xu', hasTone: false },
];

/** zh ch sh r 与 a e u 的拼读组合 */
export const COMBOS_ZHCHSHR: SyllableCombo[] = [
  { shengmu: 'zh', yunmu: 'a', result: 'zha', hasTone: false },
  { shengmu: 'zh', yunmu: 'e', result: 'zhe', hasTone: false },
  { shengmu: 'zh', yunmu: 'u', result: 'zhu', hasTone: false },
  { shengmu: 'ch', yunmu: 'a', result: 'cha', hasTone: false },
  { shengmu: 'ch', yunmu: 'e', result: 'che', hasTone: false },
  { shengmu: 'ch', yunmu: 'u', result: 'chu', hasTone: false },
  { shengmu: 'sh', yunmu: 'a', result: 'sha', hasTone: false },
  { shengmu: 'sh', yunmu: 'e', result: 'she', hasTone: false },
  { shengmu: 'sh', yunmu: 'u', result: 'shu', hasTone: false },
  { shengmu: 'r', yunmu: 'e', result: 're', hasTone: false },
  { shengmu: 'r', yunmu: 'u', result: 'ru', hasTone: false },
];

/** z c s 与 a e u 的拼读组合 */
export const COMBOS_ZCS: SyllableCombo[] = [
  { shengmu: 'z', yunmu: 'a', result: 'za', hasTone: false },
  { shengmu: 'z', yunmu: 'e', result: 'ze', hasTone: false },
  { shengmu: 'z', yunmu: 'u', result: 'zu', hasTone: false },
  { shengmu: 'c', yunmu: 'a', result: 'ca', hasTone: false },
  { shengmu: 'c', yunmu: 'e', result: 'ce', hasTone: false },
  { shengmu: 'c', yunmu: 'u', result: 'cu', hasTone: false },
  { shengmu: 's', yunmu: 'a', result: 'sa', hasTone: false },
  { shengmu: 's', yunmu: 'e', result: 'se', hasTone: false },
  { shengmu: 's', yunmu: 'u', result: 'su', hasTone: false },
];

/** 所有拼读组合汇总 */
export const ALL_COMBOS: SyllableCombo[] = [
  ...COMBOS_BASIC,
  ...COMBOS_DTNL,
  ...COMBOS_GKH,
  ...COMBOS_JQX,
  ...COMBOS_ZHCHSHR,
  ...COMBOS_ZCS,
];

// ─── 分组数据 ───

export const PINYIN_GROUPS: PinyinGroup[] = [
  {
    id: 'dan-yunmu',
    name: '单韵母',
    emoji: '👄',
    tone: 'green',
    desc: '6个单韵母，嘴巴变魔术',
    items: DAN_YUNMU,
  },
  {
    id: 'shengmu',
    name: '声母',
    emoji: '🔤',
    tone: 'blue',
    desc: '23个声母，拼读好帮手',
    items: SHENGMU,
  },
  {
    id: 'fu-yunmu',
    name: '复韵母',
    emoji: '🔗',
    tone: 'yellow',
    desc: '9个复韵母，两个手拉手',
    items: FU_YUNMU,
  },
  {
    id: 'qian-bi-yunmu',
    name: '前鼻韵母',
    emoji: '👃',
    tone: 'pink',
    desc: '5个前鼻韵母，鼻子出气',
    items: QIAN_BI_YUNMU,
  },
  {
    id: 'hou-bi-yunmu',
    name: '后鼻韵母',
    emoji: '🎺',
    tone: 'purple',
    desc: '4个后鼻韵母，鼻子嗡嗡响',
    items: HOU_BI_YUNMU,
  },
  {
    id: 'zhengti',
    name: '整体认读音节',
    emoji: '⭐',
    tone: 'orange',
    desc: '16个整体认读，直接读不用拼',
    items: ZHENGTI,
  },
];

// ─── 工具函数 ───

/** 获取所有拼音条目 */
export function getAllPinyin(): PinyinEntry[] {
  return PINYIN_GROUPS.flatMap((g) => g.items);
}

/** 按类型获取拼音条目 */
export function getPinyinByType(type: 'shengmu' | 'yunmu' | 'zhengti'): PinyinEntry[] {
  return getAllPinyin().filter((item) => item.type === type);
}

/** 搜索拼音（匹配字母、示例汉字、音节） */
export function searchPinyin(query: string): PinyinEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getAllPinyin().filter(
    (item) =>
      item.p.toLowerCase().includes(q) ||
      item.examples.some((ex) => ex.includes(query)) ||
      item.syllables.some((sy) => sy.toLowerCase().includes(q)) ||
      item.rhyme.includes(query),
  );
}
