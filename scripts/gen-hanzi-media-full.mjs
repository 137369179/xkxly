#!/usr/bin/env node
/**
 * Full hanzi media generator - generates images and videos in batches
 * Run multiple times to cover all characters
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
const LOG_FILE = resolve(ROOT, 'scripts', '.media-full.log');
const STATE_FILE = resolve(ROOT, 'scripts', '.media-full-state.json');
const API_URL = 'http://127.0.0.1:8787/api/ai/image';

mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(VID_DIR, { recursive: true });
mkdirSync(VOICE_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString().slice(0, 19)}] ${msg}`;
  console.log(line);
  writeFileSync(LOG_FILE, line + '\n', { flag: 'a' });
}

let state = { lastChar: null, phase: 'img', imgDone: 0, vidDone: 0, imgFail: 0, vidFail: 0 };
if (existsSync(STATE_FILE)) {
  try { state = JSON.parse(readFileSync(STATE_FILE, 'utf8')); log(`Resuming: ${state.phase}/${state.lastChar}`); } catch {}
}

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

function getImgPrompt(char) {
  return `A cute children's educational illustration showing the Chinese character "${char}" with its meaning. Thick colorful outlines, simple cartoon style perfect for kids aged 3-8, rounded corners, bright pastel colors, white background, no text visible except the character itself.`;
}

async function fetchJSON(url, body) {
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function downloadToFile(url, path) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(path, buf);
  return buf.length;
}

async function genImage(char) {
  const result = await fetchJSON(API_URL, { prompt: getImgPrompt(char), size: '1024x1024', n: 1 });
  const imgUrl = result?.url || result?.data?.[0]?.url;
  if (!imgUrl) throw new Error('no url');
  const bytes = await downloadToFile(imgUrl, resolve(IMG_DIR, `${char}.png`));
  return bytes;
}

function runCmd(cmd, args, timeout = 60000) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'pipe' });
    let stderr = '';
    proc.stderr.on('data', d => stderr += d);
    const timer = setTimeout(() => { proc.kill(); resolve({ code: -1, error: 'timeout' }); }, timeout);
    proc.on('close', code => { clearTimeout(timer); resolve({ code, stderr }); });
    proc.on('error', e => { clearTimeout(timer); resolve({ code: -1, error: e.message }); });
  });
}

async function genVideo(char, hanziData) {
  const imgPath = resolve(IMG_DIR, `${char}.png`);
  const vidPath = resolve(VID_DIR, `${char}-教学.mp4`);
  const voicePath = resolve(VOICE_DIR, `${char}.mp3`);
  
  if (existsSync(vidPath)) return { ok: true, skipped: true };
  if (!existsSync(imgPath)) return { ok: false, reason: 'no image' };
  
  const h = hanziData[char] || {};
  const voiceText = buildVoiceText(h);
  const aiffPath = voicePath + '.aiff';
  
  await runCmd('say', ['-v', 'Mei-Jia', '-r', '120', '-o', aiffPath, voiceText], 60000);
  const ffResult = await runCmd('/usr/local/bin/ffmpeg', ['-y', '-i', aiffPath, '-acodec', 'libmp3lame', '-ab', '128k', voicePath], 30000);
  try { import('node:fs').then(m => m.unlinkSync(aiffPath)); } catch {}
  if (ffResult.code !== 0) return { ok: false, reason: `tts: ${ffResult.error || ffResult.stderr.slice(-100)}` };
  
  const duration = 20;
  const filter = `[0:v]format=yuv420p,zoompan=z='min(zoom+0.001,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration*25}:s=1280x720:fps=25,fade=t=in:st=0:d=2,fade=t=out:st=${duration-2}:d=2[v]`;
  
  const result = await runCmd('/usr/local/bin/ffmpeg', ['-y', '-loop', '1', '-i', imgPath, '-i', voicePath, '-filter_complex', filter, '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-c:a', 'aac', '-b:a', '128k', '-shortest', vidPath], 120000);
  
  if (result.code === 0 && existsSync(vidPath)) {
    const fs = await import('node:fs');
    const sizeMB = Math.floor(fs.statSync(vidPath).size / 1024 / 1024);
    return { ok: true, sizeMB };
  }
  return { ok: false, reason: `ffmpeg ${result.code}: ${result.stderr.slice(-200)}` };
}

async function main() {
  log('='.repeat(60));
  log('Hanzi Media Generator - Full Batch Mode');
  log('='.repeat(60));
  
  const existingImgs = new Set(readdirSync(IMG_DIR).filter(f => /\.(png|webp)$/i.test(f)).map(f => f.replace(/\.(png|webp)$/i, '')));
  const existingVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
  const hanziData = loadHanziData();
  const allChars = Object.keys(hanziData);
  
  log(`Total chars: ${allChars.length}, Images: ${existingImgs.size}, Videos: ${existingVids.size}`);
  
  const BATCH = 30;
  const MAX_RUNS = 50; // Safety limit
  
  for (let run = 0; run < MAX_RUNS; run++) {
    // Refresh lists
    const freshImgs = new Set(readdirSync(IMG_DIR).filter(f => /\.(png|webp)$/i.test(f)).map(f => f.replace(/\.(png|webp)$/i, '')));
    const freshVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
    const missingImgs = allChars.filter(c => !freshImgs.has(c)).sort();
    const missingVids = allChars.filter(c => freshImgs.has(c) && !freshVids.has(c)).sort();
    
    if (missingImgs.length === 0 && missingVids.length === 0) {
      log('\n✅ All media generated!');
      break;
    }
    
    log(`\nRun ${run + 1}: Missing imgs=${missingImgs.length}, Missing vids=${missingVids.length}`);
    
    // Phase 1: Generate images (prioritize)
    if (missingImgs.length > 0) {
      const batch = missingImgs.slice(0, BATCH);
      log(`  Generating ${batch.length} images...`);
      for (let i = 0; i < batch.length; i++) {
        const char = batch[i];
        process.stdout.write(`  [img ${i+1}/${batch.length}] ${char} ... `);
        try {
          const bytes = await genImage(char);
          log(`✓ ${bytes}B`);
          state.imgDone++;
          state.lastChar = char;
        } catch (e) {
          log(`✗ ${e.message.slice(0, 50)}`);
          state.imgFail++;
        }
        await new Promise(r => setTimeout(r, 800));
      }
    }
    
    // Phase 2: Generate videos
    const freshImgs2 = new Set(readdirSync(IMG_DIR).filter(f => /\.(png|webp)$/i.test(f)).map(f => f.replace(/\.(png|webp)$/i, '')));
    const vidsToGen = allChars.filter(c => freshImgs2.has(c) && !freshVids.has(c)).sort();
    if (vidsToGen.length > 0) {
      const batch = vidsToGen.slice(0, BATCH);
      log(`  Generating ${batch.length} videos...`);
      for (let i = 0; i < batch.length; i++) {
        const char = batch[i];
        process.stdout.write(`  [vid ${i+1}/${batch.length}] ${char} ... `);
        try {
          const result = await genVideo(char, hanziData);
          if (result.ok) {
            log(`✓ ${result.sizeMB}MB`);
            state.vidDone++;
          } else {
            log(`✗ ${result.reason}`);
            state.vidFail++;
          }
          state.lastChar = char;
        } catch (e) {
          log(`✗ ${e.message.slice(0, 50)}`);
          state.vidFail++;
        }
        await new Promise(r => setTimeout(r, 400));
      }
    }
    
    writeFileSync(STATE_FILE, JSON.stringify(state));
    
    // Check progress
    const finalImgs = new Set(readdirSync(IMG_DIR).filter(f => /\.(png|webp)$/i.test(f)).map(f => f.replace(/\.(png|webp)$/i, '')));
    const finalVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
    log(`  Progress: imgs=${finalImgs.size}/${allChars.length}, vids=${finalVids.size}/${allChars.length}`);
  }
  
  // Final summary
  const finalImgs = new Set(readdirSync(IMG_DIR).filter(f => /\.(png|webp)$/i.test(f)).map(f => f.replace(/\.(png|webp)$/i, '')));
  const finalVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
  const stillMissing = allChars.filter(c => !finalVids.has(c));
  
  log('\n' + '='.repeat(60));
  log('FINAL STATUS');
  log('='.repeat(60));
  log(`Images: ${finalImgs.size}/${allChars.length}`);
  log(`Videos: ${finalVids.size}/${allChars.length}`);
  log(`Missing videos: ${stillMissing.length}`);
  log(`Session stats: imgDone=${state.imgDone} imgFail=${state.imgFail} vidDone=${state.vidDone} vidFail=${state.vidFail}`);
  if (stillMissing.length <= 20) log(`Missing: ${stillMissing.join(', ')}`);
  log('='.repeat(60));
}

main().catch(e => { log(`FATAL: ${e}`); process.exit(1); });
