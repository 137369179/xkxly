#!/usr/bin/env node
/**
 * Batch generate Chinese character images using Agnes AIGC
 * Runs in background and saves all images to public/hanzi-imgs/
 */
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const AGNES_API_KEY = process.env.AGNES_API_KEY || '';
const AGNES_BASE_URL = 'https://api.agnes-ai.cn/v1';

// Character prompts mapped to images
const PROMPTS = {
  '一': 'A cute children book illustration of the Chinese character 一 (one), single golden rice grain on soft beige background, simple cartoon style, thick colorful outlines, pastel colors, rounded corners',
  '二': 'A cute children book illustration of the Chinese character 二 (two), two red apples side by side on green grass, simple cartoon style, thick colorful outlines',
  '三': 'A cute children book illustration of the Chinese character 三 (three), three fluffy white clouds in blue sky, kawaii style, pastel colors',
  '四': 'A cute children book illustration of the Chinese character 四 (four), four colorful butterflies flying in garden, cartoon style for kids',
  '五': 'A cute children book illustration of the Chinese character 五 (five), five bright golden stars shining in night sky, warm yellow glow',
  '六': 'A cute children book illustration of the Chinese character 六 (six), six playful puppies sitting in circle, cute cartoon style',
  '七': 'A cute children book illustration of the Chinese character 七 (seven), seven rainbow colors arched across sky, vibrant illustration',
  '八': 'A cute children book illustration of the Chinese character 八 (eight), two symmetrical peach halves showing seeds, pastel colors',
  '九': 'A cute children book illustration of the Chinese character 九 (nine), nine golden coins arranged in circle, treasure theme',
  '十': 'A cute children book illustration of the Chinese character 十 (ten), ten tiny seedlings growing in row, spring garden scene',
  '人': 'A cute children book illustration of the Chinese character 人 (person), simple happy person standing with arms open, friendly smile, thick colorful outlines',
  '口': 'A cute children book illustration of the Chinese character 口 (mouth), friendly open mouth saying hello with smile, simple cartoon style',
  '手': 'A cute children book illustration of the Chinese character 手 (hand), open friendly hand with fingers spread waving hello, skin tone',
  '目': 'A cute children book illustration of the Chinese character 目 (eye), big friendly eye seeing clearly, cartoon style for kids',
  '耳': 'A cute children book illustration of the Chinese character 耳 (ear), ear listening attentively, sound waves nearby, cartoon style',
  '足': 'A cute children book illustration of the Chinese character 足 (foot), happy foot with toes walking forward, cartoon style',
  '大': 'A cute children book illustration of the Chinese character 大 (big), large confident person with arms wide open proudly, happy expression',
  '小': 'A cute children book illustration of the Chinese character 小 (small), tiny adorable child looking up with wonder, big eyes',
  '上': 'A cute children book illustration of the Chinese character 上 (up), arrow pointing upward with happy person climbing stairs, bright colors',
  '下': 'A cute children book illustration of the Chinese character 下 (down), arrow pointing downward with person sliding down, bright colors',
  '中': 'A cute children book illustration of the Chinese character 中 (center), target with bullseye, person standing at center winning, red white colors',
  '日': 'A cute children book illustration of the Chinese character 日 (sun), smiling golden sun with warm orange rays, friendly face, pastel yellow background',
  '月': 'A cute children book illustration of the Chinese character 月 (moon), crescent moon with gentle smile, soft golden glow, stars around',
  '山': 'A cute children book illustration of the Chinese character 山 (mountain), three green mountains with snow caps, valley between, cartoon style',
  '水': 'A cute children book illustration of the Chinese character 水 (water), flowing clear blue water with sparkles, gentle waves, cartoon style',
  '火': 'A cute children book illustration of the Chinese character 火 (fire), friendly warm orange and yellow flames with happy face, cozy feeling',
  '木': 'A cute children book illustration of the Chinese character 木 (tree), happy green tree with round canopy and brown trunk, bird on branch',
  '明': 'A cute children book illustration of the Chinese character 明 (bright), sun and moon together creating brightness, warm golden silver colors',
  '休': 'A cute children book illustration of the Chinese character 休 (rest), person leaning against tree taking break, relaxed happy expression',
  '林': 'A cute children book illustration of the Chinese character 林 (forest), two friendly green trees standing together, birds flying around',
  '森': 'A cute children book illustration of the Chinese character 森 (dense forest), three tall green trees forming little forest, animals hiding',
  '雨': 'A cute children book illustration of the Chinese character 雨 (rain), raindrops falling from fluffy gray cloud, colorful umbrellas below',
  '云': 'A cute children book illustration of the Chinese character 云 (cloud), fluffy white cloud with happy kawaii face, blue sky background',
  '雪': 'A cute children book illustration of the Chinese character 雪 (snow), soft white snowflakes falling gently, little snowman with carrot nose',
  '风': 'A cute children book illustration of the Chinese character 风 (wind), gentle breeze blowing leaves and grass, kite flying in sky',
  '飞': 'A cute children book illustration of the Chinese character 飞 (fly), happy bird flying through sky with wings spread, clouds around',
  '鸟': 'A cute children book illustration of the Chinese character 鸟 (bird), small cheerful bird with bright feathers sitting on branch singing',
  '虫': 'A cute children book illustration of the Chinese character 虫 (bug), friendly colorful caterpillar on green leaf, dotted patterns',
  '鱼': 'A cute children book illustration of the Chinese character 鱼 (fish), happy orange goldfish swimming in blue water with bubbles',
  '羊': 'A cute children book illustration of the Chinese character 羊 (sheep), fluffy white sheep with curly wool in green meadow',
  '牛': 'A cute children book illustration of the Chinese character 牛 (cow), friendly spotted cow with big eyes near wooden barn',
  '马': 'A cute children book illustration of the Chinese character 马 (horse), friendly brown horse with flowing mane galloping in field',
  '虎': 'A cute children book illustration of the Chinese character 虎 (tiger), friendly striped tiger cub in jungle, cartoon style',
  '龙': 'A cute children book illustration of the Chinese character 龙 (dragon), cute Chinese dragon with scales among clouds and mountains',
  '龟': 'A cute children book illustration of the Chinese character 龟 (turtle), slow turtle with shell pattern in garden pond',
  '兔': 'A cute children book illustration of the Chinese character 兔 (rabbit), white bunny with long ears, carrot nearby, cute style',
  '猫': 'A cute children book illustration of the Chinese character 猫 (cat), playful kitten with whiskers and ball of yarn',
  '狗': 'A cute children book illustration of the Chinese character 狗 (dog), friendly puppy wagging tail, bone nearby',
  '花': 'A cute children book illustration of the Chinese character 花 (flower), beautiful colorful flower with petals and happy face',
  '草': 'A cute children book illustration of the Chinese character 草 (grass), green grass blades with tiny flowers and morning dew',
  '树': 'A cute children book illustration of the Chinese character 树 (tree), tall green tree with round canopy and brown trunk',
  '竹': 'A cute children book illustration of the Chinese character 竹 (bamboo), green bamboo stalks with leaves, gentle wind blowing',
  '石': 'A cute children book illustration of the Chinese character 石 (rock), smooth gray rock with moss, nature scene',
  '田': 'A cute children book illustration of the Chinese character 田 (field), green rice field divided into squares, farmer in distance',
  '米': 'A cute children book illustration of the Chinese character 米 (rice), white rice grains spilled from basket, cozy kitchen',
  '门': 'A cute children book illustration of the Chinese character 门 (door), open wooden door showing garden beyond, welcoming',
  '户': 'A cute children book illustration of the Chinese character 户 (door), single wooden door half-open, cozy home entrance',
  '皿': 'A cute children book illustration of the Chinese character 皿 (bowl), ceramic bowl with food inside, table setting',
  '衣': 'A cute children book illustration of the Chinese character 衣 (clothes), colorful clothes hanging on line, sunny day',
  '书': 'A cute children book illustration of the Chinese character 书 (book), open book with knowledge and pictures, reading scene',
  '画': 'A cute children book illustration of the Chinese character 画 (painting), colorful painting on easel, art class scene',
  '诗': 'A cute children book illustration of the Chinese character 诗 (poem), poetic scene with moon and flowers, classical Chinese style',
  '歌': 'A cute children book illustration of the Chinese character 歌 (song), musical notes floating in air, happy singing',
  '读': 'A cute children book illustration of the Chinese character 读 (read), child reading book with interest, knowledge learning',
  '写': 'A cute children book illustration of the Chinese character 写 (write), child writing with pen and paper, creative',
  '说': 'A cute children book illustration of the Chinese character 说 (speak), speech bubbles with words, communication',
  '话': 'A cute children book illustration of the Chinese character 话 (words), conversation between friends, talking happily',
  '问': 'A cute children book illustration of the Chinese character 问 (ask), curious child raising hand asking question',
  '答': 'A cute children book illustration of the Chinese character 答 (answer), correct answer with lightbulb idea found',
  '听': 'A cute children book illustration of the Chinese character 听 (listen), ear listening attentively, sound waves',
  '见': 'A cute children book illustration of the Chinese character 见 (see), eyes seeing clearly, vision perception',
  '知': 'A cute children book illustration of the Chinese character 知 (know), lightbulb idea bright understanding knowledge',
  '识': 'A cute children book illustration of the Chinese character 识 (recognize), familiar friend recognized knowing',
  '好': 'A cute children book illustration of the Chinese character 好 (good), thumbs up happy approval positive',
  '坏': 'A cute children book illustration of the Chinese character 坏 (bad), thumbs down disapprove negative',
  '美': 'A cute children book illustration of the Chinese character 美 (beautiful), pretty gorgeous lovely beautiful scene',
  '丑': 'A cute children book illustration of the Chinese character 丑 (ugly), funny mismatched cartoon ugly face',
  '长': 'A cute children book illustration of the Chinese character 长 (long), ruler measuring stretched distance long',
  '短': 'A cute children book illustration of the Chinese character 短 (short), stubby short condensed brief little',
  '高': 'A cute children book illustration of the Chinese character 高 (tall), skyscraper mountain reaching high tall',
  '低': 'A cute children book illustration of the Chinese character 低 (low), ground level underground low basement',
  '多': 'A cute children book illustration of the Chinese character 多 (many), many objects piles abundance crowd lots',
  '少': 'A cute children book illustration of the Chinese character 少 (few), few items scarce limited small amount',
  '老': 'A cute children book illustration of the Chinese character 老 (old), wise elder with gray hair and wisdom',
  '新': 'A cute children book illustration of the Chinese character 新 (new), shiny bright fresh clean new beginning',
  '旧': 'A cute children book illustration of the Chinese character 旧 (old), vintage antique worn used time passed',
  '正': 'A cute children book illustration of the Chinese character 正 (correct), straight proper right answer correct',
  '反': 'A cute children book illustration of the Chinese character 反 (opposite), reversed wrong contrary opposite flip',
  '真': 'A cute children book illustration of the Chinese character 真 (true), real genuine authentic honest truth',
  '假': 'A cute children book illustration of the Chinese character 假 (false), fake pretend mock not real false',
  '是': 'A cute children book illustration of the Chinese character 是 (yes), affirmative agreement correct okay yes',
  '非': 'A cute children book illustration of the Chinese character 非 (no), negation wrong incorrect deny no',
  '有': 'A cute children book illustration of the Chinese character 有 (have), possession existing there is have got',
  '无': 'A cute children book illustration of the Chinese character 无 (none), nothing empty void lack absence none',
  '生': 'A cute children book illustration of the Chinese character 生 (life), birth growing alive creating life born',
  '死': 'A cute children book illustration of the Chinese character 死 (death), ending passing goodbye final death',
  '存': 'A cute children book illustration of the Chinese character 存 (exist), existing staying remaining preserved exist',
  '亡': 'A cute children book illustration of the Chinese character 亡 (lost), lost gone disappeared vanished end亡',
  '动': 'A cute children book illustration of the Chinese character 动 (move), active kinetic energy motion moving',
  '静': 'A cute children book illustration of the Chinese character 静 (still), quiet calm peaceful serene rest still',
  '干': 'A cute children book illustration of the Chinese character 干 (dry), arid thirsty without water drought dry',
  '湿': 'A cute children book illustration of the Chinese character 湿 (wet), damp soaked moist humid water wet',
  '冷': 'A cute children book illustration of the Chinese character 冷 (cold), freezing icy bitter winter chill cold',
  '热': 'A cute children book illustration of the Chinese character 热 (hot), warm fiery burning summer heat hot',
  '寒': 'A cute children book illustration of the Chinese character 寒 (chilly), cold winter frost freezing chilly寒',
  '暖': 'A cute children book illustration of the Chinese character 暖 (warm), cozy comfortable pleasant temperature warm',
  '乐': 'A cute children book illustration of the Chinese character 乐 (happy), joyful smiling laughter fun happiness',
  '苦': 'A cute children book illustration of the Chinese character 苦 (bitter), harsh unpleasant painful sad bitter',
  '忧': 'A cute children book illustration of the Chinese character 忧 (worry), anxious concerned troubled worried',
  '愁': 'A cute children book illustration of the Chinese character 愁 (sad), melancholy rainy contemplative sad愁',
  '喜': 'A cute children book illustration of the Chinese character 喜 (delight), enthusiastic joyful happy喜 delight',
  '怒': 'A cute children book illustration of the Chinese character 怒 (angry), mad furious outraged upset怒 angry',
  '惧': 'A cute children book illustration of the Chinese character 惧 (fear), terrified frightened scared惧 fear',
  '爱': 'A cute children book illustration of the Chinese character 爱 (love), affection caring warm heart love爱',
  '恨': 'A cute children book illustration of the Chinese character 恨 (hate), resentment anger hostility bitter恨 hate',
  '想': 'A cute children book illustration of the Chinese character 想 (think), pondering considering remembering想 think',
  '忘': 'A cute children book illustration of the Chinese character 忘 (forget), forgetting memory fading忘 forget',
  '念': 'A cute children book illustration of the Chinese character 念 (miss), cherishing thinking heartfelt念 miss',
  '愿': 'A cute children book illustration of the Chinese character 愿 (wish), hoping aspiring desiring dream愿 wish',
  '梦': 'A cute children book illustration of the Chinese character 梦 (dream), sleeping fantasy imagination night梦 dream',
  '醒': 'A cute children book illustration of the Chinese character 醒 (wake), awakening opening eyes morning醒 wake',
  '睡': 'A cute children book illustration of the Chinese character 睡 (sleep), peacefully Zzz bubbles night sleep睡',
  '吃': 'A cute children book illustration of the Chinese character 吃 (eat), delicious meal hungry satisfied eating',
  '喝': 'A cute children book illustration of the Chinese character 喝 (drink), water glass refreshment thirst quenched',
  '跑': 'A cute children book illustration of the Chinese character 跑 (run), sprinting fast speed motion running跑',
  '走': 'A cute children book illustration of the Chinese character 走 (walk), striding moving forward pace walking',
  '站': 'A cute children book illustration of the Chinese character 站 (stand), upright firm stable standing pose',
  '坐': 'A cute children book illustration of the Chinese character 坐 (sit), cross-legged peaceful relaxed sitting',
  '跳': 'A cute children book illustration of the Chinese character 跳 (jump), leaping bouncing spring energy jumping',
  '笑': 'A cute children book illustration of the Chinese character 笑 (laugh), giggling joyous happy amused laughing',
  '哭': 'A cute children book illustration of the Chinese character 哭 (cry), weeping tears sad unhappy grieving',
  '唱': 'A cute children book illustration of the Chinese character 唱 (sing), melody notes voice happy tune singing',
  '叫': 'A cute children book illustration of the Chinese character 叫 (call), shouting yelling loud calling out叫 call',
  '看': 'A cute children book illustration of the Chinese character 看 (look), hand shading eyes looking far seeing看',
  '听': 'A cute children book illustration of the Chinese character 听 (hear), listening attentively ear focused hearing',
  '说': 'A cute children book illustration of the Chinese character 说 (tell), speaking speech bubbles communication说 tell',
  '做': 'A cute children book illustration of the Chinese character 做 (do), doing action helping making doing做',
  '买': 'A cute children book illustration of the Chinese character 买 (buy), purchasing shopping acquiring buying买',
  '卖': 'A cute children book illustration of the Chinese character 卖 (sell), vending trading marketing selling卖',
  '买': 'A cute children book illustration of the Chinese character 买 (buy), purchasing shopping acquiring buying买',
  '卖': 'A cute children book illustration of the Chinese character 卖 (sell), vending trading marketing selling卖',
  '来': 'A cute children book illustration of the Chinese character 来 (come), approaching here now coming来 come',
  '去': 'A cute children book illustration of the Chinese character 去 (go), leaving departing heading away going去 go',
  '回': 'A cute children book illustration of the Chinese character 回 (return), going back coming home again回 return',
  '过': 'A cute children book illustration of the Chinese character 过 (pass), crossing going beyond completed passing',
  '到': 'A cute children book illustration of the Chinese character 到 (arrive), reaching destination arrived到达 arrive',
  '入': 'A cute children book illustration of the Chinese character 入 (enter), going inside incoming arrival entering',
  '出': 'A cute children book illustration of the Chinese character 出 (exit), leaving coming out departure exiting',
  '开': 'A cute children book illustration of the Chinese character 开 (open), beginning starting initiating opening開',
  '关': 'A cute children book illustration of the Chinese character 关 (close), shutting ending terminating closing關',
  '放': 'A cute children book illustration of the Chinese character 放 (release), letting go placing setting freeing放 release',
  '收': 'A cute children book illustration of the Chinese character 收 (collect), gathering receiving accepting collecting收 collect',
  '起': 'A cute children book illustration of the Chinese character 起 (rise), getting up starting beginning rising起 rise',
  '止': 'A cute children book illustration of the Chinese character 止 (stop), ceasing halting ending pause stopping止 stop',
  '发': 'A cute children book illustration of the Chinese character 发 (send), emitting launching developing sending发 send',
  '现': 'A cute children book illustration of the Chinese character 现 (appear), showing present current visible appearing现 appear',
  '隐': 'A cute children book illustration of the Chinese character 隐 (hide), concealed invisible hidden secret隐 hide',
  '显': 'A cute children book illustration of the Chinese character 显 (obvious), apparent clear evident visible显 obvious',
  '藏': 'A cute children book illustration of the Chinese character 藏 (store), hiding storing concealing keeping藏 store',
  '露': 'A cute children book illustration of the Chinese character 露 (dew)',
};

