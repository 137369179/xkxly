#!/usr/bin/env node
/**
 * 汉字教学视频批量生成器 - Pro版
 * 使用改进的六书分类教学内容
 */

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

// 导入详细的教学内容（从 analyze-video-script.mjs）
const TEACHING_CONTENT = JSON.parse(readFileSync(resolve(ROOT, 'scripts/teaching-content.json'), 'utf-8'));

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

// 构建语音文本
function buildVoiceText(h) {
  const char = h.c;
  const info = TEACHING_CONTENT[char];
  
  if (info) {
    return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${char}」。\n\n` +
           `这个字是个${info.type}。\n` +
           `它的意思是：${info.desc}。\n\n` +
           `${info.story}\n\n` +
           `为了方便记住，我们一起念一首小儿歌：\n` +
           `${info.rhyme.replace(/\n/g, '。')}\n\n` +
           `这个字可以组成这些词语：${info.words.join('、')}。\n` +
           `请跟我读：${info.words.join('，')}, ${info.words.join('，')}。\n\n` +
           `我们用它造个句子吧：「${h.sentence}」\n\n` +
           `复习一下：「${char}」是${info.type}，${info.memory}。\n` +
           `太棒了！你已经学会「${char}」这个字了！给自己鼓鼓掌吧！`;
  }
  
  // 默认模板
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${char}」。\n\n` +
         `这个字读「${h.pd}」，是${['', '一声', '二声', '三声', '四声'][h.tone]}。\n` +
         `它的部首是「${h.radical}」，一共有${h.strokes}画。\n\n` +
         `这是一个常用的汉字，让我们一起认识它吧！\n\n` +
         `组词练习：${h.words.slice(0, 3).join('、')}。\n` +
         `造句：${h.sentence}。\n\n` +
         `太棒了！你已经学会了「${char}」这个字！`;
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
  console.log('🎬 开始批量生成汉字教学视频（Pro版）...\n');
  console.log('⏰ 预计耗时：每个视频约 30-60 秒\n');
  
  // 加载汉字数据
  const hanziList = loadHanziData();
  console.log(`📚 加载了 ${hanziList.length} 个汉字数据\n`);
  
  let success = 0, failed = 0, skipped = 0;
  
  for (let i = 0; i < hanziList.length; i++) {
    const h = hanziList[i];
    process.stdout.write(`[${i + 1}/${hanziList.length}] ${h.c} ... `);
    
    const result = await generateVideo(h);
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 进度: ${success}成功, ${failed}失败`);
    }
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
}

main().catch(console.error);
