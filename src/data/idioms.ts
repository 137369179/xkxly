/**
 * 常用成语数据 · 60 个
 * ------------------------------------------------------------------
 * 每条含成语/拼音/释义/故事/例句/emoji/难度
 */

export interface Idiom {
  id: string;
  word: string;
  pinyin: string;
  meaning: string;
  story: string;
  example: string;
  emoji: string;
  level: 1 | 2 | 3;
}

export const IDIOMS: Idiom[] = [
  { id: 'i1', word: '一箭双雕', pinyin: 'yī jiàn shuāng diāo', meaning: '一支箭射中两只雕，比喻一举两得。', story: '古时候有个神箭手，一箭射下两只飞雕，从此传为佳话。', example: '我们骑车去上学，既锻炼身体又省时间，真是一箭双雕。', emoji: '🏹', level: 1 },
  { id: 'i2', word: '亡羊补牢', pinyin: 'wáng yáng bǔ láo', meaning: '丢了羊再修补羊圈，比喻出了问题再补救还不晚。', story: '牧羊人丢了羊后才修补羊圈，邻居说现在补还不迟。', example: '虽然考差了，但现在开始努力还来得及，亡羊补牢为时不晚。', emoji: '🐑', level: 1 },
  { id: 'i3', word: '守株待兔', pinyin: 'shǒu zhū dài tù', meaning: '守在树桩旁等兔子来撞，比喻不主动努力而存侥幸心理。', story: '农夫偶然捡到撞树的兔子，就天天守在树旁等，结果什么也没等到。', example: '学习要主动努力，不能守株待兔等着天上掉馅饼。', emoji: '🐰', level: 1 },
  { id: 'i4', word: '画蛇添足', pinyin: 'huà shé tiān zú', meaning: '画蛇时给它加上脚，比喻做了多余的事反而不好。', story: '比赛画蛇，有人先画完了又给蛇添上脚，结果输了。', example: '作文已经很好了，再加这些多余的句子就是画蛇添足。', emoji: '🐍', level: 1 },
  { id: 'i5', word: '井底之蛙', pinyin: 'jǐng dǐ zhī wā', meaning: '井底的青蛙，比喻见识短浅的人。', story: '青蛙坐在井里，以为天只有井口那么大。', example: '我们要多读书多看看世界，不能做井底之蛙。', emoji: '🐸', level: 1 },
  { id: 'i6', word: '狐假虎威', pinyin: 'hú jiǎ hǔ wēi', meaning: '狐狸借着老虎的威风吓唬别人，比喻依仗别人的势力欺压人。', story: '狐狸被老虎抓住，说自己是天帝派来的，让老虎跟它走一趟看看。', example: '他总是借着班长的名义欺负同学，真是狐假虎威。', emoji: '🦊', level: 1 },
  { id: 'i7', word: '刻舟求剑', pinyin: 'kè zhōu qiú jiàn', meaning: '在船上刻记号来找掉进水里的剑，比喻方法不对。', story: '楚国人坐船时剑掉水里，他在船舷刻了个记号，到岸后才下水找。', example: '情况已经变了，你还用老办法，这不是刻舟求剑吗？', emoji: '⚔️', level: 2 },
  { id: 'i8', word: '拔苗助长', pinyin: 'bá miáo zhù zhǎng', meaning: '把禾苗拔高帮助它生长，比喻急于求成反而坏事。', story: '农夫嫌禾苗长得慢，把它们往上拔了一点，结果禾苗都枯死了。', example: '学习要循序渐进，不能拔苗助长。', emoji: '🌾', level: 1 },
  { id: 'i9', word: '对牛弹琴', pinyin: 'duì niú tán qín', meaning: '对着牛弹琴，比喻对不懂道理的人讲道理。', story: '音乐家给牛弹奏高雅的曲子，牛只顾吃草。', example: '给他讲这么深的道理，简直是对牛弹琴。', emoji: '🐄', level: 2 },
  { id: 'i10', word: '掩耳盗铃', pinyin: 'yǎn ěr dào líng', meaning: '捂着耳朵偷铃铛，比喻自欺欺人。', story: '小偷以为捂住自己的耳朵别人就听不到铃铛声了。', example: '考试抄袭还以为老师不知道，真是掩耳盗铃。', emoji: '🔔', level: 2 },
  { id: 'i11', word: '自相矛盾', pinyin: 'zì xiāng máo dùn', meaning: '自己的言行相互对立，不能自圆其说。', story: '卖矛和盾的人说盾什么都挡得住，矛什么都刺得穿。', example: '你说不去又想去，这不是自相矛盾吗？', emoji: '🛡️', level: 2 },
  { id: 'i12', word: '水滴石穿', pinyin: 'shuǐ dī shí chuān', meaning: '水不断滴下能把石头滴穿，比喻坚持不懈就能成功。', story: '水滴年复一年落在同一块石头上，终于滴出了一个洞。', example: '每天背几个单词，水滴石穿，一年就能学会很多。', emoji: '💧', level: 1 },
  { id: 'i13', word: '半途而废', pinyin: 'bàn tú ér fèi', meaning: '走到半路就停下来，比喻做事不能坚持到底。', story: '乐羊子读书读到一半就回家，妻子剪断织布告诉他不能半途而废。', example: '学钢琴已经三年了，不能半途而废。', emoji: '🛤️', level: 2 },
  { id: 'i14', word: '胸有成竹', pinyin: 'xiōng yǒu chéng zhú', meaning: '画竹子前心中已有竹子的形象，比喻做事前已有完整计划。', story: '画家文与可画竹前，心中已有竹子的完整形象。', example: '这次考试我准备得很充分，胸有成竹。', emoji: '🎋', level: 2 },
  { id: 'i15', word: '闻鸡起舞', pinyin: 'wén jī qǐ wǔ', meaning: '听到鸡叫就起来练剑，比喻有志之人奋发努力。', story: '祖逖和刘琨每天听到鸡叫就起床练剑，后来都成了大将军。', example: '他每天闻鸡起舞，刻苦训练，终于成了冠军。', emoji: '🐓', level: 2 },
  { id: 'i16', word: '愚公移山', pinyin: 'yú gōng yí shān', meaning: '愚公决心把山移走，比喻有毅力不怕困难。', story: '愚公家门口有两座大山，他带领全家人一点一点把山移走。', example: '只要我们有愚公移山的精神，什么困难都能克服。', emoji: '⛰️', level: 2 },
  { id: 'i17', word: '熟能生巧', pinyin: 'shú néng shēng qiǎo', meaning: '熟练了就能产生巧办法。', story: '卖油翁能把油从铜钱孔中倒入而不沾湿铜钱，他说只是熟能生巧。', example: '数学要多做练习，熟能生巧就快了。', emoji: '🎯', level: 1 },
  { id: 'i18', word: '百发百中', pinyin: 'bǎi fā bǎi zhòng', meaning: '每次都命中目标，形容准确率极高。', story: '养由基射箭百发百中，被称为神箭手。', example: '他投篮百发百中，是我们班的篮球明星。', emoji: '🎯', level: 1 },
  { id: 'i19', word: '风吹草动', pinyin: 'fēng chuī cǎo dòng', meaning: '风吹动草的动静，比喻微小的变化。', story: '猎人时刻注意风吹草动，等待猎物出现。', example: '夜里有点风吹草动，小狗就会叫起来。', emoji: '🍃', level: 2 },
  { id: 'i20', word: '春暖花开', pinyin: 'chūn nuǎn huā kāi', meaning: '春天温暖，百花开放，形容大好春光。', story: '冬去春来，天气变暖，花园里的花都开了。', example: '春暖花开的时候，我们去公园赏花吧。', emoji: '🌸', level: 1 },
  { id: 'i21', word: '金枝玉叶', pinyin: 'jīn zhī yù yè', meaning: '原指花木枝叶美好，后比喻皇族子孙。', story: '古时候皇族子弟被称为金枝玉叶。', example: '这些花就像金枝玉叶一样美丽。', emoji: '🌿', level: 3 },
  { id: 'i22', word: '大材小用', pinyin: 'dà cái xiǎo yòng', meaning: '大的材料用在小处，比喻人才使用不当。', story: '大松木被用来做小凳子，太浪费了。', example: '让大学生去扫地，真是大材小用。', emoji: '🪵', level: 2 },
  { id: 'i23', word: '风吹雨打', pinyin: 'fēng chuī yǔ dǎ', meaning: '风雨的侵袭，比喻经历的磨难。', story: '小树苗经历风吹雨打后长得更加结实。', example: '不管风吹雨打，他每天都坚持跑步。', emoji: '🌧️', level: 2 },
  { id: 'i24', word: '九牛一毛', pinyin: 'jiǔ niú yī máo', meaning: '九头牛身上的一根毛，比喻极大数量中微不足道的一部分。', story: '富翁捐出一块钱就像九牛一毛，毫不在意。', example: '这些知识只是九牛一毛，还有很多要学。', emoji: '🐮', level: 3 },
  { id: 'i25', word: '日新月异', pinyin: 'rì xīn yuè yì', meaning: '每天每月都有新的变化，形容进步很快。', story: '城市发展日新月异，每天都有新变化。', example: '科技日新月异，手机越来越先进。', emoji: '📱', level: 2 },
  { id: 'i26', word: '天马行空', pinyin: 'tiān mǎ xíng kōng', meaning: '天马在空中飞驰，比喻思想奔放不受拘束。', story: '神马在天空中自由飞翔，不受任何阻碍。', example: '他的想象力天马行空，总能想出好点子。', emoji: '🐴', level: 3 },
  { id: 'i27', word: '龙飞凤舞', pinyin: 'lóng fēi fèng wǔ', meaning: '形容书法笔势有力，灵活舒展。', story: '书法家的字写得龙飞凤舞，非常壮观。', example: '他的草书龙飞凤舞，让人赞叹。', emoji: '🐉', level: 3 },
  { id: 'i28', word: '鸟语花香', pinyin: 'niǎo yǔ huā xiāng', meaning: '鸟儿鸣叫，花朵飘香，形容春天的美好景象。', story: '春天来了，公园里鸟语花香，美极了。', example: '清晨的花园鸟语花香，让人心旷神怡。', emoji: '🐦', level: 1 },
  { id: 'i29', word: '马到成功', pinyin: 'mǎ dào chéng gōng', meaning: '战马一到就取得胜利，形容顺利成功。', story: '将军骑马冲到阵前，一战即胜。', example: '祝你考试马到成功！', emoji: '🐎', level: 1 },
  { id: 'i30', word: '虎头蛇尾', pinyin: 'hǔ tóu shé wěi', meaning: '头大如虎，尾细如蛇，比喻做事有始无终。', story: '做事开始很积极，后来就松懈了。', example: '做事不能虎头蛇尾，要有始有终。', emoji: '🐯', level: 2 },
  { id: 'i31', word: '鸡飞狗跳', pinyin: 'jī fēi gǒu tiào', meaning: '鸡飞起来狗跳起来，形容混乱的场面。', story: '小偷进村惹得鸡飞狗跳。', example: '弟弟一回家就闹得鸡飞狗跳。', emoji: '🐔', level: 2 },
  { id: 'i32', word: '鱼跃龙门', pinyin: 'yú yuè lóng mén', meaning: '鱼跳过龙门就变成龙，比喻一举成名。', story: '鲤鱼逆流而上跳过龙门，变成了龙。', example: '经过努力考上名校，真是鱼跃龙门。', emoji: '🐟', level: 3 },
  { id: 'i33', word: '蛛丝马迹', pinyin: 'zhū sī mǎ jì', meaning: '蜘蛛丝和马的足迹，比喻隐约可寻的线索。', story: '侦探从蛛丝马迹中找到了真相。', example: '从蛛丝马迹来看，他已经离开了。', emoji: '🕸️', level: 3 },
  { id: 'i34', word: '鹤立鸡群', pinyin: 'hè lì jī qún', meaning: '鹤站在鸡群中很突出，比喻才能出众。', story: '仙鹤站在鸡群中格外显眼。', example: '他个子最高，站在队伍里鹤立鸡群。', emoji: '🦩', level: 2 },
  { id: 'i35', word: '蜂拥而至', pinyin: 'fēng yōng ér zhì', meaning: '像蜂群一样涌来，形容人多。', story: '听到有免费礼物，人们蜂拥而至。', example: '商店打折，顾客蜂拥而至。', emoji: '🐝', level: 3 },
  { id: 'i36', word: '画龙点睛', pinyin: 'huà lóng diǎn jīng', meaning: '画龙时点上眼睛，比喻关键处用一语使内容生动。', story: '画家画龙不点睛，点睛后龙就飞走了。', example: '这篇文章结尾那句话真是画龙点睛。', emoji: '🐲', level: 2 },
  { id: 'i37', word: '坐井观天', pinyin: 'zuò jǐng guān tiān', meaning: '坐在井底看天，比喻眼界狭小。', story: '青蛙坐在井里，看到的天只有井口大。', example: '不多出去走走，就像坐井观天一样。', emoji: '🐸', level: 1 },
  { id: 'i38', word: '杯弓蛇影', pinyin: 'bēi gōng shé yǐng', meaning: '杯中弓影误认为蛇，比喻疑神疑鬼。', story: '乐广请朋友喝酒，朋友把弓影当成蛇，吓得生病。', example: '别杯弓蛇影了，那只是个影子。', emoji: '🐍', level: 3 },
  { id: 'i39', word: '叶公好龙', pinyin: 'yè gōng hào lóng', meaning: '叶公口头说喜欢龙，真龙来了却害怕，比喻表面爱好而非真心。', story: '叶公到处画龙，真龙来拜访时他吓跑了。', example: '他说喜欢挑战，但真遇到困难就退缩，真是叶公好龙。', emoji: '🐉', level: 2 },
  { id: 'i40', word: '黔驴技穷', pinyin: 'qián lǘ jì qióng', meaning: '黔地的驴子技能用完了，比喻有限的本领已经用完。', story: '驴子只会踢和叫，老虎看穿后就把它吃了。', example: '他的借口已经黔驴技穷了。', emoji: '🫏', level: 3 },
  { id: 'i41', word: '鹏程万里', pinyin: 'péng chéng wàn lǐ', meaning: '大鹏飞万里，比喻前程远大。', story: '大鹏展翅高飞，一飞就是万里。', example: '祝你鹏程万里，前程似锦！', emoji: '🦅', level: 2 },
  { id: 'i42', word: '雪中送炭', pinyin: 'xuě zhōng sòng tàn', meaning: '下雪时送炭取暖，比喻在别人急需时给以帮助。', story: '大雪天，有人给穷苦人家送去炭火取暖。', example: '在我最困难的时候你帮助了我，真是雪中送炭。', emoji: '🔥', level: 2 },
  { id: 'i43', word: '画饼充饥', pinyin: 'huà bǐng chōng jī', meaning: '画个饼来充饥，比喻空想不能解决问题。', story: '饿了画个饼，看着饼却吃不到。', example: '光说不做就像画饼充饥，没有用。', emoji: '🍪', level: 2 },
  { id: 'i44', word: '打草惊蛇', pinyin: 'dǎ cǎo jīng shé', meaning: '打草时惊动了蛇，比喻做事不谨慎惊动了对方。', story: '有人打草丛，结果把藏在里面的蛇惊走了。', example: '别打草惊蛇，等证据确凿再行动。', emoji: '🐍', level: 3 },
  { id: 'i45', word: '火树银花', pinyin: 'huǒ shù yín huā', meaning: '形容灯火灿烂或烟花绚丽。', story: '元宵节的夜晚，烟花如火树银花般绚烂。', example: '国庆夜的烟火火树银花，美极了。', emoji: '🎆', level: 3 },
  { id: 'i46', word: '春风化雨', pinyin: 'chūn fēng huà yǔ', meaning: '春天的风和雨，比喻良好的教育。', story: '老师的教导如春风化雨，润物无声。', example: '老师的关怀如春风化雨，温暖了每个学生。', emoji: '🌧️', level: 3 },
  { id: 'i47', word: '秋高气爽', pinyin: 'qiū gāo qì shuǎng', meaning: '秋天天气晴朗凉爽。', story: '秋天天高云淡，空气清新凉爽。', example: '秋高气爽的日子最适合郊游。', emoji: '🍂', level: 1 },
  { id: 'i48', word: '冰天雪地', pinyin: 'bīng tiān xuě dì', meaning: '形容冰雪漫天的严寒景象。', story: '北极到处是冰天雪地。', example: '冬天到了北方，到处冰天雪地。', emoji: '❄️', level: 2 },
  { id: 'i49', word: '百花齐放', pinyin: 'bǎi huā qí fàng', meaning: '各种花一齐开放，比喻不同事物自由发展。', story: '春天来了，百花齐放，万紫千红。', example: '艺术应该百花齐放，各有特色。', emoji: '🌺', level: 1 },
  { id: 'i50', word: '万紫千红', pinyin: 'wàn zǐ qiān hóng', meaning: '形容百花争奇斗艳的春景。', story: '花园里万紫千红，美不胜收。', example: '春天到了，公园里万紫千红。', emoji: '🌈', level: 2 },
  { id: 'i51', word: '一鸣惊人', pinyin: 'yī míng jīng rén', meaning: '一声鸣叫震惊众人，比喻平时默默无闻，一下子做出惊人成绩。', story: '齐威王三年不理事，一出手就让全国震惊。', example: '他平时不声不响，这次比赛却一鸣惊人。', emoji: '🐦', level: 2 },
  { id: 'i52', word: '三心二意', pinyin: 'sān xīn èr yì', meaning: '心思不专一，形容不专心。', story: '小猫钓鱼时三心二意，一会儿追蜻蜓一会儿捉蝴蝶。', example: '学习不能三心二意，要专心致志。', emoji: '🐱', level: 1 },
  { id: 'i53', word: '四海为家', pinyin: 'sì hǎi wéi jiā', meaning: '到处都可以当作家，形容志在四方。', story: '旅行家四海为家，走到哪里住到哪里。', example: '他四海为家，走遍了全世界。', emoji: '🌍', level: 2 },
  { id: 'i54', word: '五颜六色', pinyin: 'wǔ yán liù sè', meaning: '形容颜色多而鲜艳。', story: '花园里的花五颜六色，非常好看。', example: '气球五颜六色，真漂亮。', emoji: '🎈', level: 1 },
  { id: 'i55', word: '七上八下', pinyin: 'qī shàng bā xià', meaning: '形容心里慌乱不安。', story: '考试前他心里七上八下的。', example: '等成绩的时候心里七上八下。', emoji: '😟', level: 1 },
  { id: 'i56', word: '九死一生', pinyin: 'jiǔ sǐ yī shēng', meaning: '形容经历极大危险而幸存。', story: '探险家九死一生从沙漠中走了出来。', example: '那次车祸真是九死一生。', emoji: '😰', level: 3 },
  { id: 'i57', word: '十全十美', pinyin: 'shí quán shí měi', meaning: '各方面都完美无缺。', story: '没有人是十全十美的，每个人都有优点和缺点。', example: '这件事做得十全十美，无可挑剔。', emoji: '💯', level: 1 },
  { id: 'i58', word: '百折不挠', pinyin: 'bǎi zhé bù náo', meaning: '无论受多少挫折都不退缩，形容意志坚强。', story: '爱迪生百折不挠，试了上千次才发明灯泡。', example: '遇到困难要百折不挠，不能轻易放弃。', emoji: '💪', level: 2 },
  { id: 'i59', word: '千军万马', pinyin: 'qiān jūn wàn mǎ', meaning: '形容雄壮的队伍或浩大的声势。', story: '将军率领千军万马奔赴战场。', example: '洪水像千军万马一样冲过来。', emoji: '🐎', level: 2 },
  { id: 'i60', word: '万众一心', pinyin: 'wàn zhòng yī xīn', meaning: '千万人一条心，形容齐心协力。', story: '全国人民万众一心，共同抗灾。', example: '只要万众一心，就没有克服不了的困难。', emoji: '🤝', level: 2 },
];

export function getIdiomsByLevel(level: 1 | 2 | 3): Idiom[] {
  return IDIOMS.filter(i => i.level === level);
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
