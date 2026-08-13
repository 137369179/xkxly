#!/usr/bin/env node
/**
 * 汉字教学视频生成器 Pro版
 * 专业教学方法：六书分类 + 故事记忆法 + 儿歌口诀
 * 
 * 教学方法：
 * 1. 六书分类 - 象形、指事、会意、形声
 * 2. 故事记忆法 - 每个字一个有趣故事
 * 3. 儿歌口诀 - 朗朗上口易记忆
 * 4. 偏旁部首 - 理解字的构成
 * 5. 组词练习 - 实际应用
 */

import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');
const DATA_FILE = resolve(ROOT, 'src', 'data', 'hanzi.ts');

// 确保目录存在
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(VOICE_DIR)) mkdirSync(VOICE_DIR, { recursive: true });

// 六书类型判断与故事库
const LIUSHU_STORIES = {
  // 象形字 - 画出来的字
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
    '木': { desc: '一棵树', story: '一棵大树立在那里，上面是树枝，下面是树根', rhyme: '大树高高立地上，枝叶繁茂好乘凉' },
  },
  // 指事字 - 用符号指示
  '指事': {
    '上': { desc: '在基准线上面', story: '画一条横线作地面，上面加一短横，表示"在上面"。这就是"上"字', rhyme: '上面上面在上头，高高在上不低头' },
    '下': { desc: '在基准线下面', story: '画一条横线作地面，下面加一短横，表示"在下面"。这就是"下"字', rhyme: '下面下面在下头，脚踏实地不抬头' },
    '一': { desc: '最简的一横', story: '画一根横线，表示"一个"。这是最简单的汉字', rhyme: '一根横线是一字，一二三四它居首' },
    '二': { desc: '两横', story: '画两根横线，上面短下面长，表示"两个"', rhyme: '两根横线二是字，成双成对好兄弟' },
    '三': { desc: '三横', story: '画三根横线，一、二、三，表示"三个"', rhyme: '三根横线三是字，举一反三最聪明' },
    '十': { desc: '横竖交叉', story: '一根横线一根竖，十字交叉站中间。这就是"十"字', rhyme: '一横一竖十字叉，十个手指数红花' },
    '中': { desc: '旗子在中间', story: '一面旗子插在中间，周围都是空地。这就是"中"字', rhyme: '旗杆立在正中央，不偏不斜称中正' },
    '五': { desc: '交错的数目', story: '五根木棍交叉摆，表示数字五', rhyme: '五行五方五指尖，五颜六色真好看' },
    '九': { desc: '弯曲的数字', story: '像个小钩子弯弯的，表示数字九', rhyme: '九九归一再出发，九九乘法顶呱呱' },
    '七': { desc: '像个人弯腰', story: '像个人弯腰干活的样子，表示数字七', rhyme: '七色彩虹天上挂，七仙女下凡间啦' },
    '上': { desc: '短横在长横上面', story: '下面长横是地面，上面短横在上方', rhyme: '上面上面在上头，登高望远不回头' },
  },
  // 会意字 - 组合表意
  '会意': {
    '明': { desc: '日月在一起很明亮', story: '左边是太阳，右边是月亮。太阳和月亮一起发光，世界就明亮了', rhyme: '日月同辉亮堂堂，光明未来在前方' },
    '休': { desc: '人靠在树旁休息', story: '走累了吗？靠在树边歇一歇。左边的"人"靠着右边的"木"，就是休息的"休"', rhyme: '小树旁边人休息，劳逸结合最合理' },
    '森': { desc: '三棵树就是森林', story: '一棵树是木，两棵树是林，三棵树就是森。很多树在一起，就是森林', rhyme: '树木成林又成森，空气清新环境美' },
    '林': { desc: '两棵树就是树林', story: '左边一棵树，右边一棵树，两棵树站在一起就是树林', rhyme: '两棵并排是小林，风吹树叶沙沙响' },
    '从': { desc: '两个人一前一后', story: '前面一个人带着后面一个人，跟着走就是"从"', rhyme: '你跟我来我跟你，跟跟从从是一家' },
    '众': { desc: '三个人就是众人', story: '一个人是人，两个人是从，三个人就是众。大家团结力量大', rhyme: '三人成众力量大，齐心协力干事情' },
    '男': { desc: '田地里用力气的男人', story: '上面是"田"，下面是"力"。在田里出力气干活的人是男人', rhyme: '田间出力是好汉，男女平等肩并肩' },
    '字': { desc: '屋顶下有孩子', story: '宝盖头是房子，下面是儿子。房子里有孩子，就是"字"', rhyme: '屋子里面生娃娃，取名写字传文化' },
    '家': { desc: '屋顶下有猪', story: '古代人家屋顶下养猪，表示有房有产业就是家', rhyme: '家里家外温暖窝，爸爸妈妈爱我多' },
    '春': { desc: '太阳下草木生长', story: '上面是草芽，中间是日（太阳），太阳照在小草上，春天就来了', rhyme: '春风春雨春意浓，花草树木都发芽' },
    '秋': { desc: '禾苗熟了像火烧', story: '左边是禾苗，右边是火。秋天庄稼成熟了，像火一样金黄', rhyme: '秋高气爽丰收季，稻谷金黄果飘香' },
    '东': { desc: '太阳从树后升起', story: '太阳从树木后面升起来，太阳升起的方向就是东方', rhyme: '东边日出东方红，万丈光芒照大地' },
    '西': { desc: '鸟儿归巢', story: '太阳下山了，鸟儿飞回巢里。太阳落下的方向是西方', rhyme: '西边日落鸟归巢，夕阳西下景色好' },
    '北': { desc: '两人背靠背', story: '两个人背靠背站着，表示方向相反，北方就是背面', rhyme: '北风呼呼冷风吹，南北东西要分清' },
    '南': { desc: '工具在田间', story: '像是在田地里劳作的农具，太阳升起南边照', rhyme: '南边太阳暖洋洋，春暖花开好风光' },
    '安': { desc: '女子在屋下安静', story: '宝盖头是房子，下面是女。女子在屋里就很安全安宁', rhyme: '安安静静好女子，平安快乐在一起' },
    '好': { desc: '女子和孩子', story: '左边是女，右边是孩子。妈妈抱着孩子，就是好', rhyme: '好人好事天天有，好好學習争上游' },
    '友': { desc: '两只手友好合作', story: '两双手握在一起，表示朋友友好互助', rhyme: '好朋友呀手拉手，互相帮助一起走' },
    '朋': { desc: '两个月亮并排', story: '两个"月"字并排站，像两个好朋友并肩同行', rhyme: '朋友朋友手牵手，快快乐乐一起走' },
  },
  // 形声字 - 形旁+声旁
  '形声': {
    '妈': { desc: '女字旁+马的音', story: '左边是女字旁，表示是女性；右边是"马"，读音和马相同。妈妈的妈', rhyme: '妈妈妈妈真好，教我读书又画画' },
    '爸': { desc: '父字旁+巴的音', story: '上面是父，表示爸爸；下面是巴，读音相近。爸爸', rhyme: '爸爸爸爸力气大，把我举过头顶耍' },
    '河': { desc: '三点水+可的音', story: '左边三点水，和水有关；右边是可，读音相近。河水哗哗流', rhyme: '小河小河哗啦啦， flowing flowing not stop' },
    '海': { desc: '三点水+每的音', story: '左边三点水，和海有关；右边是每，读音相近。大海', rhyme: '大海大海蓝湛湛，鱼儿游来虾儿窜' },
    '请': { desc: '言字旁+青的音', story: '左边言字旁，和说话有关；右边是青，读音相近。请你', rhyme: '请字有礼又大方，文明用语记心上' },
    '情': { desc: '竖心旁+青的音', story: '左边竖心旁，和心情有关；右边是青，读音相近。心情', rhyme: '心情好坏要注意，乐观开朗最有益' },
    '晴': { desc: '日字旁+青的音', story: '左边日字旁，和太阳有关；右边是青，读音相近。晴天', rhyme: '晴天晴天太阳照，蓝天白云多美妙' },
    '清': { desc: '三点水+青的音', story: '左边三点水，和水有关；右边是青，读音相近。清水', rhyme: '清水清水明镜台，干干净净真可爱' },
    '听': { desc: '口字旁+斤的音', story: '左边口字旁，和耳朵听的动作用嘴说；右边是斤，读音相近', rhyme: '用心倾听别打断，尊重他人好习惯' },
    '读': { desc: '言字旁+卖的音', story: '左边言字旁，读书要用嘴读出来；右边是卖，读音相近', rhyme: '读书读书多有益，书中自有黄金屋' },
    '写': { desc: '宝盖头+与的音', story: '上面宝盖头，在房子里；下面与，读音相近。写字要在室内', rhyme: '写工整正写字好，一笔一划要记牢' },
    '学': { desc: '孩子头上学文', story: '上面是交叉的文具，表示学习；下面是孩子，孩子在学校学习', rhyme: '学习学习再学习，知识海洋任我游' },
  }
};

