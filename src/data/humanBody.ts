/**
 * 🫀 人体奥秘数据（6 大器官系统）
 * ------------------------------------------------------------
 * 消化、呼吸、循环、骨骼、神经、感觉
 * 每个系统含：中英文名、描述、器官列表、AI 探险故事 prompt
 */

export interface OrganItem {
  id: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
  /** 在人体示意图上的位置（百分比坐标 x:0-100, y:0-100） */
  position: { x: number; y: number };
  /** 功能简述 */
  function: string;
  /** 趣味知识 */
  funFact: string;
  /** 大小比喻（让儿童理解） */
  sizeComparison: string;
}

export interface BodySystemItem {
  id: string;
  category: 'body';
  /** 所属系统 */
  system: '消化' | '呼吸' | '循环' | '骨骼' | '神经' | '感觉';
  nameZh: string;
  nameEn: string;
  phonics: string;
  emoji: string;
  desc: string;
  chant: string;
  funFact: string;
  /** AI 探险故事 prompt */
  storyPrompt: string;
  storyFallback: string;
  /** AI 讲解 prompt */
  aiPrompt: string;
  aiFallback: string;
  /** 器官列表 */
  organs: OrganItem[];
  /** 主题色 */
  color: string;
}

export const BODY_SYSTEMS: BodySystemItem[] = [
  {
    id: 'digestive',
    category: 'body',
    system: '消化',
    nameZh: '消化系统',
    nameEn: 'Digestive System',
    phonics: '/daɪˈdʒestɪv/',
    emoji: '🍎',
    desc: '食物的旅行之路：从嘴巴到便便！',
    chant: '吃吃喝喝，嘴巴嚼，胃里搅，变成便便跑！',
    funFact: '食物从吃进去到排出来，大约需要 24-72 小时！',
    storyPrompt: '带宝贝跟着一个苹果一起进入嘴巴，经过食道、胃、小肠、大肠，最后变成便便排出来。每到一个地方都介绍一下器官的功能，像探险一样！',
    storyFallback: '小苹果被宝贝咬了一口，扑通掉进嘴巴里！牙齿把它嚼碎，和口水混在一起变成糊糊。然后经过一条滑梯一样的食道，来到一个酸酸的袋子里——那是胃，会把小苹果搅来搅去。然后来到弯弯曲曲的小肠，营养被吸走了，送到全身各处。最后到大肠，水分被吸干，变成便便排出来。小苹果的旅行结束啦！',
    aiPrompt: '给宝贝讲消化系统：食物从嘴巴进去，经过食道、胃、小肠、大肠，最后变成便便。让宝贝跟着一个苹果一起探险。用拟人化方式介绍。',
    aiFallback: '哈喽，我是消化系统！我就像一条长长的管道，从嘴巴一直到便便。食物先在嘴巴里被牙齿嚼碎，然后通过食道滑到胃里。胃像一个搅拌机，加上酸酸的胃液把食物搅成糊糊。然后到小肠，营养被吸收送到全身。最后到大肠，水分被吸干，就变成便便啦！全程大约 24-72 小时！',
    color: '#ff5c8a',
    organs: [
      { id: 'mouth', nameZh: '嘴巴', nameEn: 'Mouth', emoji: '👄', position: { x: 50, y: 17 }, function: '咀嚼食物，和口水混合开始消化', funFact: '成人有 32 颗牙齿', sizeComparison: '嘴巴能张开约 4 厘米' },
      { id: 'esophagus', nameZh: '食道', nameEn: 'Esophagus', emoji: '🍝', position: { x: 50, y: 26 }, function: '把食物从嘴巴运到胃里', funFact: '食道肌肉会波浪式收缩推食物下行', sizeComparison: '约 25 厘米长，像一根吸管' },
      { id: 'liver', nameZh: '肝脏', nameEn: 'Liver', emoji: '🏈', position: { x: 43, y: 49 }, function: '身体的化工厂，解毒并分泌胆汁帮助消化', funFact: '肝脏是人体唯一可以自我再生的内脏！', sizeComparison: '重约 1.5 公斤，像一个橄榄球' },
      { id: 'stomach', nameZh: '胃', nameEn: 'Stomach', emoji: '🫧', position: { x: 54, y: 50 }, function: '用胃酸搅拌和分解食物', funFact: '胃酸强到能溶解铁钉！', sizeComparison: '能装约 1.5 升食物，像一个气球' },
      { id: 'small-intestine', nameZh: '小肠', nameEn: 'Small Intestine', emoji: '🌀', position: { x: 50, y: 64 }, function: '吸收食物中的营养', funFact: '小肠有 6-7 米长！', sizeComparison: '展开有一个停车场那么长' },
      { id: 'large-intestine', nameZh: '大肠', nameEn: 'Large Intestine', emoji: '🔄', position: { x: 42, y: 60 }, function: '吸收水分，形成便便', funFact: '大肠里有数万亿个细菌帮我们消化', sizeComparison: '约 1.5 米长，像一条粗管子' },
      { id: 'anus', nameZh: '肛门', nameEn: 'Anus', emoji: '💩', position: { x: 50, y: 76 }, function: '把便便排出体外', funFact: '健康的便便像香蕉的形状', sizeComparison: '和你的小指差不多粗' },
    ],
  },
  {
    id: 'respiratory',
    category: 'body',
    system: '呼吸',
    nameZh: '呼吸系统',
    nameEn: 'Respiratory System',
    phonics: '/rəˈspɪrətri/',
    emoji: '🫁',
    desc: '空气的旅行之路：从鼻子到肺！',
    chant: '吸——呼——，鼻子进，肺里转，二氧化碳吐出来！',
    funFact: '你每天大约呼吸 2 万次，吸进 1 万升空气！',
    storyPrompt: '带宝贝跟着一个空气泡泡一起进入鼻子，经过气管，到达肺，再变成二氧化碳跑出来。像探险一样介绍每个器官的功能！',
    storyFallback: '小空气泡泡被宝贝吸进了鼻子！鼻子里面有好多鼻毛，像过滤器一样把灰尘挡住。然后空气经过气管，像坐滑梯一样滑到肺里。肺里有好多好多小气泡，把氧气送到血液里，再把废气二氧化碳收集起来，呼出去。小空气泡泡变成二氧化碳飞走了！',
    aiPrompt: '给宝贝讲呼吸系统：空气从鼻子进去，经过气管到肺，氧气送到血液，二氧化碳呼出来。用拟人化方式介绍。',
    aiFallback: '哈喽，我是呼吸系统！我负责让宝贝呼吸新鲜空气！空气从鼻子进去，鼻毛挡住灰尘，然后经过气管到达肺。肺里有 3 亿个小气泡，把氧气送到血液里运到全身，再把废气二氧化碳收集起来呼出去。你每天呼吸 2 万次，吸进 1 万升空气呢！',
    color: '#7cc3e8',
    organs: [
      { id: 'nose', nameZh: '鼻子', nameEn: 'Nose', emoji: '👃', position: { x: 50, y: 13 }, function: '呼吸和闻味道', funFact: '鼻子能识别 1 万种不同的气味', sizeComparison: '鼻孔各有 1.5 厘米宽' },
      { id: 'trachea', nameZh: '气管', nameEn: 'Trachea', emoji: '🛤️', position: { x: 50, y: 24 }, function: '把空气从鼻子运到肺', funFact: '气管有 C 形软骨环保持通畅', sizeComparison: '约 10-12 厘米长' },
      { id: 'lung-left', nameZh: '左肺', nameEn: 'Left Lung', emoji: '🫁', position: { x: 58, y: 38 }, function: '和右肺一起交换氧气和二氧化碳', funFact: '左肺比右肺小一点，给心脏腾位置', sizeComparison: '像一个大海绵' },
      { id: 'lung-right', nameZh: '右肺', nameEn: 'Right Lung', emoji: '🫁', position: { x: 42, y: 38 }, function: '和左肺一起交换氧气和二氧化碳', funFact: '右肺有 3 叶，左肺只有 2 叶', sizeComparison: '比左肺大一点' },
      { id: 'alveoli', nameZh: '肺泡', nameEn: 'Alveoli', emoji: '🫧', position: { x: 40, y: 44 }, function: '氧气和二氧化碳交换的地方', funFact: '肺里有 3 亿个肺泡！', sizeComparison: '每个肺泡只有 0.2 毫米' },
    ],
  },
  {
    id: 'circulatory',
    category: 'body',
    system: '循环',
    nameZh: '循环系统',
    nameEn: 'Circulatory System',
    phonics: '/ˈsɜːkjələtəri/',
    emoji: '🫀',
    desc: '血液快递员，把营养送到全身！',
    chant: '扑通扑通，心脏跳，血液全身跑！',
    funFact: '心脏一天跳动约 10 万次，泵出 7000 升血液！',
    storyPrompt: '带宝贝变小，跟着一个红细胞一起从心脏出发，经过血管到全身送氧气，再回到心脏。像快递员送货一样介绍循环系统！',
    storyFallback: '宝贝变小变小，跳到一个红细胞上！红细胞从心脏的左心室出发，带着满满的氧气，在血管里飞快地跑。跑到手指尖、脚趾尖、头顶，把氧气送给每一个细胞，顺便带上二氧化碳。然后回到心脏的右心房，再去肺里换新鲜氧气，又开始新一轮旅行！心脏就像一个超级水泵，一天跳 10 万次！',
    aiPrompt: '给宝贝讲循环系统：心脏像水泵，把血液泵到全身送氧气和营养，再带回二氧化碳。用拟人化方式介绍。',
    aiFallback: '哈喽，我是循环系统！我的核心是心脏，它像一个大水泵，一天跳 10 万次，泵出 7000 升血液！血液在血管里流动，把氧气和营养送到全身每一个角落，再把废物带回来。你全身的血管连起来有 10 万公里长，能绕地球 2 圈半呢！',
    color: '#ff5c8a',
    organs: [
      { id: 'heart', nameZh: '心脏', nameEn: 'Heart', emoji: '🫀', position: { x: 52, y: 39 }, function: '泵血到全身', funFact: '心脏只有拳头大小，但一天跳 10 万次', sizeComparison: '和你的拳头一样大' },
      { id: 'artery', nameZh: '主动脉', nameEn: 'Aorta', emoji: '🔴', position: { x: 49, y: 33 }, function: '把含氧血液从心脏送到全身', funFact: '动脉血是鲜红色的', sizeComparison: '最粗的主动脉直径 2.5 厘米' },
      { id: 'vein', nameZh: '腔静脉', nameEn: 'Vena Cava', emoji: '🔵', position: { x: 52, y: 33 }, function: '把含二氧化碳血液送回心脏', funFact: '静脉血是暗红色的', sizeComparison: '静脉比动脉粗但壁薄' },
      { id: 'capillary', nameZh: '毛细血管', nameEn: 'Capillary', emoji: '🩸', position: { x: 25, y: 58 }, function: '和细胞交换氧气和营养', funFact: '毛细血管比头发还细 10 倍', sizeComparison: '只有 0.008 毫米粗' },
    ],
  },
  {
    id: 'skeletal',
    category: 'body',
    system: '骨骼',
    nameZh: '骨骼系统',
    nameEn: 'Skeletal System',
    phonics: '/ˈskelɪtl/',
    emoji: '🦴',
    desc: '身体里的脚手架，支撑你站起来！',
    chant: '骨头骨头，硬硬的，撑着身体站得直！',
    funFact: '婴儿有 300 块骨头，长大后变成 206 块，因为有些骨头会合在一起！',
    storyPrompt: '带宝贝变小，参观身体里的骨头脚手架。从头骨到脊柱到四肢骨，像参观建筑工地一样介绍骨骼系统！',
    storyFallback: '宝贝变小，走进身体里的"骨头工地"！首先看到头骨，像一个头盔保护着大脑。然后是脊柱，由 33 块小骨头叠起来，像一串珠子，让你能弯腰转身。再看到四肢骨：手臂骨、腿骨，像柱子一样支撑身体。婴儿有 300 块骨头，长大后有些合在一起变成 206 块！骨头里面还有骨髓，是制造血液的地方！',
    aiPrompt: '给宝贝讲骨骼系统：成人有 206 块骨头，支撑身体、保护内脏。骨头里有骨髓制造血液。用拟人化方式介绍。',
    aiFallback: '哈喽，我是骨骼系统！我是你身体里的脚手架，没有我你就变成一滩泥啦！成人有 206 块骨头，最大的是大腿骨，最小的是耳朵里的听小骨。头骨保护大脑，脊柱让你能弯腰，肋骨保护心脏和肺。骨头里面还有骨髓，每天都在制造新的血液！',
    color: '#FFE8A3',
    organs: [
      { id: 'skull', nameZh: '头骨', nameEn: 'Skull', emoji: '💀', position: { x: 50, y: 10 }, function: '保护大脑', funFact: '头骨由 22 块骨头拼成', sizeComparison: '和你的头一样大' },
      { id: 'spine', nameZh: '脊柱', nameEn: 'Spine', emoji: '🦴', position: { x: 50, y: 48 }, function: '支撑身体，保护脊髓', funFact: '脊柱由 33 块椎骨组成', sizeComparison: '从脖子到腰，约 70 厘米' },
      { id: 'ribs', nameZh: '肋骨', nameEn: 'Ribs', emoji: '🫁', position: { x: 50, y: 38 }, function: '保护心脏和肺', funFact: '人有 12 对肋骨', sizeComparison: '像一个小笼子' },
      { id: 'arm-bone', nameZh: '手臂骨', nameEn: 'Arm Bone', emoji: '💪', position: { x: 28, y: 44 }, function: '让手臂能弯曲活动', funFact: '手臂由肱骨、尺骨和桡骨组成', sizeComparison: '约 30 厘米长' },
      { id: 'leg-bone', nameZh: '腿骨', nameEn: 'Leg Bone', emoji: '🦵', position: { x: 43, y: 88 }, function: '支撑身体，走路跑步', funFact: '大腿骨是身体最长的骨头', sizeComparison: '约 45 厘米长' },
    ],
  },
  {
    id: 'nervous',
    category: 'body',
    system: '神经',
    nameZh: '神经系统',
    nameEn: 'Nervous System',
    phonics: '/ˈnɜːvəs/',
    emoji: '🧠',
    desc: '身体里的电报员，传递信息超快！',
    chant: '大脑指挥，神经传话，反应快快哒！',
    funFact: '神经信号传导速度可达 120 米/秒，比高铁还快！',
    storyPrompt: '带宝贝变小，跟着一个神经信号从手指尖出发，经过神经，到达大脑，再传回指令。像电报员一样介绍神经系统！',
    storyFallback: '宝贝变小，变成一个神经信号！从手指尖出发，"嗖"地一下在神经上飞跑，速度有 120 米每秒，比高铁还快！到达脊髓，再上传到大脑。大脑是总指挥，分析信息后发回指令：手指碰到了热水，快缩回来！整个过程不到 0.1 秒！大脑有 860 亿个神经元，比地球人口还多 10 倍！',
    aiPrompt: '给宝贝讲神经系统：大脑是总指挥，神经传递信息，速度比高铁还快。用拟人化方式介绍。',
    aiFallback: '哈喽，我是神经系统！我是你身体里的电报员！大脑是总指挥，有 860 亿个神经元。神经像电线一样遍布全身，把信息传到大脑，再把指令传回来。你碰到热水会立刻缩手，整个过程不到 0.1 秒！神经信号传导速度有 120 米每秒，比高铁还快！',
    color: '#c2a8ef',
    organs: [
      { id: 'brain', nameZh: '大脑', nameEn: 'Brain', emoji: '🧠', position: { x: 50, y: 9 }, function: '思考、记忆、指挥全身', funFact: '大脑有 860 亿个神经元', sizeComparison: '和你的两个拳头合起来一样大' },
      { id: 'cerebellum', nameZh: '小脑', nameEn: 'Cerebellum', emoji: '🧠', position: { x: 50, y: 15 }, function: '控制平衡和协调', funFact: '小脑只占大脑体积的 10%', sizeComparison: '像一个核桃' },
      { id: 'spinal-cord', nameZh: '脊髓', nameEn: 'Spinal Cord', emoji: '🧵', position: { x: 50, y: 34 }, function: '传递大脑和身体之间的信号', funFact: '脊髓约 45 厘米长', sizeComparison: '和一根铅笔差不多粗' },
      { id: 'nerves', nameZh: '神经', nameEn: 'Nerves', emoji: '⚡', position: { x: 35, y: 46 }, function: '把信号传遍全身', funFact: '神经连起来有 7 万公里长', sizeComparison: '比头发还细' },
    ],
  },
  {
    id: 'sensory',
    category: 'body',
    system: '感觉',
    nameZh: '感觉系统',
    nameEn: 'Sensory System',
    phonics: '/ˈsensəri/',
    emoji: '👁️',
    desc: '五感小分队：看、听、闻、尝、摸！',
    chant: '眼睛看，耳朵听，鼻子闻，舌头尝，皮肤摸！',
    funFact: '舌头上有 1 万个味蕾，每 2 周更新一次！',
    storyPrompt: '带宝贝认识五感小分队的五位成员：眼睛看世界、耳朵听声音、鼻子闻味道、舌头尝味道、皮肤摸东西。每个成员介绍自己的本领！',
    storyFallback: '哈喽，我们是五感小分队！我是眼睛，能看到五颜六色的世界，每分钟眨 15 次！我是耳朵，能听到各种声音，还有内耳帮你保持平衡！我是鼻子，能识别 1 万种气味！我是舌头，上面有 1 万个味蕾，能尝出酸甜苦咸鲜！我是皮肤，全身最大的器官，能感受冷热软硬！我们五个一起帮宝贝认识世界！',
    aiPrompt: '给宝贝讲五感：眼睛看、耳朵听、鼻子闻、舌头尝、皮肤摸。用拟人化方式让每个器官自我介绍。',
    aiFallback: '哈喽，我是感觉系统！我有五个小分队：眼睛负责看，能看到千万种颜色；耳朵负责听，还能帮你保持平衡；鼻子负责闻，能识别 1 万种气味；舌头负责尝，有 1 万个味蕾；皮肤负责摸，是全身最大的器官！我们五感一起帮宝贝认识这个美丽的世界！',
    color: '#62cc8a',
    organs: [
      { id: 'eye', nameZh: '眼睛', nameEn: 'Eye', emoji: '👁️', position: { x: 46, y: 11 }, function: '看东西，识别颜色', funFact: '每分钟眨眼 15 次', sizeComparison: '和一颗弹珠差不多' },
      { id: 'ear', nameZh: '耳朵', nameEn: 'Ear', emoji: '👂', position: { x: 61, y: 13 }, function: '听声音，保持平衡', funFact: '内耳有液体帮你保持平衡', sizeComparison: '耳朵里面的耳蜗只有豌豆大' },
      { id: 'nose-organ', nameZh: '鼻子', nameEn: 'Nose', emoji: '👃', position: { x: 50, y: 13 }, function: '闻味道', funFact: '能识别 1 万种气味', sizeComparison: '鼻腔约 7.5 厘米深' },
      { id: 'tongue', nameZh: '舌头', nameEn: 'Tongue', emoji: '👅', position: { x: 50, y: 18 }, function: '尝味道', funFact: '有 1 万个味蕾，每 2 周更新', sizeComparison: '长约 10 厘米' },
      { id: 'skin', nameZh: '皮肤', nameEn: 'Skin', emoji: '✋', position: { x: 74, y: 48 }, function: '感受冷热软硬，保护身体', funFact: '皮肤是全身最大的器官', sizeComparison: '成人皮肤面积约 2 平方米' },
    ],
  },
];

/** 按 ID 快速查找 */
export const BODY_SYSTEM_BY_ID = Object.fromEntries(BODY_SYSTEMS.map(s => [s.id, s]));
