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
