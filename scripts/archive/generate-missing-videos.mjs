#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');
const DATA_FILE = resolve(ROOT, 'src', 'data', 'hanzi.ts');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(VOICE_DIR)) mkdirSync(VOICE_DIR, { recursive: true });

// 六书故事库
const LIUSHU_STORIES = {
  '象形': {
    '日': { desc: '圆圆的太阳，中间一点是光芒', story: '古人在天空看到一个圆圆的太阳，就在纸上画了个圆圈，中间加一点表示光芒，这就是"日"字', rhyme: '太阳圆圆叫日字，日出东方亮堂堂' },
    '月': { desc: '弯弯的月亮像小船', story: '夜晚抬头看，月亮弯弯像小船。古人画下这个弯月，就是"月"字', rhyme: '月儿弯弯挂天上，夜晚照亮小窗台' },
    '山': { desc: '三座山峰连在一起', story: '远处有三座大山，中间最高两边矮。古人画上三座山峰，就是"山"字', rhyme: '三座山峰连一起，高山上面白云飘' },
    '水': { desc: '流动的小河，中间主流两边水花', story: '一条小河哗啦啦流，中间是主流，两边溅起水花。古人这样画，就是"水"字', rhyme: '小河流水哗啦啦，清清河水养鱼虾' },
    '火': { desc: '跳动的火焰，中间高两边低', story: '篝火噼啪响，中间火苗最高，两边火花飞溅。这就是"火"字', rhyme: '火焰跳动暖洋洋，烧水煮饭靠它帮' },
    '木': { desc: '一棵树，有枝有根', story: '路边有一棵大树，上面有树枝，下面有树根。古人画上这棵树，就是"木"字', rhyme: '大树高高立路边，枝叶茂盛遮阴凉' },
    '人': { desc: '侧身站立的人', story: '一个人站在路边，侧着身子。古人画了一个侧面小人，就是"人"字', rhyme: '两个人儿站成行，你帮我助情谊长' },
    '口': { desc: '张开的嘴巴', story: '张大嘴巴"啊"一声，方方的嘴巴就像"口"字', rhyme: '小嘴巴呀嗷嗷叫，吃饭说话都用它' },
    '手': { desc: '张开的手掌', story: '伸出你的手，五指张开。古人画了一只手掌，就是"手"字', rhyme: '小手小手拍拍拍，动手动脑本领大' },
    '目': { desc: '圆圆的眼睛', story: '睁开眼睛看看世界，眼睛圆圆的像"目"字', rhyme: '眼睛明亮看远方，保护视力不能忘' },
    '心': { desc: '心脏的形状', story: '摸摸你的胸口，心跳的地方就是心脏。古人画出心脏的形状，就是"心"字', rhyme: '小小心脏咚咚跳，健康快乐最重要' },
    '耳': { desc: '耳朵的形状', story: '摸摸你的耳朵，弯弯的形状就像"耳"字', rhyme: '小耳朵听声音，风声雨声听分明' },
    '鱼': { desc: '有头有尾的鱼', story: '水里游来一条鱼，有头有尾还有鳍。古人画出这条鱼，就是"鱼"字', rhyme: '小鱼摇摇尾巴游，水中嬉戏乐悠悠' },
    '鸟': { desc: '一只小鸟', story: '树上飞来一只鸟，有头有翅还有爪。古人画下这只鸟，就是"鸟"字', rhyme: '小鸟小鸟天上飞，叽叽喳喳唱起来' },
    '马': { desc: '一匹奔马', story: '草原上跑过一匹马，有鬃毛有四条腿。古人画出这匹马，就是"马"字', rhyme: '大马奔跑速度快，哒哒哒哒真神气' },
    '羊': { desc: '有角的羊头', story: '小羊头上有两个弯弯角。古人画出羊头，就是"羊"字', rhyme: '小羊咩咩叫得欢，白白毛毛真好看' },
    '牛': { desc: '有角的牛头', story: '老黄牛有两支弯弯角。古人画出牛头，就是"牛"字', rhyme: '老黄牛啊力气大，耕地拉车顶呱呱' },
    '雨': { desc: '天上下雨', story: '乌云密布下起雨，外面是云框，里面雨滴落下来。这就是"雨"字', rhyme: '小雨小雨沙沙下，小草喝饱笑哈哈' },
    '雪': { desc: '天上的雪花', story: '冬天来了下雪啦！上面是雨字头，下面是扫雪的工具，这就是"雪"字', rhyme: '雪花飘飘冬天到，堆个雪人哈哈笑' },
    '花': { desc: '草花开', story: '花园里开满花，上面是草字头，下面是变化，草变化出美丽的花', rhyme: '花儿花儿开得好，红的黄的五彩耀' },
  },
  '指事': {
    '一': { desc: '最简的一横', story: '画一根横线，表示"一个"。这是最简单的汉字', rhyme: '一根横线是一字，一二三四它居首' },
    '二': { desc: '两横', story: '画两根横线，上面短下面长，表示"两个"', rhyme: '两根横线二是字，成双成对好兄弟' },
    '三': { desc: '三横', story: '画三根横线，一、二、三，表示"三个"', rhyme: '三根横线三是字，举一反三最聪明' },
    '七': { desc: '像个人弯腰', story: '像个人弯腰干活的样子，表示数字七', rhyme: '七色彩虹天上挂，七仙女下凡间啦' },
    '上': { desc: '在基准线上面', story: '画一条横线作地面，上面加一短横，表示"在上面"', rhyme: '上面上面在上头，高高在上不低头' },
    '下': { desc: '在基准线下面', story: '画一条横线作地面，下面加一短横，表示"在下面"', rhyme: '下面下面在下头，脚踏实地不抬头' },
    '八': { desc: '分开的意思', story: '两笔向两边分开，表示"分开"', rhyme: '八字分开向两边，八分八散记心间' },
    '六': { desc: '像屋梁交叉', story: '上面一点，下面一个交错的形状，表示数字六', rhyme: '六个小朋友手拉手，六一儿童乐悠悠' },
    '中': { desc: '旗子在中间', story: '一面旗子插在中间，周围都是空地。这就是"中"字', rhyme: '旗杆立在正中央，不偏不斜称中正' },
    '五': { desc: '交错的数目', story: '五根木棍交叉摆，表示数字五', rhyme: '五行五方五指尖，五颜六色真好看' },
    '九': { desc: '弯曲的数字', story: '像个小钩子弯弯的，表示数字九', rhyme: '九九归一再出发，九九乘法顶呱呱' },
  },
  '会意': {
    '休': { desc: '人靠在树旁休息', story: '走累了吗？靠在树边歇一歇。左边的"人"靠着右边的"木"，就是休息的"休"', rhyme: '小树旁边人休息，劳逸结合最合理' },
    '森': { desc: '三棵树就是森林', story: '一棵树是木，两棵树是林，三棵树就是森。很多树在一起，就是森林', rhyme: '树木成林又成森，空气清新环境美' },
    '明': { desc: '日月在一起很明亮', story: '左边是太阳，右边是月亮。太阳和月亮一起发光，世界就明亮了', rhyme: '日月同辉亮堂堂，光明未来在前方' },
    '春': { desc: '太阳下草木生长', story: '上面是草芽，中间是日（太阳），太阳照在小草上，春天就来了', rhyme: '春风春雨春意浓，花草树木都发芽' },
    '秋': { desc: '禾苗熟了像火烧', story: '左边是禾苗，右边是火。秋天庄稼成熟了，像火一样金黄', rhyme: '秋高气爽丰收季，稻谷金黄果飘香' },
    '冬': { desc: '冰柱垂下表示冬天', story: '上面是冰的象形，下面是终的意思，表示一年到头冰天雪地', rhyme: '冬天到来北风吹，雪结冰柱真美丽' },
    '东': { desc: '太阳从树后升起', story: '太阳从树木后面升起来，太阳升起的方向就是东方', rhyme: '东边日出东方红，万丈光芒照大地' },
    '西': { desc: '鸟儿归巢', story: '太阳下山了，鸟儿飞回巢里。太阳落下的方向是西方', rhyme: '西边日落鸟归巢，夕阳西下景色好' },
    '南': { desc: '工具在田间', story: '像是在田地里劳作的农具，太阳升起南边照', rhyme: '南边太阳暖洋洋，春暖花开好风光' },
    '北': { desc: '两人背靠背', story: '两个人背靠背站着，表示方向相反，北方就是背面', rhyme: '北风呼呼冷风吹，南北东西要分清' },
    '友': { desc: '两只手友好合作', story: '两双手握在一起，表示朋友友好互助', rhyme: '好朋友呀手拉手，互相帮助一起走' },
    '朋': { desc: '两个月亮并排', story: '两个"月"字并排站，像两个好朋友并肩同行', rhyme: '朋友朋友手牵手，快快乐乐一起走' },
    '笑': { desc: '竹子被风摇动发出笑声', story: '竹字头下面一个夭，风吹过竹林沙沙响，像在欢笑', rhyme: '笑声朗朗多开心，竹子摇摇晃不停' },
    '步': { desc: '两只脚走路', story: '上面止是左脚，下面止是右脚，两只脚交替走就是步', rhyme: '一步一步往上走，脚踏实地不落后' },
    '采': { desc: '手在树上摘东西', story: '上面是手，下面是树，手伸到树上摘果子就是采', rhyme: '采摘果子树上摘，劳动最快乐' },
    '看': { desc: '手搭眼睛远望', story: '上面是手，下面是目（眼睛），手搭在眼睛上往远看就是看', rhyme: '用手遮住眼眉前，眺望远方看得见' },
    '家': { desc: '屋顶下有猪', story: '古代人家屋顶下养猪，表示有房有产业就是家', rhyme: '家里家外温暖窝，爸爸妈妈爱我多' },
    '安': { desc: '女子在屋下安静', story: '宝盖头是房子，下面是女。女子在屋里就很安全安宁', rhyme: '安安静静好女子，平安快乐在一起' },
    '好': { desc: '女子和孩子', story: '左边是女，右边是孩子。妈妈抱着孩子，就是好', rhyme: '好人好事天天有，好好学习争上游' },
    '字': { desc: '屋顶下有孩子', story: '宝盖头是房子，下面是儿子。房子里有孩子，就是"字"', rhyme: '屋子里面生娃娃，取名写字传文化' },
    '男': { desc: '田地里用力气的男人', story: '上面是"田"，下面是"力"。在田里出力气干活的人是男人', rhyme: '田间出力是好汉，男女平等肩并肩' },
    '立': { desc: '人站在地上', story: '一个大字下面一横，人稳稳地站在地面上就是立', rhyme: '站立姿势要端正，挺胸抬头气昂昂' },
    '坐': { desc: '两人坐在土上', story: '两个人坐在土堆上休息，两个人相对而坐就是坐', rhyme: '坐下休息歇歇脚，团结合作力量大' },
    '炎': { desc: '两个火叠加很热', story: '两个火叠在一起，火上加火非常热，就是炎热', rhyme: '炎炎夏天太阳照，热得大汗直冒泡' },
  },
  '形声': {
    '妈': { desc: '女字旁+马的音', story: '左边是女字旁，表示是女性；右边是"马"，读音和马相同。妈妈的妈', rhyme: '妈妈妈妈真好，教我读书又画画' },
    '爸': { desc: '父字旁+巴的音', story: '上面是父，表示爸爸；下面是巴，读音相近。爸爸', rhyme: '爸爸爸爸力气大，把我举过头顶耍' },
    '河': { desc: '三点水+可的音', story: '左边三点水，和水有关；右边是可，读音相近。河水哗哗流', rhyme: '小河小河哗啦啦，鱼儿游来虾儿爬' },
    '海': { desc: '三点水+每的音', story: '左边三点水，和海有关；右边是每，读音相近。大海', rhyme: '大海大海蓝湛湛，鱼儿游来虾儿窜' },
    '请': { desc: '言字旁+青的音', story: '左边言字旁，和说话有关；右边是青，读音相近。请你', rhyme: '请字有礼又大方，文明用语记心上' },
    '情': { desc: '竖心旁+青的音', story: '左边竖心旁，和心情有关；右边是青，读音相近。心情', rhyme: '心情好坏要注意，乐观开朗最有益' },
    '晴': { desc: '日字旁+青的音', story: '左边日字旁，和太阳有关；右边是青，读音相近。晴天', rhyme: '晴天晴天太阳照，蓝天白云多美妙' },
    '清': { desc: '三点水+青的音', story: '左边三点水，和水有关；右边是青，读音相近。清水', rhyme: '清水清水明镜台，干干净净真可爱' },
    '吃': { desc: '口字旁+乞的音', story: '左边口字旁，和嘴有关；右边是乞，读音相近。吃东西要用嘴吃', rhyme: '吃饭用口慢慢嚼，细嚼慢咽身体好' },
    '喝': { desc: '口字旁+曷的音', story: '左边口字旁，和嘴有关；右边是曷，读音相近。喝水要用嘴喝', rhyme: '喝水要用小口喝，身体健康笑呵呵' },
    '读': { desc: '言字旁+卖的音', story: '左边言字旁，读书要用嘴读出来；右边是卖，读音相近', rhyme: '读书读书多有益，书中自有黄金屋' },
    '写': { desc: '宝盖头+与的音', story: '上面宝盖头，在房子里；下面与，读音相近。写字要在室内', rhyme: '写工整正写字好，一笔一划要记牢' },
    '诗': { desc: '言字旁+寺的音', story: '左边言字旁，和语言有关；右边是寺，读音相近。诗歌', rhyme: '诗歌韵律优美听，吟诗作对最有情' },
    '真': { desc: '八字头+具的变体', story: '上面是十和目，下面是具，表示真实不虚假', rhyme: '真心真意对人好，实事求是最重要' },
    '美': { desc: '羊字头+大的变体', story: '上面是羊，下面是大，羊大为美，表示美好', rhyme: '美丽风景看不够，美好生活乐悠悠' },
    '哥': { desc: '两个可叠加', story: '两个"可"字叠在一起，哥哥是我尊敬的称呼', rhyme: '哥哥哥哥真好，陪我玩耍教我做' },
    '奶': { desc: '女字旁+乃的音', story: '左边女字旁，右边乃，读音相近。奶奶', rhyme: '奶奶奶奶疼爱我，煮饭洗衣忙不完' },
    '妹': { desc: '女字旁+未的音', story: '左边女字旁，右边未，读音相近。妹妹', rhyme: '妹妹妹妹年纪小，蹦蹦跳跳真可爱' },
    '姐': { desc: '女字旁+且的音', story: '左边女字旁，右边且，读音相近。姐姐', rhyme: '姐姐姐姐对我好，辅导作业耐心教' },
    '弟': { desc: '弓字头+弟弟的变体', story: '像一把弓，弟弟是家里最小的男孩', rhyme: '弟弟弟弟年纪小，跟我一起长大好' },
    '哭': { desc: '两个口+犬的变体', story: '两个口代表哭出声，下面是犬，表示大声哭叫', rhyme: '哭了哭了别伤心，擦擦眼泪笑一笑' },
    '笑': { desc: '竹字头+夭的变体', story: '竹字头下面一个夭，风吹过竹林沙沙响，像在欢笑', rhyme: '笑声朗朗多开心，竹子摇摇晃不停' },
    '走': { desc: '十字头+止的变体', story: '上面是十，下面是止（脚），表示用脚行走', rhyme: '走路要看好脚下，安全第一记心间' },
    '跑': { desc: '足字旁+包的音', story: '左边足字旁，表示用脚；右边包，读音相近。跑步', rhyme: '跑步运动身体好，天天锻炼不生病' },
    '跳': { desc: '足字旁+兆的音', story: '左边足字旁，表示用脚；右边兆，读音相近。跳高', rhyme: '跳高跳绳真好玩，身体健康棒又棒' },
    '站': { desc: '立字旁+占的音', story: '左边立字旁，表示站立；右边占，读音相近。站立', rhyme: '站如松坐如钟，姿势端正气轩昂' },
    '画': { desc: '田字被框住', story: '像一块田地被人工划分成方格，用来画画', rhyme: '画画写字真有趣，小小画家出作品' },
    '米': { desc: '米粒散落的形状', story: '像一粒粒米散落开来，中间是米粒，四周是米糠', rhyme: '大米米饭香喷喷，农民辛苦种粮田' },
    '学': { desc: '孩子头上学文', story: '上面是交叉的文具，表示学习；下面是孩子，孩子在学校学习', rhyme: '学习学习再学习，知识海洋任我游' },
    '书': { desc: '手按着书卷', story: '像一只手按着书卷在书写，就是书本的书', rhyme: '书本书本知识多，打开书本想啥说' },
  }
};

