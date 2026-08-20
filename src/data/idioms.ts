/**
 * 常用成语数据 · 60 个
 * ------------------------------------------------------------------
 * 每条含成语/拼音/释义/故事/例句/emoji/难度/主题
 *
 * 分类（双维：难度 level + 主题 category）：
 *   - study 勤学 📚 · wisdom 智慧 🧠 · nature 自然 🌸
 *   - character 品格 💖 · fable 寓言趣事 🎭
 *
 * 精选成语（带 lesson 教育启示 + imagePrompt 插图描述）：
 *   为「讲故事 → 懂道理」的完整学习闭环优先配备，故事更生动、贴合儿童认知。
 */

export type IdiomCategory = 'study' | 'wisdom' | 'nature' | 'character' | 'fable';

export const IDIOM_CATEGORIES: { id: IdiomCategory; emoji: string }[] = [
  { id: 'study', emoji: '📚' },
  { id: 'wisdom', emoji: '🧠' },
  { id: 'nature', emoji: '🌸' },
  { id: 'character', emoji: '💖' },
  { id: 'fable', emoji: '🎭' },
];

export interface Idiom {
  id: string;
  word: string;
  pinyin: string;
  meaning: string;
  story: string;
  example: string;
  emoji: string;
  level: 1 | 2 | 3;
  /** 主题分类 */
  category: IdiomCategory;
  /** 精选成语：一句话道理（讲故事→懂道理） */
  lesson?: string;
  /** 精选成语：插图描述（保留，供后续生成本地插画用） */
  imagePrompt?: string;
  /** 精选成语：本地插画路径（public/idioms/<id>.jpg，渲染以此为主） */
  image?: string;
}

