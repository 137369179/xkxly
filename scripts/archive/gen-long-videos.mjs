#!/usr/bin/env node
/**
 * 生成长达50秒的汉字教学视频
 * 方法：生成3段18秒视频 + 拼接成50秒完整视频
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');
const TEMP_DIR = resolve(ROOT, 'temp');
const DATA_FILE = resolve(ROOT, 'src', 'data', 'hanzi.ts');

// 确保目录存在
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(VOICE_DIR)) mkdirSync(VOICE_DIR, { recursive: true });
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

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

// 获取六书信息
function getLiushuInfo(char) {
  const liushuMap = {
    '日': { type: '象形字', desc: '像太阳的形状', story: '古人看到圆圆的太阳，就画了一个圆圈中间加一点，后来变成了现在的日字' },
    '月': { type: '象形字', desc: '像月亮的形状', story: '古人看到弯弯的月亮，就画了一弯新月，后来变成了现在的月字' },
    '山': { type: '象形字', desc: '像山的形状', story: '古人看到三座山峰连在一起，就画了三座山，后来变成了现在的山字' },
    '水': { type: '象形字', desc: '像水流的样子', story: '古人看到流动的河水，中间是主流，两边是水花，后来变成了现在的水字' },
    '火': { type: '象形字', desc: '像火焰的形状', story: '古人看到跳动的火焰，中间是高高的火苗，两边是火花，后来变成了现在的火字' },
    '木': { type: '象形字', desc: '像树木的形状', story: '古人看到一棵树，上面是树枝，下面是树根，后来变成了现在的木字' },
    '人': { type: '象形字', desc: '像人的侧面', story: '古人看到一个侧身站立的人，就画了一个侧面的小人，后来变成了现在的人字' },
    '口': { type: '象形字', desc: '像嘴巴的形状', story: '古人看到张开的嘴巴，就画了一个方框，后来变成了现在的口字' },
    '手': { type: '象形字', desc: '像手的形状', story: '古人看到张开的手掌，就画了一只手，后来变成了现在的手字' },
    '大': { type: '指事字', desc: '像一个张开四肢的人', story: '一个人张开双臂和双腿，表示很大，就在人字中间加了一横' },
    '小': { type: '指事字', desc: '表示东西很小', story: '在两笔中间加了两个小点，表示小小的东西' },
    '上': { type: '指事字', desc: '表示位置在高处', story: '下面一长横是基准线，上面一短横表示在高处' },
    '下': { type: '指事字', desc: '表示位置在低处', story: '下面一长横是基准线，上面一短横表示在低处' },
    '明': { type: '会意字', desc: '日月在一起很明亮', story: '左边是太阳，右边是月亮，太阳和月亮一起发光，就是明亮的明' },
    '休': { type: '会意字', desc: '人靠在树上休息', story: '左边是人，右边是树，一个人靠在树旁边休息，就是休息的休' },
    '林': { type: '会意字', desc: '两棵树就是树林', story: '两个木字并排站在一起，表示很多树，就是树林的林' },
    '森': { type: '会意字', desc: '三棵树就是森林', story: '三个木字堆在一起，表示更多的树，就是森林的森' },
    '雨': { type: '象形字', desc: '像天上下雨', story: '外面是云框，里面的点像雨滴从天上落下来' },
    '风': { type: '象形字', desc: '像风吹鸟飞', story: '外面像风，里面像一只被风吹着的鸟' },
    '飞': { type: '象形字', desc: '像鸟儿飞翔', story: '像一只展开翅膀飞翔的小鸟' },
    '鸟': { type: '象形字', desc: '像鸟的形状', story: '上面是鸟头，中间是鸟身，下面是鸟爪，就像一只小鸟' },
    '虫': { type: '象形字', desc: '像小虫子', story: '圆圆的头，弯曲的身体，像一条小虫子' },
    '鱼': { type: '象形字', desc: '像鱼的形状', story: '上面是鱼头，中间是鱼身，下面是鱼尾，就像一条鱼' },
    '羊': { type: '象形字', desc: '像羊的头', story: '上面是羊角，下面是羊脸，就像一只小羊' },
    '牛': { type: '象形字', desc: '像牛的头', story: '上面是牛角，下面是牛脸，就像一头牛' },
    '马': { type: '象形字', desc: '像马的形状', story: '上面是马鬃，中间是马头，下面是马腿，就像一匹马' },
    '虎': { type: '象形字', desc: '像老虎', story: '像一只蹲着的老虎，有虎头和虎纹' },
    '龙': { type: '象形字', desc: '像龙', story: '像一条神话中的龙，有龙头龙身' },
    '龟': { type: '象形字', desc: '像乌龟', story: '像一只爬行的乌龟，有龟壳和四只脚' },
    '兔': { type: '象形字', desc: '像兔子', story: '像一只竖起耳朵的小兔子' },
    '猫': { type: '形声字', desc: '犭表意，喵表音', story: '左边是反犬旁表示动物，右边像猫叫的声音' },
    '狗': { type: '形声字', desc: '犭表意，句表音', story: '左边是反犬旁表示动物，右边表示读音' },
    '花': { type: '形声字', desc: '艹表意，化表音', story: '上面是草字头表示植物，下面是化的声音' },
    '草': { type: '形声字', desc: '艹表意，早表音', story: '上面是草字头，下面是早的声音' },
    '树': { type: '形声字', desc: '木表意，对表音', story: '左边是木字旁表示树木，右边是对的声音' },
    '竹': { type: '象形字', desc: '像竹叶', story: '像两片竹叶垂下来的样子' },
    '石': { type: '象形字', desc: '像石头', story: '上面是厂（山崖），下面是口（石头）' },
    '田': { type: '象形字', desc: '像田地在空中看', story: '像一块块方方正正的田地，有田埂分开' },
    '米': { type: '象形字', desc: '像米粒散落', story: '像一粒粒米散开的样子' },
    '门': { type: '象形字', desc: '像门的形状', story: '像两扇开着的门' },
    '书': { type: '指事字', desc: '用手按着书', story: '像一只手按着书本在书写' },
    '学': { type: '会意字', desc: '孩子在家学习', story: '上面是交叉的文具，下面是孩子，表示孩子在学校学习' }
  };
  return liushuMap[char] || { type: '汉字', desc: '', story: '' };
}

// 构建分段中文教学语音文本（专业教学法 - 50秒版本）
function buildVoiceText(h) {
  const info = getLiushuInfo(h.c);
  const toneName = ['', '一声', '二声', '三声', '四声'][h.tone];
  
  // 第一段： Introduction (0-10秒)
  const part1 = `小朋友们好！今天我们学习汉字「${h.c}」。这个字读「${h.pd}」，是${toneName}。`;
  
  // 第二段： Etymology (10-25秒)
  const part2 = `它是个${info.type}。${info.desc ? '意思是：' + info.desc + '。' : ''}${info.story ? '记忆故事：' + info.story + '。' : ''}`;
  
  // 第三段： Words (25-40秒)
  const part3 = `这个字可以组这些词：${h.words.slice(0, 3).join('、')}。跟我一起读：${h.words.slice(0, 3).join('，')}，${h.words.slice(0, 3).join('，')}，${h.words.slice(0, 3).join('，')}。`;
  
  // 第四段： Conclusion (40-50秒)
  const part4 = `小朋友，你学会了吗？真棒！给自己鼓鼓掌吧！`;
  
  return { part1, part2, part3, part4 };
}

// 使用系统 TTS 生成中文语音
function generateSpeech(text, outputFile) {
  try {
    if (process.platform === 'darwin') {
      execSync(`say -v "Mei-Jia" -r 140 -o "${outputFile}.aiff" "${text}"`, { stdio: 'pipe' });
      execSync(`ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { stdio: 'pipe' });
      return `${outputFile}.mp3`;
    }
  } catch (e) {
    console.log(`  TTS 生成失败: ${e.message}`);
  }
  return null;
}

// 生成单段视频（约18秒）
async function generateSegment(char, segmentIndex, text, audioFile) {
  const imageUrl = resolve(IMAGE_DIR, `${char}.png`);
  const segmentVideo = resolve(TEMP_DIR, `${char}-seg${segmentIndex}.mp4`);
  
  if (!existsSync(imageUrl)) {
    console.log(`  ✗ ${char}: 图片不存在`);
    return null;
  }
  
  try {
    // 估算时长
    const duration = Math.max(15, Math.ceil(text.length / 2));
    
    // 使用 ffmpeg 生成视频（淡入 + 缓慢缩放 + 淡出）
    const filterComplex = `[0:v]format=yuv420p,zoompan=z='min(zoom+0.001,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.floor(duration * 25)}:s=1280x720:fps=25,fade=t=in:st=0:d=1,fade=t=out:st=${Math.max(0, duration - 1)}:d=1[v]`;
    
    execSync(`ffmpeg -y -loop 1 -i "${imageUrl}" -i "${audioFile}" -filter_complex "${filterComplex}" -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -shortest "${segmentVideo}"`, { 
      stdio: 'pipe' 
    });
    
    return segmentVideo;
  } catch (e) {
    console.error(`  ✗ ${char} 片段${segmentIndex}: ${e.message}`);
    return null;
  }
}

// 主函数
async function main() {
  console.log('🎬 开始生成长达50秒的汉字教学视频...\n');
  
  const hanziList = loadHanziData();
  console.log(`📚 加载了 ${hanziList.length} 个汉字数据\n`);
  
  let success = 0;
  let failed = 0;
  
  // 处理前30个基础汉字作为示例
  const chars = hanziList.slice(0, 30);
  
  for (const h of chars) {
    const char = h.c;
    console.log(`[${success + failed + 1}/${chars.length}] ${char}...`);
    
    const videoPath = resolve(OUTPUT_DIR, `${char}-教学.mp4`);
    
    // 跳过已生成的视频
    if (existsSync(videoPath)) {
      console.log(`  ⏭ 已存在，跳过`);
      continue;
    }
    
    try {
      // 构建教学文本
      const { part1, part2, part3, part4 } = buildVoiceText(h);
      
      // 生成四段语音
      const voice1 = resolve(VOICE_DIR, `${char}-p1`);
      const voice2 = resolve(VOICE_DIR, `${char}-p2`);
      const voice3 = resolve(VOICE_DIR, `${char}-p3`);
      const voice4 = resolve(VOICE_DIR, `${char}-p4`);
      
      const audio1 = generateSpeech(part1, voice1);
      const audio2 = generateSpeech(part2, voice2);
      const audio3 = generateSpeech(part3, voice3);
      const audio4 = generateSpeech(part4, voice4);
      
      if (!audio1 || !audio2 || !audio3 || !audio4) {
        console.log(`  ✗ 语音生成失败`);
        failed++;
        continue;
      }
      
      // 生成四段视频
      const seg1 = await generateSegment(char, 1, part1, audio1);
      const seg2 = await generateSegment(char, 2, part2, audio2);
      const seg3 = await generateSegment(char, 3, part3, audio3);
      const seg4 = await generateSegment(char, 4, part4, audio4);
      
      if (!seg1 || !seg2 || !seg3 || !seg4) {
        console.log(`  ✗ 视频生成失败`);
        failed++;
        continue;
      }
      
      // 合并四段视频
      const concatList = resolve(TEMP_DIR, `${char}-concat.txt`);
      writeFileSync(concatList, `file '${seg1}'\nfile '${seg2}'\nfile '${seg3}'\nfile '${seg4}'\n`);
      
      execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${videoPath}"`, { stdio: 'pipe' });
      
      // 清理临时文件
      [seg1, seg2, seg3, seg4, concatList].forEach(f => {
        try { execSync(`rm -f "${f}"`, { stdio: 'pipe' }); } catch {}
      });
      
      const sizeMB = existsSync(videoPath) ? Math.floor(readFileSync(videoPath).length / 1024 / 1024) : 0;
      console.log(`  ✓ ${char} (${sizeMB}MB)`);
      success++;
    } catch (e) {
      console.error(`  ✗ ${char}: ${e.message}`);
      failed++;
    }
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
  console.log(`📁 视频目录: ${OUTPUT_DIR}`);
}

main().catch(console.error);
