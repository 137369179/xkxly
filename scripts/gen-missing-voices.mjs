#!/usr/bin/env node
/**
 * 为识字版块中缺失的汉字生成语音文件
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');
const DATA_FILE = resolve(ROOT, 'src', 'data', 'hanzi.ts');

mkdirSync(VOICE_DIR, { recursive: true });

// 加载汉字数据
function loadHanziData() {
  const content = readFileSync(DATA_FILE, 'utf8');
  const entries = [];
  const re = /\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    entries.push({
      c: m[1], p: m[2], pd: m[3], tone: +m[4],
      radical: m[5], strokes: +m[6], origin: m[7], evolve: m[8],
      words: m[9].split(',').map(w => w.trim().replace(/'/g, '')),
      sentence: m[10], level: +m[11], freq: +m[12]
    });
  }
  return entries;
}

// 构建语音文本
function buildVoiceText(h) {
  const toneName = ['', '一声', '二声', '三声', '四声'][h.tone];
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${h.c}」。这个字读「${h.pd}」，是${toneName}。它的部首是「${h.radical}」，一共有${h.strokes}画。记忆小故事：${h.origin}。记住口诀：「${h.c} ${h.c} ${h.c}，${h.pd} ${h.pd} ${h.pd}」。组词练习：${h.words.slice(0, 3).join('、')}。跟读：${h.words.slice(0, 3).join('，')}。造句：${h.sentence}。太棒了！你已经学会「${h.c}」这个字了！给自己鼓鼓掌吧！下期再见！`;
}

// 生成语音
function generateSpeech(text, outputFile) {
  try {
    if (process.platform === 'darwin') {
      const safe = text.replace(/"/g, "'");
      const aiff = outputFile + '.aiff';
      execSync(`say -v "Mei-Jia" -r 120 -o "${aiff}" "${safe}"`, { stdio: 'pipe', timeout: 90000 });
      const mp3 = outputFile + '.mp3';
      execSync(`ffmpeg -y -i "${aiff}" -acodec libmp3lame -ab 128k "${mp3}" 2>/dev/null`, { stdio: 'pipe', timeout: 60000 });
      try { execSync(`rm -f "${aiff}"`); } catch {}
      return mp3;
    }
  } catch (e) {
    console.error(`TTS fail for ${outputFile}: ${e.message}`);
  }
  return null;
}

const hanziList = loadHanziData();
console.log(`📚 共 ${hanziList.length} 个汉字`);

// 检查现有语音
const existingVoices = new Set(readdirSync(VOICE_DIR).filter(f => f.endsWith('.mp3')).map(f => f.replace('.mp3', '')));
console.log(`🔊 已有语音: ${existingVoices.size}`);

const missing = hanziList.filter(h => !existingVoices.has(h.c)).map(h => h.c);
console.log(`❌ 缺少语音: ${missing.length}`);

if (missing.length === 0) {
  console.log('✅ 所有汉字都有语音文件！');
  process.exit(0);
}

console.log('\n🎙️ 开始生成语音...\n');

let done = 0, failed = 0;
const BATCH = 5;

for (let i = 0; i < missing.length; i += BATCH) {
  const batch = missing.slice(i, i + BATCH);
  await Promise.all(batch.map(async (char) => {
    if (existingVoices.has(char)) return;
    const h = hanziList.find(x => x.c === char);
    if (!h) { failed++; return; }
    const voicePath = resolve(VOICE_DIR, char);
    const text = buildVoiceText(h);
    const audioFile = generateSpeech(text, voicePath);
    if (audioFile && existsSync(audioFile)) {
      existingVoices.add(char);
      done++;
      console.log(`  ✓ ${char} (${h.pd})`);
    } else {
      failed++;
      console.log(`  ✗ ${char}: TTS失败`);
    }
  }));
  const pct = Math.round((i + batch.length) / missing.length * 100);
  process.stderr.write(`\r  进度: ${pct}% (${done}/${missing.length})`);
}

console.log(`\n\n📊 生成完成: 成功 ${done}, 失败 ${failed}`);
console.log(`📁 语音目录: ${VOICE_DIR}`);
console.log(`✅ 总计语音数: ${existingVoices.size}`);