export const IDIOMS: Idiom[] = [
  {
    id: 'i1', word: '一箭双雕', pinyin: 'yī jiàn shuāng diāo',
    meaning: '一支箭射中两只雕，比喻一举两得。',
    story: '古时候有个神箭手，一箭射下两只飞雕，从此传为佳话。',
    example: '我们骑车去上学，既锻炼身体又省时间，真是一箭双雕。',
    emoji: '🏹', level: 1, category: 'wisdom',
  },
  {
    id: 'i2', word: '亡羊补牢', pinyin: 'wáng yáng bǔ láo',
    meaning: '丢了羊再修补羊圈，比喻出了问题再补救还不晚。',
    story: '一天夜里，羊圈破了个洞，狼偷偷钻进来叼走了一只羊。邻居劝农夫快把羊圈修一修，农夫却不以为然。等到第二天又少了一只羊，农夫这才赶紧动手，把羊圈修得结结实实。从此，羊儿再也没有少过。小朋友，犯了错不要紧，只要及时改正，就一点也不晚！',
    example: '虽然考差了，但现在开始努力还来得及，亡羊补牢为时不晚。',
    emoji: '🐑', level: 1, category: 'character',
    lesson: '犯了错及时改正就不算晚。',
    imagePrompt: '儿童水彩插画，软萌果冻风，夜色下农夫正在修补小羊圈的栅栏，两三只圆滚滚的小羊羔在一旁好奇张望，暖黄马灯照明，柔和糖果色背景。',
    image: '/idioms/i2.jpg',
  },
  {
    id: 'i3', word: '守株待兔', pinyin: 'shǒu zhū dài tù',
    meaning: '守在树桩旁等兔子来撞，比喻不主动努力而存侥幸心理。',
    story: '从前有一位农夫。一天他正在田里锄地，一只小兔子飞快地跑来，一不小心“咚”的一声撞到了树桩上，晕了过去。农夫太开心了，捡起兔子回家美美地吃了一顿。第二天，农夫不再锄地了，他坐在树桩旁，等啊等，可是兔子再也没来。他等得田里长满了荒草，最后还是什么也没等到。小朋友，运气是靠不住的，只有自己努力，才会有收获呀！',
    example: '学习要主动努力，不能守株待兔等着天上掉馅饼。',
    emoji: '🐰', level: 1, category: 'fable',
    lesson: '不能靠碰运气过日子，要靠自己努力。',
    imagePrompt: '儿童水彩插画，软萌果冻风，圆脸农夫靠着一棵大树干打瞌睡，旁边长满野草的空田里有一只呆萌小兔子，柔和的绿与米色糖果色背景。',
    image: '/idioms/i3.jpg',
  },
  {
    id: 'i4', word: '画蛇添足', pinyin: 'huà shé tiān zú',
    meaning: '画蛇时给它加上脚，比喻做了多余的事反而不好。',
    story: '古时候，几个人比赛画蛇，谁画得快谁就赢。有个人画得最快，不一会儿就画好了。他得意洋洋，心想再给蛇添上几只脚，一定更威风！他刚添了一只脚，另一个人也画完了，一把夺过酒壶说：“蛇本来没有脚，你添上脚就不是蛇啦，这酒归我！”那人只能眼巴巴地看着美酒被拿走。小朋友，做事恰到好处就好，多此一举反而会坏事哦。',
    example: '作文已经很好了，再加这些多余的句子就是画蛇添足。',
    emoji: '🐍', level: 1, category: 'fable',
    lesson: '做事恰到好处就好，多此一举反而坏事。',
    imagePrompt: '儿童水彩插画，软萌果冻风，两个小朋友低头对着地上一条画好的圆润小蛇，其中一个给蛇添上小脚丫，地上摆着一壶酒，活泼明亮的糖果色背景。',
    image: '/idioms/i4.jpg',
  },
  {
    id: 'i5', word: '井底之蛙', pinyin: 'jǐng dǐ zhī wā',
    meaning: '井底的青蛙，比喻见识短浅的人。',
    story: '在一口幽静的井里，住着一只小青蛙。它每天抬头，都只看到圆圆的一片天空，便骄傲地对飞来的小鸟说：“天就只有井口那么大呀！”小鸟笑着说：“你出来看看就知道了，天可大得无边无际呢！”青蛙跳出井口，眼前的天空辽阔又明亮，它这才明白，自己从前看到的世界太小啦。小朋友，多出去走走、多看看书，世界比我们想象的大得多！',
    example: '我们要多读书多看看世界，不能做井底之蛙。',
    emoji: '🐸', level: 1, category: 'fable',
    lesson: '世界很大，要多开眼界，别骄傲自满。',
    imagePrompt: '儿童水彩插画，软萌果冻风，一只圆润呆萌的小青蛙从古老井口探出头，看到头顶辽阔湛蓝天空和朵朵白云，井外的小鸟扇着翅膀，明亮的糖果色背景。',
    image: '/idioms/i5.jpg',
  },
  {
    id: 'i6', word: '狐假虎威', pinyin: 'hú jiǎ hǔ wēi',
    meaning: '狐狸借着老虎的威风吓唬别人，比喻依仗别人的势力欺压人。',
    story: '一天，老虎抓住了一只小狐狸，正要吃它。“等等！”狐狸眼珠一转，大声说：“我可是天帝派来管理百兽的大王，你敢吃我？”老虎半信半疑，跟着狐狸走进森林。小动物们一见狐狸身后的老虎，吓得四散奔逃。老虎一看：哎呀，果然百兽都怕狐狸！它不知道，大家怕的是它自己呀。小朋友，借着别人的威风吓人是不可取的，只有自己真正有本事才最可靠。',
    example: '他总是借着班长的名义欺负同学，真是狐假虎威。',
    emoji: '🦊', level: 1, category: 'fable',
    lesson: '借别人的威风吓人，自己并没有真本事。',
    imagePrompt: '儿童水彩插画，软萌果冻风，胖胖的小狐狸得意洋洋地走在前面，身后跟着一只威风却憨憨的大老虎，小动物们好奇张望，柔和的森林糖果色背景。',
    image: '/idioms/i6.jpg',
  },
  { id: 'i7', word: '刻舟求剑', pinyin: 'kè zhōu qiú jiàn', meaning: '在船上刻记号来找掉进水里的剑，比喻方法不对。', story: '楚国有个商人要坐船过江。船行到江中央，一阵晃动，他腰间的宝剑“扑通”一声掉进了水里。商人不慌不忙，拿出小刀在船边刻了个记号，说：“我的剑就是从这里掉下去的。”船靠了岸，商人立刻从记号处跳进水里找剑，可江水滔滔，剑早就被冲走了。小朋友，船已经走远了，记号怎么会有用呢？遇到事情要动脑筋，不能用老办法应对新情况呀！', example: '情况已经变了，你还用老办法，这不是刻舟求剑吗？', emoji: '⚔️', level: 2, category: 'wisdom',
    lesson: '情况变了，方法也要跟着变，要懂得变通。',
    imagePrompt: '儿童水彩插画，软萌果冻风，一只古式小船行驶在清澈江面上，船上的圆脸商人指着船舷上的小记号，水中一条小刀的剪影，蓝天白云暖黄色糖果背景。',
    image: '/idioms/i7.jpg' },
  { id: 'i8', word: '拔苗助长', pinyin: 'bá miáo zhù zhǎng', meaning: '把禾苗拔高帮助它生长，比喻急于求成反而坏事。', story: '农夫嫌禾苗长得慢，把它们往上拔了一点，结果禾苗都枯死了。', example: '学习要循序渐进，不能拔苗助长。', emoji: '🌾', level: 1, category: 'fable' },
  { id: 'i9', word: '对牛弹琴', pinyin: 'duì niú tán qín', meaning: '对着牛弹琴，比喻对不懂道理的人讲道理。', story: '音乐家给牛弹奏高雅的曲子，牛只顾吃草。', example: '给他讲这么深的道理，简直是对牛弹琴。', emoji: '🐄', level: 2, category: 'fable' },
  { id: 'i10', word: '掩耳盗铃', pinyin: 'yǎn ěr dào líng', meaning: '捂着耳朵偷铃铛，比喻自欺欺人。', story: '小偷以为捂住自己的耳朵别人就听不到铃铛声了。', example: '考试抄袭还以为老师不知道，真是掩耳盗铃。', emoji: '🔔', level: 2, category: 'fable' },
  { id: 'i11', word: '自相矛盾', pinyin: 'zì xiāng máo dùn', meaning: '自己的言行相互对立，不能自圆其说。', story: '卖矛和盾的人说盾什么都挡得住，矛什么都刺得穿。', example: '你说不去又想去，这不是自相矛盾吗？', emoji: '🛡️', level: 2, category: 'wisdom' },
  {
    id: 'i12', word: '水滴石穿', pinyin: 'shuǐ dī shí chuān',
    meaning: '水不断滴下能把石头滴穿，比喻坚持不懈就能成功。',
    story: '山崖下，一滴一滴的小水珠，日夜不停地落在同一块石头上。小鸟看见了，心疼地问：“石头那么硬，你那么小，何必为难自己呀？”小水珠笑笑说：“只要我一直不停地滴，总有一天能穿透它！”一天、一年、十年……水珠始终没有放弃。终于有一天，坚硬的石头上被滴出了一道圆圆的小洞。小朋友，就像背单词、练字一样，每天坚持一点点，日积月累就能创造奇迹！',
    example: '每天背几个单词，水滴石穿，一年就能学会很多。',
    emoji: '💧', level: 1, category: 'study',
    lesson: '每天坚持一点点，日积月累就能成功。',
    imagePrompt: '儿童水彩插画，软萌果冻风，一颗晶莹小水珠滴落在圆润的青石上溅起小水花，旁边一只可爱小鸟歪头看着，暖绿与天蓝色糖果色背景。',
    image: '/idioms/i12.jpg',
  },
  { id: 'i13', word: '半途而废', pinyin: 'bàn tú ér fèi', meaning: '走到半路就停下来，比喻做事不能坚持到底。', story: '乐羊子读书读到一半就回家，妻子剪断织布告诉他不能半途而废。', example: '学钢琴已经三年了，不能半途而废。', emoji: '🛤️', level: 2, category: 'character' },
  { id: 'i14', word: '胸有成竹', pinyin: 'xiōng yǒu chéng zhú', meaning: '画竹子前心中已有竹子的形象，比喻做事前已有完整计划。', story: '画家文与可画竹前，心中已有竹子的完整形象。', example: '这次考试我准备得很充分，胸有成竹。', emoji: '🎋', level: 2, category: 'study' },
  {
    id: 'i15', word: '闻鸡起舞', pinyin: 'wén jī qǐ wǔ',
    meaning: '听到鸡叫就起来练剑，比喻有志之人奋发努力。',
    story: '古时候，有个叫祖逖的少年，他和好朋友刘琨立志要做一番大事业。每天天还没亮，公鸡一打鸣，两人就立刻从被窝里爬起来，到院子里练剑。宝剑在晨光中闪出一道道亮光，他们练得满头大汗也不肯停下。就这样日复一日，他们练就了高强的本领，后来都成为了保家卫国的大英雄。小朋友，想做成大事，就要像他们一样勤奋刻苦、说到做到！',
    example: '他每天闻鸡起舞，刻苦训练，终于成了冠军。',
    emoji: '🐓', level: 2, category: 'study',
    lesson: '勤奋刻苦、说到做到，梦想就能实现。',
    imagePrompt: '儿童水彩插画，软萌果冻风，天刚泛白的清晨，两个圆脸小朋友在庭院里精神抖擞地舞着木剑，旁边一只大红公鸡跳上墙头啼叫，淡橘与暖黄色的清晨糖果色背景。',
    image: '/idioms/i15.jpg',
  },
  {
    id: 'i16', word: '愚公移山', pinyin: 'yú gōng yí shān',
    meaning: '愚公决心把山移走，比喻有毅力不怕困难。',
    story: '很久以前，有一位叫愚公的老爷爷，家门口挡着两座又高又大的山，出门很不方便。于是他召集全家人，说：“我们一起把这两座山搬走吧！”邻居笑话他：“你都这么老了，哪搬得动大山呀？”愚公笑着说：“我是老了，可我有了儿子，儿子又有了孙子，子子孙孙搬下去，总有一天能搬完！”后来，他的坚持感动了天帝，派神仙帮他把山搬走了。小朋友，只要有恒心、不怕困难，再大的困难也能战胜！',
    example: '只要我们有愚公移山的精神，什么困难都能克服。',
    emoji: '⛰️', level: 2, category: 'study',
    lesson: '只要有恒心、不怕困难，坚持到底就能成功。',
    imagePrompt: '儿童水彩插画，软萌果冻风，白胡子圆脸老爷爷挑着两个小竹篮，一家老小黄悠悠地搬动一座大山的土石，山形柔和，远处暖阳，绿与橙的糖果色渐变背景。',
    image: '/idioms/i16.jpg',
  },
  { id: 'i17', word: '熟能生巧', pinyin: 'shú néng shēng qiǎo', meaning: '熟练了就能产生巧办法。', story: '卖油翁能把油从铜钱孔中倒入而不沾湿铜钱，他说只是熟能生巧。', example: '数学要多做练习，熟能生巧就快了。', emoji: '🎯', level: 1, category: 'study' },
  { id: 'i18', word: '百发百中', pinyin: 'bǎi fā bǎi zhòng', meaning: '每次都命中目标，形容准确率极高。', story: '养由基射箭百发百中，被称为神箭手。', example: '他投篮百发百中，是我们班的篮球明星。', emoji: '🎯', level: 1, category: 'study' },
  { id: 'i19', word: '风吹草动', pinyin: 'fēng chuī cǎo dòng', meaning: '风吹动草的动静，比喻微小的变化。', story: '猎人时刻注意风吹草动，等待猎物出现。', example: '夜里有点风吹草动，小狗就会叫起来。', emoji: '🍃', level: 2, category: 'nature' },
  {
    id: 'i20', word: '春暖花开', pinyin: 'chūn nuǎn huā kāi',
    meaning: '春天温暖，百花开放，形容大好春光。',
    story: '冬天悄悄地过去了，春风暖暖地吹来。小河里的冰融化了，溪水唱着歌向前跑。花园里，桃花、杏花、迎春花都露出了笑脸，红红的、粉粉的、黄黄的，你挤我碰，好不热闹。小鸟在枝头叽叽喳喳地唱歌，蝴蝶在花丛中翩翩起舞。大人们带着宝贝去郊外踏青，春风轻轻吹过脸颊，真舒服呀！小朋友，这就是春暖花开的好时节，快去拥抱美好的春天吧！',
    example: '春暖花开的时候，我们去公园赏花吧。',
    emoji: '🌸', level: 1, category: 'nature',
    lesson: '春天万物复苏、生机勃勃，要珍惜美好时光。',
    imagePrompt: '儿童水彩插画，软萌果冻风，粉粉的桃花瓣随风飘落，花开满树，草地上蝴蝶飞舞、溪水泛光，远处蓝天白云，粉与薄荷绿的糖果色背景。',
    image: '/idioms/i20.jpg',
  },
  { id: 'i21', word: '金枝玉叶', pinyin: 'jīn zhī yù yè', meaning: '原指花木枝叶美好，后比喻皇族子孙。', story: '古时候皇族子弟被称为金枝玉叶。', example: '这些花就像金枝玉叶一样美丽。', emoji: '🌿', level: 3, category: 'nature' },
  { id: 'i22', word: '大材小用', pinyin: 'dà cái xiǎo yòng', meaning: '大的材料用在小处，比喻人才使用不当。', story: '大松木被用来做小凳子，太浪费了。', example: '让大学生去扫地，真是大材小用。', emoji: '🪵', level: 2, category: 'character' },
  { id: 'i23', word: '风吹雨打', pinyin: 'fēng chuī yǔ dǎ', meaning: '风雨的侵袭，比喻经历的磨难。', story: '小树苗经历风吹雨打后长得更加结实。', example: '不管风吹雨打，他每天都坚持跑步。', emoji: '🌧️', level: 2, category: 'nature' },
  { id: 'i24', word: '九牛一毛', pinyin: 'jiǔ niú yī máo', meaning: '九头牛身上的一根毛，比喻极大数量中微不足道的一部分。', story: '富翁捐出一块钱就像九牛一毛，毫不在意。', example: '这些知识只是九牛一毛，还有很多要学。', emoji: '🐮', level: 3, category: 'wisdom' },
  { id: 'i25', word: '日新月异', pinyin: 'rì xīn yuè yì', meaning: '每天每月都有新的变化，形容进步很快。', story: '城市发展日新月异，每天都有新变化。', example: '科技日新月异，手机越来越先进。', emoji: '📱', level: 2, category: 'study' },
  { id: 'i26', word: '天马行空', pinyin: 'tiān mǎ xíng kōng', meaning: '天马在空中飞驰，比喻思想奔放不受拘束。', story: '神马在天空中自由飞翔，不受任何阻碍。', example: '他的想象力天马行空，总能想出好点子。', emoji: '🐴', level: 3, category: 'character' },
  { id: 'i27', word: '龙飞凤舞', pinyin: 'lóng fēi fèng wǔ', meaning: '形容书法笔势有力，灵活舒展。', story: '书法家的字写得龙飞凤舞，非常壮观。', example: '他的草书龙飞凤舞，让人赞叹。', emoji: '🐉', level: 3, category: 'study' },
  { id: 'i28', word: '鸟语花香', pinyin: 'niǎo yǔ huā xiāng', meaning: '鸟儿鸣叫，花朵飘香，形容春天的美好景象。', story: '春天来了，公园里鸟语花香，美极了。', example: '清晨的花园鸟语花香，让人心旷神怡。', emoji: '🐦', level: 1, category: 'nature' },
  { id: 'i29', word: '马到成功', pinyin: 'mǎ dào chéng gōng', meaning: '战马一到就取得胜利，形容顺利成功。', story: '将军骑马冲到阵前，一战即胜。', example: '祝你考试马到成功！', emoji: '🐎', level: 1, category: 'character' },
  { id: 'i30', word: '虎头蛇尾', pinyin: 'hǔ tóu shé wěi', meaning: '头大如虎，尾细如蛇，比喻做事有始无终。', story: '做事开始很积极，后来就松懈了。', example: '做事不能虎头蛇尾，要有始有终。', emoji: '🐯', level: 2, category: 'character' },
  { id: 'i31', word: '鸡飞狗跳', pinyin: 'jī fēi gǒu tiào', meaning: '鸡飞起来狗跳起来，形容混乱的场面。', story: '小偷进村惹得鸡飞狗跳。', example: '弟弟一回家就闹得鸡飞狗跳。', emoji: '🐔', level: 2, category: 'fable' },
  { id: 'i32', word: '鱼跃龙门', pinyin: 'yú yuè lóng mén', meaning: '鱼跳过龙门就变成龙，比喻一举成名。', story: '鲤鱼逆流而上跳过龙门，变成了龙。', example: '经过努力考上名校，真是鱼跃龙门。', emoji: '🐟', level: 3, category: 'study' },
  { id: 'i33', word: '蛛丝马迹', pinyin: 'zhū sī mǎ jì', meaning: '蜘蛛丝和马的足迹，比喻隐约可寻的线索。', story: '侦探从蛛丝马迹中找到了真相。', example: '从蛛丝马迹来看，他已经离开了。', emoji: '🕸️', level: 3, category: 'wisdom' },
  { id: 'i34', word: '鹤立鸡群', pinyin: 'hè lì jī qún', meaning: '鹤站在鸡群中很突出，比喻才能出众。', story: '仙鹤站在鸡群中格外显眼。', example: '他个子最高，站在队伍里鹤立鸡群。', emoji: '🦩', level: 2, category: 'character' },
  { id: 'i35', word: '蜂拥而至', pinyin: 'fēng yōng ér zhì', meaning: '像蜂群一样涌来，形容人多。', story: '听到有免费礼物，人们蜂拥而至。', example: '商店打折，顾客蜂拥而至。', emoji: '🐝', level: 3, category: 'nature' },
  {
    id: 'i36', word: '画龙点睛', pinyin: 'huà lóng diǎn jīng',
    meaning: '画龙时点上眼睛，比喻关键处用一语使内容生动。',
    story: '古时候，有位画家在墙上画了四条龙，画得活灵活现，可就是没有眼睛。有人问他为什么不画眼睛，画家神秘地说：“画上眼睛，龙就会飞走啦！”大家都笑他说大话。画家提起笔，轻轻给两条龙点上眼睛。忽然，天边电闪雷鸣，那两条龙“轰隆”一声破墙而出，腾云驾雾飞上了天！小朋友，就像写好作文最关键的一句一样，把重要的细节点出来，整个作品就活起来啦！',
    example: '这篇文章结尾那句话真是画龙点睛。',
    emoji: '🐲', level: 2, category: 'study',
    lesson: '最关键的细节做好了，整个作品就活起来。',
    imagePrompt: '儿童水彩插画，软萌果冻风，一位圆脸小画家举着毛笔给墙上的胖青龙点眼睛，青龙眼睛一亮、腾空飞起，周围祥云朵朵，蓝与金黄的糖果色背景。',
    image: '/idioms/i36.jpg',
  },
  { id: 'i37', word: '坐井观天', pinyin: 'zuò jǐng guān tiān', meaning: '坐在井底看天，比喻眼界狭小。', story: '青蛙坐在井里，看到的天只有井口大。', example: '不多出去走走，就像坐井观天一样。', emoji: '🐸', level: 1, category: 'fable' },
  { id: 'i38', word: '杯弓蛇影', pinyin: 'bēi gōng shé yǐng', meaning: '杯中弓影误认为蛇，比喻疑神疑鬼。', story: '乐广请朋友喝酒，朋友把弓影当成蛇，吓得生病。', example: '别杯弓蛇影了，那只是个影子。', emoji: '🐍', level: 3, category: 'fable' },
  { id: 'i39', word: '叶公好龙', pinyin: 'yè gōng hào lóng', meaning: '叶公口头说喜欢龙，真龙来了却害怕，比喻表面爱好而非真心。', story: '叶公到处画龙，真龙来拜访时他吓跑了。', example: '他说喜欢挑战，但真遇到困难就退缩，真是叶公好龙。', emoji: '🐉', level: 2, category: 'fable' },
  { id: 'i40', word: '黔驴技穷', pinyin: 'qián lǘ jì qióng', meaning: '黔地的驴子技能用完了，比喻有限的本领已经用完。', story: '驴子只会踢和叫，老虎看穿后就把它吃了。', example: '他的借口已经黔驴技穷了。', emoji: '🫏', level: 3, category: 'fable' },
  { id: 'i41', word: '鹏程万里', pinyin: 'péng chéng wàn lǐ', meaning: '大鹏飞万里，比喻前程远大。', story: '大鹏展翅高飞，一飞就是万里。', example: '祝你鹏程万里，前程似锦！', emoji: '🦅', level: 2, category: 'character' },
  {
    id: 'i42', word: '雪中送炭', pinyin: 'xuě zhōng sòng tàn',
    meaning: '下雪时送炭取暖，比喻在别人急需时给以帮助。',
    story: '冬天，北风呼呼地刮，下起了鹅毛大雪。一户穷人家没有柴火，冻得直发抖。这时，邻居李大叔背着一捆炭火，踏着厚厚的雪赶来，说：“快，先暖暖身子！”炉火噼啪作响，屋里渐渐暖和起来，一家人感动得连声道谢。后来，这家人也常常帮助别人。小朋友，在别人最需要的时候伸出援手，就像雪中的炭火一样温暖又珍贵！',
    example: '在我最困难的时候你帮助了我，真是雪中送炭。',
    emoji: '🔥', level: 2, category: 'character',
    lesson: '在别人最需要的时候帮助他，是最珍贵的温暖。',
    imagePrompt: '儿童水彩插画，软萌果冻风，大雪纷飞的暖橙色屋子里，圆脸大叔把一捆炭火递给瑟瑟发抖的一家人，炉火映红他们的笑脸，冷蓝与暖橙对比的糖果色背景。',
    image: '/idioms/i42.jpg',
  },
  { id: 'i43', word: '画饼充饥', pinyin: 'huà bǐng chōng jī', meaning: '画个饼来充饥，比喻空想不能解决问题。', story: '饿了画个饼，看着饼却吃不到。', example: '光说不做就像画饼充饥，没有用。', emoji: '🍪', level: 2, category: 'fable' },
  { id: 'i44', word: '打草惊蛇', pinyin: 'dǎ cǎo jīng shé', meaning: '打草时惊动了蛇，比喻做事不谨慎惊动了对方。', story: '有人打草丛，结果把藏在里面的蛇惊走了。', example: '别打草惊蛇，等证据确凿再行动。', emoji: '🐍', level: 3, category: 'wisdom' },
  { id: 'i45', word: '火树银花', pinyin: 'huǒ shù yín huā', meaning: '形容灯火灿烂或烟花绚丽。', story: '元宵节的夜晚，烟花如火树银花般绚烂。', example: '国庆夜的烟火火树银花，美极了。', emoji: '🎆', level: 3, category: 'nature' },
  { id: 'i46', word: '春风化雨', pinyin: 'chūn fēng huà yǔ', meaning: '春天的风和雨，比喻良好的教育。', story: '老师的教导如春风化雨，润物无声。', example: '老师的关怀如春风化雨，温暖了每个学生。', emoji: '🌧️', level: 3, category: 'character' },
  { id: 'i47', word: '秋高气爽', pinyin: 'qiū gāo qì shuǎng', meaning: '秋天天气晴朗凉爽。', story: '秋天天高云淡，空气清新凉爽。', example: '秋高气爽的日子最适合郊游。', emoji: '🍂', level: 1, category: 'nature' },
  { id: 'i48', word: '冰天雪地', pinyin: 'bīng tiān xuě dì', meaning: '形容冰雪漫天的严寒景象。', story: '北极到处是冰天雪地。', example: '冬天到了北方，到处冰天雪地。', emoji: '❄️', level: 2, category: 'nature' },
  { id: 'i49', word: '百花齐放', pinyin: 'bǎi huā qí fàng', meaning: '各种花一齐开放，比喻不同事物自由发展。', story: '春天来了，百花齐放，万紫千红。', example: '艺术应该百花齐放，各有特色。', emoji: '🌺', level: 1, category: 'nature' },
  { id: 'i50', word: '万紫千红', pinyin: 'wàn zǐ qiān hóng', meaning: '形容百花争奇斗艳的春景。', story: '花园里万紫千红，美不胜收。', example: '春天到了，公园里万紫千红。', emoji: '🌈', level: 2, category: 'nature' },
  { id: 'i51', word: '一鸣惊人', pinyin: 'yī míng jīng rén', meaning: '一声鸣叫震惊众人，比喻平时默默无闻，一下子做出惊人成绩。', story: '齐威王三年不理事，一出手就让全国震惊。', example: '他平时不声不响，这次比赛却一鸣惊人。', emoji: '🐦', level: 2, category: 'study' },
  { id: 'i52', word: '三心二意', pinyin: 'sān xīn èr yì', meaning: '心思不专一，形容不专心。', story: '小猫钓鱼时三心二意，一会儿追蜻蜓一会儿捉蝴蝶。', example: '学习不能三心二意，要专心致志。', emoji: '🐱', level: 1, category: 'character' },
  { id: 'i53', word: '四海为家', pinyin: 'sì hǎi wéi jiā', meaning: '到处都可以当作家，形容志在四方。', story: '旅行家四海为家，走到哪里住到哪里。', example: '他四海为家，走遍了全世界。', emoji: '🌍', level: 2, category: 'character' },
  { id: 'i54', word: '五颜六色', pinyin: 'wǔ yán liù sè', meaning: '形容颜色多而鲜艳。', story: '花园里的花五颜六色，非常好看。', example: '气球五颜六色，真漂亮。', emoji: '🎈', level: 1, category: 'nature' },
  { id: 'i55', word: '七上八下', pinyin: 'qī shàng bā xià', meaning: '形容心里慌乱不安。', story: '考试前他心里七上八下的。', example: '等成绩的时候心里七上八下。', emoji: '😟', level: 1, category: 'character' },
  { id: 'i56', word: '九死一生', pinyin: 'jiǔ sǐ yī shēng', meaning: '形容经历极大危险而幸存。', story: '探险家九死一生从沙漠中走了出来。', example: '那次车祸真是九死一生。', emoji: '😰', level: 3, category: 'fable' },
  { id: 'i57', word: '十全十美', pinyin: 'shí quán shí měi', meaning: '各方面都完美无缺。', story: '没有人是十全十美的，每个人都有优点和缺点。', example: '这件事做得十全十美，无可挑剔。', emoji: '💯', level: 1, category: 'character' },
  { id: 'i58', word: '百折不挠', pinyin: 'bǎi zhé bù náo', meaning: '无论受多少挫折都不退缩，形容意志坚强。', story: '爱迪生百折不挠，试了上千次才发明灯泡。', example: '遇到困难要百折不挠，不能轻易放弃。', emoji: '💪', level: 2, category: 'study' },
  { id: 'i59', word: '千军万马', pinyin: 'qiān jūn wàn mǎ', meaning: '形容雄壮的队伍或浩大的声势。', story: '将军率领千军万马奔赴战场。', example: '洪水像千军万马一样冲过来。', emoji: '🐎', level: 2, category: 'fable' },
  { id: 'i60', word: '万众一心', pinyin: 'wàn zhòng yī xīn', meaning: '千万人一条心，形容齐心协力。', story: '全国人民万众一心，共同抗灾。', example: '只要万众一心，就没有克服不了的困难。', emoji: '🤝', level: 2, category: 'character' },
];

export function getIdiomsByLevel(level: 1 | 2 | 3): Idiom[] {
  return IDIOMS.filter(i => i.level === level);
}

export function getIdiomsByCategory(category: IdiomCategory): Idiom[] {
  return IDIOMS.filter(i => i.category === category);
}

export function searchIdioms(query: string): Idiom[] {
  const q = query.trim().toLowerCase();
  return IDIOMS.filter(i =>
    i.word.includes(q) ||
    i.pinyin.includes(q) ||
    i.meaning.includes(q) ||
    i.example.includes(q)
  );
}