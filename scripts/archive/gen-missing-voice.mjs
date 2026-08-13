#!/usr/bin/env node
/**
 * 生成缺失的汉字语音文件
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');
const IMAGE_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VIDEO_DIR = resolve(ROOT, 'public', 'hanzi-videos');

if (!existsSync(VOICE_DIR)) mkdirSync(VOICE_DIR, { recursive: true });

// Get chars that have images and videos but missing voice MP3
const imgChars = new Set(
  readdirSync(IMAGE_DIR)
    .filter(f => f.endsWith('.png'))
    .map(f => f.replace('.png', ''))
);

const videoChars = new Set(
  readdirSync(VIDEO_DIR)
    .filter(f => f.endsWith('-教学.mp4'))
    .map(f => f.replace('-教学.mp4', ''))
);

const existingMp3Chars = new Set(
  readdirSync(VOICE_DIR)
    .filter(f => f.endsWith('.mp3'))
    .map(f => f.replace('.mp3', ''))
);

// Find missing voice files
const missingChars = [...imgChars].filter(c => 
  videoChars.has(c) && !existingMp3Chars.has(c)
).sort();

console.log(`需要生成 ${missingChars.length} 个汉字的语音文件\n`);

const CHAR_INFO = {
  '芳': { pd: 'fāng', tone: 1, desc: '花草的香气', words: '芬芳、花香、芳草' },
  '轻': { pd: 'qīng', tone: 1, desc: '分量大，与重相对', words: '轻松、轻轻、年轻' },
  '边': { pd: 'biān', tone: 1, desc: '物体的外围', words: '旁边、一边、边缘' },
  '过': { pd: 'guò', tone: 4, desc: '从一处到另一处', words: '过去、过来、经过' },
  '近': { pd: 'jìn', tone: 4, desc: '距离小', words: '附近、远近、亲近' },
  '还': { pd: 'hái', tone: 2, desc: '表示仍然', words: '还有、还是、还是' },
  '远': { pd: 'yuǎn', tone: 3, desc: '距离大', words: '远处、远方、远近' },
  '送': { pd: 'sòng', tone: 4, desc: '把东西给别人', words: '送走、送礼、送货' },
  '道': { pd: 'dào', tone: 4, desc: '道路、道理', words: '大道、知道、道理' },
  '遥': { pd: 'yáo', tone: 2, desc: '距离远', words: '遥远、遥控、遥望' },
  '酒': { pd: 'jiǔ', tone: 3, desc: '用粮食发酵制成的饮料', words: '白酒、喝酒、酒吧' },
  '醉': { pd: 'zuì', tone: 4, desc: '饮酒过量神志不清', words: '醉酒、陶醉、沉醉' },
  '重': { pd: 'zhòng', tone: 4, desc: '分量大', words: '重要、重新、重力' },
  '野': { pd: 'yě', tone: 3, desc: '城外、田野', words: '野外、田野、野兔' },
  '金': { pd: 'jīn', tone: 1, desc: '金属、黄金', words: '金色、金子、金黄' },
  '银': { pd: 'yín', tone: 2, desc: '银白色金属', words: '银色、银行、银白' },
  '问': { pd: 'wèn', tone: 4, desc: '向人请求解答', words: '问题、询问、问答' },
  '闲': { pd: 'xián', tone: 2, desc: '没有事情做', words: '空闲、休闲、悠闲' },
  '间': { pd: 'jiān', tone: 1, desc: '两物之间', words: '中间、时间、房间' },
  '闻': { pd: 'wén', tone: 2, desc: '用鼻子嗅', words: '闻到、新闻、闻名' },
  '阳': { pd: 'yáng', tone: 2, desc: '太阳、阳光', words: '阳光、夕阳、太阳' },
  '阴': { pd: 'yīn', tone: 1, desc: '云层遮日', words: '阴天、阴影、阴凉' },
  '雁': { pd: 'yàn', tone: 4, desc: '一种候鸟', words: '大雁、归雁、雁行' },
  '霜': { pd: 'shuāng', tone: 1, desc: '水气凝结的白色冰晶', words: '霜冻、霜花、冰霜' },
  '香': { pd: 'xiāng', tone: 1, desc: '气味好闻', words: '香味、香水、香甜' },
};

function generateSpeech(char) {
  const info = CHAR_INFO[char];
  if (!info) {
    // Fallback generic voice
    const text = `小朋友们，今天我们学习汉字「${char}」。跟老师一起读：${char}。`;
    const outputFile = resolve(VOICE_DIR, char);
    try {
      execSync(`say -v "Mei-Jia" -r 130 -o "${outputFile}.aiff" "${text}"`, { stdio: 'pipe', timeout: 60000 });
      execSync(`/usr/local/bin/ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { stdio: 'pipe' });
      try { execSync(`rm -f "${outputFile}.aiff"`); } catch(e) {}
      console.log(`✓ ${char}: 已生成`);
      return true;
    } catch (e) {
      console.log(`✗ ${char}: 失败 - ${e.message}`);
      return false;
    }
  }
  
  const text = `小朋友们好！今天我们学习汉字「${char}」。\n\n` +
               `这个字读「${info.pd}」，是${['', '一声', '二声', '三声', '四声'][info.tone]}。\n` +
               `它的意思是：${info.desc}。\n\n` +
               `它可以组成这些词语：${info.words}。\n` +
               `跟老师一起读一遍吧！${char}，${char}，${char}。\n\n` +
               `太棒了！你已经学会了「${char}」这个字！`;
  
  const outputFile = resolve(VOICE_DIR, char);
  try {
    execSync(`say -v "Mei-Jia" -r 130 -o "${outputFile}.aiff" "${text}"`, { stdio: 'pipe', timeout: 120000 });
    execSync(`/usr/local/bin/ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { stdio: 'pipe' });
    try { execSync(`rm -f "${outputFile}.aiff"`); } catch(e) {}
    console.log(`✓ ${char} (${info.pd}): 语音生成成功`);
    return true;
  } catch (e) {
    console.log(`✗ ${char}: 语音生成失败 - ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🎙️ 开始生成缺失的汉字语音...\n');
  
  let success = 0, failed = 0;
  for (let i = 0; i < missingChars.length; i++) {
    const char = missingChars[i];
    process.stdout.write(`[${i + 1}/${missingChars.length}] ${char} ... `);
    const result = await generateSpeech(char);
    if (result) success++; else failed++;
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
}

main().catch(console.error);
