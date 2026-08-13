#!/usr/bin/env node
/**
 * 汉字教学视频生成器 - 示例版
 * 用于审核教学内容和视频效果
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

// 改进版教学内容库
const TEACHING_CONTENT = {
  '日': {
    type: '象形字',
    desc: '太阳的形状',
    story: `远古时代，人们在田野里劳作，抬头看天空，看到一个圆圆的太阳发出光芒。为了记住它，就在陶罐上画了个圆圈，中间加一点表示光芒。后来文字发明了，这个圆圈就变成了方方的"日"字！中间的横就是太阳光芒的意思。`,
    rhyme: `太阳圆圆叫日字，日出东方亮堂堂。一日一日又一日，时光匆匆要珍惜。日历一页翻一页，好好学习争朝夕。`,
    words: ['日记', '日子', '日光', '日出', '今日'],
    sentence: '今天的太阳真红，照得大地暖洋洋。',
    memory: '想象一个发光的圆太阳🌞'
  },
  '月': {
    type: '象形字',
    desc: '月亮的形状',
    story: `夜晚，月亮弯弯像小船挂在天上。古人观察到月亮的形状变化多端，有时候圆如盘，有时候弯如钩。他们把最典型的弯月形状画下来，就成了"月"字。外面的框是月亮轮廓，里面的短横表示月光。`,
    rhyme: `月儿弯弯挂天上，夜晚照亮小窗台。一月二月三月过，月月变化真奇妙。月圆月缺都有情，明月千里寄相思。`,
    words: ['月光', '月亮', '月牙', '岁月', '月份'],
    sentence: '今晚的月亮很圆，像个大玉盘。',
    memory: '看那弯弯的月亮像小船🌙'
  },
  '山': {
    type: '象形字',
    desc: '山峰的形状',
    story: `远处有三座大山连在一起，中间最高两边矮。古人爬山时看到了这样的景色，就把三座山峰画在纸上：中间一竖最高，两边各一撇一捺。这就是"山"字！`,
    rhyme: `三座山峰连一起，高山上面白云飘。上山下山要小心，山顶风景最美丽。山高路远不用怕，一步一脚印踏实。`,
    words: ['大山', '山羊', '火山', '上山', '山河'],
    sentence: '山上有很多树和小动物。',
    memory: '三座山峰叠在一起⛰️'
  },
  '水': {
    type: '象形字',
    desc: '流水的形状',
    story: `一条小河哗啦啦地流，中间是主流，两边溅起水花。古人把流动的河水画下来：中间弯弯曲曲的主流，两边是小水滴。这就是"水"字！`,
    rhyme: `小河流水哗啦啦，清清河水养鱼虾。节约用水是美德，点滴汇聚成大江。上善若水水利万物，柔弱胜刚强。`,
    words: ['水果', '水牛', '大水', '河水', '雨水'],
    sentence: '河里有很多鱼在游泳。',
    memory: '想象流动的小河流水💧'
  },
  '明': {
    type: '会意字',
    desc: '日月发光',
    story: `左边是太阳，右边是月亮。太阳和月亮一起发光，世界就明亮了。明天、光明、明白都跟这个有关。太阳代表阳气，月亮代表阴气，阴阳结合才能明亮。`,
    rhyme: `日月同辉亮堂堂，光明未来在前方。明德修身做好人，明知故犯可不行。明眸皓齿真美丽，明察秋毫见真相。`,
    words: ['明天', '明白', '光明', '明月', '明星'],
    sentence: '明天天气很好。',
    memory: '太阳月亮一起明☀️🌙'
  },
  '春': {
    type: '会意字',
    desc: '太阳下草木生',
    story: `上面是草芽，中间是日（太阳），下面是屯（种子发芽）。太阳照在小草上，温度升高，种子发芽，春天就来了！古人看到这种景象，创造了"春"字。`,
    rhyme: `春风春雨春意浓，花草树木都发芽。春暖花开真美好，春光明媚放风筝。春色满园关不住，一年之计在于春。`,
    words: ['春天', '春风', '春雨', '春日', '春节'],
    sentence: '春天来了，天气变暖了。',
    memory: '太阳+草=春天的草发芽🌱'
  },
  '休': {
    type: '会意字',
    desc: '人靠在树旁',
    story: `走累了吗？靠在树边歇一歇。左边的"人"靠着右边的"木"（树），人靠着树就是休息。学累了也要休息哦，劳逸结合才能学得更好！`,
    rhyme: `小树旁边人休息，劳逸结合最合理。学累了要歇一歇，休息好了再学习。休养生息养精神，休戚与共一家亲。`,
    words: ['休息', '休假', '午休'],
    sentence: '我在树下休息。',
    memory: '人靠树上就是在休息😴'
  },
  '森': {
    type: '会意字',
    desc: '三棵树',
    story: `一棵树是木，两棵树是林，三棵树就是森。很多树在一起，茂密的树林就是森林。保护森林，人人有责！森林可以净化空气，留住水土。`,
    rhyme: `树木成林又成森，空气清新环境美。森林防火要记住，绿水青山是金库。森严壁垒不可破，森林茂密鸟儿栖。`,
    words: ['森林', '阴森', '森严'],
    sentence: '森林很大很美丽。',
    memory: '三个木就是森林🌲🌲🌲'
  },
  '妈': {
    type: '形声字',
    desc: '女 + 马',
    story: `左边是女字旁，表示妈妈是女性；右边是"马"，读音相近。妈妈的妈，读音就是"mā"。形声字由形旁和声旁组成，形旁表意，声旁表音。`,
    rhyme: `妈妈妈妈真好，教我读书又画画。妈妈辛苦又劳累，我爱我的好妈妈。妈妈的爱像大海，妈妈的话记心上。`,
    words: ['妈妈', '大妈', '姨妈', '老妈'],
    sentence: '妈妈爱我。',
    memory: '女字旁+马=妈妈👩'
  },
  '爸': {
    type: '形声字',
    desc: '父 + 巴',
    story: `上面是父，表示爸爸是父亲；下面是"巴"，读音相近。爸爸的爸，读音是"bà"。爸爸和妈妈一起抚养我们长大，我们要孝顺父母。`,
    rhyme: `爸爸爸爸力气大，把我举过头顶耍。爸爸上班很辛苦，我要懂事听他的话。爸爸的爱如山重，爸爸的话记心间。`,
    words: ['爸爸', '老爸', '爸比'],
    sentence: '爸爸在上班。',
    memory: '父字头+巴=爸爸👨'
  },
  '河': {
    type: '形声字',
    desc: '氵 + 可',
    story: `左边三点水，表示和水有关；右边是"可"，读音相近。河水的河，读音是"hé"。河流是大地的血脉，滋润着两岸的土地和人民。`,
    rhyme: `小河小河哗啦啦，鱼儿游来虾儿爬。河水清清倒映树，保护水源人人夸。河清海晏天下太平，河渠纵横灌溉田。`,
    words: ['小河', '河流', '河南', '河马', '河边'],
    sentence: '小河里有很多鱼。',
    memory: '三点水+可=小河🏞️'
  },
  '读': {
    type: '形声字',
    desc: '讠 + 卖',
    story: `左边言字旁，读书要用嘴读出来；右边是"卖"，读音相近。读书的读，读音是"dú"。书籍是人类进步的阶梯，我们要爱读书、读好书。`,
    rhyme: `读书读书多有益，书中自有黄金屋。读书破万卷下笔如有神，做个爱读书的好孩子。读万卷书行万里路，读书百遍其义自见。`,
    words: ['读书', '阅读', '朗读', '读懂'],
    sentence: '我在读书。',
    memory: '言字旁+卖=读书📖'
  }
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

// 生成视频
async function generateVideo(char) {
  const imageUrl = resolve(IMAGE_DIR, `${char}.png`);
  const videoPath = resolve(OUTPUT_DIR, `${char}-教学.mp4`);
  const voicePath = resolve(VOICE_DIR, `${char}`);
  
  if (!existsSync(imageUrl)) {
    console.log(`  ✗ ${char}: 图片不存在`);
    return false;
  }
  
  // 删除旧视频，重新生成
  if (existsSync(videoPath)) {
    try { execSync(`rm "${videoPath}"`); } catch(e) {}
  }
  
  try {
    const voiceText = buildVoiceText(char);
    if (!voiceText) {
      console.log(`  ✗ ${char}: 没有教学内容`);
      return false;
    }
    
    console.log(`  📝 ${char} 语音内容预览:`);
    console.log(`     ${voiceText.substring(0, 100)}...`);
    
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
  console.log('🎬 开始生成示例教学视频...\n');
  console.log('📊 待生成字符: 日、月、山、水、明、春、休、森、妈、爸、河、读\n');
  
  const chars = ['日', '月', '山', '水', '明', '春', '休', '森', '妈', '爸', '河', '读'];
  
  let success = 0, failed = 0;
  for (const char of chars) {
    process.stdout.write(`[${++success + failed}/${chars.length}] ${char} ... `);
    const result = await generateVideo(char);
    if (result) success++; else failed++;
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
  console.log(`📁 视频目录: ${OUTPUT_DIR}`);
  console.log(`\n🔍 请检查以下示例视频:`);
  chars.forEach(c => console.log(`   • ${c}-教学.mp4`));
}

main().catch(console.error);
