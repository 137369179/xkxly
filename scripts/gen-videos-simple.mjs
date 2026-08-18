#!/usr/bin/env node
/**
 * Simple video generator - generates videos for chars that have images but no videos
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VID_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');
const LOG_FILE = resolve(ROOT, 'scripts', '.video-gen-simple.log');
const STATE_FILE = resolve(ROOT, 'scripts', '.video-state.json');

mkdirSync(VID_DIR, { recursive: true });
mkdirSync(VOICE_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString().slice(0, 19)}] ${msg}`;
  console.log(line);
  writeFileSync(LOG_FILE, line + '\n', { flag: 'a' });
}

// Load state
let state = { lastChar: null, vidDone: 0, vidFailed: 0 };
if (existsSync(STATE_FILE)) {
  try { state = JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch {}
}

// Load data
function loadHanziData() {
  const data = {};
  const sources = [
    ['src/data/hanzi.ts', /\{\s*c:\s*'([^']+)',\s*p:\s*'([^']*)',\s*pd:\s*'([^']*)',\s*tone:\s*(\d),\s*radical:\s*'([^']*)',\s*strokes:\s*(\d+),\s*origin:\s*'([^']*)',\s*evolve:\s*'([^']*)',\s*words:\s*\[([^\]]+)\],\s*sentence:\s*'([^']*)',\s*level:\s*(\d),\s*freq:\s*(\d+)\s*\}/g],
    ['src/data/hanzi500.ts', /\{\s*id:\s*'[^']+',\s*char:\s*'([^']+)',\s*pinyin:\s*'([^']*)',\s*strokeCount:\s*(\d+),\s*radical:\s*'([^']*)',\s*category:\s*'[^']+',\s*words:\s*\[([^\]]+)\],\s*originDesc:\s*'([^']*)',\s*sentence:\s*'([^']*)'\s*\}/g],
    ['src/data/hanziSentences.ts', /\{\s*c:\s*'([^']+)',\s*pinyin:\s*'([^']+)',\s*word:\s*'([^']+)',\s*sentence:\s*'([^']+)'\s*\}/g],
  ];
  for (const [fname, re] of sources) {
    const content = readFileSync(resolve(ROOT, fname), 'utf8');
    let m;
    while ((m = re.exec(content)) !== null) {
      if (fname === 'src/data/hanzi.ts') {
        const [, c, p, pd, tone, radical, strokes, origin, evolve, words, sentence] = m;
        if (!data[c]) data[c] = { c, p, pd, tone: +tone, radical, strokes: +strokes, origin, evolve, words: words.split(',').map(w => w.trim().replace(/'/g, '')), sentence };
      } else if (fname === 'src/data/hanzi500.ts') {
        const [, char, pinyin, strokeCount, radical, words, originDesc, sentence] = m;
        if (!data[char]) data[char] = { c: char, p: pinyin, pd: pinyin, tone: 1, radical, strokes: +strokeCount, origin: originDesc, evolve: '', words: words.split(',').map(w => w.trim().replace(/'/g, '')), sentence };
      } else {
        const [, c, pinyin, word, sentence] = m;
        if (!data[c]) data[c] = { c, p: pinyin, pd: pinyin, tone: 1, radical: '', strokes: 0, origin: '', evolve: '', words: [word], sentence };
      }
    }
  }
  return data;
}

function buildVoiceText(h) {
  if (!h) return '小朋友们好！今天我们学习一个新的汉字。';
  const { c, pd, radical, strokes, origin, words, sentence } = h;
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${c}」。这个字读「${pd}」，它的部首是「${radical}」，一共有${strokes}画。记忆小故事：${origin}。组词练习：${(words||[]).slice(0,3).join('、')}。跟读：${(words||[]).slice(0,3).join('，')}。造句：${sentence||''}。太棒了！你已经学会「${c}」这个字了！给自己鼓鼓掌吧！下期再见！`;
}

function runCmd(cmd, args, timeout = 60000) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'pipe', timeout });
    let stderr = '';
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => resolve({ code, stderr }));
    proc.on('error', e => resolve({ code: -1, error: e.message }));
    setTimeout(() => { proc.kill(); resolve({ code: -1, error: 'timeout' }); }, timeout);
  });
}

async function genVideo(char, hanziData) {
  const imgPath = resolve(IMG_DIR, `${char}.png`);
  const vidPath = resolve(VID_DIR, `${char}-教学.mp4`);
  const voicePath = resolve(VOICE_DIR, `${char}.mp3`);
  
  if (existsSync(vidPath)) return { ok: true, skipped: true, reason: 'exists' };
  if (!existsSync(imgPath)) return { ok: false, reason: 'no image' };
  
  const h = hanziData[char] || {};
  const voiceText = buildVoiceText(h);
  
  // Generate voice
  const aiffPath = voicePath + '.aiff';
  try {
    await runCmd('say', ['-v', 'Mei-Jia', '-r', '120', '-o', aiffPath, voiceText], 60000);
    const ffResult = await runCmd('/usr/local/bin/ffmpeg', ['-y', '-i', aiffPath, '-acodec', 'libmp3lame', '-ab', '128k', voicePath], 30000);
    try { await import('node:fs').then(m => m.unlinkSync)(aiffPath); } catch {}
    if (ffResult.code !== 0) return { ok: false, reason: `tts/ffmpeg: ${ffResult.error || ffResult.stderr.slice(-100)}` };
  } catch (e) {
    return { ok: false, reason: `voice error: ${e.message}` };
  }
  
  // Generate video
  const duration = 20;
  const filter = `[0:v]format=yuv420p,zoompan=z='min(zoom+0.001,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration*25}:s=1280x720:fps=25,fade=t=in:st=0:d=2,fade=t=out:st=${duration-2}:d=2[v]`;
  
  const result = await runCmd('/usr/local/bin/ffmpeg', [
    '-y', '-loop', '1', '-i', imgPath, '-i', voicePath,
    '-filter_complex', filter,
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '128k',
    '-shortest', vidPath
  ], 120000);
  
  if (result.code === 0 && existsSync(vidPath)) {
    const fs = await import('node:fs');
    const sizeMB = Math.floor(existsSync(vidPath) ? fs.statSync(vidPath).size / 1024 / 1024 : 0);
    return { ok: true, sizeMB };
  }
  return { ok: false, reason: `ffmpeg code ${result.code}: ${result.stderr.slice(-200)}` };
}

async function main() {
  log('='.repeat(60));
  log('视频生成器 (Video Generator)');
  log('='.repeat(60));
  
  const existingVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
  const hanziData = loadHanziData();
  const allChars = Object.keys(hanziData);
  
  const toGenerate = allChars.filter(c => !existingVids.has(c)).sort();
  log(`待生成视频: ${toGenerate.length}`);
  log(`已存在视频: ${existingVids.size}`);
  
  const BATCH_SIZE = 20;
  let totalOk = 0, totalFail = 0;
  
  for (let i = 0; i < toGenerate.length; i += BATCH_SIZE) {
    const batch = toGenerate.slice(i, i + BATCH_SIZE);
    log(`\n批次 ${Math.floor(i/BATCH_SIZE)+1}: 处理 ${batch.length} 个字...`);
    
    for (const char of batch) {
      process.stdout.write(`[${i + batch.indexOf(char) + 1}/${toGenerate.length}] ${char} ... `);
      const result = await genVideo(char, hanziData);
      
      if (result.ok) {
        totalOk++;
        state.vidDone++;
        state.lastChar = char;
        console.log(`✓ ${result.sizeMB}MB`);
      } else {
        totalFail++;
        state.vidFailed++;
        console.log(`✗ ${result.reason}`);
      }
      writeFileSync(STATE_FILE, JSON.stringify(state));
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  const finalVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
  const stillMissing = allChars.filter(c => !finalVids.has(c));
  
  log('\n' + '='.repeat(60));
  log(`完成! 成功: ${totalOk}, 失败: ${totalFail}`);
  log(`总视频数: ${finalVids.size}, 仍缺少: ${stillMissing.length}`);
  if (stillMissing.length <= 20) log(`缺少: ${stillMissing.join(', ')}`);
  log('='.repeat(60));
}

main().catch(e => { log(`FATAL: ${e}`); process.exit(1); });
