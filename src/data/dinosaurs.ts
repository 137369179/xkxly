/**
 * 🦕 恐龙世界数据（10 种恐龙）
 * ------------------------------------------------------------
 * 涵盖三叠纪、侏罗纪、白垩纪三大时代的代表性恐龙
 * 每条数据含：中英文名、音标、emoji、描述、顺口溜、冷知识、体型数据、AI 讲解 prompt
 */

export interface DinoItem {
  id: string;
  category: 'dino';
  nameZh: string;
  nameEn: string;
  phonics: string;
  emoji: string;
  desc: string;
  chant: string;
  funFact: string;
  /** AI 讲解主题 prompt */
  aiPrompt: string;
  /** AI 讲解本地兜底文案 */
  aiFallback: string;
  /** 生存时代 */
  era: '三叠纪' | '侏罗纪' | '白垩纪';
  /** 饮食分类 */
  diet: '肉食' | '草食' | '杂食';
  /** 体长（米） */
  length: number;
  /** 体重（吨） */
  weight: number;
  /** 身高（米） */
  height: number;
  /** 发现地 */
  discoveredIn: string;
  /** 对比说明 */
  compareNote: string;
}

export const DINOSAURS: DinoItem[] = [
  {
    id: 'trex',
    category: 'dino',
    nameZh: '霸王龙',
    nameEn: 'T-Rex',
    phonics: '/tiː-reks/',
    emoji: '🦖',
    desc: '白垩纪晚期的陆地霸主，牙齿像香蕉一样大！',
    chant: '霸王龙，牙齿尖，走起路来响沉沉！',
    funFact: '霸王龙的前肢虽然小，但是力气比成年人还大哦！',
    aiPrompt: '给宝贝讲霸王龙：它是白垩纪最厉害的肉食恐龙，牙齿像香蕉那么大，咬合力超级强，但是前肢小小的像小手一样。请用拟人化方式让霸王龙自己介绍自己。',
    aiFallback: '你好呀，我是霸王龙！我住在白垩纪晚期，是当时陆地上的大 king！我的牙齿像香蕉一样大，一口能咬断骨头！不过我的小手短短的，够不到脸，你帮我挠挠痒好不好？我体重有 8 吨多，相当于 2 辆大公交车那么重呢！',
    era: '白垩纪',
    diet: '肉食',
    length: 12,
    weight: 8.4,
    height: 4,
    discoveredIn: '北美洲',
    compareNote: '相当于 2 辆公交车长，比一层楼还高！',
  },
  {
    id: 'triceratops',
    category: 'dino',
    nameZh: '三角龙',
    nameEn: 'Triceratops',
    phonics: '/traɪˈserətɒps/',
    emoji: '🦕',
    desc: '头上有三只角的大型草食恐龙，像带了坚固的盾牌！',
    chant: '三角龙，三角尖，大盾牌护安全！',
    funFact: '三角龙的头骨长度可以达到 2.5 米，占了身体的三分之一！',
    aiPrompt: '给宝贝讲三角龙：它头上三只角，脖子上有大盾牌，是草食恐龙里的勇士，连霸王龙都不一定打得过它。用拟人化方式介绍。',
    aiFallback: '你好，我是三角龙！我头上长着三只尖尖的角，脖子上还有一面大盾牌，像戴了头盔的骑士！我最爱吃树叶和草。虽然我是草食恐龙，但霸王龙看到我也要绕路走，因为我的角可锋利了！',
    era: '白垩纪',
    diet: '草食',
    length: 9,
    weight: 6,
    height: 3,
    discoveredIn: '北美洲',
    compareNote: '比一辆大卡车还长，头骨就有 2.5 米！',
  },
  {
    id: 'pterosaur',
    category: 'dino',
    nameZh: '翼龙',
    nameEn: 'Pterosaur',
    phonics: '/ˈterəsɔːr/',
    emoji: '🦅',
    desc: '会飞行的远古爬行动物，展翅翱翔蓝天！',
    chant: '翼龙飞，翅膀长，天空飞翔真威风！',
    funFact: '翼龙其实不是恐龙哦，它是会飞的爬行动物亲戚！',
    aiPrompt: '给宝贝讲翼龙：它是远古时代的天空中之王，翅膀展开有 10 米宽，可以在天上滑翔。注意告诉宝贝翼龙不是恐龙，是恐龙的飞行亲戚。用拟人化方式介绍。',
    aiFallback: '哈喽，我是翼龙！我在侏罗纪和白垩纪的天空中飞翔，翅膀展开有 10 米宽，比两辆汽车还长！悄悄告诉你一个小秘密：我其实不是恐龙，是恐龙的飞行亲戚哦！我最爱吃鱼，从天上俯冲到水面抓鱼吃，可厉害啦！',
    era: '侏罗纪',
    diet: '肉食',
    length: 10,
    weight: 0.25,
    height: 1.5,
    discoveredIn: '世界各地',
    compareNote: '翅膀展开比两辆汽车还长！但体重只有 250 公斤',
  },
  {
    id: 'stegosaurus',
    category: 'dino',
    nameZh: '剑龙',
    nameEn: 'Stegosaurus',
    phonics: '/ˌsteɡəˈsɔːrəs/',
    emoji: '🦎',
    desc: '背上有两排骨质板的大型食草恐龙。',
    chant: '剑龙背，骨板直，尾巴尖刺防敌人！',
    funFact: '剑龙的脑容量非常小，只有核桃那么大！',
    aiPrompt: '给宝贝讲剑龙：背上竖着两排大骨板，尾巴末端有四根尖刺，是草食恐龙的防御高手。脑容量只有核桃那么大。用拟人化方式介绍。',
    aiFallback: '你好呀，我是剑龙！我背上长着两排大大的骨板，像穿了盔甲一样帅！我的尾巴末端有四根尖尖的刺，谁敢欺负我，我就用尾巴甩它！不过嘛，我的脑子只有核桃那么大，不太聪明，但是我很勇敢！',
    era: '侏罗纪',
    diet: '草食',
    length: 9,
    weight: 5,
    height: 3,
    discoveredIn: '北美洲',
    compareNote: '和一辆大卡车一样长，背上骨板有 60 厘米高！',
  },
  {
    id: 'brachiosaurus',
    category: 'dino',
    nameZh: '腕龙',
    nameEn: 'Brachiosaurus',
    phonics: '/ˌbrækiəˈsɔːrəs/',
    emoji: '🦕',
    desc: '超长脖子的巨型草食恐龙，能吃到最高处的树叶！',
    chant: '腕龙高，脖子长，高处树叶随便尝！',
    funFact: '腕龙的心脏每分钟要泵出上百升血液，才能把血送到高高的脑袋！',
    aiPrompt: '给宝贝讲腕龙：它是最高的恐龙之一，脖子像长颈鹿一样长，能吃到 12 米高的树叶，心脏超级强大。用拟人化方式介绍。',
    aiFallback: '哈喽，我是腕龙！我是恐龙世界里最高的！我的脖子像长颈鹿一样长，能吃到 12 米高的树叶，相当于 4 层楼那么高！我的心脏可厉害了，每天要把好多好多血泵到我高高的脑袋上。我体重 40 吨，相当于 10 头大象那么重！',
    era: '侏罗纪',
    diet: '草食',
    length: 23,
    weight: 40,
    height: 12,
    discoveredIn: '北美洲、非洲',
    compareNote: '有 4 层楼那么高！比 3 辆公交车还长！重 40 吨！',
  },
  {
    id: 'velociraptor',
    category: 'dino',
    nameZh: '迅猛龙',
    nameEn: 'Velociraptor',
    phonics: '/vəˈlɒsɪræptər/',
    emoji: '🦖',
    desc: '小型肉食恐龙，聪明敏捷，脚上有致命利爪！',
    chant: '迅猛龙，跑得快，利爪锋利谁敢来！',
    funFact: '迅猛龙其实只有火鸡那么大，电影里把它放大了好多倍！',
    aiPrompt: '给宝贝讲迅猛龙：它虽然只有火鸡那么大，但是跑得超快、很聪明，脚上有弯弯的利爪，是群体狩猎的小猎手。用拟人化方式介绍，纠正电影里把它放大的误解。',
    aiFallback: '嘿，我是迅猛龙！别看我个头小，只有火鸡那么大，但我跑得超快，脑子也很好使！我脚上有一把弯弯的利爪，像小镰刀一样。我和小伙伴们一起合作打猎，再大的猎物也不怕！电影里把我拍得太大啦，其实人家很可爱的！',
    era: '白垩纪',
    diet: '肉食',
    length: 2,
    weight: 0.015,
    height: 0.5,
    discoveredIn: '蒙古',
    compareNote: '只有火鸡那么大！但跑起来比自行车还快！',
  },
  {
    id: 'ankylosaurus',
    category: 'dino',
    nameZh: '甲龙',
    nameEn: 'Ankylosaurus',
    phonics: '/ˌæŋkɪləˈsɔːrəs/',
    emoji: '🦎',
    desc: '全身披着铠甲的草食恐龙，尾巴末端有大锤子！',
    chant: '甲龙甲，全身披，尾锤一甩谁敢欺！',
    funFact: '甲龙的尾锤重达 50 公斤，一锤能打断霸王龙的腿！',
    aiPrompt: '给宝贝讲甲龙：它全身覆盖着骨质甲板，像穿了一身盔甲，尾巴末端有个大锤子，连霸王龙都不敢惹它。用拟人化方式介绍。',
    aiFallback: '你好，我是甲龙！我全身披着厚厚的骨质甲板，像穿了一身铁甲，连牙齿都咬不穿！我的尾巴末端有个大锤子，重 50 公斤，一甩就能把霸王龙的腿打断！虽然我是草食恐龙，但我可是恐龙界的"坦克"哦！',
    era: '白垩纪',
    diet: '草食',
    length: 8,
    weight: 4.8,
    height: 1.7,
    discoveredIn: '北美洲',
    compareNote: '和一辆小卡车一样长，全身铠甲 + 尾锤 50 公斤！',
  },
  {
    id: 'diplodocus',
    category: 'dino',
    nameZh: '梁龙',
    nameEn: 'Diplodocus',
    phonics: '/dɪˈplɒdəkəs/',
    emoji: '🦕',
    desc: '超长尾巴的草食巨兽，是地球上最长的恐龙之一！',
    chant: '梁龙长，尾巴 whip，鞭子一甩谁不怕！',
    funFact: '梁龙的尾巴有 14 米长，甩动时音速可达超音速，发出鞭子一样的爆响！',
    aiPrompt: '给宝贝讲梁龙：它是地球上最长的恐龙之一，身长 27 米，其中尾巴就占了 14 米，尾巴甩起来像鞭子一样响。用拟人化方式介绍。',
    aiFallback: '哈喽，我是梁龙！我是最长的恐龙之一，身体有 27 米长，相当于 3 辆公交车首尾相连！我的尾巴就有 14 米长，甩起来"啪"的一声，比鞭子还响！虽然我这么长，但我只吃草和树叶，是个温柔的大家伙！',
    era: '侏罗纪',
    diet: '草食',
    length: 27,
    weight: 12,
    height: 4,
    discoveredIn: '北美洲',
    compareNote: '3 辆公交车首尾相连！尾巴就有 14 米长！',
  },
  {
    id: 'spinosaurus',
    category: 'dino',
    nameZh: '棘龙',
    nameEn: 'Spinosaurus',
    phonics: '/ˌspaɪnəˈsɔːrəs/',
    emoji: '🦖',
    desc: '背上有大帆的肉食恐龙，会游泳，爱吃鱼！',
    chant: '棘龙帆，背上高，河里抓鱼它最豪！',
    funFact: '棘龙是已知最大的肉食恐龙，比霸王龙还大！而且它会游泳！',
    aiPrompt: '给宝贝讲棘龙：它是比霸王龙还大的肉食恐龙，背上有高高的大帆，会游泳，最爱抓鱼吃。用拟人化方式介绍，和霸王龙做个有趣的对比。',
    aiFallback: '你好，我是棘龙！我比霸王龙还大哦，是最大的肉食恐龙！我背上有一面高高的大帆，像船帆一样帅！我和别的肉食恐龙不一样，我最喜欢在水里游泳抓鱼吃。我的嘴巴长长的，牙齿尖尖的，专门用来抓滑溜溜的鱼！',
    era: '白垩纪',
    diet: '肉食',
    length: 14,
    weight: 7,
    height: 4.5,
    discoveredIn: '北非',
    compareNote: '比霸王龙还大！背帆有 1.8 米高！会游泳！',
  },
  {
    id: 'parasaurolophus',
    category: 'dino',
    nameZh: '副栉龙',
    nameEn: 'Parasaurolophus',
    phonics: '/ˌpærəsɔːˈrɒləfəs/',
    emoji: '🦕',
    desc: '头上长着长管子冠饰的草食恐龙，能发出好听的声音！',
    chant: '副栉龙，头冠长，吹响号角响四方！',
    funFact: '副栉龙的头冠可以发出低沉的号角声，在几公里外都能听到！',
    aiPrompt: '给宝贝讲副栉龙：它头上有一个长长的管子状头冠，科学家发现这个头冠能发出像号角一样的声音，用来和同伴交流。用拟人化方式介绍。',
    aiFallback: '你好呀，我是副栉龙！看到我头上长长的管子了吗？那是我的头冠，像个号角一样！我可以用它发出"呜——"的声音，几公里外的小伙伴都能听到！我们就是用这个方式互相喊话的。我是草食恐龙，走路靠两条腿，跑起来可快啦！',
    era: '白垩纪',
    diet: '草食',
    length: 10,
    weight: 2.5,
    height: 3,
    discoveredIn: '北美洲',
    compareNote: '头冠有 1.6 米长！能吹出号角一样的声音！',
  },
];

/** 按时代分组 */
export const DINOS_BY_ERA = {
  三叠纪: DINOSAURS.filter(d => d.era === '三叠纪'),
  侏罗纪: DINOSAURS.filter(d => d.era === '侏罗纪'),
  白垩纪: DINOSAURS.filter(d => d.era === '白垩纪'),
};

/** 按饮食分组 */
export const DINOS_BY_DIET = {
  肉食: DINOSAURS.filter(d => d.diet === '肉食'),
  草食: DINOSAURS.filter(d => d.diet === '草食'),
  杂食: DINOSAURS.filter(d => d.diet === '杂食'),
};
