#!/usr/bin/env node
/**
 * Resume hanzi media generation - continues from where previous runs left off
 * Usage: node scripts/gen-hanzi-media-resume.mjs [--batch N]
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
const LOG_FILE = resolve(ROOT, 'scripts', '.media-resume.log');
const STATE_FILE = resolve(ROOT, 'scripts', '.media-state.json');
const API_URL = 'http://127.0.0.1:8787/api/ai/image';

mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(VID_DIR, { recursive: true });
mkdirSync(VOICE_DIR, { recursive: true });

// Parse args
const args = process.argv.slice(2);
const BATCH_SIZE = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '50', 10);
const CONTINUE = args.includes('--continue');

function log(msg) {
  const line = `[${new Date().toISOString().slice(0, 19)}] ${msg}`;
  console.log(line);
  writeFileSync(LOG_FILE, line + '\n', { flag: 'a' });
}

// Load state
let state = { lastChar: null, imgDone: 0, vidDone: 0, imgFailed: 0, vidFailed: 0 };
if (existsSync(STATE_FILE) && CONTINUE) {
  try { state = JSON.parse(readFileSync(STATE_FILE, 'utf8')); log(`Resuming from: ${state.lastChar || 'start'}`); } catch {}
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
        const [, c, p, pd, tone, radical, strokes, origin, evolve, words, sentence, , ] = m;
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

const hanziData = loadHanziData();
const allChars = Object.keys(hanziData);

// Load existing assets
function loadExisting(dir, ext) {
  return new Set(readdirSync(dir).filter(f => f.endsWith(ext)).map(f => f.replace(new RegExp(`${ext}$`), '')));
}
const existingImgs = loadExisting(IMG_DIR, '.png');
const existingVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
const existingVoices = loadExisting(VOICE_DIR, '.mp3');

log(`Total chars: ${allChars.length}, Images: ${existingImgs.size}, Videos: ${existingVids.size}, Voices: ${existingVoices.size}`);

// Image prompts
function getImgPrompt(char) {
  return `A cute children's educational illustration showing the Chinese character "${char}" with its meaning. Thick colorful outlines, simple cartoon style perfect for kids aged 3-8, rounded corners, bright pastel colors, white background, no text visible except the character itself.`;
}

// Voice text
function buildVoiceText(h) {
  if (!h) return '小朋友们好！今天我们学习一个新的汉字。';
  const { c, pd, radical, strokes, origin, words, sentence } = h;
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${c}」。这个字读「${pd}」，它的部首是「${radical}」，一共有${strokes}画。记忆小故事：${origin}。组词练习：${(words||[]).slice(0,3).join('、')}。跟读：${(words||[]).slice(0,3).join('，')}。造句：${sentence||''}。太棒了！你已经学会「${c}」这个字了！给自己鼓鼓掌吧！下期再见！`;
}

// HTTP POST with retry
async function fetchJSON(url, body, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

// Download URL to file
async function downloadToFile(url, path) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(path, buf);
  return buf.length;
}

// Generate image
async function genImage(char) {
  const prompt = getImgPrompt(char);
  const result = await fetchJSON(API_URL, { prompt, size: '1024x1024', n: 1 });
  const imgUrl = result?.url || result?.data?.[0]?.url;
  if (!imgUrl) throw new Error('no url');
  const bytes = await downloadToFile(imgUrl, resolve(IMG_DIR, `${char}.png`));
  return bytes;
}

// Generate voice via subprocess
function genVoice(char) {
  return new Promise((resolve) => {
    const h = hanziData[char] || {};
    const text = buildVoiceText(h);
    const aiff = resolve(VOICE_DIR, `${char}.aiff`);
    const mp3 = resolve(VOICE_DIR, `${char}.mp3`);
    
    // say command
    const say = spawn('say', ['-v', 'Mei-Jia', '-r', '120', '-o', aiff, text], { stdio: 'ignore' });
    say.on('close', (code) => {
      if (code !== 0) return resolve(null);
      // ffmpeg convert
      const ff = spawn('/usr/local/bin/ffmpeg', ['-y', '-i', aiff, '-acodec', 'libmp3lame', '-ab', '128k', mp3], { stdio: 'ignore' });
      ff.on('close', (code) => {
        try { require('node:fs').unlinkSync(aiff); } catch {}
        resolve(code === 0 ? mp3 : null);
      });
    });
  });
}

// Generate video via ffmpeg
async function genVideo(char) {
  const imgPath = resolve(IMG_DIR, `${char}.png`);
  const vidPath = resolve(VID_DIR, `${char}-教学.mp4`);
  const voicePath = resolve(VOICE_DIR, `${char}.mp3`);
  
  if (existsSync(vidPath)) return { ok: true, skipped: true };
  if (!existsSync(imgPath)) return { ok: false, reason: 'no image' };
  if (!existsSync(voicePath)) {
    const vp = await genVoice(char);
    if (!vp) return { ok: false, reason: 'tts failed' };
  }
  
  const duration = 20;
  const filter = `[0:v]format=yuv420p,zoompan=z='min(zoom+0.001,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration*25}:s=1280x720:fps=25,fade=t=in:st=0:d=2,fade=t=out:st=${duration-2}:d=2[v]`;
  
  return new Promise((resolve) => {
    const ff = spawn('/usr/local/bin/ffmpeg', ['-y', '-loop', '1', '-i', imgPath, '-i', voicePath, '-filter_complex', filter, '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-c:a', 'aac', '-b:a', '128k', '-shortest', vidPath], { stdio: 'ignore' });
    ff.on('close', (code) => {
      if (code === 0 && existsSync(vidPath)) {
        const sizeMB = Math.floor(existsSync(vidPath) ? require('node:fs').statSync(vidPath).size / 1024 / 1024 : 0);
        resolve({ ok: true, sizeMB });
      } else {
        resolve({ ok: false, reason: `ffmpeg code ${code}` });
      }
    });
    ff.on('error', () => resolve({ ok: false, reason: 'spawn error' }));
  });
}

// Main loop
async function main() {
  const missingImgs = allChars.filter(c => !existingImgs.has(c)).sort();
  const charsWithImgNoVid = allChars.filter(c => existingImgs.has(c) && !existingVids.has(c)).sort();
  
  log(`Missing images: ${missingImgs.length}, Missing videos (has img): ${charsWithImgNoVid.length}`);
  
  // Phase 1: Images
  if (missingImgs.length > 0) {
    const startIdx = CONTINUE && state.lastChar ? missingImgs.indexOf(state.lastChar) + 1 : 0;
    const toProcess = missingImgs.slice(startIdx, startIdx + BATCH_SIZE);
    
    log(`Phase 1: Generating ${toProcess.length} images...`);
    let ok = 0, fail = 0;
    for (let i = 0; i < toProcess.length; i++) {
      const char = toProcess[i];
      process.stdout.write(`[${i+1}/${toProcess.length}] ${char} ... `);
      try {
        const bytes = await genImage(char);
        existingImgs.add(char);
        ok++;
        state.lastChar = char;
        writeFileSync(STATE_FILE, JSON.stringify({ ...state, imgDone: state.imgDone + 1 }));
        console.log(`✓ ${bytes}B`);
      } catch (e) {
        fail++;
        console.log(`✗ ${e.message.slice(0, 50)}`);
        state.imgFailed++;
      }
      await new Promise(r => setTimeout(r, 800)); // rate limit
    }
    log(`Phase 1 done: +${ok} img, ${fail} failed`);
  }
  
  // Re-scan
  const freshImgs = new Set(readdirSync(IMG_DIR).filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));
  const freshVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
  
  // Phase 2: Videos
  const toVideo = allChars.filter(c => freshImgs.has(c) && !freshVids.has(c)).sort();
  if (toVideo.length > 0) {
    const startIdx2 = CONTINUE && state.lastChar ? toVideo.indexOf(state.lastChar) + 1 : 0;
    const batch2 = toVideo.slice(startIdx2, startIdx2 + Math.min(BATCH_SIZE, 20));
    
    log(`Phase 2: Generating ${batch2.length} videos...`);
    let ok = 0, fail = 0;
    for (let i = 0; i < batch2.length; i++) {
      const char = batch2[i];
      process.stdout.write(`[${i+1}/${batch2.length}] ${char} ... `);
      try {
        const result = await genVideo(char);
        if (result.ok) {
          freshVids.add(char);
          ok++;
          state.lastChar = char;
          writeFileSync(STATE_FILE, JSON.stringify({ ...state, vidDone: state.vidDone + 1 }));
          console.log(`✓ ${result.sizeMB}MB`);
        } else {
          fail++;
          console.log(`✗ ${result.reason}`);
          state.vidFailed++;
        }
      } catch (e) {
        fail++;
        console.log(`✗ ${e.message.slice(0, 50)}`);
      }
      await new Promise(r => setTimeout(r, 400));
    }
    log(`Phase 2 done: +${ok} vid, ${fail} failed`);
  }
  
  // Final summary
  const finalImgs = new Set(readdirSync(IMG_DIR).filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));
  const finalVids = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
  const stillMissing = allChars.filter(c => !finalVids.has(c));
  
  log('\n' + '='.repeat(50));
  log(`Final: Images=${finalImgs.size} Videos=${finalVids.size} Missing=${stillMissing.length}`);
  log(`Session: imgOK=${state.imgDone} imgFail=${state.imgFailed} vidOK=${state.vidDone} vidFail=${state.vidFailed}`);
  log('='.repeat(50));
}

main().catch(e => { log(`FATAL: ${e}`); process.exit(1); });
