/**
 * AI本地规则引擎 - 当后端AI不可用时提供基础功能
 * ------------------------------------------------------------
 * 设计原则：
 *   - 不依赖任何外部服务，纯本地运行
 *   - 提供基础但有用的内容，避免完全空白
 *   - 根据场景智能选择最合适的fallback策略
 */

export interface LocalFallbackResult {
  /** 是否成功生成本地内容 */
  ok: boolean;
  /** 生成的文本内容 */
  text?: string;
  /** 是否为占位内容（非真实知识） */
  placeholder?: boolean;
}

/**
 * 汉字学习本地fallback
 */
export function getHanziLocalFallback(char: string, data?: { pinyin?: string; origin?: string }): LocalFallbackResult {
  const pinyin = data?.pinyin || char;
  
  // 根据汉字特征提供规则化解释
  const rules: Array<{ pattern: RegExp; explain: (char: string, py: string) => string }> = [
    // 象形字规则
    {
      pattern: /^[日月山水火木土田禾米门刀手口目耳心足走辶钅钺纟衤示礻虫鸟鱼犬犭艹竹石雨雪风]+$/,
      explain: (c, _py) => `「${c}」是一个象形字，它像${getShapeDescription(c)}的样子。古人看到${c}的样子，就创造了这个字。`
    },
    // 常见部首组合
    {
      pattern: /^.+$/,
      explain: (c, py) => `「${c}」读作 ${py}。这是一个常用的汉字，你可以试着用「${c}」组一个词，比如「${generateWordExample(c)}」。`
    }
  ];
  
  for (const rule of rules) {
    if (rule.pattern.test(char)) {
      return { ok: true, text: rule.explain(char, pinyin) };
    }
  }
  
  return { ok: true, text: `「${char}」是一个有趣的汉字，多读几遍就能记住啦！`, placeholder: true };
}

/**
 * 数学题解答本地fallback
 */
export function getMathLocalFallback(display: string, correct: string): LocalFallbackResult {
  // 解析算式并给出具体讲解
  const match = display.match(/^(\d+)\s*([+\-×÷])\s*(\d+)$/);
  
  if (match) {
    const [, a, op, b] = match;
    const numA = parseInt(a ?? '0');
    const numB = parseInt(b ?? '0');
    
    let explanation = '';
    switch (op) {
      case '+':
        explanation = `让我们一起数一数：先拿出 ${numA} 个苹果，再拿来 ${numB} 个苹果。一个一个点数：${Array.from({length: numA + numB}, (_, i) => i + 1).join('、')}。一共有 ${correct} 个苹果！`;
        break;
      case '-':
        explanation = `原来有 ${numA} 个苹果，吃掉了 ${numB} 个。还剩下几个呢？${numA} 减去 ${numB} 等于 ${correct}。`;
        break;
      case '×':
        explanation = `${numA} 乘以 ${numB} 表示有 ${numA} 组，每组 ${numB} 个。一共是 ${correct} 个！`;
        break;
      case '÷':
        explanation = `${numA} 平均分成 ${numB} 份，每份是 ${correct}。`;
        break;
    }
    
    return { ok: true, text: explanation };
  }
  
  return { ok: true, text: `这道题的答案是 ${correct}。你可以用计数器或者画图来理解哦！`, placeholder: true };
}

/**
 * 拼音辅导本地fallback
 */
export function getPinyinLocalFallback(symbol: string): LocalFallbackResult {
  const guides: Record<string, string> = {
    'a': '嘴巴张大，像医生检查嗓子时说的「啊——」',
    'o': '嘴巴圆圆，像大公鸡打鸣「喔喔喔」',
    'e': '嘴巴扁扁，像微笑时的样子「一——」',
    'i': '嘴角向两边拉开，像说「咦——」',
    'u': '嘴巴嘟起来，像吹口哨「呜——」',
    'ü': '嘴巴圆圆，像小鱼吐泡泡「鱼——」',
    'b': '先把嘴唇闭上，再突然打开',
    'p': '和b一样，但打开时用力吹气',
    'm': '嘴唇闭上，声音从鼻子出来',
    'f': '上牙轻轻咬住下嘴唇，吹气',
  };
  
  const guide = guides[symbol];
  if (guide) {
    return { ok: true, text: `发「${symbol}」的音时，${guide}。多练习几次就能掌握了！` };
  }
  
  return { ok: true, text: `「${symbol}」这个拼音要大声念三遍：${symbol} ${symbol} ${symbol}！`, placeholder: true };
}

/**
 * 古诗学习本地fallback
 */
