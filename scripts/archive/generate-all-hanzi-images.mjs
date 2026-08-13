#!/usr/bin/env node
/**
 * Generate ALL remaining Chinese character images using Agnes AIGC
 * This script runs in background and generates images for all characters
 */
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'public', 'hanzi-imgs');
const AGNES_API_KEY = process.env.AGNES_API_KEY || '';
const AGNES_BASE_URL = 'https://api.agnes-ai.cn/v1';

// Load existing generated images
const existingFiles = existsSync(OUTPUT_DIR) ? readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')) : [];
const existingChars = new Set(existingFiles.map(f => f.replace('.png', '')));

// Character descriptions for image generation
const CHAR_DESCRIPTIONS = {
  // Basic numbers and directions
  '一': 'A single golden rice grain on soft beige background, simple cartoon style',
  '二': 'Two red apples side by side on green grass, simple cartoon style',
  '三': 'Three fluffy white clouds in blue sky, cute cartoon style',
  '四': 'Four colorful butterflies flying in garden, kawaii style',
  '五': 'Five bright golden stars shining in night sky',
  '六': 'Six playful puppies sitting in circle, cute cartoon',
  '七': 'Seven rainbow colors arched across sky, vibrant illustration',
  '八': 'Two symmetrical peach halves showing seeds, pastel colors',
  '九': 'Nine golden coins arranged in circle, treasure theme',
  '十': 'Ten tiny seedlings growing in row, spring garden scene',
  
  // Nature elements
  '日': 'A cute smiling sun with warm orange rays, friendly face',
  '月': 'A crescent moon with gentle smile, soft golden glow, stars around',
  '山': 'Three cute green mountains with snow caps, valley between',
  '水': 'Flowing clear blue water with sparkles, gentle waves',
  '火': 'Warm friendly fire with orange and yellow flames, cozy feeling',
  '雨': 'Raindrops falling from fluffy gray cloud, colorful umbrellas below',
  '云': 'Fluffy white cloud with cute face, blue sky background, kawaii',
  '雪': 'Soft white snowflakes falling, winter scene with little snowman',
  '风': 'Gentle wind blowing leaves and grass, invisible breeze illustrated',
  '星': 'Twinkling bright star with sparkle rays, dark blue night sky',
  '天': 'Blue sky with white clouds and flying birds, open peaceful scene',
  '地': 'Green earth with flowers and grass, warm brown soil visible',
  '花': 'Beautiful colorful flower with petals and happy face, garden scene',
  '草': 'Green grass blades with tiny flowers, fresh morning dew drops',
  '树': 'Tall green tree with round canopy and brown trunk, bird on branch',
  '木': 'Simple tree showing roots and branches, educational diagram style',
  '林': 'Two friendly trees standing together, forest friends cartoon',
  '森': 'Three trees forming a little forest, cute woodland scene',
  '竹': 'Green bamboo stalks with leaves, gentle wind blowing',
  '石': 'Smooth gray rock with moss, nature scene cartoon style',
  '田': 'Green rice field divided into squares, farmer in distance',
  '米': 'White rice grains spilled from basket, cozy kitchen scene',
  
  // Animals
  '鱼': 'Cute orange goldfish with big eyes, swimming in blue water',
  '鸟': 'Small cheerful bird with wings spread, singing on branch',
  '虫': 'Tiny friendly caterpillar on green leaf, dotted body segments',
  '羊': 'Fluffy white sheep with smile, green meadow background',
  '牛': 'Cute cow with spotted pattern, barn in background',
  '马': 'Galloping horse with flowing mane, open field setting',
  '虎': 'Friendly striped tiger cub, jungle background cartoon',
  '龙': 'Cute Chinese dragon with scales, clouds and mountains',
  '龟': 'Slow turtle with shell pattern, garden pond scene',
  '兔': 'White bunny with long ears, carrot nearby, cute style',
  '猫': 'Playful kitten with whiskers, ball of yarn nearby',
  '狗': 'Friendly puppy wagging tail, bone nearby, cartoon style',
  
  // People and body parts
  '人': 'Simple happy person standing, round head and smile, cute cartoon',
  '口': 'Friendly open mouth saying hello, simple illustration',
  '手': 'Open hand with fingers spread, skin tone, friendly gesture',
  '足': 'Happy foot with toes, walking pose, cartoon style',
  '大': 'Big confident person with arms wide open, proud stance',
  '小': 'Tiny cute child looking up, small and precious',
  '上': 'Arrow pointing upward with happy person climbing stairs',
  '下': 'Arrow pointing downward with person sliding down',
  '中': 'Target with bullseye, person standing at center winning',
  '目': 'Big eye seeing clearly focused, cartoon style',
  '耳': 'Ear listening attentively sound waves, cartoon style',
  
  // Actions and concepts
  '明': 'Sun and moon together creating brightness, warm golden silver',
  '休': 'Person resting under tree shade, relaxed happy moment',
  '看': 'Hand shading eyes looking far away, curious expression',
  '采': 'Hand picking fruit from tree, harvest time',
  '飞': 'Bird or person flying through sky clouds',
  '笑': 'Happy laughing face with tears of joy',
  '哭': 'Crying face with teardrops comfort needed',
  '跑': 'Person running fast with speed lines',
  '走': 'Person walking briskly with motion lines',
  '坐': 'Person sitting cross-legged peacefully',
  '立': 'Person standing straight proud confident posture',
  '读': 'Child reading book with interest knowledge learning',
  '写': 'Writing with pen paper creation artistic',
  '说': 'Speaking with speech bubbles communication friendly',
  '听': 'Listening attentively ear focused sound waves',
  '问': 'Asking question curious inquiry need help',
  '答': 'Answering question correct solution found lightbulb',
  
  // Places and objects
  '家': 'Cozy happy home family warmth safe shelter',
  '国': 'Country nation flag territory homeland proud',
  '城': 'City town buildings streets bustling urban',
  '村': 'Village country cottage peaceful rural quiet',
  '园': 'Garden park green nature flowers trees playground',
  '门': 'Open wooden door showing garden beyond welcoming',
  '户': 'Single wooden door half-open cozy home entrance',
  '车': 'Car vehicle wheel transportation travel friendly',
  '船': 'Boat ship sailing water voyage adventure',
  '书': 'Open book knowledge pictures reading learning happy',
  '画': 'Colorful painting on easel art class creative',
  '衣': 'Colorful clothes hanging on line sunny day',
  '帽': 'Nice hat head covering brim sun protection',
  '鞋': 'Shoe boot footwear protection walking comfortable',
  
  // Quality and emotions
  '好': 'Good thumbs up happy approval positive smile',
  '美': 'Beautiful pretty gorgeous lovely wonderful scene',
  '长': 'Long ruler measurement stretched distance far',
  '短': 'Short stubby brief condensed little small',
  '高': 'Tall skyscraper mountain reaching high up',
  '低': 'Low ground level underground basement small',
  '多': 'Many objects piles abundance crowd lots plenty',
  '少': 'Few items scarce limited small amount little',
  '老': 'Old wise elder gray hair wisdom experienced',
  '新': 'New shiny bright fresh start clean beginning',
  '真': 'True real genuine authentic honest trustworthy',
  '善': 'Kind good virtuous helping others caring',
  '爱': 'Love hearts everywhere warm feeling affection',
  '勇': 'Brave courageous daring heroic bold strong',
  '智': 'Smart intelligent clever wise brainy thinking',
  
  // Time and weather
  '春': 'Spring season renewal growth green warm flowers',
  '夏': 'Summer season hot bright green lush sunny',
  '秋': 'Autumn fall season harvest golden crisp leaves',
  '冬': 'Winter season cold snow white still peaceful',
  '早': 'Early morning sunrise dawn beginning fresh',
  '晚': 'Evening sunset orange pink sky calm quiet',
  '晴': 'Clear sunny bright weather day beautiful blue',
  '阴': 'Overcast cloudy gray dull weather muted',
  
  // Numbers and measures
  '百': 'Hundred many lots plenty quantity number',
  '千': 'Thousand many countless vast number large',
  '万': 'Ten thousand many countless huge number',
  '年': 'Year annual cycle time passing grows older',
  '岁': 'Age year annual festival growing time passes',
  '时': 'Time clock moment period duration passing',
  '分': 'Minute segment piece dividing portion part',
  '秒': 'Second brief moment instant quick fleeting',
  
  // Family and people
  '爸': 'Father dad parent male caregiver loving',
  '妈': 'Mother mom parent female caregiver caring',
  '爷': 'Grandpa elderly male elder wise respected',
  '奶': 'Grandma elderly female elder loving kind',
  '哥': 'Brother older male sibling protective friendly',
  '姐': 'Sister older female sibling caring helpful',
  '弟': 'Brother younger male sibling playful friendly',
  '妹': 'Sister younger female sibling cute sweet',
  '儿': 'Son child young male offspring beloved',
  '女': 'Daughter girl young female child loved',
  
  // Colors
  '红': 'Red bright color rosy cheerful warm vibrant',
  '黄': 'Yellow bright sunny golden cheerful warm',
  '蓝': 'Blue sky ocean calm cool peaceful serene',
  '绿': 'Green grass nature fresh vibrant alive',
  '白': 'White pure clean bright pure snow pristine',
  '黑': 'Black dark mysterious night elegant bold',
  '紫': 'Purple royal elegant mystical beautiful fancy',
  '橙': 'Orange warm sunny citrus cheerful bright',
  
  // Food
  '饭': 'Cooked rice meal food warm dish satisfied',
  '菜': 'Vegetable greens healthy food plant fresh',
  '果': 'Fruit sweet juicy healthy snack delicious',
  '茶': 'Tea cup hot drink relaxing traditional ceremony',
  '酒': 'Wine cup toast celebration gathering happy',
  '糖': 'Sugar sweet candy treat dessert yummy',
  
  // Body and senses
  '头': 'Head top body part thinking idea brain',
  '心': 'Heart red love symbol beating emotional center',
  '身': 'Body whole person healthy active moving',
  '眼': 'Eye seeing vision perception looking watching',
  '鼻': 'Nose smelling breathing sense odor detecting',
  '嘴': 'Mouth eating speaking tasting talking opening',
  '牙': 'Tooth white clean chewing biting dental health',
  '舌': 'Taste tongue speaking flavor sensing taste',
  '发': 'Hair head covering style grooming beauty',
  '脸': 'Face facial expression emotion seeing appearance',
  
  // Abstract concepts
  '光': 'Light brightness shine glowing radiating',
  '影': 'Shadow darkness silhouette shade hidden',
  '声': 'Sound voice noise hearing listening audio',
  '音': 'Music tone melody sound harmonic musical',
  '色': 'Color hue tint shade pigment vibrant visual',
  '香': 'Fragrance smell aroma scent perfume nice',
  '味': 'Taste flavor savor relish flavor culinary',
  '气': 'Air atmosphere breath energy vital life force',
  '电': 'Electricity lightning bolt energy power spark',
  '雷': 'Thunder boom sound lightning crash powerful',
  
  // Tools and instruments
  '笔': 'Pen pencil brush writing instrument tool',
  '墨': 'Ink black pigment writing painting creative',
  '纸': 'Paper sheet material writing recording creative',
  '砚': 'Inkstone grinding block ink preparing artistic',
  '铃': 'Bell ringing sound metal chime清脆清脆',
  '钟': 'Clock timekeeping ringing loud mechanical',
  '鼓': 'Drum percussion beating rhythm sound musical',
  '琴': 'Zither string instrument music playing elegant',
  
  // Measurement and direction
  '东': 'East sunrise direction温暖 warm golden',
  '西': 'West sunset direction orange pink sky',
  '南': 'South warm direction palm trees tropical',
  '北': 'North cold direction winter winds icy',
  '左': 'Left side direction pointing western',
  '右': 'Right side direction pointing eastern',
  '前': 'Front forward direction ahead leading',
  '后': 'Back behind direction following trailing',
  '内': 'Inside interior within contained within',
  '外': 'Outside exterior external beyond without',
  
  // State and condition
  '开': 'Open starting beginning initiating opening',
  '关': 'Close shutting ending terminating closing',
  '出': 'Exit leaving coming out departure going',
  '入': 'Enter going inside incoming arrival entering',
  '来': 'Coming arriving approaching here now movement',
  '去': 'Going leaving departing heading away movement',
  '回': 'Returning going back coming home again movement',
  '过': 'Passing crossing going beyond completed movement',
  
  // Possession and action
  '有': 'Having possession existing there is possession',
  '无': 'Nothing empty void lack absence negation',
  '是': 'Yes affirmative agreement correct affirmation',
  '非': 'No negation wrong incorrect denial rejection',
  '得': 'Gain obtaining getting receiving achievement',
  '失': 'Lose missing failing misplaced losing failure',
  '买': 'Buy purchasing shopping acquiring owning transaction',
  '卖': 'Sell vending trading marketing offering selling',
  
  // More nature and environment
  '江': 'River flowing water wide long waterway natural',
  '河': 'River flowing water stream waterway natural',
  '海': 'Ocean sea vast blue water waves coastal',
  '湖': 'Lake still water reflection calm natural',
  '池': 'Pond small water feature reflection garden',
  '溪': 'Stream small flowing water babbling natural',
  '沙': 'Sand grains beach desert granular golden',
  '岸': 'Shore bank edge water land boundary coastal',
  
  // More animals
  '鸡': 'Rooster chicken farmyard crowing morning bird',
  '鸭': 'Duck waterfowl quacking swimming pond bird',
  '鹅': 'Goose white waterfowl honking long neck bird',
  '猪': 'Pig pink farmyard oinking mud-loving animal',
  '鼠': 'Mouse tiny rodent cheese loving small creature',
  '蛇': 'Snake slithering reptile scales tropical creature',
  '蛙': 'Frog green amphibian hopping pond creature',
  '鲤': 'Koi fish colorful ornamental pond creature',
  '蝶': 'Butterfly colorful wings flying garden insect',
  '蝉': 'Cicada summer insect buzzing tree creature',
  
  // More actions
  '唱': 'Singing melody notes voice happy musical',
  '舞': 'Dancing joyful movement music rhythmic graceful',
  '跳': 'Jumping leaping bouncing spring energetic motion',
  '游': 'Swimming water movement splashing aquatic sport',
  '登': 'Climbing ascending ascending rising upward motion',
  '攀': 'Climbing grasping ascending scaling vertical motion',
  '滑': 'Sliding gliding smooth motion ice water surface',
  '滚': 'Rolling turning circular motion spinning round',
  '转': 'Turning rotating spinning circular motion changing',
  
  // More qualities
  '快': 'Fast quick rapid speedy swift motion',
  '慢': 'Slow leisurely gradual unhurried relaxed pace',
  '轻': 'Light lightweight delicate gentle soft feel',
  '重': 'Heavy weight substantial dense solid feel',
  '硬': 'Hard firm rigid stiff solid unyielding feel',
  '软': 'Soft tender flexible mild yielding comfortable',
  '尖': 'Sharp pointed acute keen keen edge feeling',
  '钝': 'Dull blunt flat unsharpened not cutting',
  '滑': 'Smooth slippery slick polished easy glide',
  '糙': 'Rough coarse textured uneven gritty feeling',
  
  // More abstract
  '空': 'Empty void space hollow open airless absence',
  '满': 'Full complete filled entire saturated overflowing',
  '圆': 'Round circle sphere globe curved complete shape',
  '方': 'Square box rectangle corner geometric shape',
  '尖': 'Pointed sharp tip apex peaked narrow end',
  '平': 'Flat even level smooth horizontal balanced',
  '曲': 'Curved bent winding flexible arched shape',
  '直': 'Straight direct linear upright rigid aligned',
  
  // More daily life
  '床': 'Bed sleeping rest comfortable nighttime furniture',
  '桌': 'Table desk surface working eating furniture',
  '椅': 'Chair seating sitting furniture comfortable',
  '灯': 'Light lamp bulb illumination bright nighttime',
  '镜': 'Mirror reflecting glass surface shiny bathroom',
  '碗': 'Bowl vessel container food eating kitchen',
  '筷': 'Chopsticks eating utensil Asian dining tool',
  '勺': 'Spoon utensil eating stirring liquid tool',
  
  // More seasons and time
  '晨': 'Morning dawn early sunrise beginning fresh',
  '晓': 'Daybreak dawn early morning light appearing',
  '暮': 'Dusk evening sunset twilight fading dark',
  '昏': 'Twilight dusk darkening faint disappearing',
  '夜': 'Night darkness evening dark time sleeping',
  '旦': 'Dawn sunrise beginning new day breaking light',
  '昔': 'Past former yesterday antiquity ancient times',
  '今': 'Present now today current this moment',
  
  // More nature elements
  '露': 'Dew drops moisture forming morning grass',
  '霜': 'Frost ice crystals white cold forming winter',
  '冰': 'Ice frozen water cold solid transparent crystal',
  '雾': 'Fog mist vapor thick obscuring visibility',
  '虹': 'Rainbow spectrum colors arc sky after rain',
  '霓': 'Secondary rainbow faint duplicate arc phenomenon',
  '霞': 'Sunset clouds colorful pink orange glow evening',
  '曜': 'Celestial body shining bright luminous radiant',
  '晶': 'Crystal clear transparent shining bright pure',
  
  // More human activities
  '学': 'Learning studying education knowledge growing mind',
  '习': 'Practicing repeating training skill developing habit',
  '教': 'Teaching instructing educating guiding nurturing others',
  '育': 'Nurturing raising educating developing fostering growth',
  '师': 'Teacher instructor mentor guide educating shaping',
  '友': 'Friend companion companion buddy social connection',
  '朋': 'Friend companion peer associate social bond',
  '客': 'Guest visitor welcome host hospitality visiting',
  
  // More qualities and states
  '能': 'Able capable skilled talented competent ability',
  '力': 'Power strength force energy muscle capability',
  '智': 'Smart intelligent clever wise brainy knowledge',
  '愚': 'Foolish silly dumb naive ignorant unintelligent',
  '贤': 'Virtuous worthy noble honorable respected moral',
  '才': 'Talent gifted skilled ability potential creative',
  '德': 'Moral virtue ethics character goodness righteous',
  '仁': 'Benevolent kind loving compassionate human-hearted',
  '义': 'Justice righteous fair honorable duty correct',
  '礼': 'Etiquette polite respectful manners proper civilized',
  '信': 'Trustworthy honest faithful reliable truthful loyal',
  
  // More nature scenes
  '桥': 'Bridge connecting two sides crossing over water',
  '路': 'Path road journey travel destination walking way',
  '街': 'Street road pathway urban walkable city thoroughfare',
  '巷': 'Alley narrow passage lane street compact pathway',
  '庭': 'Courtyard patio garden indoor outdoor enclosed space',
  '院': 'Yard enclosure garden family compound walled space',
  '堂': 'Hall chamber main room grand reception gathering',
  '阁': 'Pavilion tower lookout elegant structure traditional',
  '庵': 'Hermitage hut cottage simple humble dwelling retreat',
  
  // More materials and substances
  '金': 'Gold metal precious yellow wealth valuable rare',
  '银': 'Silver metal white gray precious metallic shiny',
  '铜': 'Copper metal reddish brown conductor wire electrical',
  '铁': 'Iron metal gray strong magnetic hard durable',
  '钢': 'Steel alloy strong durable metallic hardened engineered',
  '玉': 'Jade precious stone valuable beautiful green translucent',
  '宝': 'Treasure jewel precious valuable cherished rare gem',
  '珍': 'Precious valuable rare treasured gem extraordinary',
  '珠': 'Pearl gem precious valuable shiny organic treasure',
  
  // More emotions and thoughts
  '喜': 'Delighted joyful enthusiastic happy celebrating pleasure',
  '忧': 'Worried anxious concerned troubled uneasy disturbed',
  '愁': 'Sad contemplative melancholy worried pensive sorrowful',
  '怒': 'Angry mad furious outraged upset distressed resentful',
  '惧': 'Fearful terrified frightened scared anxious worried',
  '惊': 'Surprised shocked startled amazed astonished excited',
  '恨': 'Hate resentment anger hostility bitter vengeful spiteful',
  '恋': 'Love infatuation romance affection passion devotion',
  '念': 'Missing cherishing thinking heartfelt longing remembrance',
  '恩': 'Gratitude thanks appreciation blessing kindness rewarded',
  
  // More actions and verbs
  '饮': 'Drinking water refreshment thirst quenched swallowing liquid',
  '食': 'Eating consuming food nourishment satisfying hunger meal',
  '叫': 'Calling shouting yelling loud voice demanding attention',
  '呼': 'Breathing calling out exhaling inhaling inviting summoning',
  '吸': 'Inhaling breathing drawing in air intake respiratory',
  '吹': 'Blowing wind breath exhale air moving dispersing',
  '打': 'Hitting striking beating punching pounding impacting',
  '拍': 'Clapping patting tapping slapping rhythmical touching',
  '拉': 'Pulling dragging tugging hauling drawing extending',
  '推': 'Pushing shoving pressing forcing moving away',
  
  // More objects and things
  '网': 'Net network mesh web catching trapping interconnected',
  '绳': 'Rope cord string binding tying securing fastening',
  '线': 'Thread string fiber connecting sewing weaving measuring',
  '针': 'Needle sharp point sewing threading piercing pinpoint',
  '结': 'Knot tie bundle bow fasten join connected secured',
  '带': 'Belt sash strap tie binding wrapping carrying',
  '包': 'Bag packet包裹 container carrying storing holding',
  '箱': 'Box chest container storing carrying protecting enclosed',
  '盒': 'Box case container holding storing packaging enclosed',
  
  // More measurements and quantities
  '寸': 'Inch small unit measurement brief tiny little',
  '尺': 'Foot ruler measurement unit length measuring tool',
  '丈': 'Zhang unit measurement ten feet traditional Chinese',
  '里': 'Li traditional Chinese mile unit measurement distance',
  '亩': 'Mu traditional Chinese acre unit measurement land area',
  '斤': 'Jin traditional Chinese pound unit measurement weight',
  '两': 'Liang traditional Chinese ounce unit measurement weight',
  '钱': 'Qian traditional Chinese candarin unit measurement value',
  
  // More time periods
  '旬': 'Decade ten days period week approximately timeframe',
  '期': 'Period term deadline scheduled future timeframe duration',
  '节': 'Festival joint section node segment commemorative holiday',
  '候': 'Climate season wait outlook condition temporal period',
  
  // More geographic features
  '洲': 'Island continent landmass surrounded water geographic feature',
  '岛': 'Isle island small land surrounded sea geography feature',
  '汀': 'Sandbar shore beach water edge waterfront geography',
  '涯': 'Horizon edge boundary limit distant geography extent',
  '陵': 'Tomb mound hill burial elevation geography feature',
  '阜': 'Mound earth hill rise elevation geography formation',
  '坂': 'Slope hillside incline slant angle geography terrain',
  '坡': 'Bank slope incline hillside ascent geography terrain',
};

async function generateImage(char, description) {
  const prompt = `A cute children book illustration showing the Chinese character "${char}" (${description}). Thick colorful outlines, simple cartoon style perfect for kids aged 3-8, rounded corners, bright pastel colors, white background`;
  
  const res = await fetch(`${AGNES_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AGNES_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'wanx2.1-t2i-turbo',
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
  const toGenerate = Object.entries(CHAR_DESCRIPTIONS)
    .filter(([char]) => !existingChars.has(char))
    .slice(0, 100); // Limit per run
  
  if (toGenerate.length === 0) {
    console.log('✅ All characters already have images!');
    return;
  }
  
  console.log(`🎨 Generating ${toGenerate.length} character images...`);
  
  const CONCURRENCY = 3;
  let done = 0;
  let failed = 0;
  
  for (let i = 0; i < toGenerate.length; i += CONCURRENCY) {
    const batch = toGenerate.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ([char, desc]) => {
      try {
        console.log(`Generating ${char}...`);
        const dataUrl = await generateImage(char, desc);
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
  console.log(`Total images: ${existingChars.size + done}`);
}

main().catch(e => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
