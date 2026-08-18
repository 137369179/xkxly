/**
 * 🪐 太空探索数据（太阳系 8 大行星 + 太阳 + 月球）
 * ------------------------------------------------------------
 * 每颗行星含：中英文名、音标、emoji、描述、顺口溜、冷知识
 * 3D 模型参数：半径、轨道半径、公转速度、自转速度、颜色、光环
 */

export interface PlanetModel3D {
  /** 球体半径（R3F 单位） */
  radius: number;
  /** 纹理颜色 */
  color: string;
  /** 是否有光环 */
  hasRing?: boolean;
  /** 公转轨道半径 */
  orbitRadius: number;
  /** 公转速度（弧度/秒） */
  orbitSpeed: number;
  /** 自转速度 */
  rotationSpeed: number;
}

export interface PlanetItem {
  id: string;
  category: 'space';
  /** 天体类型 */
  bodyType: 'star' | 'planet' | 'moon';
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
  /** 距太阳距离（天文单位 AU） */
  distanceAU: number;
  /** 直径（公里） */
  diameter: number;
  /** 公转周期（地球日） */
  orbitalPeriod: number;
  /** 自转周期（小时） */
  rotationPeriod: number;
  /** 卫星数量 */
  moons: number;
  /** 表面温度（摄氏度） */
  surfaceTemp: string;
  /** 3D 模型配置 */
  model3D: PlanetModel3D;
  /** 距太阳的顺序（1-8，太阳为 0） */
  order: number;
}

