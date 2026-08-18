/**
 * 发音评测引擎（P0-1）
 * ------------------------------------------------------------
 * 旧 SpeechEvalButton 仅判断 transcript.length >= 1（只要有声音就过），
 * 无法真正评估发音质量。本模块基于编辑距离（Levenshtein）做字级对齐，
 * 输出每个目标字的「正确 / 替换 / 缺失」状态，给出可信的发音得分与
 * 逐字反馈，让孩子知道自己哪个字读得对、哪个字要再练。
 *
 * 算法：
 *   1. 预处理：去标点、转小写、全角转半角、中文去空格；
 *   2. 编辑距离 DP 同时回溯对齐路径，标记每个目标字为 match/substitute/insert/delete；
 *   3. 得分 = 匹配数 / 目标字数 × 100，再按「连续匹配加成」微调；
 *   4. 生成逐字结果数组，UI 可据此高亮对错。
 *
 * 纯函数，不依赖浏览器 API，可在 Node 下单测。
 */

/** 单个目标字的评测结果 */
export interface CharEval {
  /** 目标字 */
  ch: string;
  /** 在目标文本中的下标 */
  index: number;
  /** 评测状态 */
  status: 'correct' | 'wrong' | 'missing';
  /** 孩子实际读出的字（wrong 时有值；correct 时等于 ch；missing 时为空） */
  heard: string;
}

/** 一次跟读的完整评测结果 */
export interface PronunciationResult {
  /** 综合得分 0–100 */
  score: number;
  /** 是否通过（score >= threshold） */
  passed: boolean;
  /** 目标字数 */
  targetCount: number;
  /** 正确读出的字数 */
  correctCount: number;
  /** 逐字结果 */
  chars: CharEval[];
  /** 识别到的原文（预处理后） */
  transcript: string;
  /** 文字点评（给孩子看的鼓励语） */
  feedback: string;
  /** AI 改进建议（针对读错的字） */
  tips: string[];
}

/** 预处理文本：去标点、转小写、全角转半角、去空格 */
function normalize(text: string, lang: 'zh-CN' | 'en-US'): string {
  let s = text.trim();
  // 全角转半角
  s = s.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/\u3000/g, ' '); // 全角空格
  // 去标点
  // eslint-disable-next-line no-useless-escape -- 标点清洗正则，含引号/方括号的刻意转义
  s = s.replace(/[。！？；：，、""''（）【】《》〈〉「」『』.!?;:,\"'()\[\]{}<>]/g, '');
  if (lang === 'zh-CN') {
    // 中文去空格
    s = s.replace(/\s+/g, '');
  } else {
    // 英文转小写、合并空格
    s = s.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  return s;
}

/** 编辑距离 DP，返回完整矩阵用于回溯对齐路径 */
function levenshteinMatrix(a: string, b: string): number[][] {
  const m = a.length;
  const n = b.length;
  // 初始化：首行 = 列下标、首列 = 行下标、其余为 0（等价于先 fill(0) 再补首行首列）
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    const cur = dp[i] ?? [];
    const prev = dp[i - 1] ?? [];
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] ?? 0;
      } else {
        cur[j] = 1 + Math.min(prev[j - 1] ?? 0, prev[j] ?? 0, cur[j - 1] ?? 0);
      }
    }
  }
  return dp;
}

/** 回溯 DP 矩阵，得到每个目标字的匹配状态 */
function backtrackAlign(
  a: string, // 目标文本
  b: string, // 识别文本
  dp: number[][],
): CharEval[] {
  const chars: CharEval[] = [];
  let i = a.length;
  let j = b.length;
  // 临时用数组收集，最后反转
  const tmp: CharEval[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      tmp.push({ ch: a[i - 1] ?? '', index: i - 1, status: 'correct', heard: b[j - 1] ?? '' });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || (dp[i - 1]?.[j] ?? 0) <= (dp[i]?.[j - 1] ?? 0))) {
      // 目标字在识别结果中缺失
      tmp.push({ ch: a[i - 1] ?? '', index: i - 1, status: 'missing', heard: '' });
      i--;
    } else {
      // 识别结果中多出的字（插入），不对应目标字，跳过
      j--;
    }
  }
  tmp.reverse();

  // 把 substitute 状态补上：遍历对齐结果，若目标字前后有识别字但本身非 correct/missing，
  // 则尝试与最近的插入字配对标记为 wrong
  // 简化：重新走一遍，用原始 DP 路径判断
  // 实际上上面的回溯已把「目标字存在但识别未匹配」归为 missing，
  // 这里补充：如果识别文本非空且目标字不是 correct，且识别文本有对应位置，标记为 wrong
  // 更准确的做法：在回溯时区分 substitute 和 delete
  // 重新实现回溯以区分 substitute（目标字与识别字不同）vs missing（目标字被跳过）
  const chars2: CharEval[] = [];
  let ii = a.length;
  let jj = b.length;
  const tmp2: CharEval[] = [];
  while (ii > 0 || jj > 0) {
    if (ii > 0 && jj > 0 && a[ii - 1] === b[jj - 1]) {
      tmp2.push({ ch: a[ii - 1] ?? '', index: ii - 1, status: 'correct', heard: b[jj - 1] ?? '' });
      ii--;
      jj--;
    } else if (
      ii > 0 &&
      jj > 0 &&
      ((dp[ii - 1]?.[jj - 1] ?? 0) <= (dp[ii - 1]?.[jj] ?? 0) ||
        (dp[ii - 1]?.[jj - 1] ?? 0) <= (dp[ii]?.[jj - 1] ?? 0))
    ) {
      // 替换：目标字与识别字不同
      tmp2.push({ ch: a[ii - 1] ?? '', index: ii - 1, status: 'wrong', heard: b[jj - 1] ?? '' });
      ii--;
      jj--;
    } else if (ii > 0 && (jj === 0 || (dp[ii - 1]?.[jj] ?? 0) < (dp[ii]?.[jj - 1] ?? 0))) {
      // 目标字缺失
      tmp2.push({ ch: a[ii - 1] ?? '', index: ii - 1, status: 'missing', heard: '' });
      ii--;
    } else {
      // 识别多出的字，跳过
      jj--;
    }
  }
  tmp2.reverse();
  chars2.push(...tmp2);

  // 优先返回更准确的 chars2
  void chars;
  return chars2;
}