function getLiushuInfo(char) {
  for (const [type, chars] of Object.entries(LIUSHU_STORIES)) {
    if (chars[char]) return { type, ...chars[char] };
  }
  // 默认分类
  if (['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '上', '下', '中', '不', '与'].includes(char)) {
    return { type: '指事', desc: '用符号表示抽象概念', story: `「${char}」用简单的符号表示意思`, rhyme: '符号简单好记忆，一看就知道意思' };
  }
  if (['明', '休', '林', '森', '从', '众', '好', '男', '女', '家', '春', '秋', '冬', '夏', '东', '西', '南', '北'].includes(char)) {
    return { type: '会意', desc: '组合两个部分表示新意', story: `「${char}」由两部分组成，合起来有新含义`, rhyme: '两个零件拼一起，新意思呀真有趣' };
  }
  return { type: '汉字', desc: '', story: `「${char}」是一个常用汉字`, rhyme: `${char} ${char} 真好玩，天天见面认识它` };
}

function loadHanziData() {
  const content = readFileSync(DATA_FILE, 'utf-8');
  const entries = [];
  const regex = /\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    entries.push({
      c: match[1], p: match[2], pd: match[3], tone: parseInt(match[4]),
      radical: match[5], strokes: parseInt(match[6]), origin: match[7], evolve: match[8],
      words: match[9].split(',').map(w => w.trim().replace(/'/g, '')),
      sentence: match[10], level: parseInt(match[11]), freq: parseInt(match[12])
    });
  }
  return entries;
}

function buildVoiceText(h) {
  const info = getLiushuInfo(h.c);
  const toneName = ['', '一声', '二声', '三声', '四声'][h.tone];
  
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${h.c}」。\n\n` +
         `这个字读「${h.pd}」，是${toneName}。\n` +
         `它的部首是「${h.radical}」，一共有${h.strokes}画。\n\n` +
         `它是${info.type}字。\n` +
         `${info.desc ? info.desc + '。\n\n' : ''}` +
         `记忆小故事：${info.story}。\n\n` +
         `记住口诀：「${info.rhyme}」。\n\n` +
         `组词练习：${h.words.slice(0, 3).join('、')}。\n` +
         `跟读：${h.words.slice(0, 3).join('，')}, ${h.words.slice(0, 3).join('，')}。\n\n` +
         `造句：${h.sentence}。\n\n` +
         `复习：「${h.c}」是${info.type}，${info.desc || '很好记'}。\n` +
         `${h.pd}，${h.c} ${h.c} ${h.c}。\n\n` +
         `太棒了！你已经学会「${h.c}」这个字了！给自己鼓鼓掌吧！下期再见！`;
}

function generateSpeech(text, outputFile) {
  try {
    if (process.platform === 'darwin') {
      const safeText = text.replace(/"/g, "'").replace(/\n/g, ' ');
      execSync(`say -v "Mei-Jia" -r 130 -o "${outputFile}.aiff" "${safeText}"`, { stdio: 'pipe', timeout: 120000 });
      execSync(`ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { stdio: 'pipe' });
      try { execSync(`rm -f "${outputFile}.aiff"`); } catch(e) {}
      return `${outputFile}.mp3`;
    }
  } catch (e) {
    console.log(`  TTS 失败: ${e.message}`);
  }
  return null;
}

