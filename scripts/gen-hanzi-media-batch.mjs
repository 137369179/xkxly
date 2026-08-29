#!/usr/bin/env node
/**
 * 汉字教学媒体批量生成器
 * Phase 1: 为所有缺失的汉字生成配图
 * Phase 2: 为所有缺失的汉字生成教学视频（含语音）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const VID_DIR = resolve(ROOT, 'public', 'hanzi-videos');
const VOICE_DIR = resolve(ROOT, 'public', 'hanzi-voices');
const DATA_FILE = resolve(ROOT, 'src', 'data', 'hanzi.ts');
const CACHE_FILE = resolve(ROOT, 'scripts/.media-batch-cache.json');

mkdirSync(IMG_DIR, { recursive: true });
mkdirSync(VID_DIR, { recursive: true });
mkdirSync(VOICE_DIR, { recursive: true });

// 加载已有状态
let existingImg = new Set(readdirSync(IMG_DIR).filter(f => /\.(png|webp)$/i.test(f)).map(f => f.replace(/\.(png|webp)$/i, '')));
let existingVid = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));

// 加载缓存
let cache = {};
if (existsSync(CACHE_FILE)) {
  try { cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8')); } catch {}
}

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

const hanziList = loadHanziData();
console.log(`📚 共 ${hanziList.length} 个汉字`);
console.log(`🖼️  已有图片: ${existingImg.size}`);
console.log(`🎬 已有视频: ${existingVid.size}`);

// 构建图像生成提示词
function getImgPrompt(h) {
  const char = h.c;
  // 基础数字
  if (['一','二','三','四','五','六','七','八','九','十'].includes(char)) {
    return `A cute children's educational illustration showing the Chinese number character "${char}". Number ${char} represented as ${char} colorful objects (apples, stars, clouds). Simple cartoon style, bright pastel colors, thick outlines, white background, no text`;
  }
  // 自然元素
  if (char === '日') return 'A cute smiling sun with warm orange rays, friendly face, kawaii style, bright colors, white background';
  if (char === '月') return 'A crescent moon with gentle smile, soft golden glow, stars around, kawaii style, night sky background';
  if (char === '山') return 'Three cute green mountains with snow caps, valley between, cartoon style, blue sky background';
  if (char === '水') return 'Flowing clear blue water with sparkles, gentle waves, cartoon style, fresh and clean';
  if (char === '火') return 'Warm friendly fire with orange and yellow flames, cozy cartoon style';
  if (char === '木') return 'Simple tree with roots and branches, educational cartoon style, green leaves';
  if (char === '林') return 'Two friendly trees standing together, forest friends, cute cartoon style';
  if (char === '森') return 'Three trees forming a little forest, cute woodland scene, cartoon style';
  if (char === '花') return 'Beautiful colorful flower with petals and happy face, garden scene, cartoon style';
  if (char === '草') return 'Green grass blades with tiny flowers, fresh morning dew, cartoon style';
  if (char === '树') return 'Tall green tree with round canopy and brown trunk, bird on branch, cartoon style';
  if (char === '石') return 'Smooth gray rock with moss, nature scene, cartoon style';
  if (char === '田') return 'Green rice field divided into squares, farmer in distance, cartoon style';
  if (char === '土') return 'Brown earth soil with green sprout emerging, simple cartoon style';
  if (char === '雨') return 'Raindrops falling from fluffy gray cloud, colorful umbrellas below, cartoon style';
  if (char === '雪') return 'Soft white snowflakes falling, winter scene with little snowman, cartoon style';
  if (char === '云') return 'Fluffy white cloud with cute face, blue sky background, kawaii style';
  if (char === '风') return 'Gentle wind blowing leaves and grass, invisible breeze illustrated, cartoon style';
  if (char === '星') return 'Twinkling bright star with sparkle rays, dark blue night sky, cartoon style';
  if (char === '天') return 'Blue sky with white clouds and flying birds, open peaceful scene, cartoon style';
  if (char === '地') return 'Green earth with flowers and grass, warm brown soil visible, cartoon style';
  // 人物身体
  if (char === '人') return 'Simple happy person standing, round head and smile, cute cartoon style';
  if (char === '口') return 'Friendly open mouth saying hello, simple illustration, cute cartoon style';
  if (char === '手') return 'Open hand with fingers spread, skin tone, friendly gesture, cartoon style';
  if (char === '足') return 'Happy foot with toes, walking pose, cartoon style';
  if (char === '目') return 'Big eye seeing clearly focused, cartoon style';
  if (char === '耳') return 'Ear listening attentively sound waves, cartoon style';
  if (char === '心') return 'Red heart love symbol beating emotional center, cute cartoon style';
  if (char === '头') return 'Head top body part thinking idea brain, cute cartoon style';
  if (char === '身') return 'Whole body person healthy active moving, cartoon style';
  // 方向位置
  if (char === '上') return 'Arrow pointing upward with happy person climbing stairs, cute cartoon';
  if (char === '下') return 'Arrow pointing downward with person sliding down, cartoon style';
  if (char === '中') return 'Target with bullseye, person standing at center winning, cartoon style';
  if (char === '大') return 'Big confident person with arms wide open, proud stance, cute cartoon';
  if (char === '小') return 'Tiny cute child looking up, small and precious, cartoon style';
  if (char === '长') return 'Long ruler measurement stretched distance far, cute cartoon';
  if (char === '短') return 'Short stubby brief condensed little small, cartoon style';
  if (char === '高') return 'Tall skyscraper mountain reaching high up, cartoon style';
  if (char === '低') return 'Low ground level underground basement small, cartoon style';
  if (char === '多') return 'Many objects piles abundance crowd lots plenty, cartoon style';
  if (char === '少') return 'Few items scarce limited small amount little, cartoon style';
  // 家庭
  if (char === '爸') return 'Father dad parent male caregiver loving, cartoon style';
  if (char === '妈') return 'Mother mom parent female caregiver caring, cartoon style';
  if (char === '爷') return 'Grandpa elderly male elder wise respected kind, cartoon style';
  if (char === '奶') return 'Grandma elderly female elder loving kind, cartoon style';
  if (char === '哥') return 'Brother older male sibling protective friendly, cartoon style';
  if (char === '姐') return 'Sister older female sibling caring helpful, cartoon style';
  if (char === '弟') return 'Brother younger male sibling playful friendly, cartoon style';
  if (char === '妹') return 'Sister younger female sibling cute sweet, cartoon style';
  if (char === '儿') return 'Son child young male offspring beloved, cute cartoon style';
  if (char === '女') return 'Daughter girl young female child loved, cute cartoon style';
  // 动作
  if (char === '跑') return 'Person running fast with speed lines, energetic cartoon style';
  if (char === '走') return 'Person walking briskly with motion lines, cartoon style';
  if (char === '跳') return 'Jumping leaping bouncing spring energetic motion, cartoon style';
  if (char === '坐') return 'Person sitting cross-legged peacefully relaxed, cartoon style';
  if (char === '站') return 'Person standing straight proud confident posture, cartoon style';
  if (char === '飞') return 'Bird or person flying through sky clouds joyful, cartoon style';
  if (char === '看') return 'Hand shading eyes looking far away curious expression, cartoon style';
  if (char === '听') return 'Listening attentively ear focused sound waves, cartoon style';
  if (char === '说') return 'Speaking with speech bubbles communication friendly, cartoon style';
  if (char === '读') return 'Child reading book with interest knowledge learning happy';
  if (char === '写') return 'Writing with pen paper creation artistic cute cartoon';
  if (char === '笑') return 'Happy laughing face with tears of joy, cartoon style';
  if (char === '哭') return 'Crying face with teardrops comfort needed sad cartoon';
  if (char === '吃') return 'Eating delicious meal hungry satisfied happy, cartoon style';
  if (char === '喝') return 'Drinking water refreshment thirsty quenched happy cartoon';
  if (char === '唱') return 'Singing melody notes voice happy musical, cartoon style';
  // 概念
  if (char === '好') return 'Good thumbs up happy approval positive smile, cartoon style';
  if (char === '坏') return 'Thumbs down disapprove negative angry, cartoon style';
  if (char === '美') return 'Beautiful pretty gorgeous lovely wonderful scene, cartoon style';
  if (char === '丑') return 'Ugly funny mismatched cartoon character silly';
  if (char === '真') return 'True real genuine authentic honest trustworthy, cartoon style';
  if (char === '假') return 'False fake pretend mock not real cartoon silly';
  if (char === '对') return 'Correct right proper accurate yes thumbs up cartoon';
  if (char === '错') return 'Wrong incorrect mistake error no X mark cartoon';
  if (char === '爱') return 'Love hearts everywhere warm feeling affection cartoon';
  if (char === '想') return 'Thinking pondering lightbulb idea understanding cartoon';
  if (char === '忘') return 'Forgetting memory fading cloud head cartoon';
  if (char === '念') return 'Missing cherishing thinking heartfelt love cartoon';
  if (char === '乐') return 'Happy joyful smiling laughter fun cartoon style';
  if (char === '苦') return 'Bitter harsh unpleasant medicinal medicine cartoon';
  if (char === '忧') return 'Worried anxious concerned troubled frowning cartoon';
  if (char === '愁') return 'Sad contemplative melancholy rainy window cartoon';
  if (char === '喜') return 'Delighted joyful enthusiastic happy celebrating cartoon';
  if (char === '怒') return 'Angry mad furious outraged upset cartoon';
  if (char === '惧') return 'Fearful terrified frightened scared cartoon';
  if (char === '怕') return 'Scared timid fearful shy cartoon hiding';
  // 颜色
  if (char === '红') return 'Bright red rose apple cheerful warm vibrant cartoon';
  if (char === '黄') return 'Bright sunny golden yellow cheerful warm cartoon';
  if (char === '蓝') return 'Blue sky ocean calm cool peaceful serene cartoon';
  if (char === '绿') return 'Green grass nature fresh vibrant alive cartoon';
  if (char === '白') return 'White pure clean bright snow pristine minimal cartoon';
  if (char === '黑') return 'Black dark mysterious night elegant bold cartoon';
  // 形状
  if (char === '圆') return 'Round circle sphere globe curved complete shape pastel cartoon';
  if (char === '方') return 'Square box rectangle corner geometric shape pastel cartoon';
  // 时间天气
  if (char === '春') return 'Spring season renewal growth green warm flowers cute cartoon';
  if (char === '夏') return 'Summer season hot bright green lush sunny cartoon';
  if (char === '秋') return 'Autumn fall season harvest golden crisp leaves cartoon';
  if (char === '冬') return 'Winter season cold snow white still peaceful cute cartoon';
  if (char === '早') return 'Early morning sunrise dawn beginning fresh cartoon';
  if (char === '晚') return 'Evening sunset orange pink sky calm quiet cartoon';
  if (char === '晴') return 'Clear sunny bright weather beautiful blue sky cartoon';
  if (char === '阴') return 'Overcast cloudy gray dull weather muted cartoon';
  // 动物
  if (char === '鱼') return 'Cute orange goldfish with big eyes swimming in blue water cartoon';
  if (char === '鸟') return 'Small cheerful bird with wings spread singing on branch cartoon';
  if (char === '虫') return 'Tiny friendly caterpillar on green leaf dotted body segments cartoon';
  if (char === '羊') return 'Fluffy white sheep with smile green meadow cartoon';
  if (char === '牛') return 'Cute cow with spotted pattern barn in background cartoon';
  if (char === '马') return 'Galloping horse with flowing mane open field cartoon';
  if (char === '虎') return 'Friendly striped tiger cub jungle background cartoon';
  if (char === '龙') return 'Cute Chinese dragon with scales clouds and mountains cartoon';
  if (char === '龟') return 'Slow turtle with shell pattern garden pond cartoon';
  if (char === '兔') return 'White bunny with long ears carrot nearby cute cartoon';
  if (char === '猫') return 'Playful kitten with whiskers ball of yarn nearby cartoon';
  if (char === '狗') return 'Friendly puppy wagging tail bone nearby cartoon style';
  if (char === '鸡') return 'Rooster chicken farmyard crowing morning bird cartoon';
  if (char === '鸭') return 'Duck quacking swimming pond water cartoon';
  if (char === '鹅') return 'White goose honking long neck water cartoon';
  if (char === '猪') return 'Pink pig farmyard oinking mud cartoon';
  if (char === '鼠') return 'Mouse tiny rodent cheese loving small creature cartoon';
  if (char === '蛇') return 'Snake slithering reptile scales tropical creature cartoon';
  if (char === '蛙') return 'Green frog hopping pond cartoon';
  if (char === '鲤') return 'Colorful koi fish ornamental pond cartoon';
  if (char === '蝶') return 'Colorful butterfly wings flying garden insect cartoon';
  // 植物食物
  if (char === '米') return 'White rice grains spilled from basket cozy kitchen cartoon';
  if (char === '竹') return 'Green bamboo stalks with leaves gentle wind cartoon';
  if (char === '果') return 'Sweet juicy fruit healthy snack delicious cartoon';
  if (char === '茶') return 'Tea cup hot drink relaxing traditional cartoon';
  if (char === '糖') return 'Sweet candy treat dessert yummy cartoon';
  if (char === '饭') return 'Cooked rice meal food warm dish satisfied cartoon';
  if (char === '菜') return 'Vegetable greens healthy plant fresh cartoon';
  if (char === '豆') return 'Red beans soy beans bowl healthy food cartoon';
  // 场所物品
  if (char === '家') return 'Cozy happy home family warmth safe shelter cartoon';
  if (char === '国') return 'Country flag territory homeland proud cartoon';
  if (char === '城') return 'City buildings streets bustling urban cartoon';
  if (char === '村') return 'Village cottage peaceful rural quiet cartoon';
  if (char === '园') return 'Garden park green nature flowers trees playground cartoon';
  if (char === '门') return 'Open wooden door showing garden beyond welcoming cartoon';
  if (char === '户') return 'Single wooden door half-open cozy home entrance cartoon';
  if (char === '屋') return 'House roof walls windows cozy home cartoon';
  if (char === '车') return 'Car vehicle wheel transportation travel friendly cartoon';
  if (char === '船') return 'Boat ship sailing water voyage adventure cartoon';
  if (char === '书') return 'Open book knowledge pictures reading learning happy cartoon';
  if (char === '画') return 'Colorful painting on easel art class creative cartoon';
  if (char === '衣') return 'Colorful clothes hanging on line sunny day cartoon';
  if (char === '帽') return 'Nice hat head covering brim sun protection cute cartoon';
  if (char === '鞋') return 'Shoe boot footwear protection walking comfortable cartoon';
  if (char === '灯') return 'Light lamp bulb illumination bright cartoon style';
  if (char === '镜') return 'Mirror reflecting glass surface shiny bathroom cartoon';
  if (char === '碗') return 'Ceramic bowl vessel food eating kitchen cartoon';
  // 抽象概念
  if (char === '会') return 'Can able meeting gathering understanding concept cartoon';
  if (char === '被') return 'Being covered wrapped passive voice grammar educational';
  if (char === '把') return 'Hold grasp handle把握 preposition grammar educational';
  if (char === '得') return 'Gain obtaining getting receiving achievement cartoon';
  if (char === '到') return 'Arriving reaching destination arrived excited cartoon';
  if (char === '来') return 'Coming arriving approaching here now movement cartoon';
  if (char === '去') return 'Going leaving departing heading away movement cartoon';
  if (char === '在') return 'Present at location existing here now cartoon';
  if (char === '和') return 'Harmony peace together unity connection cartoon';
  if (char === '与') return 'Hand giving something sharing cartoon style';
  if (char === '为') return 'Doing action helping purpose cartoon style';
  if (char === '之') return 'Walking path journey going somewhere cartoon';
  if (char === '也') return 'Also too as well emoji cartoon style';
  if (char === '不') return 'Shake head saying no forbidden negative cartoon style';
  if (char === '又') return 'Again also another time replay cartoon';
  if (char === '再') return 'Once more again repeat new attempt cartoon';
  if (char === '就') return 'Right then immediately correct cartoon style';
  if (char === '都') return 'All everyone everything both cartoon style';
  if (char === '才') return 'Just only then talent cartoon style';
  if (char === '很') return 'Very quite extremely degree cartoon style';
  if (char === '从') return 'Following along from origin cartoon style';
  if (char === '自') return 'Self natural own originate cartoon style';
  if (char === '以') return 'Using by means of with cartoon style';
  if (char === '可') return 'Can able may allowed permitted cartoon style';
  if (char === '能') return 'Able capable skilled talented cartoon style';
  if (char === '行') return 'Walk behavior ok fine able cartoon style';
  if (char === '让') return 'Let allow permit enable cartoon style';
  if (char === '要') return 'Want need must important desire cartoon style';
  if (char === '还') return 'Also still moreover cartoon style';
  // 更多常见字
  const fallbacks = {
    '丁':'A small carpenter nail tool educational cartoon',
    '丑':'Ugly funny misshapen cartoon character silly',
    '专':'Special expert dedicated专注 cartoon style',
    '且':'Ancient altar sacrifice offering cartoon style',
    '世':'World generation era cartoon style',
    '业':'Business industry career study cartoon',
    '丛':'Bush cluster gathering丛 cartoon style',
    '丝':'Silk thread丝 cartoon style',
    '丢':'Lost dropping丢失 cartoon style',
    '严':'Strict serious严肃 cartoon style',
    '个':'Individual person个 classifier cartoon',
    '丰':'Abundant plentiful丰满 cartoon style',
    '串':'String skewer串 cartoon style',
    '丹':'Cinnabar red pill丹 cartoon style',
    '主':'Main master主人 cartoon style',
    '丽':'Beautiful pretty华丽 cartoon style',
    '举':'Lift raise举 cartoon style',
    '久':'Long time久 cartoon style',
    '么':'What how什么 cartoon style',
    '乌':'Black dark乌鸦 cartoon style',
    '乎':'Particle question乎 cartoon style',
    '乐':'Music happy快乐 cartoon style',
    '乘':'Ride multiply乘 cartoon style',
    '也':'Also too也 cartoon style',
    '习':'Practice learn习 cartoon style',
    '买':'Buy purchasing买 cartoon style',
    '了':'Completed particle了 cartoon style',
    '争':'Fight compete争 cartoon style',
    '互':'Mutually互相 cartoon style',
    '井':'Well水井 cartoon style',
    '亚':'Asia亚 cartoon style',
    '些':'Some some卡通 style',
    '交':'Interact communicate交 cartoon style',
    '产':'Produce produce产 cartoon style',
    '京':'Capital city京 cartoon style',
    '亮':'Bright shiny亮 cartoon style',
    '亲':'Dear亲 cartoon style',
    '亿':'Hundred million亿 cartoon style',
    '什':'What什么 cartoon style',
    '介':'Introduce中介 cartoon style',
    '仍':'Still仍然 cartoon style',
    '仔':'Careful仔细 cartoon style',
    '他':'He him他 cartoon style',
    '付':'Pay pay付 cartoon style',
    '代':'Replace代 cartoon style',
    '令':'Order令 cartoon style',
    '以':'Use以 cartoon style',
    '们':'Plural们 cartoon style',
    '件':'Thing item件 cartoon style',
    '价':'Price价 cartoon style',
  };
  return fallbacks[char] || `Educational children's illustration representing Chinese character "${char}", cute cartoon style, bright colors, white background, simple and clear for kids aged 3-8`;
}

// 构建语音文本
function buildVoiceText(h) {
  const toneName = ['', '一声', '二声', '三声', '四声'][h.tone];
  return `小朋友们好！欢迎来到《宝贝学习乐园》！今天我们学习汉字「${h.c}」。这个字读「${h.pd}」，是${toneName}。它的部首是「${h.radical}」，一共有${h.strokes}画。记忆小故事：${h.origin}。记住口诀：「${h.c} ${h.c} ${h.c}，${h.pd} ${h.pd} ${h.pd}」。组词练习：${h.words.slice(0, 3).join('、')}。跟读：${h.words.slice(0, 3).join('，')}。造句：${h.sentence}。太棒了！你已经学会「${h.c}」这个字了！给自己鼓鼓掌吧！下期再见！`;
}

// 调用 BFF 生成图片
async function generateImage(char, prompt) {
  const res = await fetch('http://localhost:8787/api/ai/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size: '1024x1024', n: 1 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const url = data?.data?.[0]?.url;
  if (!url) throw new Error('No image URL in response');
  const imgRes = await fetch(url);
  const buf = await imgRes.arrayBuffer();
  return Buffer.from(buf);
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
    console.error(`TTS fail: ${e.message}`);
  }
  return null;
}

// 生成视频
async function generateVideo(h, imgPath) {
  const char = h.c;
  const videoPath = resolve(VID_DIR, `${char}-教学.mp4`);
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

// ─── Phase 1: 生成图片 ──────────────────────────────────────────────
async function phase1GenerateImages() {
  const missing = hanziList.filter(h => !existingImg.has(h.c)).map(h => h.c);
  if (missing.length === 0) { console.log('✅ 所有图片已存在'); return { done: 0, failed: 0 }; }
  
  console.log(`\n🎨 Phase 1: 生成 ${missing.length} 个缺失的图片...\n`);
  
  const CONCURRENCY = 4;
  let done = 0, failed = 0;
  
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (char) => {
      if (existingImg.has(char)) return;
      const h = hanziList.find(x => x.c === char);
      if (!h) { failed++; return; }
      const prompt = getImgPrompt(h);
      try {
        const buf = await generateImage(char, prompt);
        writeFileSync(resolve(IMG_DIR, `${char}.png`), buf);
        existingImg.add(char);
        done++;
        console.log(`  ✓ ${char}`);
      } catch (e) {
        failed++;
        console.log(`  ✗ ${char}: ${e.message.slice(0, 50)}`);
      }
    }));
    const pct = Math.round((i + batch.length) / missing.length * 100);
    process.stderr.write(`\r  进度: ${pct}% (${done + failed}/${missing.length})`);
  }
  console.log(`\n  Phase 1 完成: 成功 ${done}, 失败 ${failed}`);
  return { done, failed };
}

// ─── Phase 2: 生成视频 ──────────────────────────────────────────────
async function phase2GenerateVideos() {
  // 重新扫描
  existingVid = new Set(readdirSync(VID_DIR).filter(f => f.endsWith('.mp4')).map(f => f.replace('-教学.mp4', '')));
  existingImg = new Set(readdirSync(IMG_DIR).filter(f => /\.(png|webp)$/i.test(f)).map(f => f.replace(/\.(png|webp)$/i, '')));
  
  const missing = hanziList.filter(h => !existingVid.has(h.c) && existingImg.has(h.c));
  if (missing.length === 0) { console.log('✅ 所有视频已存在'); return { done: 0, failed: 0 }; }
  
  console.log(`\n🎬 Phase 2: 生成 ${missing.length} 个缺失的视频...\n`);
  
  let done = 0, failed = 0;
  const BATCH = 3;
  
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    await Promise.all(batch.map(async (h) => {
      const char = h.c;
      const imgPath = resolve(IMG_DIR, `${char}.png`);
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
    process.stderr.write(`\r  进度: ${pct}% (${done}/${missing.length})`);
  }
  console.log(`\n  Phase 2 完成: 成功 ${done}, 失败 ${failed}`);
  return { done, failed };
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('  汉字教学媒体批量生成器');
  console.log('='.repeat(60));
  
  const p1 = await phase1GenerateImages();
  const p2 = await phase2GenerateVideos();
  
  // 保存缓存
  writeFileSync(CACHE_FILE, JSON.stringify({ 
    done: p1.done, failed: p1.failed, vidDone: p2.done, vidFailed: p2.failed,
    ts: new Date().toISOString()
  }));
  
  console.log('\n' + '='.repeat(60));
  console.log(`  总结果: 图片+${p1.done} 视频+${p2.done}  失败: ${p1.failed + p2.failed}`);
  console.log(`  剩余缺失视频: ${hanziList.filter(h => !existingVid.has(h.c) && existingImg.has(h.c)).length} 个`);
  console.log('='.repeat(60));
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
