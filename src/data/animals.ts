/**
 * 🦁 动物百科数据（50 种动物）
 * ------------------------------------------------------------
 * 6 大分类：哺乳类 20、鸟类 8、爬行类 5、两栖类 3、鱼类 6、昆虫类 8
 * 12 种栖息地：草原、森林、海洋、南极、竹林、池塘、天空、花园、沙漠、河流、山地、北极
 */

export interface AnimalItem {
  id: string;
  category: 'animal';
  nameZh: string;
  nameEn: string;
  phonics: string;
  emoji: string;
  desc: string;
  chant: string;
  funFact: string;
  aiPrompt: string;
  aiFallback: string;
  /** 动物分类 */
  animalClass: '哺乳' | '鸟类' | '爬行' | '两栖' | '鱼类' | '昆虫';
  /** 栖息地 */
  habitat: '草原' | '森林' | '海洋' | '南极' | '北极' | '沙漠' | '竹林' | '池塘' | '天空' | '花园' | '山地' | '河流';
  /** 饮食 */
  diet: '肉食' | '草食' | '杂食';
  /** 声音（中文拟声） */
  sound: string;
  /** 体型大小等级 1-5 */
  sizeLevel: 1 | 2 | 3 | 4 | 5;
  /** 濒危等级 */
  conservationStatus: '无危' | '近危' | '易危' | '濒危' | '极危';
  /** 栖息地坐标（简化版世界地图上的位置百分比 x:0-100, y:0-100） */
  habitatCoord?: { x: number; y: number };
}