async function generateImage(char, prompt) {
  const res = await fetch(`${AGNES_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AGNES_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'flux-realism:free',
      prompt: prompt,
      size: '1024x1024',
      n: 1,
    }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  
  const data = await res.json();
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }
  if (data.data?.[0]?.url) {
    const imgRes = await fetch(data.data[0].url);
    const buf = await imgRes.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
  }
  throw new Error('No image data in response');
}

async function main() {
  if (!AGNES_API_KEY) {
    console.error('❌ AGNES_API_KEY not set');
    process.exit(1);
  }
  
  // Get list of chars needing generation
  const existingFiles = existsSync(OUTPUT_DIR) ? readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')) : [];
  const existingChars = new Set(existingFiles.map(f => f.replace('.png', '')));
  
  // Filter chars that need generation
  const toGenerate = Object.entries(PROMPTS)
    .filter(([char]) => !existingChars.has(char))
    .slice(0, 50); // Limit to 50 per run
  
  console.log(`🎨 Generating ${toGenerate.length} character images...`);
  
  const CONCURRENCY = 3;
  let done = 0;
  let failed = 0;
  
  for (let i = 0; i < toGenerate.length; i += CONCURRENCY) {
    const batch = toGenerate.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ([char, prompt]) => {
      try {
        console.log(`Generating ${char}...`);
        const dataUrl = await generateImage(char, prompt);
        const base64 = dataUrl.split(',')[1];
        const buf = Buffer.from(base64, 'base64');
        writeFileSync(resolve(OUTPUT_DIR, `${char}.png`), buf);
        done++;
        console.log(`  ✓ ${char} (${buf.length} bytes)`);
      } catch (e) {
        failed++;
        console.error(`  ✗ ${char}: ${e.message}`);
      }
    }));
    
    const progress = Math.round((i + batch.length) / toGenerate.length * 100);
    process.stderr.write(`\rProgress: ${progress}% (${i + batch.length}/${toGenerate.length})`);
  }
  
  console.log(`\n✅ Batch complete! Success: ${done}, Failed: ${failed}`);
}

main().catch(e => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
