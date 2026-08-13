#!/usr/bin/env node
/**
 * 汉字教学视频生成器 - 改进版
 * 基于六书分类的专业教学方法
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(VOICE_DIR)) mkdirSync(VOICE_DIR, { recursive: true });

// 详细的教学内容库
const TEACHING_CONTENT = {
  // 象形字
  '日': {
    type: '象形字',
    desc: '太阳的形状',
    story: `远古时代，人们在田野里劳作，抬头看天空，看到一个圆圆的太阳发出光芒。为了记住它，就在陶罐上画了个圆圈，中间加一点表示光芒。后来文字发明了，这个圆圈就变成了方方的"日"字！中间的横就是太阳光芒的意思。`,
    rhyme: `太阳圆圆叫日字，日出东方亮堂堂。
一日一日又一日，时光匆匆要珍惜。
日历一页翻一页，好好学习争朝夕。`,
    words: ['日记', '日子', '日光', '日出', '今日'],
    sentence: '今天的太阳真红，照得大地暖洋洋。',
    memory: '想象一个发光的圆太阳🌞'
  },
  '月': {
    type: '象形字',
    desc: '月亮的形状',
    story: `夜晚，月亮弯弯像小船挂在天上。古人观察到月亮的形状变化多端，有时候圆如盘，有时候弯如钩。他们把最典型的弯月形状画下来，就成了"月"字。外面的框是月亮轮廓，里面的短横表示月光。`,
    rhyme: `月儿弯弯挂天上，夜晚照亮小窗台。
一月二月三月过，月月变化真奇妙。
月圆月缺都有情，明月千里寄相思。`,
    words: ['月光', '月亮', '月牙', '岁月', '月份'],
    sentence: '今晚的月亮很圆，像个大玉盘。',
    memory: '看那弯弯的月亮像小船🌙'
  },
  '山': {
    type: '象形字',
    desc: '山峰的形状',
    story: `远处有三座大山连在一起，中间最高两边矮。古人爬山时看到了这样的景色，就把三座山峰画在纸上：中间一竖最高，两边各一撇一捺。这就是"山"字！`,
    rhyme: `三座山峰连一起，高山上面白云飘。
上山下山要小心，山顶风景最美丽。
山高路远不用怕，一步一脚印踏实。`,
    words: ['大山', '山羊', '火山', '上山', '山河'],
    sentence: '山上有很多树和小动物。',
    memory: '三座山峰叠在一起⛰️'
  },
  '水': {
    type: '象形字',
    desc: '流水的形状',
    story: `一条小河哗啦啦地流，中间是主流，两边溅起水花。古人把流动的河水画下来：中间弯弯曲曲的主流，两边是小水滴。这就是"水"字！`,
    rhyme: `小河流水哗啦啦，清清河水养鱼虾。
节约用水是美德，点滴汇聚成大江。
上善若水水利万物，柔弱胜刚强。`,
    words: ['水果', '水牛', '大水', '河水', '雨水'],
    sentence: '河里有很多鱼在游泳。',
    memory: '想象流动的小河流水💧'
  },
  '火': {
    type: '象形字',
    desc: '火焰的形状',
    story: `晚上点火取暖，篝火噼啪响，中间火苗最高，两边火花飞溅。古人画出跳动的火焰，中间高两边低，这就是"火"字！`,
    rhyme: `火焰跳动暖洋洋，烧水煮饭靠它帮。
星星之火可以燎，小心用火别着慌。
钻木取火是人类，文明进步第一步。`,
    words: ['火车', '大火', '火花', '火力', '火山'],
    sentence: '火很烫，小朋友不要摸。',
    memory: '看那跳动的火焰🔥'
  },
  '木': {
    type: '象形字',
    desc: '树木的形状',
    story: `路边有一棵大树，上面有树枝向两边伸展，下面有树根扎进土里。古人画了一棵树：上面是树枝，下面是树根，中间是树干。这就是"木"字！`,
    rhyme: `大树高高立路边，枝叶茂盛遮阴凉。
木材可以做家具，保护环境多栽树。
十年树木百年树人，树木成材不容易。`,
    words: ['木头', '树木', '木马', '木耳', '木瓜'],
    sentence: '树下有一张木桌。',
    memory: '一棵有根有枝的大树🌳'
  },
  '人': {
    type: '象形字',
    desc: '人的侧面形状',
    story: `一个人站在路边，侧着身子，弯着腰，伸出一只脚。古人简化了这个侧面人形，两笔就画出了最简单的汉字——"人"！`,
    rhyme: `两个人儿站成行，你帮我助情谊长。
人与人要相互爱，团结起来力量大。
做人要正直善良，诚实守信走天下。`,
    words: ['大人', '人生', '人们', '人工', '个人'],
    sentence: '我是一个好学生。',
    memory: '像一个侧面站立的人形👤'
  },
  '口': {
    type: '象形字',
    desc: '嘴巴的形状',
    story: `张大嘴巴说"啊"，方方的嘴巴就像"口"字。吃饭用口，说话用口，唱歌用口。保护小嘴巴，少吃零食多刷牙！`,
    rhyme: `小嘴巴呀嗷嗷叫，吃饭说话都用它。
少吃零食多刷牙，口腔健康笑哈哈。
口乃心之门户，言为心声要表达。`,
    words: ['出口', '门口', '开口', '人口', '路口'],
    sentence: '我有一张小小的嘴。',
    memory: '方方正正的小嘴巴👄'
  },
  '手': {
    type: '象形字',
    desc: '手掌的形状',
    story: `伸出你的手，五指张开。古人画了一只手掌，弯曲的手指和手掌组成了"手"字。用手可以做很多事：写字、画画、干活、帮助他人。`,
    rhyme: `小手小手拍拍拍，动手动脑本领大。
自己事情自己做，勤劳双手顶呱呱。
手拉手儿做朋友，互相帮助暖年华。`,
    words: ['手机', '对手', '手心', '手表', '手表'],
    sentence: '这是我的左手。',
    memory: '张开五指的手掌✋'
  },
  '目': {
    type: '象形字',
    desc: '眼睛的形状',
    story: `睁开眼睛看看世界，眼睛圆圆的像"目"字。古人画了一只眼睛：外面是椭圆的眼眶，里面是圆圆的瞳孔。目就是眼睛的意思。`,
    rhyme: `眼睛明亮看远方，保护视力不能忘。
少看手机多望远，双眼明亮闪金光。
目不能蔽非理，心不能欺暗室。`,
    words: ['目光', '目标', '节目', '耳目', '题目'],
    sentence: '眼睛是心灵的窗户。',
    memory: '圆圆的大眼睛👁️'
  },
  '心': {
    type: '象形字',
    desc: '心脏的形状',
    story: `摸摸你的胸口，心跳的地方就是心脏。古人画出心脏的形状：弯弯的像一颗心，下面有两个血管。这就是"心"字！`,
    rhyme: `小小心脏咚咚跳，健康快乐最重要。
用心学习用心爱，心灵手巧人人夸。
心正不怕影子歪，心地善良乐开花。`,
    words: ['心里', '心情', '爱心', '心思', '心愿'],
    sentence: '我心里很高兴。',
    memory: '一颗跳动的心脏❤️'
  },
  
  // 指事字
  '一': {
    type: '指事字',
    desc: '最简单的数字',
    story: `画一根横线，表示"一个"。这是最简单的汉字，也是最基础的数量单位。一加一是二，一加二是三。一横代表第一、唯一、统一。`,
    rhyme: `一根横线是一字，一二三四它居首。
一心一意做事好，一帆风顺步步高。
一生一世一双人，一朝一夕要珍重。`,
    words: ['一个', '一天', '一定', '一直', '一起'],
    sentence: '我有一个苹果。',
    memory: '简单的一横——一✋'
  },
  '二': {
    type: '指事字',
    desc: '两根横线',
    story: `画两根横线，上面短下面长，表示"两个"。一二三，二排在一的后面，是成双成对的意思。一双筷子、两只手、两个人。`,
    rhyme: `两根横线二是字，成双成对好兄弟。
两只小手拍一拍，二人同心其利断。
二话不说向前走，二龙戏珠福满天。`,
    words: ['第二', '二月', '二年', '二十', '二审'],
    sentence: '我是第二名。',
    memory: '两根横线就是二📏'
  },
  '三': {
    type: '指事字',
    desc: '三根横线',
    story: `画三根横线，一、二、三，表示"三个"。三是中国文化中很重要的数字，代表天、地、人三才，三生万物。`,
    rhyme: `三根横线三是字，举一反三最聪明。
三人行必有我师，三位一体真神奇。
三下五除二，三天打鱼两天晒网不可取。`,
    words: ['三个', '三天', '三角', '三十', '三维'],
    sentence: '我有三个苹果。',
    memory: '三根横线就是三📊'
  },
  '七': {
    type: '指事字',
    desc: '拐弯的横线',
    story: `像一个人弯腰干活的样子，也像拐杖的形状。古人用来表示数字七，七彩彩虹天上挂，七仙女下凡间啦。`,
    rhyme: `七色彩虹天上挂，七仙女下凡间啦。
七上八下坐不住，七个手指数一数。
七星伴月照前路，七窍玲珑聪明人。`,
    words: ['七个', '七月', '七点', '七天', '七夕'],
    sentence: '我有七个苹果。',
    memory: '像拐杖一样的七🦯'
  },
  '八': {
    type: '指事字',
    desc: '分开的两笔',
    story: `两笔向两边分开，表示"分开"、"分散"。八也是数字，八面玲珑、八方来财、八拜之交。`,
    rhyme: `八字分开向两边，八分八散记心间。
八面威风真神气，八仙过海显神通。
八一建军节，八方支援灾区人民。`,
    words: ['八分', '八年', '八个', '八天', '八门'],
    sentence: '我有八个苹果。',
    memory: '向两边分开的是八✌️'
  },
  '六': {
    type: '指事字',
    desc: '屋梁交叉',
    story: `上面一点是屋顶尖，下面一个交错的架子，表示数字六。六六大顺，吉祥如意，六合之内皆朋友。`,
    rhyme: `六个小朋友手拉手，六一儿童乐悠悠。
六畜兴旺农家好，六合之内皆朋友。
六神无主心慌乱，六根清净修佛法。`,
    words: ['六个', '六月', '六年', '六十', '六安'],
    sentence: '我有六个苹果。',
    memory: '一点加个交叉架是六🏠'
  },
  '上': {
    type: '指事字',
    desc: '基准线上面',
    story: `画一条横线作地面，上面加一短横，表示"在上面"。上下左右，先是上下。上楼、上山、上天。`,
    rhyme: `上面上面在上头，高高在上不低头。
上楼梯要小心，上山容易下山难。
上善若水水利万物，上行下效看领导。`,
    words: ['上天', '上山', '上衣', '上午', '上级'],
    sentence: '飞机在天上飞。',
    memory: '短横在长横上面是上⬆️'
  },
  '下': {
    type: '指事字',
    desc: '基准线下面',
    story: `画一条横线作地面，下面加一短横，表示"在下面"。上和下是反义词，要分清。下楼、下雨、下车。`,
    rhyme: `下面下面在下头，脚踏实地不抬头。
下楼梯要注意，下雨天下带伞走。
下笔成章文思敏，下马看花仔细瞧。`,
    words: ['下去', '下手', '下午', '下面', '下雨'],
    sentence: '我下楼去。',
    memory: '短横在长横下面是下⬇️'
  },
  '中': {
    type: '指事字',
    desc: '旗子在中间',
    story: `一面旗子插在中间，周围都是空地。中就是中间、中心、正中。不偏不斜称中正，中庸之道很重要。`,
    rhyme: `旗杆立在正中央，不偏不斜称中正。
中国中国了不起，中西交流友谊长。
中立公正不偏私，中流砥柱当自强。`,
    words: ['中间', '中国', '心中', '中间', '中文'],
    sentence: '我站在队伍中间。',
    memory: '旗杆插在中间是中🚩'
  },
  
  // 会意字
  '明': {
    type: '会意字',
    desc: '日月发光',
    story: `左边是太阳，右边是月亮。太阳和月亮一起发光，世界就明亮了。明天、光明、明白都跟这个有关。`,
    rhyme: `日月同辉亮堂堂，光明未来在前方。
明德修身做好人，明知故犯可不行。
明眸皓齿真美丽，明察秋毫见真相。`,
    words: ['明天', '明白', '光明', '明月', '明星'],
    sentence: '明天天气很好。',
    memory: '太阳月亮一起明☀️🌙'
  },
  '休': {
    type: '会意字',
    desc: '人靠在树旁',
    story: `走累了吗？靠在树边歇一歇。左边的"人"靠着右边的"木"（树），人靠着树就是休息。学累了也要休息哦！`,
    rhyme: `小树旁边人休息，劳逸结合最合理。
学累了要歇一歇，休息好了再学习。
休养生息养精神，休戚与共一家亲。`,
    words: ['休息', '休假', '午休', '休假', '休学'],
    sentence: '我在树下休息。',
    memory: '人靠树上就是在休息😴'
  },
  '森': {
    type: '会意字',
    desc: '三棵树',
    story: `一棵树是木，两棵树是林，三棵树就是森。很多树在一起，茂密的树林就是森林。保护森林，人人有责！`,
    rhyme: `树木成林又成森，空气清新环境美。
森林防火要记住，绿水青山是金库。
森严壁垒不可破，森林茂密鸟儿栖。`,
    words: ['森林', '阴森', '森严', '森林', '盆景'],
    sentence: '森林很大很美丽。',
    memory: '三个木就是森林🌲🌲🌲'
  },
  '春': {
    type: '会意字',
    desc: '太阳下草木生',
    story: `上面是草芽，中间是日（太阳），下面是屯（种子发芽）。太阳照在小草上，温度升高，种子发芽，春天就来了！`,
    rhyme: `春风春雨春意浓，花草树木都发芽。
春暖花开真美好，春光明媚放风筝。
春色满园关不住，一年之计在于春。`,
    words: ['春天', '春风', '春雨', '春日', '春节'],
    sentence: '春天来了，天气变暖了。',
    memory: '太阳+草=春天的草发芽🌱'
  },
  '秋': {
    type: '会意字',
    desc: '禾苗熟了',
    story: `左边是禾苗，右边是火。秋天庄稼成熟了，像火一样金黄。秋收冬藏，秋天是收获的季节。`,
    rhyme: `秋高气爽丰收季，稻谷金黄果飘香。
秋风秋雨愁杀人，一叶知秋早早防。
秋色宜人真美丽，秋水长天共一色。`,
    words: ['秋天', '秋水', '秋收', '秋日', '秋千'],
    sentence: '秋天天气凉了。',
    memory: '禾苗着火就是秋天🍂'
  },
  '冬': {
    type: '会意字',
    desc: '冰柱垂下',
    story: `上面是冰的象形，下面是"终"的省写，表示一年到头都结冰寒冷。冬去春来，四季轮回。`,
    rhyme: `冬天到来北风吹，雪结冰柱真美丽。
冬眠的动物睡了，春暖花开再相聚。
冬日可爱真温暖，冬温夏清孝父母。`,
    words: ['冬天', '冬日', '冬泳', '冬季', '冬至'],
    sentence: '冬天很冷要穿厚衣服。',
    memory: '冰棒下面打结是冬天🧊'
  },
  '东': {
    type: '指事字',
    desc: '太阳从树后升起',
    story: `太阳从树木后面升起来，太阳升起的方向就是东方。东边日出西边雨，道是无晴却有晴。`,
    rhyme: `东边日出东方红，万丈光芒照大地。
东海东海浪花翻，东风压倒西风去。
东山再起显英雄，东西南北走天涯。`,
    words: ['东西', '东方', '东边', '东风', '东风'],
    sentence: '太阳从东方升起。',
    memory: '太阳从木头后升起是东🌅'
  },
  '西': {
    type: '指事字',
    desc: '鸟儿归巢',
    story: `太阳下山了，鸟儿飞回巢里。太阳落下的方向是西方。夕阳西下，断肠人在天涯。`,
    rhyme: `西边日落鸟归巢，夕阳西下景色好。
西装西裤真时髦，西门庆是大坏蛋。
西山日薄暮年时，西窗剪烛话巴山。`,
    words: ['东西', '西山', '西边', '西医', '西装'],
    sentence: '太阳在西边落下。',
    memory: '鸟巢里有太阳是西🌇'
  },
  
  // 形声字
  '妈': {
    type: '形声字',
    desc: '女 + 马',
    story: `左边是女字旁，表示妈妈是女性；右边是"马"，读音相近。妈妈的妈，读音就是"mā"。`,
    rhyme: `妈妈妈妈真好，教我读书又画画。
妈妈辛苦又劳累，我爱我的好妈妈。
妈妈的爱像大海，妈妈的话记心上。`,
    words: ['妈妈', '大妈', '姨妈', '老妈', '后妈'],
    sentence: '妈妈爱我。',
    memory: '女字旁+马=妈妈👩'
  },
  '爸': {
    type: '形声字',
    desc: '父 + 巴',
    story: `上面是父，表示爸爸是父亲；下面是"巴"，读音相近。爸爸的爸，读音是"bà"。`,
    rhyme: `爸爸爸爸力气大，把我举过头顶耍。
爸爸上班很辛苦，我要懂事听他的话。
爸爸的爱如山重，爸爸的话记心间。`,
    words: ['爸爸', '老爸', '爸比', '爸爸', '外爸'],
    sentence: '爸爸在上班。',
    memory: '父字头+巴=爸爸👨'
  },
  '河': {
    type: '形声字',
    desc: '氵 + 可',
    story: `左边三点水，表示和水有关；右边是"可"，读音相近。河水的河，读音是"hé"。`,
    rhyme: `小河小河哗啦啦，鱼儿游来虾儿爬。
河水清清倒映树，保护水源人人夸。
河清海晏天下太平，河渠纵横灌溉田。`,
    words: ['小河', '河流', '河南', '河马', '河边'],
    sentence: '小河里有很多鱼。',
    memory: '三点水+可=小河🏞️'
  },
  '读': {
    type: '形声字',
    desc: '讠 + 卖',
    story: `左边言字旁，读书要用嘴读出来；右边是"卖"，读音相近。读书的读，读音是"dú"。`,
    rhyme: `读书读书多有益，书中自有黄金屋。
读书破万卷下笔如有神，做个爱读书的好孩子。
读万卷书行万里路，读书百遍其义自见。`,
    words: ['读书', '阅读', '阅读理解', '朗读', '读懂'],
    sentence: '我在读书。',
    memory: '言字旁+卖=读书📖'
  },
};

// 构建语音文本
function buildVoiceText(char) {
  const info = TEACHING_CONTENT[char];
  if (!info) return null;
  
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${char}」。\n\n` +
         `这个字是个${info.type}。\n` +
         `它的意思是：${info.desc}。\n\n` +
         `${info.story}\n\n` +
         `为了方便记住，我们一起念一首小儿歌：\n` +
         `${info.rhyme.replace(/\n/g, '。')}\n\n` +
         `这个字可以组成这些词语：${info.words.join('、')}。\n` +
         `请跟我读：${info.words.join('，')}, ${info.words.join('，')}。\n\n` +
         `我们用它造个句子吧：「${info.sentence}」\n\n` +
         `复习一下：「${char}」是${info.type}，${info.memory}。\n` +
         `太棒了！你已经学会「${char}」这个字了！给自己鼓鼓掌吧！`;
}

// 生成语音
function generateSpeech(text, outputFile) {
  try {
    if (process.platform === 'darwin') {
      const safeText = text.replace(/"/g, "'").replace(/\n/g, ' ');
      execSync(`say -v "Mei-Jia" -r 130 -o "${outputFile}.aiff" "${safeText}"`, { stdio: 'pipe', timeout: 180000 });
      execSync(`/usr/local/bin/ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { stdio: 'pipe' });
      try { execSync(`rm -f "${outputFile}.aiff"`); } catch(e) {}
      return `${outputFile}.mp3`;
    }
  } catch (e) {
    console.log(`  TTS 失败: ${e.message}`);
  }
  return null;
}

// 生成示例视频
async function generateSampleVideo(char) {
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
    const voiceText = buildVoiceText(char);
    if (!voiceText) {
      console.log(`  ✗ ${char}: 没有教学内容`);
      return false;
    }
    
    const audioFile = generateSpeech(voiceText, voicePath);
    if (!audioFile) {
      console.log(`  ✗ ${char}: 语音生成失败`);
      return false;
    }
    
    const duration = 50;
    const filterComplex = `[0:v]format=yuv420p,zoompan=z='min(zoom+0.0004,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=1280x720:fps=25,fade=t=in:st=0:d=3,fade=t=out:st=${duration-3}:d=3[v]`;
    
    execSync(`/usr/local/bin/ffmpeg -y -loop 1 -i "${imageUrl}" -i "${audioFile}" -filter_complex "${filterComplex}" -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -shortest "${videoPath}"`, { 
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
  console.log('🎬 生成示例视频...\n');
  
  const sampleChar = process.argv[2] || '日';
  await generateSampleVideo(sampleChar);
}

main().catch(console.error);