// 默认故事模板（当没有特定故事时）
function getDefaultStory(char, liushuType) {
  return {
    type: liushuType || '汉字',
    desc: `这是一个${liushuType || ''}汉字`,
    story: `「${char}」是一个常用的汉字，让我们来看看它的样子吧！`,
    rhyme: `${char} ${char} 真好玩，天天见面认识它`
  };
}

// 获取六书分类信息
function getLiushuInfo(char) {
  for (const [type, chars] of Object.entries(LIUSHU_STORIES)) {
    if (chars[char]) {
      return { type, ...chars[char] };
    }
  }
  // 根据部首推断
  const radicalMap = {
    '氵': '形声', '亻': '形声', '女': '形声', '日': '象形', '月': '象形',
    '木': '象形', '火': '象形', '水': '象形', '山': '象形', '石': '象形',
    '艹': '形声', '纟': '形声', '言': '形声', '心': '象形', '手': '象形',
    '目': '象形', '口': '象形', '耳': '象形', '辶': '形声', '宀': '形声',
    '冖': '形声', '穴': '形声', '广': '形声', '病': '形声',
  };
  
  // 简单判断
  if (['一', '二', '三', '上', '下', '中', '不', '与', '之', '也'].includes(char)) {
    return getDefaultStory(char, '指事');
  }
  if (['明', '休', '林', '森', '从', '众', '男', '好', '友', '朋', '春', '秋'].includes(char)) {
    return getDefaultStory(char, '会意');
  }
  if (['妈', '爸', '河', '海', '请', '情', '晴', '清', '花', '草', '树', '马', '妈'].includes(char)) {
    return getDefaultStory(char, '形声');
  }
  return getDefaultStory(char, '汉字');
}

