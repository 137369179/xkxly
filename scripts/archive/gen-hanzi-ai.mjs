#!/usr/bin/env node
/**
 * Generate high-quality AI images for Chinese characters via local server
 */
import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const API_URL = 'http://localhost:8787/api/hanzi/image-gen';

// Character prompt mappings
const PROMPTS = {
  '一': 'single golden rice grain',
  '二': 'two red apples side by side',
  '三': 'three fluffy white clouds',
  '四': 'four colorful butterflies',
  '五': 'five bright golden stars',
  '六': 'six playful puppies',
  '七': 'seven rainbow colors',
  '八': 'two symmetrical peach halves',
  '九': 'nine golden treasure coins',
  '十': 'ten tiny seedlings growing',
  '不': 'shake head saying no',
  '与': 'hand giving something',
  '东': 'sun rising in east',
  '两': 'two equal halves balanced',
  '为': 'doing action helping',
  '之': 'walking path journey',
  '九': 'nine curved lucky number',
  '乡': 'hometown village scene',
  '书': 'open book knowledge reading',
  '乱': 'tangled mess confusion',
  '事': 'matters affairs business',
  '万': 'ten thousand many countless',
  '上': 'arrow pointing up above',
  '下': 'arrow pointing down below',
  '中': 'center target bullseye',
  '天': 'blue sky heaven above',
  '地': 'green earth ground below',
  '日': 'cute smiling sun with rays',
  '月': 'crescent moon gentle smile',
  '山': 'three green mountains snow caps',
  '水': 'flowing blue water sparkles',
  '火': 'warm friendly orange flames',
  '木': 'happy tree with green leaves',
  '人': 'simple happy person standing',
  '口': 'friendly open mouth hello',
  '手': 'open hand with fingers spread',
  '足': 'happy foot walking forward',
  '大': 'big person arms wide open',
  '小': 'tiny cute child looking up',
  '明': 'sun and moon together bright',
  '休': 'person resting under tree',
  '看': 'hand shading eyes looking far',
  '采': 'hand picking fruit from tree',
  '林': 'two friendly trees forest',
  '森': 'three trees little forest',
  '雨': 'raindrops from fluffy cloud',
  '云': 'fluffy white cloud kawaii face',
  '雪': 'soft white snowflakes winter',
  '风': 'gentle wind blowing leaves',
  '飞': 'bird flying through sky clouds',
  '鸟': 'small cheerful bird singing',
  '虫': 'tiny friendly caterpillar leaf',
  '鱼': 'cute orange goldfish swimming',
  '羊': 'fluffy white sheep meadow',
  '牛': 'cute spotted cow barn yard',
  '马': 'galloping horse flowing mane',
  '虎': 'friendly striped tiger cub',
  '龙': 'cute Chinese dragon clouds',
  '龟': 'slow turtle garden pond',
  '兔': 'white bunny long ears carrot',
  '猫': 'playful kitten ball yarn',
  '狗': 'friendly puppy wagging tail',
  '门': 'open wooden door garden',
  '石': 'smooth gray rock moss nature',
  '田': 'green rice field squares',
  '米': 'white rice grains basket',
  '竹': 'green bamboo stalks leaves',
  '衣': 'colorful clothes hanging line',
  '皿': 'ceramic bowl food table',
  '花': 'beautiful colorful flower petals',
  '草': 'green grass blades morning dew',
  '树': 'tall green tree brown trunk',
  '桥': 'wooden bridge crossing river',
  '楼': 'tall building many windows',
  '家': 'cozy happy home family warm',
  '国': 'country flag territory homeland',
  '城': 'city buildings streets bustling',
  '村': 'village cottage peaceful rural',
  '园': 'garden park green flowers trees',
  '街': 'street road urban walkable',
  '路': 'path road journey travel',
  '车': 'car vehicle wheel transportation',
  '船': 'boat ship sailing water voyage',
  '舟': 'small boat floating water',
  '马': 'horse animal riding gallop swift',
  '骑': 'riding horse equestrian sport',
  '舞': 'dancing joyful movement music',
  '歌': 'singing musical notes celebration',
  '读': 'reading book knowledge learning',
  '写': 'writing pen paper creation',
  '说': 'speaking speech bubbles communication',
  '话': 'words conversation friendly talk',
  '问': 'asking question curious inquiry',
  '答': 'answering question solution found',
  '听': 'listening attentively ear focused',
  '见': 'seeing with eyes clear vision',
  '知': 'knowing lightbulb idea understanding',
  '识': 'recognizing familiar friend known',
  '好': 'good thumbs up happy approval',
  '坏': 'bad thumbs down disapprove negative',
  '美': 'beautiful pretty gorgeous lovely',
  '丑': 'ugly funny mismatched cartoon',
  '长': 'long ruler stretched distance',
  '短': 'short stubby brief condensed',
  '高': 'tall skyscraper mountain reaching',
  '低': 'low ground level underground',
  '多': 'many objects piles abundance crowd',
  '少': 'few items scarce limited small',
  '老': 'old wise elder gray hair wisdom',
  '新': 'new shiny bright fresh clean',
  '旧': 'old vintage antique worn used',
  '正': 'correct straight proper right answer',
  '反': 'opposite reversed wrong contrary',
  '善': 'kind good virtuous helping others',
  '恶': 'evil mean bad wicked villainous',
  '真': 'true real genuine authentic honest',
  '假': 'false fake pretend mock not real',
  '对': 'right correct proper accurate yes',
  '错': 'wrong incorrect mistake error no',
  '是': 'yes affirmative agreement correct',
  '非': 'no negation wrong incorrect deny',
  '有': 'having possession existing there is',
  '无': 'nothing empty void lack absence',
  '生': 'life birth growing alive creating',
  '死': 'death ending passing goodbye final',
  '存': 'existing staying remaining preserved',
  '亡': 'lost gone disappeared vanished end',
  '动': 'moving active kinetic energy motion',
  '静': 'still quiet calm peaceful serene rest',
  '干': 'dry arid thirsty without water drought',
  '湿': 'wet damp soaked moist humid water',
  '冷': 'cold freezing icy bitter winter chill',
  '热': 'hot warm fiery burning summer heat',
  '寒': 'chilly cold winter frost freezing',
  '暖': 'warm cozy comfortable pleasant temperature',
  '凉': 'cool refreshing mild pleasant breeze',
  '温': 'mild temperate comfortable moderate',
  '能': 'able capable skilled talented competent',
  '力': 'power strength force energy muscle',
  '智': 'smart intelligent clever wise brainy',
  '愚': 'foolish silly dumb naive ignorant',
  '贤': 'virtuous worthy noble honorable respected',
  '才': 'talent gifted skilled ability potential',
  '德': 'moral virtue ethics character goodness',
  '仁': 'benevolent kind loving compassionate human',
  '义': 'justice righteous fair honorable duty',
  '礼': 'etiquette polite respectful manners proper',
  '信': 'trustworthy honest faithful reliable true',
  '忠': 'loyal faithful dedicated committed devoted',
  '孝': 'filial respect parents family tradition',
  '悌': 'brotherly love sibling harmony respect',
  '廉': 'honest incorruptible clean integrity pure',
  '耻': 'ashamed embarrassed guilty regretful sorry',
  '勇': 'brave courageous daring heroic bold',
  '怯': 'scared timid fearful shy cowardly',
  '刚': 'strong firm hard tough rigid steel',
  '柔': 'soft gentle flexible tender mild silk',
  '强': 'powerful mighty strong force dominant',
  '弱': 'weak fragile frail delicate powerless',
  '富': 'rich wealthy abundant prosperous blessed',
  '穷': 'poor needy lacking poverty',
  '贵': 'noble expensive precious valuable rare',
  '贱': 'cheap worthless low base common',
  '乐': 'happy joyful smiling laughter fun',
  '苦': 'bitter harsh unpleasant painful sad',
  '忧': 'worried anxious concerned troubled',
  '愁': 'sad contemplative melancholy rainy',
  '喜': 'delighted joyful enthusiastic happy',
  '怒': 'angry mad furious outraged upset',
  '惧': 'fearful terrified frightened scared',
  '爱': 'love affection caring warm heart',
  '恨': 'hate resentment anger hostility bitter',
  '想': 'thinking pondering considering remembering',
  '忘': 'forgetting forgetting forgetting memory fading',
  '念': 'missing cherishing thinking heartfelt',
  '恩': 'gratitude thanks appreciation blessing',
  '愿': 'wishing hoping aspiring desiring dream',
  '梦': 'dream sleeping fantasy imagination night',
  '醒': 'waking up awakening opening eyes morning',
  '睡': 'sleeping peacefully Zzz bubbles night rest',
  '饮': 'drinking water refreshment thirst quenched',
  '食': 'eating delicious meal hungry satisfied',
  '唱': 'singing melody notes voice happy tune',
  '叫': 'calling shouting yelling loud voice',
  '呼': 'breathing calling out exhale inhale',
  '吸': 'inhaling breathing drawing in air',
  '吹': 'blowing wind breath exhale air moving',
  '笑': 'laughing giggling joyous happy amused',
  '哭': 'crying weeping tears sad unhappy grief',
  '喊': 'shouting yelling loud calling out',
  '呼': 'calling breathing exhaling inviting',
  '跳': 'jumping leaping bouncing spring energy',
  '跑': 'running sprinting fast speed motion',
  '走': 'walking striding moving forward pace',
  '站': 'standing upright firm stable pose',
  '坐': 'sitting cross-legged peaceful relaxed',
  '卧': 'lying down resting reclining horizontal',
  '立': 'standing straight confident posture',
  '行': 'walking traveling moving going journey',
  '到': 'arriving reaching destination arrived',
  '去': 'going leaving departing heading away',
  '来': 'coming arriving approaching here now',
  '回': 'returning going back coming home again',
  '过': 'passing crossing going beyond completed',
  '入': 'entering going inside incoming arrival',
  '出': 'exiting leaving coming out departure',
  '进': 'advancing entering progressing inward',
  '退': 'retreating backing withdrawing retreating',
  '升': 'rising ascending elevating upward climb',
  '降': 'descending lowering dropping falling down',
  '开': 'opening beginning starting initiating',
  '关': 'closing shutting ending terminating',
  '放': 'releasing letting go placing setting free',
  '收': 'collecting gathering receiving accepting',
  '起': 'starting rising getting up beginning',
  '止': 'stopping ceasing halting ending pause',
  '发': 'sending emitting launching developing',
  '现': 'appearing showing present current visible',
  '隐': 'hiding concealed invisible hidden secret',
  '显': 'obvious apparent clear evident visible',
  '藏': 'hiding storing concealing keeping secret',
  '露': 'revealing exposing appearing dew forming',
  '现': 'appearing emerging becoming visible now',
  '生': 'born living growing living being alive',
  '灭': 'extinguished destroyed vanished ended',
  '成': 'completed accomplished succeeded formed',
  '败': 'defeated failed lost defeated broken',
  '胜': 'victorious winning triumphant prevailing',
  '负': 'losing bearing carrying carrying debt',
  '得': 'gaining obtaining getting receiving got',
  '失': 'losing missing failing misplaced dropped',
  '获': 'capturing catching gaining winning obtained',
  '取': 'taking grabbing fetching obtaining getting',
  '给': 'giving providing supplying offering giving',
  '送': 'delivering giving presenting sending gift',
  '买': 'buying purchasing shopping acquiring paying',
  '卖': 'selling vending trading marketing offering',
  '交易': 'trading exchanging swapping dealing commerce',
  '财': 'wealth money riches fortune prosperity',
  '贫': 'poor lacking needy deprived impoverished',
  '富': 'wealthy rich prosperous affluent plentiful',
  '贵': 'expensive precious valued honored noble',
  '贱': 'cheap worthless humble low common base',
  '宝': 'treasure jewel precious valuable cherished',
  '藏': 'hidden stored concealed treasured guarded',
  '藏': 'store hide conceal preserve guard secret',
  '藏': 'conceal hide store preserve guard secretly',
  '珍': 'precious valuable rare treasured gem',
  '珠': 'pearl gem precious valuable shiny bright',
  '玉': 'jade precious stone valuable beautiful green',
  '金': 'gold metal precious yellow wealthy rich',
  '银': 'silver metal white gray precious metallic',
  '铜': 'copper metal reddish brown conductor wire',
  '铁': 'iron metal gray strong magnetic hard steel',
  '钢': 'steel alloy strong durable metallic hard',
  '镜': 'mirror reflecting glass surface shining clear',
  '铃': 'bell ringing sound metal chime清脆清脆',
  '钟': 'clock bell timekeeping ringing loud deep',
  '鼓': 'drum percussion beating rhythm sound loud',
  '锣': 'gong metallic percussion beaten ringing deep',
  '琴': 'zither string instrument music playing elegant',
  '棋': 'chess board game strategy playing thoughtful',
  '画': 'painting picture artwork drawing beautiful image',
  '诗': 'poem verse lyrical beautiful words art',
  '词': 'lyrics words poem verbal expression artistic',
  '书': 'book reading knowledge written pages learning',
  '文': 'culture writing language literature arts beauty',
  '字': 'character letter word symbol writing tool',
  '笔': 'pen pencil brush writing instrument tool',
  '墨': 'ink black pigment writing painting creative',
  '纸': 'paper sheet material writing recording creative',
  '砚': 'inkstone grinding block ink preparing artistic',
  '卷': 'scroll roll volume book chapter literary',
  '册': 'volume booklet folder bound literary record',
  '典': 'classic standard reference authoritative text',
  '籍': 'record register document archives literary',
  '符': 'tally token symbol emblem mark identifying',
  '号': 'number signal call name identifier marking',
  '铭': 'inscription engrave carve铭记刻 etching permanent',
  '碑': 'monument stele stone tablet inscription historical',
  '帖': 'model copy calligraphy practice sheet artistic',
  '简': 'simple concise bamboo slip brief minimal',
  '牍': 'tablet board writing surface record documenting',
  '札': 'note letter memorandum brief message written',
  '翰': 'feather writing brush literary talent expressed',
  '毫': 'brush tip hair fine delicate point precise',
  '管': 'tube pipe reed brush holder containing writing',
};

