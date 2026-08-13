#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');

if (!existsSync(VOICE_DIR)) mkdirSync(VOICE_DIR, { recursive: true });

const MISSING_CHARS = ['休', '兔', '妈', '爸', '狗', '猫', '羊', '苍', '莫', '莲', '虎', '虫', '语', '谁', '路', '身', '里', '难', '须', '龙', '龟'];

// Simple voice text for each character
const CHAR_INFO = {
  '休': { pd: 'xiū', tone: 1, desc: '休息', words: '休息、休假、午休' },
  '兔': { pd: 'tù', tone: 4, desc: '兔子', words: '小白兔、兔子、动如脱兔' },
  '妈': { pd: 'mā', tone: 1, desc: '妈妈', words: '妈妈、大妈、后妈' },
  '爸': { pd: 'bà', tone: 4, desc: '爸爸', words: '爸爸、老爸、爸比' },
  '狗': { pd: 'gǒu', tone: 3, desc: '小狗', words: '小狗、猎狗、狼心狗肺' },
  '猫': { pd: 'māo', tone: 1, desc: '小猫', words: '小猫、猫咪、照猫画虎' },
  '羊': { pd: 'yáng', tone: 2, desc: '小羊', words: '小羊、山羊、亡羊补牢' },
  '苍': { pd: 'cāng', tone: 1, desc: '青色', words: '苍天、苍翠、苍茫' },
  '莫': { pd: 'mò', tone: 4, desc: '不要', words: '莫非、莫要、迫不及待' },
  '莲': { pd: 'lián', tone: 2, desc: '莲花', words: '莲花、莲蓬、莲子' },
  '虎': { pd: 'hǔ', tone: 3, desc: '老虎', words: '老虎、虎头、狐假虎威' },
  '虫': { pd: 'chóng', tone: 2, desc: '虫子', words: '虫子、昆虫、虫牙' },
  '语': { pd: 'yǔ', tone: 3, desc: '语言', words: '语言、成语、英语' },
  '谁': { pd: 'shéi', tone: 2, desc: '谁人', words: '是谁、谁的、谁家' },
  '路': { pd: 'lù', tone: 4, desc: '道路', words: '走路、上路、小路' },
  '身': { pd: 'shēn', tone: 1, desc: '身体', words: '身体、自身、全身' },
  '里': { pd: 'lǐ', tone: 3, desc: '里面', words: '里面、这里、哪里' },
  '难': { pd: 'nán', tone: 2, desc: '困难', words: '困难、难过、难受' },
  '须': { pd: 'xū', tone: 1, desc: '必须', words: '必须、须知、胡须' },
  '龙': { pd: 'lóng', tone: 2, desc: '恐龙', words: '恐龙、巨龙、车水马龙' },
  '龟': { pd: 'guī', tone: 1, desc: '乌龟', words: '乌龟、海龟、龟兔赛跑' },
};

function generateSpeech(char) {
  const info = CHAR_INFO[char];
  if (!info) return null;
  
  const text = `小朋友们好！今天我们学习汉字「${char}」，读音是「${info.pd}」${info.tone === 1 ? '一声' : info.tone === 2 ? '二声' : info.tone === 3 ? '三声' : '四声'}。这个字的意思是${info.desc}。它可以组成这些词语：${info.words}。跟老师一起读一遍吧！`;
  
  const outputFile = resolve(VOICE_DIR, char);
  try {
    execSync(`say -v "Mei-Jia" -r 140 -o "${outputFile}.aiff" "${text}"`, { stdio: 'pipe', timeout: 60000 });
    execSync(`/usr/local/bin/ffmpeg -y -i "${outputFile}.aiff" -acodec libmp3lame -ab 192k "${outputFile}.mp3" 2>/dev/null`, { stdio: 'pipe' });
    try { execSync(`rm -f "${outputFile}.aiff"`); } catch(e) {}
    console.log(`✓ ${char}: 语音生成成功`);
    return true;
  } catch (e) {
    console.log(`✗ ${char}: 语音生成失败 - ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🎙️ 开始生成缺失的汉字语音...\n');
  
  let success = 0, failed = 0;
  for (const char of MISSING_CHARS) {
    process.stdout.write(`${char} ... `);
    const result = await new Promise(resolve => setTimeout(() => resolve(generateSpeech(char)), 0));
    if (result) success++; else failed++;
  }
  
  console.log(`\n✅ 完成！成功: ${success}, 失败: ${failed}`);
}

main().catch(console.error);