// 加载汉字数据
function loadHanziData() {
  const content = readFileSync(DATA_FILE, 'utf-8');
  const entries = [];
  const regex = /\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    entries.push({
      c: match[1],
      p: match[2],
      pd: match[3],
      tone: parseInt(match[4]),
      radical: match[5],
      strokes: parseInt(match[6]),
      origin: match[7],
      evolve: match[8],
      words: match[9].split(',').map(w => w.trim().replace(/'/g, '')),
      sentence: match[10],
      level: parseInt(match[11]),
      freq: parseInt(match[12])
    });
  }
  return entries;
}

// 构建更专业的中文教学语音文本
function buildVoiceText(h) {
  const info = getLiushuInfo(h.c);
  const toneName = ['', '一声', '二声', '三声', '四声'][h.tone];
  
  // 开场白
  let text = `小朋友们好！欢迎来到《宝贝学习乐园》，今天我们一起来认识一个新的汉字——「${h.c}」。\n\n`;
  
  // 读音部分
  text += `这个字读「${h.pd}」，是${toneName}。\n`;
  text += `它的部首是「${h.radical}」，一共有${h.strokes}画。\n\n`;
  
  // 六书分类解释
  text += `你知道吗？汉字有四种造字方法，叫做「六书」。\n`;
  text += `「${h.c}」是个${info.type}。\n`;
  text += `${info.desc ? info.desc + '。\n' : ''}`;
  text += `\n`;
  
  // 故事记忆
  text += `现在听我讲一个关于「${h.c}」的故事：\n`;
  text += `${info.story}\n\n`;
  
  // 儿歌口诀
  text += `为了方便记住，我们一起念一首小儿歌：\n`;
  text += `"${info.rhyme}"\n\n`;
  
  // 组词练习
  text += `这个字可以组成这些词语：\n`;
  h.words.slice(0, 3).forEach((word, i) => {
    text += `${i + 1}. ${word}，请跟我读：${word}\n`;
  });
  
  // 造句
  text += `\n我们用它造个句子吧：「${h.sentence}」\n\n`;
  
  // 复习巩固
  text += `好啦，让我们来复习一下今天学的「${h.c}」字。\n`;
  text += `它是${info.type}，意思是${info.desc || '很好记'}。\n`;
  text += `我们一起念：${h.pd}，${h.pd}，${h.c} ${h.c} ${h.c}。\n\n`;
  
  // 结尾鼓励
  text += `太棒了！你已经学会了「${h.c}」这个字！给自己鼓鼓掌吧！\n`;
  text += `下期节目再见！`;
  
  return text;
}

// 使用系统 TTS 生成中文语音
function generateSpeech(text, outputFile) {
  try {
    if (process.platform === 'darwin') {
      // macOS 使用 say 命令，使用中文语音
      const safeText = text.replace(/"/g, "'");
      execSync(`say -v "Mei-Jia" -r 130 -o "${outputFile}.aiff" "${safeText}"`, { stdio: 'pipe', timeout: 120000 });
      execSync(`ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { stdio: 'pipe' });
      // 清理临时文件
      try { execSync(`rm -f "${outputFile}.aiff"`); } catch(e) {}
      return `${outputFile}.mp3`;
    } else if (process.platform === 'linux') {
      // Linux 使用 espeak
      const safeText = text.replace(/"/g, "'");
      execSync(`espeak -v zh -s 110 "${safeText}" -w "${outputFile}.wav" 2>/dev/null`, { stdio: 'pipe' });
      return `${outputFile}.wav`;
    }
  } catch (e) {
    console.log(`  TTS 生成失败: ${e.message}`);
  }
  return null;
}

// 生成教学视频
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
    console.log(`  ⏭ ${char}: 已存在，跳过`);
    return true;
  }
  
  try {
    // 构建教学文本
    const voiceText = buildVoiceText(h);
    process.stdout.write(`📝 ${char}: ${voiceText.substring(0, 30)}...\n`);
    
    // 生成语音
    const audioFile = generateSpeech(voiceText, voicePath);
    if (!audioFile) {
      console.log(`  ✗ ${char}: 语音生成失败`);
      return false;
    }
    
    // 固定视频时长为 50 秒
    const duration = 50;
    
    // 使用 ffmpeg 生成视频（淡入 + 缓慢缩放 + 淡出）
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

// 主函数
async function main() {
  console.log('🎬 开始生成汉字教学视频（Pro版）...\n');
  console.log('⏰ 预计耗时：每个视频约 30-60 秒\n');
  
  const hanziList = loadHanziData();
  console.log(`📚 加载了 ${hanziList.length} 个汉字数据\n`);
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  // 处理所有汉字
  for (let i = 0; i < hanziList.length; i++) {
    const h = hanziList[i];
    process.stdout.write(`[${i + 1}/${hanziList.length}] ${h.c} ... `);
    
    const result = await generateVideo(h);
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    // 每10个打印进度
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 当前进度: ${success}成功, ${failed}失败, ${skipped}跳过`);
    }
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
  console.log(`📁 视频目录: ${OUTPUT_DIR}`);
  console.log(`🔊 语音目录: ${VOICE_DIR}`);
}

main().catch(console.error);