export const ANIMALS: AnimalItem[] = [
  // ── 哺乳类（20）──────────────────────────────────────────
  {
    id: 'lion', category: 'animal', nameZh: '狮子', nameEn: 'Lion', phonics: '/ˈlaɪən/', emoji: '🦁',
    desc: '草原之王，唯一群居的大型猫科动物！', chant: '狮子王，吼一声，草原动物都胆寒！', funFact: '狮子是群居动物，一群叫狮群',
    aiPrompt: '给宝贝讲狮子：狮子是草原之王，唯一群居的大型猫科动物，公狮子有威武的鬃毛。用拟人化方式介绍。',
    aiFallback: '你好，我是狮子王！我住在非洲大草原，是唯一群居的大型猫科动物。我有一头威风凛凛的鬃毛，像戴了皇冠！我的一声吼叫可以传到 8 公里远，草原上的动物听到都会害怕！不过我只吃肉，最爱和狮群伙伴们一起打猎！',
    animalClass: '哺乳', habitat: '草原', diet: '肉食', sound: '吼——', sizeLevel: 4, conservationStatus: '易危', habitatCoord: { x: 55, y: 58 },
  },
  {
    id: 'elephant', category: 'animal', nameZh: '大象', nameEn: 'Elephant', phonics: '/ˈelɪfənt/', emoji: '🐘',
    desc: '陆地上最大的动物，用鼻子喝水吃食！', chant: '大象大，鼻子长，喝水喷水真好玩！', funFact: '大象用鼻子喝水、吃东西',
    aiPrompt: '给宝贝讲大象：大象是陆地上最大的动物，鼻子可以喝水、吃东西、打招呼。大象记忆力超好。用拟人化方式介绍。',
    aiFallback: '哈喽，我是大象！我是陆地上最大的动物，体重有 6 吨呢！我的鼻子是万能工具：可以喝水、拔树、吃东西、还能和好朋友握手！我的记忆力特别好，多年没见的朋友我也能认出来。我的耳朵像大扇子，扇起来呼呼响！',
    animalClass: '哺乳', habitat: '草原', diet: '草食', sound: '呜——', sizeLevel: 5, conservationStatus: '濒危', habitatCoord: { x: 56, y: 60 },
  },
  {
    id: 'giraffe', category: 'animal', nameZh: '长颈鹿', nameEn: 'Giraffe', phonics: '/dʒəˈrɑːf/', emoji: '🦒',
    desc: '脖子最长的动物，能吃到最高处的树叶！', chant: '长颈鹿，脖子长，高处树叶随便尝！', funFact: '长颈鹿脖子最长，能吃到高处树叶',
    aiPrompt: '给宝贝讲长颈鹿：长颈鹿是地球上最高的动物，脖子有 2 米多长，能吃到高处的树叶。用拟人化方式介绍。',
    aiFallback: '你好，我是长颈鹿！我是世界上最高的动物，光脖子就有 2.4 米长！我能吃到别的动物够不到的高处树叶，相当于站在二楼阳台上吃树上的果子！我的舌头是紫色的，有 50 厘米长，能卷住树叶往嘴里送！',
    animalClass: '哺乳', habitat: '草原', diet: '草食', sound: '哼', sizeLevel: 5, conservationStatus: '易危', habitatCoord: { x: 57, y: 59 },
  },
  {
    id: 'panda', category: 'animal', nameZh: '熊猫', nameEn: 'Panda', phonics: '/ˈpændə/', emoji: '🐼',
    desc: '中国国宝，黑白相间，爱吃竹子！', chant: '大熊猫，圆滚滚，竹子啃得真开心！', funFact: '熊猫是国宝，爱吃竹子',
    aiPrompt: '给宝贝讲大熊猫：大熊猫是中国的国宝，黑白相间，99% 的食物是竹子。用拟人化方式介绍。',
    aiFallback: '你好呀，我是大熊猫！我是中国的国宝，大家都说我萌萌的！我穿着黑白相间的衣服，每天最多的时间就是吃竹子和睡觉。我一天要吃 12 公斤竹子呢！虽然我看起来胖嘟嘟的，但我其实是熊，跑起来可快了！',
    animalClass: '哺乳', habitat: '竹林', diet: '草食', sound: '嗯嗯', sizeLevel: 3, conservationStatus: '易危', habitatCoord: { x: 75, y: 45 },
  },
  {
    id: 'tiger', category: 'animal', nameZh: '老虎', nameEn: 'Tiger', phonics: '/ˈtaɪɡər/', emoji: '🐯',
    desc: '森林之王，身上的条纹是天然迷彩！', chant: '大老虎，穿条纹，森林之王真威风！', funFact: '老虎的条纹长在皮肤上，不只是毛上！',
    aiPrompt: '给宝贝讲老虎：老虎是森林之王，身上的条纹是天然迷彩，每只老虎的条纹都不一样。用拟人化方式介绍。',
    aiFallback: '哈喽，我是老虎！我是森林之王，身上的黑白条纹是我的迷彩服，藏在草丛里谁都看不见！悄悄告诉你：我的条纹长在皮肤上，就算剃光毛，条纹还在！每只老虎的条纹都不一样，就像你的指纹一样独一无二！',
    animalClass: '哺乳', habitat: '森林', diet: '肉食', sound: '嗷呜——', sizeLevel: 4, conservationStatus: '濒危', habitatCoord: { x: 78, y: 48 },
  },
  {
    id: 'zebra', category: 'animal', nameZh: '斑马', nameEn: 'Zebra', phonics: '/ˈziːbrə/', emoji: '🦓',
    desc: '穿着条纹睡衣的草原居民！', chant: '小斑马，穿条纹，黑白分明真好看！', funFact: '每只斑马的条纹都不一样，就像人的指纹！',
    aiPrompt: '给宝贝讲斑马：斑马穿着黑白条纹，每只的条纹都不一样。条纹还能让马蝇不知道往哪飞。用拟人化方式介绍。',
    aiFallback: '你好，我是斑马！我穿着黑白条纹的"睡衣"，每只斑马的条纹都不一样，就像你们的指纹！我的条纹还有个妙用：当一群斑马跑在一起，马蝇看得眼花缭乱，不知道该往哪飞！我跑起来有 65 公里每小时，比自行车快多了！',
    animalClass: '哺乳', habitat: '草原', diet: '草食', sound: '咴咴', sizeLevel: 3, conservationStatus: '近危', habitatCoord: { x: 56, y: 58 },
  },
  {
    id: 'kangaroo', category: 'animal', nameZh: '袋鼠', nameEn: 'Kangaroo', phonics: '/ˌkæŋɡəˈruː/', emoji: '🦘',
    desc: '澳大利亚的跳跃冠军，妈妈有个口袋！', chant: '袋鼠跳，跳得高，宝宝装在口袋里！', funFact: '袋鼠宝宝出生只有花生米那么大！',
    aiPrompt: '给宝贝讲袋鼠：袋鼠是澳大利亚的跳跃冠军，妈妈肚子上有口袋装宝宝。用拟人化方式介绍。',
    aiFallback: '哈喽，我是袋鼠！我来自澳大利亚，是跳跃冠军，一跳能跳 3 米高、9 米远！我妈妈的肚子上有一个温暖的口袋，我和弟弟妹妹都住在里面。我刚出生的时候只有花生米那么大，在妈妈的口袋里慢慢长大！',
    animalClass: '哺乳', habitat: '草原', diet: '草食', sound: '咳咳', sizeLevel: 4, conservationStatus: '无危', habitatCoord: { x: 85, y: 72 },
  },
  {
    id: 'monkey', category: 'animal', nameZh: '猴子', nameEn: 'Monkey', phonics: '/ˈmʌŋki/', emoji: '🐒',
    desc: '聪明调皮的攀爬高手，会用工具！', chant: '小猴子，爬树高，尾巴挂在树枝摇！', funFact: '猴子会用石头砸开坚果，还会洗红薯！',
    aiPrompt: '给宝贝讲猴子：猴子聪明调皮，会用工具，会爬树，有的还有长长的尾巴。用拟人化方式介绍。',
    aiFallback: '你好，我是小猴子！我可是森林里最聪明的动物之一，我会用石头砸开坚果，还会在水里洗红薯吃！我的长尾巴可以像第五只手一样挂在树枝上，倒挂着也能吃香蕉！我最喜欢和小伙伴们一起在树上荡秋千！',
    animalClass: '哺乳', habitat: '森林', diet: '杂食', sound: '吱吱', sizeLevel: 2, conservationStatus: '无危', habitatCoord: { x: 70, y: 55 },
  },
  {
    id: 'wolf', category: 'animal', nameZh: '狼', nameEn: 'Wolf', phonics: '/wʊlf/', emoji: '🐺',
    desc: '团队合作的猎手，对着月亮嚎叫！', chant: '大灰狼，嗷嗷叫，团队合作打猎好！', funFact: '狼的嚎叫可以传到 10 公里远！',
    aiPrompt: '给宝贝讲狼：狼是团队合作的猎手，用嚎叫和同伴交流，嚎叫声能传 10 公里。用拟人化方式介绍。',
    aiFallback: '哈喽，我是大灰狼！别怕，我其实没那么坏。我和小伙伴们一起生活，叫狼群。我们合作打猎，一起照顾小宝宝。我对着月亮嚎叫不是在哭，是在和远处的伙伴说"我在这儿呢"！我的嚎叫可以传 10 公里远！',
    animalClass: '哺乳', habitat: '森林', diet: '肉食', sound: '嗷呜——', sizeLevel: 3, conservationStatus: '无危', habitatCoord: { x: 50, y: 40 },
  },
  {
    id: 'bear', category: 'animal', nameZh: '熊', nameEn: 'Bear', phonics: '/beər/', emoji: '🐻',
    desc: '力气超大的杂食动物，冬天要冬眠！', chant: '大黑熊，力气大，冬天睡觉到春天！', funFact: '熊冬天冬眠可以睡 6 个月不吃东西！',
    aiPrompt: '给宝贝讲熊：熊力气大，什么都吃，冬天会冬眠睡 6 个月。用拟人化方式介绍。',
    aiFallback: '你好，我是大熊！我力气可大了，一巴掌能把大树拍断！我什么都吃：蜂蜜、鱼、果子、虫子，来者不拒！冬天到了，我会找一个山洞睡大觉，叫冬眠，一睡就是 6 个月，不吃不喝也不上厕所！春天醒来肚子饿扁了，第一件事就是找吃的！',
    animalClass: '哺乳', habitat: '森林', diet: '杂食', sound: '嗷——', sizeLevel: 4, conservationStatus: '无危', habitatCoord: { x: 55, y: 38 },
  },
  {
    id: 'rabbit', category: 'animal', nameZh: '兔子', nameEn: 'Rabbit', phonics: '/ˈræbɪt/', emoji: '🐰',
    desc: '长耳朵短尾巴，蹦蹦跳跳的小可爱！', chant: '小兔子，蹦蹦跳，长耳朵竖起来！', funFact: '兔子的耳朵可以旋转 270 度！',
    aiPrompt: '给宝贝讲兔子：兔子有长耳朵可以旋转 270 度，短尾巴，蹦蹦跳跳。用拟人化方式介绍。',
    aiFallback: '哈喽，我是小兔子！我的长耳朵可厉害了，能旋转 270 度，四面八方的声音都听得清清楚楚！我跑起来用后腿蹬，一跳能跳 3 米远！我最爱吃胡萝卜和青草。我的尾巴短短的、毛茸茸的，像一个小棉花球！',
    animalClass: '哺乳', habitat: '花园', diet: '草食', sound: '吱吱', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 42 },
  },
  {
    id: 'deer', category: 'animal', nameZh: '鹿', nameEn: 'Deer', phonics: '/dɪər/', emoji: '🦌',
    desc: '优雅的森林精灵，头上长着美丽的角！', chant: '小鹿小鹿，角儿美丽，跑得轻快又伶俐！', funFact: '鹿角每年都会脱落再重新长出来！',
    aiPrompt: '给宝贝讲鹿：鹿头上有美丽的角，每年脱落再长，跑得很快。用拟人化方式介绍。',
    aiFallback: '你好，我是小鹿！我头上的角每年都会掉，然后再长出新的，一次比一次大！我跑起来可优雅了，一跳能跳 9 米远。我的眼睛长在头的两侧，能看到几乎 360 度，后面有人来了我也知道！',
    animalClass: '哺乳', habitat: '森林', diet: '草食', sound: '咩——', sizeLevel: 3, conservationStatus: '无危', habitatCoord: { x: 52, y: 40 },
  },
  {
    id: 'koala', category: 'animal', nameZh: '考拉', nameEn: 'Koala', phonics: '/kəʊˈɑːlə/', emoji: '🐨',
    desc: '澳大利亚的树上居民，每天睡 20 小时！', chant: '小考拉，抱树睡，一天到晚不想起！', funFact: '考拉每天睡 18-22 小时，是世界上最爱睡觉的动物！',
    aiPrompt: '给宝贝讲考拉：考拉来自澳大利亚，住在树上吃桉树叶，每天睡 20 小时。用拟人化方式介绍。',
    aiFallback: '哈喽，我是考拉！我来自澳大利亚，住在高高的桉树上。桉树叶有毒，别的动物不敢吃，但我的肚子不怕！不过消化桉树叶很费力气，所以我每天要睡 20 个小时，只有 4 个小时醒着吃东西。你说我懒？不不不，我是在认真消化啦！',
    animalClass: '哺乳', habitat: '森林', diet: '草食', sound: '呼噜', sizeLevel: 2, conservationStatus: '濒危', habitatCoord: { x: 85, y: 72 },
  },
  {
    id: 'hippo', category: 'animal', nameZh: '河马', nameEn: 'Hippopotamus', phonics: '/ˌhɪpəˈpɒtəməs/', emoji: '🦛',
    desc: '嘴巴最大的陆地动物，住在河里！', chant: '大河马，嘴巴大，泡在水里真舒服！', funFact: '河马的嘴巴可以张开 180 度！',
    aiPrompt: '给宝贝讲河马：河马嘴巴能张开 180 度，大部分时间泡在水里防晒。用拟人化方式介绍。',
    aiFallback: '你好，我是河马！别看我胖嘟嘟的，我可是陆地上嘴巴最大的动物，嘴巴一张能开 180 度，能塞下一个小朋友！我一天大部分时间都泡在水里，因为我的皮肤怕太阳晒。到了晚上我才上岸吃草，一晚上能吃 40 公斤！',
    animalClass: '哺乳', habitat: '河流', diet: '草食', sound: '哼哼', sizeLevel: 5, conservationStatus: '易危', habitatCoord: { x: 57, y: 62 },
  },
  {
    id: 'rhino', category: 'animal', nameZh: '犀牛', nameEn: 'Rhinoceros', phonics: '/raɪˈnɒsərəs/', emoji: '🦏',
    desc: '头上长角的装甲巨兽，皮厚如钢板！', chant: '犀牛犀牛，皮厚厚的，头上有角真神气！', funFact: '犀牛的皮肤厚达 5 厘米，子弹都打不穿！',
    aiPrompt: '给宝贝讲犀牛：犀牛皮厚 5 厘米，头上有角，是濒危动物需要保护。用拟人化方式介绍。',
    aiFallback: '哈喽，我是犀牛！我穿着 5 厘米厚的"防弹衣"，皮肤硬得子弹都打不穿！我头上有尖尖的角，最长的有 1.5 米。可惜有人觉得我的角很值钱就来偷猎我，我现在很稀少了，你要保护我哦！我跑起来有 50 公里每小时，比你想的快多了！',
    animalClass: '哺乳', habitat: '草原', diet: '草食', sound: '哼——', sizeLevel: 5, conservationStatus: '极危', habitatCoord: { x: 58, y: 63 },
  },
  {
    id: 'cheetah', category: 'animal', nameZh: '猎豹', nameEn: 'Cheetah', phonics: '/ˈtʃiːtə/', emoji: '🐆',
    desc: '陆地上跑得最快的动物！', chant: '猎豹跑，快如风，百米只需三秒钟！', funFact: '猎豹百米只需 3 秒，比跑车加速还快！',
    aiPrompt: '给宝贝讲猎豹：猎豹是陆地上跑得最快的动物，百米 3 秒，但只能跑短距离。用拟人化方式介绍。',
    aiFallback: '你好，我是猎豹！我是陆地上跑得最快的动物，百米只要 3 秒钟，比你们人类的跑车加速还快！我的身体细细长长，像跑车一样流线型。不过我只能冲刺短距离，跑太远会热得受不了。我的泪痕从眼角到嘴角，像两条黑线，可以挡太阳光！',
    animalClass: '哺乳', habitat: '草原', diet: '肉食', sound: '喵——', sizeLevel: 3, conservationStatus: '易危', habitatCoord: { x: 57, y: 60 },
  },
  {
    id: 'dolphin', category: 'animal', nameZh: '海豚', nameEn: 'Dolphin', phonics: '/ˈdɒlfɪn/', emoji: '🐬',
    desc: '海洋中最聪明的动物，喜欢跳跃玩耍！', chant: '小海豚，跳出海，聪明可爱人人爱！', funFact: '海豚非常聪明，喜欢跳跃',
    aiPrompt: '给宝贝讲海豚：海豚是海洋中最聪明的动物，用回声定位，喜欢跳跃玩耍。用拟人化方式介绍。',
    aiFallback: '哈喽，我是海豚！我是海洋里最聪明的动物，脑容量比你们人类还大呢！我能用声音"看"东西，发出的声波碰到鱼就弹回来，我就知道鱼在哪里！我最喜欢跳出水面翻跟斗，来和我一起游泳吧！',
    animalClass: '哺乳', habitat: '海洋', diet: '肉食', sound: '吱吱', sizeLevel: 3, conservationStatus: '无危', habitatCoord: { x: 45, y: 55 },
  },
  {
    id: 'whale', category: 'animal', nameZh: '鲸鱼', nameEn: 'Whale', phonics: '/weɪl/', emoji: '🐋',
    desc: '海洋中最大的动物，用歌声交流！', chant: '大鲸鱼，海中王，歌声传到百里外！', funFact: '蓝鲸是地球上最大的动物，比恐龙还大！',
    aiPrompt: '给宝贝讲鲸鱼：蓝鲸是地球上最大的动物，比最大的恐龙还大，用歌声和同伴交流。用拟人化方式介绍。',
    aiFallback: '你好，我是蓝鲸！我是地球上最大的动物，比最大的恐龙还要大！我有 30 米长、180 吨重，相当于 25 头大象！我的心脏有一辆小汽车那么大！我虽然叫鲸鱼，但我不是鱼，我是哺乳动物，要浮到水面呼吸空气。我还会唱歌，歌声能传 1000 公里远！',
    animalClass: '哺乳', habitat: '海洋', diet: '肉食', sound: '呜——', sizeLevel: 5, conservationStatus: '濒危', habitatCoord: { x: 40, y: 50 },
  },
  {
    id: 'bat', category: 'animal', nameZh: '蝙蝠', nameEn: 'Bat', phonics: '/bæt/', emoji: '🦇',
    desc: '会飞的哺乳动物，用超声波导航！', chant: '小蝙蝠，夜里飞，超声波来导航！', funFact: '蝙蝠是唯一会飞的哺乳动物！',
    aiPrompt: '给宝贝讲蝙蝠：蝙蝠是唯一真正会飞的哺乳动物，用超声波导航，晚上出来活动。用拟人化方式介绍。',
    aiFallback: '哈喽，我是蝙蝠！我是世界上唯一真正会飞的哺乳动物！虽然我有翅膀，但我的翅膀其实是手指之间拉着的皮膜。我晚上才出来活动，眼睛看不太清，但我能用超声波"看"路：我发出声音，声音碰到东西弹回来，我就知道前面有什么！',
    animalClass: '哺乳', habitat: '天空', diet: '杂食', sound: '吱吱', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'squirrel', category: 'animal', nameZh: '松鼠', nameEn: 'Squirrel', phonics: '/ˈskwɪrəl/', emoji: '🐿️',
    desc: '大尾巴的爬树小能手，爱藏松果！', chant: '小松鼠，大尾巴，藏松果找不着！', funFact: '松鼠每年会忘记自己藏的松果，这些松果就长成新树！',
    aiPrompt: '给宝贝讲松鼠：松鼠有大尾巴，爱藏松果但经常忘记，无意中种了很多树。用拟人化方式介绍。',
    aiFallback: '你好，我是小松鼠！我有一条毛茸茸的大尾巴，下雨的时候可以当伞用！我最爱吃松果，秋天会埋好多好多松果留着冬天吃。可是我记性不好，经常忘记埋在哪了，那些松果就长成新的大树啦！所以说我是森林的"种树人"！',
    animalClass: '哺乳', habitat: '森林', diet: '草食', sound: '吱吱', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 52, y: 40 },
  },

  // ── 鸟类（8）──────────────────────────────────────────────
  {
    id: 'penguin', category: 'animal', nameZh: '企鹅', nameEn: 'Penguin', phonics: '/ˈpeŋɡwɪn/', emoji: '🐧',
    desc: '不会飞但游泳超厉害的鸟！', chant: '小企鹅，穿礼服，摇摇摆摆走！', funFact: '企鹅不会飞但游泳很厉害',
    aiPrompt: '给宝贝讲企鹅：企鹅是鸟类但不会飞，游泳超厉害，住在南极。用拟人化方式介绍。',
    aiFallback: '哈喽，我是企鹅！我是鸟类但不会飞，不过我游泳可厉害了，在水里像鱼雷一样快！我穿着黑白"礼服"，像个小绅士。我住在南极，那里冰天雪地，我们企鹅挤在一起取暖。我爸爸会用脚掌把蛋放在肚子下面孵，一站就是两个月！',
    animalClass: '鸟类', habitat: '南极', diet: '肉食', sound: '嘎嘎', sizeLevel: 2, conservationStatus: '近危', habitatCoord: { x: 50, y: 90 },
  },
  {
    id: 'eagle', category: 'animal', nameZh: '老鹰', nameEn: 'Eagle', phonics: '/ˈiːɡl/', emoji: '🦅',
    desc: '天空之王，视力是人类的 8 倍！', chant: '老鹰飞，看得远，千里之外找猎物！', funFact: '老鹰视力极好，能高空看到猎物',
    aiPrompt: '给宝贝讲老鹰：老鹰是天空之王，视力是人类的 8 倍，能在 3 公里外看到兔子。用拟人化方式介绍。',
    aiFallback: '你好，我是老鹰！我是天空之王，视力是你们的 8 倍，能在 3 公里外看到一只小兔子！我的翅膀展开有 2 米多宽，乘着热气流可以在天上滑翔几个小时不扇翅膀。我的爪子力气超大，能抓起一只羊！',
    animalClass: '鸟类', habitat: '天空', diet: '肉食', sound: '唳——', sizeLevel: 3, conservationStatus: '无危', habitatCoord: { x: 48, y: 42 },
  },
  {
    id: 'parrot', category: 'animal', nameZh: '鹦鹉', nameEn: 'Parrot', phonics: '/ˈpærət/', emoji: '🦜',
    desc: '会学人说话的彩色鸟！', chant: '鹦鹉鹦鹉，学说话，你好你好！', funFact: '非洲灰鹦鹉能学会 1000 多个单词！',
    aiPrompt: '给宝贝讲鹦鹉：鹦鹉会学人说话，羽毛五颜六色，住在热带森林。用拟人化方式介绍。',
    aiFallback: '哈喽哈喽，我是鹦鹉！我会学人说话，"你好你好"！我的羽毛五颜六色，有红的、绿的、蓝的、黄的，比彩虹还好看！我住在热带森林里，最爱吃水果和种子。非洲灰鹦鹉能学会 1000 多个单词呢，比我认识的朋友还多！',
    animalClass: '鸟类', habitat: '森林', diet: '杂食', sound: '你好！', sizeLevel: 2, conservationStatus: '无危', habitatCoord: { x: 70, y: 58 },
  },
  {
    id: 'peacock', category: 'animal', nameZh: '孔雀', nameEn: 'Peacock', phonics: '/ˈpiːkɒk/', emoji: '🦚',
    desc: '会开屏的美丽鸟，尾巴比身体还大！', chant: '孔雀开屏，真美丽，五彩缤纷！', funFact: '孔雀开屏是为了吸引异性，只有公孔雀才会开屏！',
    aiPrompt: '给宝贝讲孔雀：孔雀开屏很美，只有公孔雀才会开屏，为了吸引母孔雀。用拟人化方式介绍。',
    aiFallback: '你好，我是孔雀！看到我漂亮的尾巴了吗？我开屏的时候，尾巴展开有 1.5 米宽，上面有好多像眼睛一样的花纹，闪闪发光！不过只有我们男生才会开屏哦，女生是灰灰的。我开屏是为了让女生觉得我好帅！',
    animalClass: '鸟类', habitat: '花园', diet: '杂食', sound: '喵——', sizeLevel: 3, conservationStatus: '无危', habitatCoord: { x: 65, y: 55 },
  },
  {
    id: 'ostrich', category: 'animal', nameZh: '鸵鸟', nameEn: 'Ostrich', phonics: '/ˈɒstrɪtʃ/', emoji: '🦤',
    desc: '最大的鸟，不会飞但跑得超快！', chant: '大鸵鸟，不会飞，跑起来比马快！', funFact: '鸵鸟蛋是最大的蛋，一个有 2 公斤重！',
    aiPrompt: '给宝贝讲鸵鸟：鸵鸟是最大的鸟，不会飞但跑得有 70 公里每小时。鸵鸟蛋是最大的蛋。用拟人化方式介绍。',
    aiFallback: '哈喽，我是鸵鸟！我是世界上最大的鸟，有 2.5 米高，比最高的人还高！虽然我不会飞，但我跑起来有 70 公里每小时，比马还快！我的蛋也是世界上最大的蛋，一个就有 2 公斤重，够一家人吃一顿！我把头埋进沙子不是因为害怕，是在翻蛋啦！',
    animalClass: '鸟类', habitat: '草原', diet: '杂食', sound: '嗡嗡', sizeLevel: 4, conservationStatus: '无危', habitatCoord: { x: 55, y: 62 },
  },
  {
    id: 'owl', category: 'animal', nameZh: '猫头鹰', nameEn: 'Owl', phonics: '/aʊl/', emoji: '🦉',
    desc: '夜晚出行的夜行鸟，眼睛会发光！', chant: '猫头鹰，夜里醒，大眼睛亮晶晶！', funFact: '猫头鹰的头可以转 270 度！',
    aiPrompt: '给宝贝讲猫头鹰：猫头鹰是夜行鸟，头能转 270 度，晚上出来抓老鼠。用拟人化方式介绍。',
    aiFallback: '你好，我是猫头鹰！我白天睡觉，晚上才出来活动。我的头能转 270 度，能看到身后的一切！我的大眼睛在夜里也能看得清清楚楚，连地上跑的小老鼠都逃不过我的眼睛。我飞起来没有声音，是安静的夜间猎手！',
    animalClass: '鸟类', habitat: '森林', diet: '肉食', sound: '咕咕', sizeLevel: 2, conservationStatus: '无危', habitatCoord: { x: 52, y: 40 },
  },
  {
    id: 'flamingo', category: 'animal', nameZh: '火烈鸟', nameEn: 'Flamingo', phonics: '/fləˈmɪŋɡəʊ/', emoji: '🦩',
    desc: '粉红色的单腿站立鸟！', chant: '火烈鸟，粉红色，一条腿站真厉害！', funFact: '火烈鸟的粉色来自食物中的色素！',
    aiPrompt: '给宝贝讲火烈鸟：火烈鸟是粉红色的，单腿站立，颜色来自食物。用拟人化方式介绍。',
    aiFallback: '哈喽，我是火烈鸟！我全身粉红粉红的，像一团火焰！我的颜色来自我吃的小虾和藻类，如果吃不到这些，我就会变白。我最喜欢单腿站立，这样比较省力气，你试试单腿站能站多久？我们火烈鸟成千上万只聚在一起，远远看去像一片粉色的云！',
    animalClass: '鸟类', habitat: '池塘', diet: '杂食', sound: '嘎嘎', sizeLevel: 3, conservationStatus: '无危', habitatCoord: { x: 55, y: 60 },
  },
  {
    id: 'pigeon', category: 'animal', nameZh: '鸽子', nameEn: 'Pigeon', phonics: '/ˈpɪdʒɪn/', emoji: '🐦',
    desc: '城市里最常见的鸟，会送信！', chant: '小鸽子，咕咕咕，飞到东来飞到西！', funFact: '鸽子能记住数百张人脸！',
    aiPrompt: '给宝贝讲鸽子：鸽子是城市里最常见的鸟，能记住人脸，以前用来送信。用拟人化方式介绍。',
    aiFallback: '你好，我是小鸽子！你可能在学校或公园见过我。我可是很聪明的，能记住几百张人脸！以前没有手机的时候，人类用我来送信，我能飞几百公里找到回家的路。我咕咕叫的时候，是在和小伙伴说话呢！',
    animalClass: '鸟类', habitat: '天空', diet: '杂食', sound: '咕咕', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 40 },
  },

  // ── 爬行类（5）────────────────────────────────────────────
  {
    id: 'snake', category: 'animal', nameZh: '蛇', nameEn: 'Snake', phonics: '/sneɪk/', emoji: '🐍',
    desc: '没有脚的爬行动物，靠身体蠕动前进！', chant: '小蛇蛇，没有脚，扭来扭去走！', funFact: '蛇没有脚，靠身体爬行',
    aiPrompt: '给宝贝讲蛇：蛇没有脚，靠身体爬行，舌头能"闻"味道。用拟人化方式介绍。',
    aiFallback: '哈喽，我是蛇！我没有脚，但我能靠身体的肌肉扭来扭去走路，还能爬树呢！我的舌头一伸一缩不是在做鬼脸，是在"闻"味道，空气中的气味分子粘在舌头上，我就知道猎物在哪里。我能把嘴巴张得超级大，吞下比我头还大的蛋！',
    animalClass: '爬行', habitat: '森林', diet: '肉食', sound: '嘶嘶', sizeLevel: 2, conservationStatus: '无危', habitatCoord: { x: 65, y: 55 },
  },
  {
    id: 'crocodile', category: 'animal', nameZh: '鳄鱼', nameEn: 'Crocodile', phonics: '/ˈkrɒkədaɪl/', emoji: '🐊',
    desc: '恐龙时代的活化石，咬合力超强！', chant: '大鳄鱼，嘴大大，牙齿尖尖像锯子！', funFact: '鳄鱼和恐龙是同时代的，活了 2 亿年！',
    aiPrompt: '给宝贝讲鳄鱼：鳄鱼和恐龙同时代，活了 2 亿年，咬合力超强。用拟人化方式介绍。',
    aiFallback: '你好，我是鳄鱼！我可是恐龙时代的"活化石"，活了 2 亿年都没变样！我大部分时间泡在水里，只露出眼睛和鼻孔。我的咬合力是动物界最强的，一口能咬碎乌龟壳！不过我虽然凶，我也当妈妈的时候很温柔，会把宝宝含在嘴里保护！',
    animalClass: '爬行', habitat: '河流', diet: '肉食', sound: '嘶——', sizeLevel: 4, conservationStatus: '易危', habitatCoord: { x: 55, y: 58 },
  },
  {
    id: 'turtle', category: 'animal', nameZh: '乌龟', nameEn: 'Turtle', phonics: '/ˈtɜːtl/', emoji: '🐢',
    desc: '背着硬壳的慢吞吞，寿命超长！', chant: '小乌龟，慢吞吞，背着房子到处走！', funFact: '乌龟可以活 150 年以上！',
    aiPrompt: '给宝贝讲乌龟：乌龟背着硬壳，走得慢但能活 150 年。用拟人化方式介绍。',
    aiFallback: '哈喽，我是小乌龟！我背着硬硬的壳，那是我的"房子"，走到哪带到哪！遇到危险我就把头和脚缩进壳里，谁都咬不到我！我虽然走得慢，但我活得久，能活 150 岁以上！我们海龟还能在大海里游几千公里找到出生的海滩产卵！',
    animalClass: '爬行', habitat: '池塘', diet: '杂食', sound: '——', sizeLevel: 2, conservationStatus: '濒危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'lizard', category: 'animal', nameZh: '蜥蜴', nameEn: 'Lizard', phonics: '/ˈlɪzəd/', emoji: '🦎',
    desc: '会爬墙的小爬行动物，尾巴能断再生！', chant: '小蜥蜴，爬墙快，尾巴断了还能长！', funFact: '蜥蜴的尾巴断了能再长出来！',
    aiPrompt: '给宝贝讲蜥蜴：蜥蜴会爬墙，尾巴断了能再生。用拟人化方式介绍。',
    aiFallback: '你好，我是小蜥蜴！我的脚趾上有好多小钩子，能在光滑的墙壁上爬来爬去，像蜘蛛侠一样！我最厉害的本领是：如果被坏人抓住了尾巴，我就把尾巴断掉逃跑，过几个月又会长出新的尾巴！我经常伸着长长的舌头晒太阳，可舒服了！',
    animalClass: '爬行', habitat: '花园', diet: '肉食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'chameleon', category: 'animal', nameZh: '变色龙', nameEn: 'Chameleon', phonics: '/kəˈmiːliən/', emoji: '🦎',
    desc: '会变色的神奇爬行动物，眼睛能 360 度转！', chant: '变色龙，变变变，红橙黄绿青蓝紫！', funFact: '变色龙的两只眼睛可以分别看不同方向！',
    aiPrompt: '给宝贝讲变色龙：变色龙会变色，眼睛能 360 度转，舌头能弹出来抓虫子。用拟人化方式介绍。',
    aiFallback: '哈喽，我是变色龙！我能变色，开心变红色，生气变深色，冷了变暗色！我的两只眼睛可以各转各的，一只看前面一只看后面，360 度无死角！我的舌头比身体还长，能瞬间弹出来抓住虫子，"啪"的一下就吃到嘴里啦！',
    animalClass: '爬行', habitat: '森林', diet: '肉食', sound: '——', sizeLevel: 1, conservationStatus: '近危', habitatCoord: { x: 60, y: 58 },
  },

  // ── 两栖类（3）────────────────────────────────────────────
  {
    id: 'frog', category: 'animal', nameZh: '青蛙', nameEn: 'Frog', phonics: '/frɒɡ/', emoji: '🐸',
    desc: '池塘里的歌唱家，小时候是蝌蚪！', chant: '小青蛙，呱呱呱，池塘里面叫喳喳！', funFact: '青蛙小时候是蝌蚪',
    aiPrompt: '给宝贝讲青蛙：青蛙小时候是蝌蚪，长大后变模样，用舌头抓虫子。用拟人化方式介绍。',
    aiFallback: '你好，我是青蛙！我小时候是黑色的小蝌蚪，在水里游来游去，慢慢长出四条腿，尾巴缩回去，就变成青蛙啦！我的舌头能在一瞬间弹出来粘住飞虫，比眨眼还快！下雨后我最喜欢唱歌：呱呱呱呱！我是农民伯伯的好帮手，专吃害虫！',
    animalClass: '两栖', habitat: '池塘', diet: '肉食', sound: '呱呱', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'toad', category: 'animal', nameZh: '蟾蜍', nameEn: 'Toad', phonics: '/təʊd/', emoji: '🐸',
    desc: '皮肤粗糙的两栖动物，比青蛙胖！', chant: '蟾蜍蟾蜍，胖乎乎，皮肤粗粗爱挖土！', funFact: '蟾蜍的眼睛后面有毒腺，能分泌白色毒液！',
    aiPrompt: '给宝贝讲蟾蜍：蟾蜍比青蛙胖，皮肤粗糙，有毒性。用拟人化方式介绍。',
    aiFallback: '哈喽，我是蟾蜍，大家也叫癞蛤蟆！我和青蛙是表兄弟，但我比它胖，皮肤也粗粗糙糙的。我眼睛后面有毒腺，如果有人欺负我，我就分泌白色的毒液。不过别怕，我不主动咬人！我白天躲在土洞里，晚上出来抓虫子吃！',
    animalClass: '两栖', habitat: '花园', diet: '肉食', sound: '呱——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'salamander', category: 'animal', nameZh: '蝾螈', nameEn: 'Salamander', phonics: '/ˈsæləmændər/', emoji: '🦎',
    desc: '像小龙的神奇两栖动物，能再生身体部位！', chant: '小蝾螈，像小龙，断了手脚能再生！', funFact: '蝾螈能再生腿、尾巴甚至心脏！',
    aiPrompt: '给宝贝讲蝾螈：蝾螈是两栖动物，像小恐龙，能再生腿和尾巴。用拟人化方式介绍。',
    aiFallback: '你好，我是蝾螈！我长得像一只小恐龙，其实我是两栖动物。我有一个超能力：如果我的腿断了，过段时间就能长出一条新腿！不只是腿，我的尾巴、心脏、甚至大脑都能再生！科学家叔叔们正在研究我的超能力，以后说不定能帮到人类！',
    animalClass: '两栖', habitat: '池塘', diet: '肉食', sound: '——', sizeLevel: 1, conservationStatus: '易危', habitatCoord: { x: 50, y: 45 },
  },

  // ── 鱼类（6）──────────────────────────────────────────────
  {
    id: 'shark', category: 'animal', nameZh: '鲨鱼', nameEn: 'Shark', phonics: '/ʃɑːk/', emoji: '🦈',
    desc: '海洋霸主，牙齿锋利，嗅觉超灵！', chant: '大鲨鱼，牙齿尖，海里霸主谁敢来！', funFact: '鲨鱼是海洋霸主，牙齿很锋利',
    aiPrompt: '给宝贝讲鲨鱼：鲨鱼是海洋霸主，牙齿一直换新的，嗅觉很灵。用拟人化方式介绍。',
    aiFallback: '哈喽，我是大鲨鱼！我是海洋里的霸主！我的牙齿永远用不完，掉了一颗后面就有一颗新的长出来，一辈子能换 3 万颗牙！我的嗅觉超灵，一滴血在游泳池里我都能闻到。不过别怕我，我其实不太爱吃人，我最爱海豹！',
    animalClass: '鱼类', habitat: '海洋', diet: '肉食', sound: '——', sizeLevel: 5, conservationStatus: '濒危', habitatCoord: { x: 40, y: 50 },
  },
  {
    id: 'goldfish', category: 'animal', nameZh: '金鱼', nameEn: 'Goldfish', phonics: '/ˈɡəʊldfɪʃ/', emoji: '🐠',
    desc: '池塘里的小精灵，五颜六色！', chant: '小金鱼，游啊游，尾巴飘飘真好看！', funFact: '金鱼的记忆力有 3 个月，不像传说说的只有 7 秒！',
    aiPrompt: '给宝贝讲金鱼：金鱼五颜六色，记忆力有 3 个月，不是只有 7 秒。用拟人化方式介绍。',
    aiFallback: '你好，我是小金鱼！我穿着金色、红色、白色的大衣，在池塘里游来游去可好看了！大家都说我的记忆只有 7 秒，那是冤枉我啦，其实我能记住 3 个月的事情！我能认出喂我食物的人，每次看到你就游过来打招呼！',
    animalClass: '鱼类', habitat: '池塘', diet: '草食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'tropicalfish', category: 'animal', nameZh: '热带鱼', nameEn: 'Tropical Fish', phonics: '/ˈtrɒpɪkl fɪʃ/', emoji: '🐡',
    desc: '珊瑚礁里的彩虹居民，五颜六色！', chant: '热带鱼，彩色衣，珊瑚礁里捉迷藏！', funFact: '小丑鱼和海葵是好朋友，海葵保护小丑鱼！',
    aiPrompt: '给宝贝讲热带鱼：热带鱼五颜六色住在珊瑚礁，小丑鱼和海葵是好朋友。用拟人化方式介绍。',
    aiFallback: '哈喽，我是热带鱼！我住在温暖的珊瑚礁里，这里有好多五颜六色的小伙伴！我是小丑鱼，我和海葵是好朋友：海葵的毒触手保护我不被大鱼吃掉，我帮海葵清理身上的脏东西。这叫"互利共生"，就是互相帮助啦！',
    animalClass: '鱼类', habitat: '海洋', diet: '杂食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 80, y: 65 },
  },
  {
    id: 'seahorse', category: 'animal', nameZh: '海马', nameEn: 'Seahorse', phonics: '/ˈsiːhɔːs/', emoji: '🐴',
    desc: '长得像小马的鱼，爸爸负责生宝宝！', chant: '小海马，爸爸生，竖着游泳真有趣！', funFact: '海马是爸爸生宝宝的！',
    aiPrompt: '给宝贝讲海马：海马长得像小马，是爸爸负责生宝宝的。用拟人化方式介绍。',
    aiFallback: '你好，我是海马！虽然我叫"马"，但我其实是鱼！我最特别的地方是：我们海马是爸爸生宝宝的！妈妈把卵放在爸爸的肚袋里，爸爸就怀孕了，等小海马孵化出来，就从爸爸肚子里弹出来！我游泳是竖着的，像站着游泳一样，可好玩了！',
    animalClass: '鱼类', habitat: '海洋', diet: '肉食', sound: '——', sizeLevel: 1, conservationStatus: '易危', habitatCoord: { x: 80, y: 65 },
  },
  {
    id: 'octopus', category: 'animal', nameZh: '章鱼', nameEn: 'Octopus', phonics: '/ˈɒktəpəs/', emoji: '🐙',
    desc: '八条腿的海洋天才，会变色会逃脱！', chant: '八爪鱼，八条腿，聪明绝顶会变色！', funFact: '章鱼有 3 颗心脏和 9 个大脑！',
    aiPrompt: '给宝贝讲章鱼：章鱼有 8 条腿、3 颗心脏、9 个大脑，会变色会开瓶盖。用拟人化方式介绍。',
    aiFallback: '哈喽，我是章鱼！我有 8 条腿，每条腿上都有好多吸盘。我有 3 颗心脏和 9 个大脑，是海洋里最聪明的无脊椎动物！我会变色、会开瓶盖、会走迷宫。遇到危险我就喷墨汁，趁乱逃跑。我的腿断了还能长回来哦！',
    animalClass: '鱼类', habitat: '海洋', diet: '肉食', sound: '——', sizeLevel: 2, conservationStatus: '无危', habitatCoord: { x: 45, y: 55 },
  },
  {
    id: 'mantaray', category: 'animal', nameZh: '魔鬼鱼', nameEn: 'Manta Ray', phonics: '/ˈmæntə reɪ/', emoji: '🐟',
    desc: '海洋中的飞行家，翅膀展开像大风筝！', chant: '魔鬼鱼，大翅膀，海里飞翔真好看！', funFact: '魔鬼鱼翼展可达 7 米，是最大的魟鱼！',
    aiPrompt: '给宝贝讲魔鬼鱼：魔鬼鱼翅膀展开有 7 米，在海里像飞翔一样。用拟人化方式介绍。',
    aiFallback: '你好，我是魔鬼鱼！别被我的名字吓到，我其实很温柔！我的翅膀展开有 7 米宽，像一面大风筝。我在海里扇动翅膀"飞翔"，有时候还会跳出水面翻跟斗！我喜欢吃小小的浮游生物，张开大嘴把水过滤一遍就吃饱了！',
    animalClass: '鱼类', habitat: '海洋', diet: '草食', sound: '——', sizeLevel: 4, conservationStatus: '易危', habitatCoord: { x: 40, y: 50 },
  },

  // ── 昆虫类（8）────────────────────────────────────────────
  {
    id: 'bee', category: 'animal', nameZh: '蜜蜂', nameEn: 'Bee', phonics: '/biː/', emoji: '🐝',
    desc: '勤劳的小花农，酿出甜甜的蜂蜜！', chant: '小蜜蜂，嗡嗡嗡，采花蜜真勤劳！', funFact: '蜜蜂采花蜜，酿出甜甜的蜂蜜',
    aiPrompt: '给宝贝讲蜜蜂：蜜蜂采花蜜酿蜂蜜，跳"8字舞"告诉同伴花在哪里。用拟人化方式介绍。',
    aiFallback: '哈喽，我是小蜜蜂！我每天飞来飞去采花蜜，一朵花一朵花地采，一天能采几百朵！我回到蜂巢会跳"8 字舞"，转圈圈告诉小伙伴花在哪里。我酿的蜂蜜可以保存好久好久不会坏，考古学家在埃及金字塔里找到 3000 年前的蜂蜜，还能吃呢！',
    animalClass: '昆虫', habitat: '花园', diet: '草食', sound: '嗡嗡', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'butterfly', category: 'animal', nameZh: '蝴蝶', nameEn: 'Butterfly', phonics: '/ˈbʌtəflaɪ/', emoji: '🦋',
    desc: '会飞的花朵，从小虫变美丽！', chant: '蝴蝶飞，翅膀美，花丛之中舞翩翩！', funFact: '蝴蝶用脚来"尝"味道！',
    aiPrompt: '给宝贝讲蝴蝶：蝴蝶从毛毛虫变成蝴蝶，用脚尝味道。用拟人化方式介绍。',
    aiFallback: '你好，我是蝴蝶！我小时候是一条毛毛虫，整天吃叶子，吃得胖胖的。然后我把自己包起来变成蛹，在里面慢慢变化，最后破茧而出，变成美丽的蝴蝶！我用脚来"尝"味道，站在花上就能尝出花蜜甜不甜。我的翅膀上有好多小鳞片，像彩色瓦片一样！',
    animalClass: '昆虫', habitat: '花园', diet: '草食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'ant', category: 'animal', nameZh: '蚂蚁', nameEn: 'Ant', phonics: '/ænt/', emoji: '🐜',
    desc: '力气最大的小个子，能举起自己 50 倍重的东西！', chant: '小蚂蚁，力气大，排队走路真整齐！', funFact: '蚂蚁能举起自己体重 50 倍的东西！',
    aiPrompt: '给宝贝讲蚂蚁：蚂蚁力气大，能举起 50 倍体重，排队走路靠气味导航。用拟人化方式介绍。',
    aiFallback: '哈喽，我是小蚂蚁！别看我小，我能举起比我重 50 倍的东西，相当于你举起一辆大卡车！我们蚂蚁走路会留下一道看不见的气味线，后面的小伙伴跟着气味走，所以你看我们总是排着整整齐齐的队伍！我们蚂蚁有蚁后、工蚁、兵蚁，各有各的工作！',
    animalClass: '昆虫', habitat: '花园', diet: '杂食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'ladybug', category: 'animal', nameZh: '瓢虫', nameEn: 'Ladybug', phonics: '/ˈleɪdɪbʌɡ/', emoji: '🐞',
    desc: '圆点点的小甲虫，农民的好帮手！', chant: '瓢虫瓢虫，圆点点，吃蚜虫是好虫！', funFact: '一只瓢虫一天能吃 50 只蚜虫！',
    aiPrompt: '给宝贝讲瓢虫：瓢虫身上有圆点，吃蚜虫是益虫。用拟人化方式介绍。',
    aiFallback: '你好，我是瓢虫！我穿着红色外套，上面有黑色的小圆点，像我穿了一件波点裙！我是农民伯伯的好帮手，因为一天能吃 50 只蚜虫，蚜虫是害虫，会吃庄稼。遇到危险我就装死，四脚朝天一动不动，坏人就不想吃我啦！',
    animalClass: '昆虫', habitat: '花园', diet: '肉食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'dragonfly', category: 'animal', nameZh: '蜻蜓', nameEn: 'Dragonfly', phonics: '/ˈdræɡənflaɪ/', emoji: '🪰',
    desc: '会悬停的飞行高手，眼睛超大的！', chant: '蜻蜓飞，大眼睛，停在空中真厉害！', funFact: '蜻蜓每只眼睛有 3 万个小眼！',
    aiPrompt: '给宝贝讲蜻蜓：蜻蜓会悬停，每只眼睛有 3 万个小眼，是飞行高手。用拟人化方式介绍。',
    aiFallback: '哈喽，我是蜻蜓！我是昆虫界的飞行冠军，能悬停在空中不动，还能倒着飞！我的两只大眼睛各由 3 万个小眼组成，几乎能看到 360 度！我小时候叫"水虿"，住在水里，用直肠呼吸，可特别了！我最爱抓蚊子，是蚊子天敌！',
    animalClass: '昆虫', habitat: '池塘', diet: '肉食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'mantis', category: 'animal', nameZh: '螳螂', nameEn: 'Mantis', phonics: '/ˈmæntɪs/', emoji: '🦗',
    desc: '举着大刀的绿色猎手！', chant: '螳螂螳螂，举大刀，抓虫子真厉害！', funFact: '螳螂是唯一能看到 3D 画面的昆虫！',
    aiPrompt: '给宝贝讲螳螂：螳螂前肢像大刀，是唯一能看 3D 的昆虫。用拟人化方式介绍。',
    aiFallback: '你好，我是螳螂！我的前肢像两把大镰刀，举在胸前，看到猎物就"唰"地一刀抓住！我是唯一能看到 3D 画面的昆虫，能准确判断猎物的距离。我全身绿色，藏在草丛里谁都看不见，是昆虫界的"隐形猎手"！',
    animalClass: '昆虫', habitat: '花园', diet: '肉食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'cricket', category: 'animal', nameZh: '蟋蟀', nameEn: 'Cricket', phonics: '/ˈkrɪkɪt/', emoji: '🦗',
    desc: '夏夜的歌唱家，用翅膀来唱歌！', chant: '蟋蟀叫，唧唧唧，夏夜歌声真好听！', funFact: '蟋蟀用翅膀摩擦来"唱歌"，不是用嘴！',
    aiPrompt: '给宝贝讲蟋蟀：蟋蟀用翅膀摩擦唱歌，是夏夜的歌唱家。用拟人化方式介绍。',
    aiFallback: '哈喽，我是蟋蟀！大家叫我"蛐蛐"，夏天的晚上你听到的"唧唧唧"就是我唱的歌！我不用嘴唱歌，是把两只翅膀互相摩擦发声的。只有男生才会唱歌哦，是在叫女朋友！我还是个跳远高手，一跳能跳自己身体 30 倍远！',
    animalClass: '昆虫', habitat: '花园', diet: '杂食', sound: '唧唧', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
  {
    id: 'grasshopper', category: 'animal', nameZh: '蝈蝈', nameEn: 'Grasshopper', phonics: '/ˈɡrɑːshɒpər/', emoji: '🦗',
    desc: '跳得超远的绿色小虫，爱吃菜叶！', chant: '蝈蝈跳，跳得远，绿色衣裳真好看！', funFact: '蝈蝈一跳能跳自己身体 20 倍的距离！',
    aiPrompt: '给宝贝讲蝈蝈：蝈蝈跳得远，一跳 20 倍身体长度，爱吃菜叶。用拟人化方式介绍。',
    aiFallback: '你好，我是蝈蝈！我穿着绿色的衣服，藏在草丛里很难发现我！我的后腿超有力，一跳能跳自己身体 20 倍远，相当于你跳 30 米！我最爱吃菜叶和庄稼，有时候会和小伙伴一起大规模搬家，把庄稼都吃光，农民伯伯可头疼了！',
    animalClass: '昆虫', habitat: '花园', diet: '草食', sound: '——', sizeLevel: 1, conservationStatus: '无危', habitatCoord: { x: 50, y: 45 },
  },
];