export function getPoemLocalFallback(title: string, author: string, content: string): LocalFallbackResult {
  return {
    ok: true,
    text: `《${title}》是${author}写的著名诗歌。这首诗描写了${describePoemTheme(content)}。你可以想象诗中的画面，慢慢诵读感受韵律美。`,
    placeholder: true
  };
}

/**
 * 逻辑题解答本地fallback
 */
export function getLogicLocalFallback(_display: string, correct: string): LocalFallbackResult {
  return {
    ok: true,
    text: `这道题的正确答案是 ${correct}。找规律的方法：先看前面几个图形是怎么变化的，再按照同样的规律找出下一个应该是什么。加油，下次一定能独立做对！`,
    placeholder: true
  };
}

/**
 * 检查后端AI是否可用
 */
export async function checkAiAvailability(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('/api/ai/health', { 
      signal: controller.signal,
      method: 'GET'
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 科学提问本地fallback
 */
export function getScienceLocalFallback(question: string): LocalFallbackResult {
  const q = question.toLowerCase();
  if (q.includes('天') && (q.includes('蓝') || q.includes('色'))) {
    return { ok: true, text: '因为太阳光里藏着七种颜色，当阳光照进大气层时，蓝色的光最活泼，被空气到处散开，所以我们看到的天空就是蓝色的啦！🎈' };
  }
  if (q.includes('彩虹')) {
    return { ok: true, text: '下完雨后空气里有很多小水滴，太阳光照在小水滴上，就像穿过三棱镜一样被分成了红橙黄绿青蓝紫七种颜色，就变成美丽的彩虹啦！🌈' };
  }
  if (q.includes('植物') || q.includes('树') || q.includes('绿')) {
    return { ok: true, text: '植物的叶子里住着许多“叶绿素”小精灵，它们喜欢晒太阳制作甜甜的养分，所以叶子看起来都是绿油油的！🌱' };
  }
  if (q.includes('雨') || q.includes('云')) {
    return { ok: true, text: '地面的水晒热后变成看不见的水蒸气飘到天上，聚在一起变成云朵。当云朵里的小水滴越来越重抱在一起，就变成雨滴落下来啦！🌧️' };
  }
  if (q.includes('月亮') || q.includes('月')) {
    return { ok: true, text: '月亮本身不发光，是反射太阳光呢！月亮围着地球转动时，我们看到的亮面角度不同，所以有时像小船，有时圆圆的像玉盘！🌙' };
  }
  if (q.includes('鸟') || q.includes('飞')) {
    return { ok: true, text: '小鸟有轻巧坚固的翅膀，骨头也是中空的很轻，扇动翅膀时空气把它托上了天空，所以能自由自在地飞翔！🦅' };
  }
  if (q.includes('影子')) {
    return { ok: true, text: '光是直直走的小火车。当光被我们的小身体挡住时，光穿不过去，地上就留下了黑黑的影子朋友啦！👤' };
  }
  if (q.includes('恐龙')) {
    return { ok: true, text: '很久很久以前，一颗大陨石撞击了地球，天气变得非常寒冷，恐龙找不到足够的食物，就慢慢告别地球啦！🦕' };
  }
  if (q.includes('冰') || q.includes('雪')) {
    return { ok: true, text: '冰是水在冷冰冰时抱紧紧的样子。当温度变温暖，小水分子伸懒腰松开手，冰就融化成流动的水啦！🧊' };
  }
  return { ok: true, text: `大自然充满无穷奥秘！关于「${question}」，让我们保持好奇心，多观察多发现，你就是最棒的小小科学家！🌟` };
}

/**
 * 汉字口诀本地fallback
 */
export function getMnemonicLocalFallback(char: string, pinyin?: string): LocalFallbackResult {
  const mnemonics: Record<string, string> = {
    '休': '一个人靠在大树旁，累了歇歇把力养。读作 xiū，休息的意思！',
    '看': '把手搭在眼睛上，望望远处看夕阳。读作 kàn，看见的意思！',
    '明': '日头加上月亮光，照亮天地亮堂堂。读作 míng，明亮的意思！',
    '森': '一棵树、两棵树、三棵树，树木多多成森林。读作 sēn！',
    '众': '三人团结力量大，大家一起来加油。读作 zhòng，大众的意思！',
    '尖': '上面小来下面大，像根小针尖尖的。读作 jiān！',
    '尘': '小小的土聚成堆，微风一吹尘土飞。读作 chén，尘土的意思！',
    '灭': '火上一横盖住它，火苗熄灭不害怕。读作 miè，熄灭的意思！',
    '苗': '田地上面长绿草，嫩嫩禾苗快长高。读作 miáo，禾苗的意思！',
    '男': '田里有力干农活，勤劳勇敢小男子。读作 nán，男生的意思！',
    '炎': '火上加火热腾腾，夏天炎热似火炉。读作 yán，炎热的意思！',
    '从': '一人在前一人后，形影不离手拉手。读作 cóng，跟从的意思！',
  };
  if (mnemonics[char]) {
    return { ok: true, text: mnemonics[char] };
  }
  return { ok: true, text: `「${char}」${pinyin ? `读作 ${pinyin}。` : ''}仔细看它的形状特点，把小口诀记在心里，多写两遍就能牢牢记住啦！` };
}

/**
 * 智能路由：根据场景选择合适的fallback
 */
export function getSmartFallback(
  scene: string, 
  params: Record<string, unknown>
): LocalFallbackResult | null {
  // Type-safe parameter extraction
  const getString = (key: string): string | undefined => 
    typeof params[key] === 'string' ? params[key] : undefined;
  
  switch (scene) {
    case 'hanzi.story':
      return getHanziLocalFallback(getString('char') ?? '', { 
        pinyin: getString('pinyin'),
        origin: getString('origin')
      });
    case 'hanzi.mnemonic':
      return getMnemonicLocalFallback(getString('char') ?? '', getString('pinyin'));
    case 'science.ask':
      return getScienceLocalFallback(getString('question') ?? '');
    case 'math.explain':
      return getMathLocalFallback(getString('display') ?? '', getString('correct') ?? '');
    case 'pinyin.tutor':
      return getPinyinLocalFallback(getString('symbol') ?? '');
    case 'poem.tutor':
      return getPoemLocalFallback(
        getString('title') ?? '',
        getString('author') ?? '',
        getString('content') ?? ''
      );
    case 'logic.explain':
      return getLogicLocalFallback(getString('seq') ?? '', getString('correct') ?? '');
    case 'science.experiment':
      return {
        ok: true,
        text: `【准备道具】：一个装满清水的透明玻璃杯、一支手电筒。\n【动手做】：在较暗的房间里，用手电筒斜着照射水杯。\n【神奇发现】：在白墙上能看到像彩虹一样美丽的折射光斑哦！🌈`,
      };
    case 'safety.roleplay':
      return {
        ok: true,
        text: `宝贝记住哦：遇到危险情况时，一定要先保护好自己，大声向信任的爸爸妈妈或警察叔叔求助！`,
      };
    case 'logic.detective':
      return {
        ok: true,
        text: `🕵️‍♂️【案情通报】：小动物们在排队做游戏，找出关键线索，你就是最棒的小侦探！`,
      };
    case 'rhyme.create':
      return {
        ok: true,
        text: `儿歌顺口溜，朗朗上口好记牢。仔细观察多练习，学得扎实顶呱呱！🌟`,
      };
    default:
      return null;
  }
}

// ========== 辅助函数 ==========

function getShapeDescription(char: string): string {
  const shapes: Record<string, string> = {
    '日': '太阳', '月': '月亮', '山': '山峰', '水': '流水',
    '火': '火焰', '木': '树木', '土': '土地', '田': '田地',
    '门': '门', '刀': '刀刃', '手': '手掌', '口': '嘴巴',
    '目': '眼睛', '耳': '耳朵', '心': '心脏', '足': '脚',
  };
  return shapes[char as keyof typeof shapes] ?? '相关的东西';
}

function generateWordExample(char: string): string {
  // 简单的组词示例
  const examples: Record<string, string[]> = {
    '人': ['人们', '好人', '工人'],
    '大': ['大小', '大树', '大人'],
    '小': ['小鸟', '小草', '小孩'],
    '天': ['天空', '今天', '天上'],
  };
  
  const words = examples[char];
  if (words && words.length > 0) {
    return words[0] ?? '';
  }
  
  return `${char}${char === '人' ? '们' : char === '大' ? '家' : char === '小' ? '心' : '儿'}`;
}

function describePoemTheme(content: string): string {
  const keywords: Record<string, string> = {
    '春': '春天的美景',
    '秋': '秋天的景色',
    '月': '月夜的宁静',
    '山': '山川的壮丽',
    '水': '流水的动态',
    '花': '花朵的芬芳',
    '雪': '冬雪的洁白',
    '风': '春风的轻柔',
  };
  
  for (const [key, desc] of Object.entries(keywords)) {
    if (content.includes(key)) {
      return desc;
    }
  }
  
  return '美丽的自然景色';
}