function getPrompt(char) {
  return PROMPTS[char] || `cute educational illustration of Chinese character ${char}, children book style, pastel colors, simple cartoon`;
}

async function generateImage(char) {
  const prompt = getPrompt(char);
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ char, prompt }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  
  const data = await res.json();
  if (!data.ok || !data.dataUrl) {
    throw new Error(data?.error?.message || 'No dataUrl in response');
  }
  
  return data.dataUrl;
}

async function main() {
  // Read chars from hanzi.ts
  const tsContent = await import('node:fs').then(fs => 
    fs.readFileSync(resolve(ROOT, 'src/data/hanzi.ts'), 'utf8')
  );
  
  const charMatches = tsContent.matchAll(/\{ c: '(.+?)', p: '([^']+)', pd: '([^']+)'[^}]+\}/g);
  const charsToGenerate = [];
  for (const m of charMatches) {
    charsToGenerate.push(m[1]);
  }
  
  console.log(`🎨 Generating ${charsToGenerate.length} character images...`);
  
  const CONCURRENCY = 5;
  let done = 0;
  let failed = 0;
  
  for (let i = 0; i < charsToGenerate.length; i += CONCURRENCY) {
    const batch = charsToGenerate.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (char) => {
      try {
        const outputPath = resolve(OUTPUT_DIR, `${char}.png`);
        // Check existing quality
        if (existsSync(outputPath)) {
          const stat = statSync(outputPath);
          if (stat.size > 10000) {
            done++;
            return;
          }
        }
        
        console.log(`Generating ${char}...`);
        const dataUrl = await generateImage(char);
        const base64 = dataUrl.split(',')[1];
        const buf = Buffer.from(base64, 'base64');
        writeFileSync(outputPath, buf);
        done++;
        console.log(`  ✓ ${char} (${buf.length} bytes)`);
      } catch (e) {
        failed++;
        console.error(`  ✗ ${char}: ${e.message}`);
      }
    }));
    
    const progress = Math.round((i + batch.length) / charsToGenerate.length * 100);
    process.stderr.write(`\rProgress: ${progress}% (${i + batch.length}/${charsToGenerate.length})`);
  }
  
  console.log(`\n\n✅ Done! Success: ${done}, Failed: ${failed}`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(e => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
