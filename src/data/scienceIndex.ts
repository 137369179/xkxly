/**
 * 3D 羊毛毡自然科学与常识百科 🌿 (Science & Nature)
 * ------------------------------------------------------------
 * 涵盖：恐龙探秘 (Dinosaurs)、太阳系八大行星 (Solar System)、天气与四季 (Weather & Seasons)
 */

export interface ScienceItem {
  id: string;
  category: 'dino' | 'space' | 'weather';
  nameZh: string;
  nameEn: string;
  phonics: string;
  emoji: string;
  desc: string;
  chant: string;
  funFact: string;
}

export const SCIENCE_ITEMS: ScienceItem[] = [
  // 🦕 恐龙世界
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
  },
  {
    id: 'stegosaurus',
    category: 'dino',
    nameZh: '剑龙',
    nameEn: 'Stegosaurus',
    phonics: '/ˌsteɡəˈsɔːrəs/',
    emoji: '🐊',
    desc: '背上有两排骨质板的大型食草恐龙。',
    chant: '剑龙背，骨板直，尾巴尖刺防敌人！',
    funFact: '剑龙的脑容量非常小，只有核桃那么大！',
  },

  // 🪐 太阳系行星
  {
    id: 'sun',
    category: 'space',
    nameZh: '太阳',
    nameEn: 'Sun',
    phonics: '/sʌn/',
    emoji: '☀️',
    desc: '太阳系的中心恒星，给地球带来光和热！',
    chant: '大太阳，红彤彤，温暖阳光照万物！',
    funFact: '太阳的质量占了整个太阳系的 99.86%！',
  },
  {
    id: 'earth',
    category: 'space',
    nameZh: '地球',
    nameEn: 'Earth',
    phonics: '/ɜːθ/',
    emoji: '🌍',
    desc: '我们美丽的蓝星球，充满生机与海洋！',
    chant: '蓝地球，我们的家，蓝天绿地美如画！',
    funFact: '地球是目前已知唯一存在生命的天体！',
  },
  {
    id: 'moon',
    category: 'space',
    nameZh: '月球',
    nameEn: 'Moon',
    phonics: '/muːn/',
    emoji: '🌙',
    desc: '地球的天然卫星，晚上会变弯变圆。',
    chant: '弯月亮，圆月饼，夜空陪伴好做梦！',
    funFact: '月球上没有空气和水，脚印可以保存几百万年！',
  },
  {
    id: 'saturn',
    category: 'space',
    nameZh: '土星',
    nameEn: 'Saturn',
    phonics: '/ˈsætɜːn/',
    emoji: '🪐',
    desc: '戴着美丽光环的气体巨行星。',
    chant: '戴草帽，土星环，冰块尘埃绕圈圈！',
    funFact: '土星的密度非常低，如果把它放到足够大的水池里，它会浮在水面上！',
  },

  // 🌦️ 天气与四季
  {
    id: 'rainbow',
    category: 'weather',
    nameZh: '彩虹',
    nameEn: 'Rainbow',
    phonics: '/ˈreɪnbəʊ/',
    emoji: '🌈',
    desc: '雨后阳光折射形成的七彩拱桥（红橙黄绿青蓝紫）。',
    chant: '彩虹桥，七彩色，挂在天空真好看！',
    funFact: '从飞机上看，彩虹其实是一个完整的圆环哦！',
  },
  {
    id: 'rain',
    category: 'weather',
    nameZh: '下雨',
    nameEn: 'Rain',
    phonics: '/reɪn/',
    emoji: '🌧️',
    desc: '云朵里的水滴落下来，滋润大地植物。',
    chant: '小雨点，沙沙沙，花草树木喝饱水！',
    funFact: '雨滴在掉落过程中并不是桃心形，而是像汉堡包一样的扁圆形！',
  },
  {
    id: 'snow',
    category: 'weather',
    nameZh: '下雪',
    nameEn: 'Snow',
    phonics: '/snəʊ/',
    emoji: '❄️',
    desc: '冬天的六角形冰晶飘落，大地穿上白衣服。',
    chant: '雪花飘，白茫茫，堆个雪人乐淘淘！',
    funFact: '世界上找不到两片完全一模一样的雪花！',
  },
];