export const PLANETS: PlanetItem[] = [
  {
    id: 'sun',
    category: 'space',
    bodyType: 'star',
    nameZh: '太阳',
    nameEn: 'Sun',
    phonics: '/sʌn/',
    emoji: '☀️',
    desc: '太阳系的中心恒星，给地球带来光和热！',
    chant: '大太阳，红彤彤，温暖阳光照万物！',
    funFact: '太阳的质量占了整个太阳系的 99.86%！',
    aiPrompt: '给宝贝讲太阳：太阳是一颗巨大的恒星，给地球带来光和热，没有太阳就没有地球上的生命。太阳比地球大 130 万倍。用拟人化方式介绍。',
    aiFallback: '你好呀，我是太阳公公！我是一颗大大的恒星，每天给地球送光和热。我比地球大 130 万倍哦！没有我的阳光，地球上的植物就不能生长，小朋友就没有吃的啦。我的肚子里一直在燃烧，温度有 5500 度呢！不过别担心，我离地球很远很远，刚好让你觉得暖暖的！',
    distanceAU: 0,
    diameter: 1392700,
    orbitalPeriod: 0,
    rotationPeriod: 609.12,
    moons: 0,
    surfaceTemp: '5500°C',
    model3D: { radius: 2.5, color: '#FDB813', orbitRadius: 0, orbitSpeed: 0, rotationSpeed: 0.002 },
    order: 0,
  },
  {
    id: 'mercury',
    category: 'space',
    bodyType: 'planet',
    nameZh: '水星',
    nameEn: 'Mercury',
    phonics: '/ˈmɜːkjəri/',
    emoji: '☿️',
    desc: '离太阳最近的行星，个头最小，跑得最快！',
    chant: '小水星，跑得快，绕着太阳转圈圈！',
    funFact: '水星上一天比一年还长！它自转一圈要 59 天，但绕太阳一圈只要 88 天！',
    aiPrompt: '给宝贝讲水星：水星是离太阳最近的行星，个头最小，跑得最快，88 天就绕太阳一圈。上面白天超热晚上超冷。用拟人化方式介绍。',
    aiFallback: '哈喽，我是水星！我离太阳最近，是太阳系里最小的行星。我跑得可快了，88 天就绕太阳一圈！我上面没有水和空气，白天热得像烤箱（430 度），晚上冷得像冰柜（-180 度）。虽然叫水星，但我上面一滴水都没有哦！',
    distanceAU: 0.39,
    diameter: 4879,
    orbitalPeriod: 88,
    rotationPeriod: 1407.6,
    moons: 0,
    surfaceTemp: '-180°C ~ 430°C',
    model3D: { radius: 0.35, color: '#8C7853', orbitRadius: 4, orbitSpeed: 0.04, rotationSpeed: 0.004 },
    order: 1,
  },
  {
    id: 'venus',
    category: 'space',
    bodyType: 'planet',
    nameZh: '金星',
    nameEn: 'Venus',
    phonics: '/ˈviːnəs/',
    emoji: '♀️',
    desc: '夜空中最亮的星星，被厚厚的云层包裹！',
    chant: '亮金星，亮闪闪，夜空最美那颗星！',
    funFact: '金星是太阳系中最热的行星，表面温度有 460°C，比水星还热！',
    aiPrompt: '给宝贝讲金星：金星是夜空中最亮的星星，又叫启明星。它被厚厚的云层包裹，表面温度最高有 460 度，是太阳系最热的行星。用拟人化方式介绍。',
    aiFallback: '你好，我是金星！我在夜空中是最亮的星星，大家都叫我"启明星"。我穿着一层厚厚的云外衣，把阳光都反射出去，所以看起来特别亮。不过我的表面温度有 460 度，是太阳系最热的行星！因为我的云层把热气都关在里面跑不出去！',
    distanceAU: 0.72,
    diameter: 12104,
    orbitalPeriod: 225,
    rotationPeriod: -5832.5,
    moons: 0,
    surfaceTemp: '460°C',
    model3D: { radius: 0.55, color: '#FFC649', orbitRadius: 5.5, orbitSpeed: 0.015, rotationSpeed: 0.002 },
    order: 2,
  },
  {
    id: 'earth',
    category: 'space',
    bodyType: 'planet',
    nameZh: '地球',
    nameEn: 'Earth',
    phonics: '/ɜːθ/',
    emoji: '🌍',
    desc: '我们美丽的蓝星球，充满生机与海洋！',
    chant: '蓝地球，我们的家，蓝天绿地美如画！',
    funFact: '地球是目前已知唯一存在生命的天体！71% 的表面被水覆盖！',
    aiPrompt: '给宝贝讲地球：地球是我们的家，是唯一有生命的行星，71% 表面是海洋，从太空看是蓝色的。用拟人化方式让地球自我介绍。',
    aiFallback: '你好呀，我是地球！我就是你和所有小朋友的家！我穿着蓝色的外衣，因为 71% 的表面都是海洋。我有空气、有水、有阳光，所以动物、植物和人类都能在我这里生活。从太空看我，是一颗蓝蓝的弹珠，可漂亮啦！请好好爱护我哦！',
    distanceAU: 1,
    diameter: 12742,
    orbitalPeriod: 365.25,
    rotationPeriod: 23.93,
    moons: 1,
    surfaceTemp: '-89°C ~ 58°C',
    model3D: { radius: 0.6, color: '#55aee0', orbitRadius: 7, orbitSpeed: 0.01, rotationSpeed: 0.02 },
    order: 3,
  },
  {
    id: 'mars',
    category: 'space',
    bodyType: 'planet',
    nameZh: '火星',
    nameEn: 'Mars',
    phonics: '/mɑːz/',
    emoji: '🔴',
    desc: '红色的行星，表面布满铁锈色的沙漠！',
    chant: '红火星，铁锈红，沙漠一片红彤彤！',
    funFact: '火星上有太阳系最高的山——奥林匹斯山，高 21 公里，是珠峰的 2.5 倍！',
    aiPrompt: '给宝贝讲火星：火星是红色的行星，因为表面有铁锈。火星上有太阳系最高的山——奥林匹斯山。人类正在计划去火星探险。用拟人化方式介绍。',
    aiFallback: '哈喽，我是火星！我看起来红红的，因为我的泥土里有铁锈。我上面有太阳系最高的山——奥林匹斯山，高 21 公里，是你们地球珠穆朗玛峰的 2.5 倍！现在人类的机器人已经在我的表面跑来跑去了，以后说不定你也能来我家做客呢！',
    distanceAU: 1.52,
    diameter: 6779,
    orbitalPeriod: 687,
    rotationPeriod: 24.62,
    moons: 2,
    surfaceTemp: '-87°C ~ -5°C',
    model3D: { radius: 0.45, color: '#CD5C5C', orbitRadius: 8.5, orbitSpeed: 0.008, rotationSpeed: 0.018 },
    order: 4,
  },
  {
    id: 'jupiter',
    category: 'space',
    bodyType: 'planet',
    nameZh: '木星',
    nameEn: 'Jupiter',
    phonics: '/ˈdʒuːpɪtər/',
    emoji: '🟠',
    desc: '太阳系最大的行星，身上有漂亮的花纹和大红斑！',
    chant: '大木星，个头大，大红斑转圈圈！',
    funFact: '木星上有个大红斑，是一个持续了 300 多年的超级大风暴！',
    aiPrompt: '给宝贝讲木星：木星是太阳系最大的行星，可以装下 1300 个地球。它身上有大红斑，是一个 300 多年的超级风暴。用拟人化方式介绍。',
    aiFallback: '你好，我是木星！我是太阳系最大的行星，肚子能装下 1300 个地球！我身上有漂亮的花纹，还有一个大红斑，那是一个刮了 300 多年的超级大风暴，比整个地球还大！我有 95 颗卫星，像带了一大家子小朋友一样！',
    distanceAU: 5.2,
    diameter: 139820,
    orbitalPeriod: 4333,
    rotationPeriod: 9.93,
    moons: 95,
    surfaceTemp: '-145°C',
    model3D: { radius: 1.5, color: '#D8CA9D', orbitRadius: 11, orbitSpeed: 0.002, rotationSpeed: 0.04 },
    order: 5,
  },
  {
    id: 'saturn',
    category: 'space',
    bodyType: 'planet',
    nameZh: '土星',
    nameEn: 'Saturn',
    phonics: '/ˈsætɜːn/',
    emoji: '🪐',
    desc: '戴着美丽光环的气体巨行星！',
    chant: '戴草帽，土星环，冰块尘埃绕圈圈！',
    funFact: '土星的密度非常低，如果把它放到足够大的水池里，它会浮在水面上！',
    aiPrompt: '给宝贝讲土星：土星最出名的就是它美丽的光环，光环是由冰块和尘埃组成的。土星密度很低，能浮在水上。用拟人化方式介绍。',
    aiFallback: '哈喽，我是土星！看到我漂亮的光环了吗？那是我最骄傲的装饰！光环是由好多好多的冰块和石头组成的，绕着我转圈圈。偷偷告诉你：我的密度很低，如果有一个超级大的游泳池，我能浮在水上呢！我有 146 颗卫星，是太阳系卫星最多的行星！',
    distanceAU: 9.5,
    diameter: 116460,
    orbitalPeriod: 10759,
    rotationPeriod: 10.7,
    moons: 146,
    surfaceTemp: '-178°C',
    model3D: { radius: 1.2, color: '#FAD5A5', hasRing: true, orbitRadius: 14, orbitSpeed: 0.0009, rotationSpeed: 0.038 },
    order: 6,
  },
  {
    id: 'uranus',
    category: 'space',
    bodyType: 'planet',
    nameZh: '天王星',
    nameEn: 'Uranus',
    phonics: '/ˈjʊərənəs/',
    emoji: '🔵',
    desc: '躺着自转的冰巨行星，颜色是淡淡的蓝色！',
    chant: '天王星，躺着转，蓝色冰冰真好看！',
    funFact: '天王星是"躺着"自转的，它的自转轴几乎和公转轨道平行！',
    aiPrompt: '给宝贝讲天王星：天王星是淡蓝色的冰巨行星，最特别的是它"躺着"自转，自转轴几乎和轨道平行。用拟人化方式介绍。',
    aiFallback: '你好，我是天王星！我是一颗淡淡的蓝色行星，因为我的大气里有很多甲烷气体。我最特别的地方是：我是"躺着"转的！别的行星都站着转圈，我就像躺在地上打滚一样转圈。科学家说可能很久以前有个大东西撞了我一下，我就躺下了！',
    distanceAU: 19.2,
    diameter: 50724,
    orbitalPeriod: 30687,
    rotationPeriod: -17.24,
    moons: 28,
    surfaceTemp: '-224°C',
    model3D: { radius: 0.9, color: '#AFDBF5', orbitRadius: 17, orbitSpeed: 0.0004, rotationSpeed: 0.03 },
    order: 7,
  },
  {
    id: 'neptune',
    category: 'space',
    bodyType: 'planet',
    nameZh: '海王星',
    nameEn: 'Neptune',
    phonics: '/ˈneptjuːn/',
    emoji: '🔵',
    desc: '太阳系最远的行星，深蓝色的风暴之星！',
    chant: '远海王，深蓝色，最远最冷风最大！',
    funFact: '海王星上的风速可达 2100 公里/小时，是太阳系风最大的行星！',
    aiPrompt: '给宝贝讲海王星：海王星是太阳系最远的行星，深蓝色，风速超级大，有 2100 公里每小时。用拟人化方式介绍。',
    aiFallback: '哈喽，我是海王星！我是太阳系最远的行星，离太阳超级远，所以特别冷，有 -224 度！我穿着深蓝色的外衣，看起来像一颗蓝宝石。我上面的风可大啦，风速 2100 公里每小时，比地球上最强的台风还要猛 10 倍！',
    distanceAU: 30.1,
    diameter: 49244,
    orbitalPeriod: 60190,
    rotationPeriod: 16.11,
    moons: 16,
    surfaceTemp: '-224°C',
    model3D: { radius: 0.88, color: '#4166F5', orbitRadius: 20, orbitSpeed: 0.0001, rotationSpeed: 0.028 },
    order: 8,
  },
  {
    id: 'moon',
    category: 'space',
    bodyType: 'moon',
    nameZh: '月球',
    nameEn: 'Moon',
    phonics: '/muːn/',
    emoji: '🌙',
    desc: '地球的天然卫星，晚上会变弯变圆。',
    chant: '弯月亮，圆月饼，夜空陪伴好做梦！',
    funFact: '月球上没有空气和水，脚印可以保存几百万年！',
    aiPrompt: '给宝贝讲月球和人类登月的故事：1969 年阿波罗 11 号，阿姆斯特朗叔叔第一个踏上月球，说"这是个人的一小步，却是人类的一大步"。用拟人化方式，让月球自己讲故事。',
    aiFallback: '你好呀，我是月球！我是地球的好朋友，每天晚上绕着地球转。我上面没有空气和水，所以脚印可以保存几百万年！1969 年，阿姆斯特朗叔叔坐着阿波罗 11 号飞船来到我这里，他留下了第一个脚印，到现在还在呢！他说："这是个人的一小步，却是人类的一大步。"我至今还记得他踩在我身上的感觉！',
    distanceAU: 0.00257,
    diameter: 3474,
    orbitalPeriod: 27.3,
    rotationPeriod: 655.7,
    moons: 0,
    surfaceTemp: '-173°C ~ 127°C',
    model3D: { radius: 0.3, color: '#C0C0C0', orbitRadius: 8.5, orbitSpeed: 0.015, rotationSpeed: 0.005 },
    order: 9,
  },
];

/** 只取 8 大行星 */
export const EIGHT_PLANETS = PLANETS.filter(p => p.bodyType === 'planet');

/** 太阳 */
export const SUN = PLANETS.find(p => p.id === 'sun')!;

/** 月球 */
export const MOON = PLANETS.find(p => p.id === 'moon')!;