/** 生成给孩子看的文字点评 */
function buildFeedback(score: number, wrongChars: string[]): string {
  if (score >= 90) return '读得太棒了！每个字都很准！🌟';
  if (score >= 75) {
    if (wrongChars.length) return `读得很好！${wrongChars.slice(0, 2).join('、')} 再练练就完美啦！`;
    return '读得很好，再练一次会更棒！';
  }
  if (score >= 50) {
    if (wrongChars.length) return `不错哦！注意 ${wrongChars.slice(0, 2).join('、')} 的发音～`;
    return '不错哦，再多读几遍试试！';
  }
  if (wrongChars.length) return `加油！跟着妈妈再读一遍 ${wrongChars.slice(0, 2).join('、')} 吧～`;
  return '没关系，跟着音频再读一遍试试！';
}

/** 生成 AI 改进建议（针对读错的字） */
function buildTips(chars: CharEval[], lang: 'zh-CN' | 'en-US'): string[] {
  const tips: string[] = [];
  const wrongs = chars.filter((c) => c.status !== 'correct');
  for (const w of wrongs.slice(0, 3)) {
    if (w.status === 'missing') {
      tips.push(lang === 'zh-CN' ? `「${w.ch}」这个字没有听到哦，再读一次` : `"${w.ch}" was missed, try again`);
    } else if (w.status === 'wrong' && w.heard) {
      tips.push(
        lang === 'zh-CN'
          ? `「${w.ch}」听起来像「${w.heard}」，注意发音区别`
          : `"${w.ch}" sounded like "${w.heard}", check the pronunciation`,
      );
    }
  }
  return tips;
}

/**
 * 评测一次跟读。
 * @param target     目标文本（孩子应该读的内容）
 * @param transcript 语音识别结果
 * @param lang       语言
 * @param threshold  通过分数线（默认 60）
 */
export function evaluatePronunciation(
  target: string,
  transcript: string,
  lang: 'zh-CN' | 'en-US' = 'zh-CN',
  threshold = 60,
): PronunciationResult {
  const a = normalize(target, lang);
  const b = normalize(transcript, lang);

  // 识别为空：直接 0 分
  if (!b) {
    return {
      score: 0,
      passed: false,
      targetCount: a.length,
      correctCount: 0,
      chars: a.split('').map((ch, i) => ({ ch, index: i, status: 'missing', heard: '' })),
      transcript: '',
      feedback: '没有听到声音哦，请试着离麦克风近一点～',
      tips: ['请对着麦克风大声朗读'],
    };
  }

  const dp = levenshteinMatrix(a, b);
  const chars = backtrackAlign(a, b, dp);
  const correctCount = chars.filter((c) => c.status === 'correct').length;
  const targetCount = a.length || 1;

  // 基础得分：正确率
  let score = Math.round((correctCount / targetCount) * 100);

  // 连续匹配加成：如果有一半以上连续正确，+5 分（鼓励流利度）
  let maxStreak = 0;
  let streak = 0;
  for (const c of chars) {
    if (c.status === 'correct') {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }
  if (maxStreak >= Math.ceil(targetCount / 2) && score >= 50) {
    score = Math.min(100, score + 5);
  }

  const wrongChars = chars.filter((c) => c.status !== 'correct').map((c) => c.ch);
  const feedback = buildFeedback(score, wrongChars);
  const tips = buildTips(chars, lang);

  return {
    score,
    passed: score >= threshold,
    targetCount: a.length,
    correctCount,
    chars,
    transcript: b,
    feedback,
    tips,
  };
}
