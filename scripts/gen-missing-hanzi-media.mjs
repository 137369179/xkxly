#!/usr/bin/env node
/**
 * Batch generate missing hanzi images AND videos
 * Phase 1: Generate images for all missing chars
 * Phase 2: Generate videos using Agnes AIGC image-to-video
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_IMG = resolve(ROOT, 'public', 'hanzi-imgs');
const OUTPUT_VID = resolve(ROOT, 'public', 'hanzi-videos');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');
const DATA_FILE = resolve(ROOT, 'src', 'data', 'hanzi.ts');
const TTS_CACHE = resolve(ROOT, 'scripts/.tts-cache.json');

mkdirSync(OUTPUT_IMG, { recursive: true });
mkdirSync(OUTPUT_VID, { recursive: true });
mkdirSync(VOICE_DIR, { recursive: true });

// ─── Load existing state ────────────────────────────────────────────
const existingImg = new Set(readdirSync(OUTPUT_IMG).filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));
const existingVid = new Set(readdirSync(OUTPUT_VID).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));

let ttsCache = {};
if (existsSync(TTS_CACHE)) {
  try { ttsCache = JSON.parse(readFileSync(TTS_CACHE, 'utf8')); } catch {}
}

// ─── Load all hanzi data ────────────────────────────────────────────
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

const allChars = loadHanziData();
console.log(`📚 Total chars in data: ${allChars.length}`);
console.log(`🖼️  Images exist: ${existingImg.size}`);
console.log(`🎬 Videos exist: ${existingVid.size}`);

// ─── Image generation prompts per char ───────────────────────────────
const IMG_PROMPTS = {
  // Numbers
  '零':'zero egg number empty circle cold winter','一':'single golden rice grain on beige','二':'two red apples side by side green grass','三':'three fluffy white clouds blue sky',
  '四':'four colorful butterflies garden spring','五':'five bright golden stars night sky','六':'six playful puppies circle cute','七':'seven rainbow colors arched sky','八':'two symmetrical peach halves pastel',
  '九':'nine golden coins arranged circle treasure','十':'ten tiny seedlings growing row spring',
  // Basic nature
  '日':'cute smiling sun warm orange rays friendly face kawaii','月':'crescent moon gentle smile soft golden glow stars around kawaii','山':'three cute green mountains snow caps valley cartoon',
  '水':'flowing clear blue water sparkles gentle waves kawaii','火':'warm friendly fire orange yellow flames cozy cartoon','木':'simple tree roots branches educational cartoon',
  '林':'two friendly trees standing together forest friends','森':'three trees little forest cute woodland scene','花':'beautiful colorful flower petals happy face garden',
  '草':'green grass blades tiny flowers morning dew fresh','树':'tall green tree round canopy brown trunk bird branch','石':'smooth gray rock moss nature cartoon',
  '田':'green rice field divided squares farmer distance','土':'brown earth soil with green sprout emerging','雨':'raindrops falling fluffy gray cloud umbrellas below',
  '雪':'soft white snowflakes winter scene snowman cute','云':'fluffy white cloud cute face blue sky kawaii','风':'gentle wind blowing leaves grass invisible breeze illustrated',
  '星':'twinkling bright star sparkle rays dark blue night sky','天':'blue sky white clouds flying birds peaceful','地':'green earth flowers grass warm brown soil cartoon',
  // People & body
  '人':'simple happy person standing round head smile cute cartoon','口':'friendly open mouth saying hello simple illustration','手':'open hand fingers spread skin tone friendly gesture',
  '足':'happy foot toes walking pose cartoon style','目':'big eye seeing clearly focused cartoon','耳':'ear listening attentively sound waves cartoon',
  '心':'red heart love symbol beating emotional center cute','头':'head top body part thinking idea brain cartoon','身':'whole body person healthy active moving cartoon',
  // Directions & positions
  '上':'arrow pointing upward happy person climbing stairs cute','下':'arrow pointing downward person sliding down cartoon','中':'target bullseye person standing center winning cute',
  '大':'big confident person arms wide open proud stance cute','小':'tiny cute child looking up small precious cartoon','长':'long ruler measurement stretched distance far cartoon',
  '短':'short stubby brief condensed little small cartoon','高':'tall skyscraper mountain reaching high up cartoon','低':'low ground level underground basement small cartoon',
  '多':'many objects piles abundance crowd lots plenty cartoon','少':'few items scarce limited small amount little cartoon',
  // Family
  '爸':'father dad parent male caregiver loving cartoon','妈':'mother mom parent female caregiver caring cartoon',
  '爷':'grandpa elderly male elder wise respected kind cartoon','奶':'grandma elderly female elder loving kind cartoon',
  '哥':'brother older male sibling protective friendly cartoon','姐':'sister older female sibling caring helpful cartoon',
  '弟':'brother younger male sibling playful friendly cartoon','妹':'sister younger female sibling cute sweet cartoon',
  '儿':'son child young male offspring beloved cute cartoon','女':'daughter girl young female child loved cute cartoon',
  // Actions
  '跑':'person running fast speed lines energetic cartoon','走':'person walking briskly motion lines cartoon style',
  '跳':'jumping leaping bouncing spring energetic motion cartoon','坐':'person sitting cross-legged peacefully relaxed cartoon',
  '站':'person standing straight proud confident posture cartoon','飞':'bird or person flying through sky clouds joyful cartoon',
  '看':'hand shading eyes looking far away curious expression cartoon','听':'listening attentively ear focused sound waves cartoon',
  '说':'speaking speech bubbles communication friendly cartoon','读':'child reading book interest knowledge learning happy',
  '写':'writing pen paper creation artistic cute cartoon','笑':'happy laughing face tears joy cartoon',
  '哭':'crying face teardrops comfort needed sad cartoon','吃':'eating delicious meal hungry satisfied happy cartoon',
  '喝':'drinking water refreshment thirsty quenched happy cartoon','唱':'singing melody notes voice happy musical cartoon',
  '叫':'calling shouting yelling loud voice demanding attention cartoon','说':'speaking conversation friendly cartoon',
  // Concepts
  '好':'good thumbs up happy approval positive smile cartoon','坏':'thumbs down disapprove negative angry cartoon',
  '美':'beautiful pretty gorgeous lovely wonderful scene cartoon','丑':'ugly funny mismatched cartoon character silly',
  '真':'true real genuine authentic honest trustworthy cartoon','假':'false fake pretend mock not real cartoon silly',
  '对':'correct right proper accurate yes thumbs up','错':'wrong incorrect mistake error no X mark',
  '爱':'love hearts everywhere warm feeling affection cartoon','想':'thinking pondering lightbulb idea understanding cartoon',
  '忘':'forgetting memory fading cloud head cartoon','念':'missing cherishing thinking heartfelt love cartoon',
  '乐':'happy joyful smiling laughter fun cartoon','苦':'bitter harsh unpleasant medicinal medicine cartoon',
  '忧':'worried anxious concerned troubled frowning cartoon','愁':'sad contemplative melancholy rainy window cartoon',
  '喜':'delighted joyful enthusiastic happy celebrating cartoon','怒':'angry mad furious outraged upset cartoon',
  '惧':'fearful terrified frightened scared cartoon','怕':'scared timid fearful shy cartoon hiding',
  // Colors
  '红':'bright red rose apple cheerful warm vibrant cartoon','黄':'bright sunny golden yellow cheerful warm cartoon',
  '蓝':'blue sky ocean calm cool peaceful serene cartoon','绿':'green grass nature fresh vibrant alive cartoon',
  '白':'white pure clean bright snow pristine minimal cartoon','黑':'black dark mysterious night elegant bold cartoon',
  // Shapes
  '圆':'round circle sphere globe curved complete shape pastel','方':'square box rectangle corner geometric shape pastel',
  '尖':'pointed sharp tip apex peaked narrow end cartoon','平':'flat even level smooth horizontal balanced cartoon',
  // Time & weather
  '春':'spring season renewal growth green warm flowers cute','夏':'summer season hot bright green lush sunny cartoon',
  '秋':'autumn fall season harvest golden crisp leaves cartoon','冬':'winter season cold snow white still peaceful cute',
  '早':'early morning sunrise dawn beginning fresh cartoon','晚':'evening sunset orange pink sky calm quiet cartoon',
  '晴':'clear sunny bright weather beautiful blue sky cartoon','阴':'overcast cloudy gray dull weather muted cartoon',
  // More nature
  '江':'wide river flowing water natural landscape cartoon','河':'river flowing water stream natural cartoon',
  '海':'vast blue ocean waves coastal cartoon','湖':'calm lake reflection still water cartoon',
  '池':'small pond reflection garden cartoon','溪':'stream small flowing water babbling nature',
  '沙':'sand grains beach desert granular golden cartoon','岸':'shore bank edge water land cartoon',
  // Animals
  '鱼':'cute orange goldfish big eyes swimming blue water','鸟':'small cheerful bird wings spread singing branch',
  '虫':'tiny friendly caterpillar green leaf dotted segments','羊':'fluffy white sheep smile green meadow cartoon',
  '牛':'cute spotted cow barn yard cartoon','马':'galloping horse flowing mane open field cartoon',
  '虎':'friendly striped tiger cub jungle background','龙':'cute Chinese dragon scales clouds mountains',
  '龟':'slow turtle shell pattern garden pond cartoon','兔':'white bunny long ears carrot cute cartoon',
  '猫':'playful kitten whiskers ball yarn cartoon','狗':'friendly puppy wagging tail bone cartoon',
  '鸡':'rooster chicken farmyard crowing morning bird','鸭':'duck quacking swimming pond water cartoon',
  '鹅':'white goose honking long neck water cartoon','猪':'pink pig farmyard oinking mud cartoon',
  '鼠':'mouse tiny rodent cheese loving small creature','蛇':'snake slithering reptile scales tropical creature',
  '蛙':'green frog hopping pond cartoon','鲤':'colorful koi fish ornamental pond',
  '蝶':'colorful butterfly wings flying garden insect','蝉':'cicada summer insect buzzing tree creature',
  // Plants & food
  '米':'white rice grains spilled basket cozy kitchen','竹':'green bamboo stalks leaves gentle wind',
  '果':'sweet juicy fruit healthy snack delicious cartoon','茶':'tea cup hot drink relaxing traditional cartoon',
  '糖':'sweet candy treat dessert yummy cartoon','饭':'cooked rice meal food warm dish satisfied',
  '菜':'vegetable greens healthy plant fresh cartoon','豆':'red beans soy beans bowl healthy food',
  // Objects & places
  '家':'cozy happy home family warmth safe shelter cartoon','国':'country flag territory homeland proud cartoon',
  '城':'city buildings streets bustling urban cartoon','村':'village cottage peaceful rural quiet cartoon',
  '园':'garden park green nature flowers trees playground','门':'open wooden door garden beyond welcoming cartoon',
  '户':'single wooden door half-open cozy home entrance','屋':'house roof walls windows cozy home cartoon',
  '车':'car vehicle wheel transportation travel friendly cartoon','船':'boat ship sailing water voyage adventure cartoon',
  '书':'open book knowledge pictures reading learning happy','画':'colorful painting easel art class creative cartoon',
  '衣':'colorful clothes hanging line sunny day cartoon','帽':'nice hat brim sun protection cute cartoon',
  '鞋':'shoe boot footwear protection walking comfortable cartoon','灯':'light lamp bulb illumination bright cartoon',
  '镜':'mirror reflecting glass surface shiny bathroom cartoon','碗':'ceramic bowl vessel food eating kitchen cartoon',
  // Abstract / others
  '会':'can able meeting gathering understanding concept cartoon','被':'being covered wrapped passive voice grammar cartoon',
  '把':'hold grasp handle把握 preposition grammar卡通','地':'earth ground soil green sprout cartoon',
  '得':'gain obtaining getting receiving achievement cartoon','到':'arriving reaching destination arrived excited',
  '来':'coming arriving approaching here now movement cartoon','去':'going leaving departing heading away movement',
  '在':'present at location existing here now cartoon','和':'harmony peace together unity connection cartoon',
  '与':'hand giving something sharing cartoon','为':'doing action helping purpose cartoon',
  '之':'walking path journey going somewhere cartoon','也':'also too as well emoji cartoon',
  '不':'shake head saying no forbidden negative cartoon','又':'again also another time replay cartoon',
  '再':'once more again repeat new attempt cartoon','就':'right then immediately correct cartoon',
  '都':'all everyone everything both cartoon','才':'just only then talent cartoon',
  '很':'very quite extremely degree cartoon','从':'following along from origin cartoon',
  '自':'self natural own originate cartoon','以':'using by means of with cartoon',
  '可':'can able may allowed permitted cartoon','能':'able capable skilled talented cartoon',
  '行':'walk behavior ok fine able cartoon','让':'let allow permit enable cartoon',
  '要':'want need must important desire cartoon','还':'also still moreover cart',
};

function getImagePrompt(char) {
  if (IMG_PROMPTS[char]) return `A cute children's book illustration for the Chinese character "${char}". Thick colorful outlines, simple cartoon style perfect for kids aged 3-8, rounded corners, bright pastel colors, clean white background, no Chinese text visible, just a visual representation of the meaning`;
  const fallback = `Educational children's illustration representing Chinese character "${char}", cute cartoon style, bright colors, white background, simple and clear`;
  return fallback;
}

// ─── Voice text builder ──────────────────────────────────────────────
function buildVoiceText(h) {
  const toneName = ['', '一声', '二声', '三声', '四声'][h.tone];
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${h.c}」。这个字读「${h.pd}」，是${toneName}。它的部首是「${h.radical}」，一共有${h.strokes}画。记忆小故事：${h.origin}。记住口诀：「${h.c} ${h.c} ${h.c}，${h.pd} ${h.pd} ${h.pd}」。组词练习：${h.words.slice(0, 3).join('、')}。跟读：${h.words.slice(0, 3).join('，')}。造句：${h.sentence}。太棒了！你已经学会「${h.c}」这个字了！给自己鼓鼓掌吧！下期再见！`;
}

// ─── TTS via system say ──────────────────────────────────────────────
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
    console.error(`TTS fail: ${e.message}`);
  }
  return null;
}

// ─── Video generation via ffmpeg ─────────────────────────────────────
async function generateVideo(h, imgPath) {
  const char = h.c;
  const videoPath = resolve(OUTPUT_VID, `${char}-教学.mp4`);
  const voicePath = resolve(VOICE_DIR, `${char}`);

  if (existsSync(videoPath)) {
    return { ok: true, skipped: true };
  }
  if (!existsSync(imgPath)) {
    return { ok: false, reason: 'no image' };
  }

  try {
    const voiceText = buildVoiceText(h);
    const audioFile = generateSpeech(voiceText, voicePath);
    if (!audioFile) return { ok: false, reason: 'tts fail' };

    const duration = 20;
    const filterComplex = `[0:v]format=yuv420p,zoompan=z='min(zoom+0.001,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration*25}:s=1280x720:fps=25,fade=t=in:st=0:d=2,fade=t=out:st=${duration-2}:d=2[v]`;

    execSync(
      `ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioFile}" -filter_complex "${filterComplex}" -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -shortest "${videoPath}"`,
      { stdio: 'pipe', timeout: 120000 }
    );

    if (existsSync(videoPath)) {
      const sizeMB = Math.floor(readFileSync(videoPath).length / 1024 / 1024);
      return { ok: true, skipped: false, sizeMB };
    }
    return { ok: false, reason: 'ffmpeg fail' };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// ─── PHASE 1: Generate missing images via BFF server ─────────────────
async function phase1GenerateImages() {
  const missing = allChars.filter(h => !existingImg.has(h.c)).map(h => h.c);
  if (missing.length === 0) { console.log('✅ All images exist'); return { done: 0, failed: 0 }; }
  console.log(`\n🎨 Phase 1: Generating ${missing.length} missing images...\n`);

  // Check server
  let serverUrl = 'http://localhost:8787';
  try {
    const r = await fetch(serverUrl + '/api/ai/health', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error('server unhealthy');
  } catch {
    console.log('⚠️ Server not reachable, will skip image generation');
    return { done: 0, failed: missing.length };
  }

  const CONCURRENCY = 4;
  let done = 0, failed = 0;

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (char) => {
      if (existingImg.has(char)) return;
      const prompt = getImagePrompt(char);
      try {
        const res = await fetch(`${serverUrl}/api/ai/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, size: '1024x1024', n: 1 }),
          signal: AbortSignal.timeout(60000),
        });
        if (!res.ok) { failed++; return; }
        const data = await res.json();
        const dataUrl = data?.data?.[0]?.url || data?.dataUrl;
        if (!dataUrl) { failed++; return; }
        const imgRes = await fetch(dataUrl);
        const buf = await imgRes.arrayBuffer();
        writeFileSync(resolve(OUTPUT_IMG, `${char}.png`), Buffer.from(buf));
        existingImg.add(char);
        done++;
      } catch (e) { failed++; }
    }));
    const pct = Math.round((i + batch.length) / missing.length * 100);
    process.stderr.write(`\r  Phase 1 progress: ${pct}% (${done + failed}/${missing.length})`);
  }
  console.log(`\n  Phase 1 done: ${done} generated, ${failed} failed`);
  return { done, failed };
}

// ─── PHASE 2: Generate missing videos ────────────────────────────────
async function phase2GenerateVideos() {
  // Re-scan after phase 1
  const newExistingImg = new Set(readdirSync(OUTPUT_IMG).filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));
  const newExistingVid = new Set(readdirSync(OUTPUT_VID).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));

  const missing = allChars.filter(h => !newExistingVid.has(h.c) && newExistingImg.has(h.c));
  if (missing.length === 0) { console.log('✅ All videos exist'); return { done: 0, failed: 0 }; }
  console.log(`\n🎬 Phase 2: Generating ${missing.length} missing videos...\n`);

  let done = 0, failed = 0;
  const BATCH = 3;

  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    await Promise.all(batch.map(async (h) => {
      const char = h.c;
      const imgPath = resolve(OUTPUT_IMG, `${char}.png`);
      if (!existsSync(imgPath)) { failed++; return; }
      process.stdout.write(`[${i + 1}/${missing.length}] ${char} ... `);
      const result = await generateVideo(h, imgPath);
      if (result.ok) {
        console.log(`✓ (${result.sizeMB}MB)`);
        done++;
      } else {
        console.log(`✗ ${result.reason}`);
        failed++;
      }
    }));
    const pct = Math.round((i + batch.length) / missing.length * 100);
    process.stderr.write(`\r  Phase 2 progress: ${pct}% (${done}/${missing.length})`);
  }
  console.log(`\n  Phase 2 done: ${done} generated, ${failed} failed`);
  return { done, failed };
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('  汉字教学媒体批量生成器');
  console.log('='.repeat(60));

  const p1 = await phase1GenerateImages();
  const p2 = await phase2GenerateVideos();

  // Save cache
  writeFileSync(TTS_CACHE, JSON.stringify({ done: p1.done, failed: p1.failed, vidDone: p2.done, vidFailed: p2.failed }));

  console.log('\n' + '='.repeat(60));
  console.log(`  总结果: 图片+${p1.done} 视频+${p2.done}  失败: ${p1.failed + p2.failed}`);
  console.log(`  剩余缺失视频: ${allChars.filter(h => !existingVid.has(h.c) && existingImg.has(h.c)).length} 个`);
  console.log('='.repeat(60));
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