/** 按分类分组 */
export const ANIMALS_BY_CLASS = {
  哺乳: ANIMALS.filter(a => a.animalClass === '哺乳'),
  鸟类: ANIMALS.filter(a => a.animalClass === '鸟类'),
  爬行: ANIMALS.filter(a => a.animalClass === '爬行'),
  两栖: ANIMALS.filter(a => a.animalClass === '两栖'),
  鱼类: ANIMALS.filter(a => a.animalClass === '鱼类'),
  昆虫: ANIMALS.filter(a => a.animalClass === '昆虫'),
};

/** 按栖息地分组 */
export const ANIMALS_BY_HABITAT = {
  草原: ANIMALS.filter(a => a.habitat === '草原'),
  森林: ANIMALS.filter(a => a.habitat === '森林'),
  海洋: ANIMALS.filter(a => a.habitat === '海洋'),
  南极: ANIMALS.filter(a => a.habitat === '南极'),
  北极: ANIMALS.filter(a => a.habitat === '北极'),
  沙漠: ANIMALS.filter(a => a.habitat === '沙漠'),
  竹林: ANIMALS.filter(a => a.habitat === '竹林'),
  池塘: ANIMALS.filter(a => a.habitat === '池塘'),
  天空: ANIMALS.filter(a => a.habitat === '天空'),
  花园: ANIMALS.filter(a => a.habitat === '花园'),
  山地: ANIMALS.filter(a => a.habitat === '山地'),
  河流: ANIMALS.filter(a => a.habitat === '河流'),
};

/** 所有栖息地列表 */
export const HABITATS = Object.keys(ANIMALS_BY_HABITAT) as (keyof typeof ANIMALS_BY_HABITAT)[];

/** 所有分类列表 */
export const ANIMAL_CLASSES = Object.keys(ANIMALS_BY_CLASS) as (keyof typeof ANIMALS_BY_CLASS)[];

/** 体型等级对应的文字描述 */
export const SIZE_LABELS: Record<number, string> = {
  1: '迷你型',
  2: '小型',
  3: '中型',
  4: '大型',
  5: '巨型',
};

/** 濒危等级颜色 */
export const CONSERVATION_COLORS: Record<string, string> = {
  无危: 'text-green-600 bg-green-100',
  近危: 'text-yellow-600 bg-yellow-100',
  易危: 'text-orange-600 bg-orange-100',
  濒危: 'text-red-600 bg-red-100',
  极危: 'text-purple-600 bg-purple-100',
};