async function generateVideo(h) {
  const char = h.c;
  const imageUrl = resolve(IMAGE_DIR, `${char}.png`);
  const videoPath = resolve(OUTPUT_DIR, `${char}-教学.mp4`);
  const voicePath = resolve(VOICE_DIR, `${char}`);
  
  if (!existsSync(imageUrl)) {
    console.log(`  ✗ ${char}: 图片不存在`);
    return false;
  }
  
  if (existsSync(videoPath)) {
    console.log(`  ⏭ ${char}: 已存在`);
    return true;
  }
  
  try {
    const voiceText = buildVoiceText(h);
    const audioFile = generateSpeech(voiceText, voicePath);
    if (!audioFile) {
      console.log(`  ✗ ${char}: 语音生成失败`);
      return false;
    }
    
    const duration = 50;
    const filterComplex = `[0:v]format=yuv420p,zoompan=z='min(zoom+0.0004,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=1280x720:fps=25,fade=t=in:st=0:d=3,fade=t=out:st=${duration-3}:d=3[v]`;
    
    execSync(`ffmpeg -y -loop 1 -i "${imageUrl}" -i "${audioFile}" -filter_complex "${filterComplex}" -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -shortest "${videoPath}"`, { 
      stdio: 'pipe',
      timeout: 180000
    });
    
    const sizeMB = existsSync(videoPath) ? Math.floor(readFileSync(videoPath).length / 1024 / 1024) : 0;
    console.log(`  ✓ ${char} (${duration}秒, ${sizeMB}MB)`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${char}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🎬 开始生成缺失的汉字教学视频...\n');
  
  const hanziList = loadHanziData();
  const missingChars = ['七', '休', '八', '六', '写', '冬', '口', '吃', '哥', '哭', '喝', '夏', '奶', '妈', '妹', '姐', '弟', '手', '森', '爷', '爸', '画', '真', '站', '米', '美', '诗', '读', '走', '跑', '跳'];
  
  console.log(`需要生成: ${missingChars.length} 个汉字\n`);
  
  let success = 0, failed = 0;
  for (let i = 0; i < missingChars.length; i++) {
    const char = missingChars[i];
    const h = hanziList.find(x => x.c === char);
    if (!h) {
      console.log(`  ✗ ${char}: 数据未找到`);
      failed++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${missingChars.length}] ${char} ... `);
    const result = await generateVideo(h);
    if (result) success++; else failed++;
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
}

main().catch(console.error);
