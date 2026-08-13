/**
 * AI 服务层 · 儿童安全护栏
 * ------------------------------------------------------------------
 * 使用者是 5 岁孩子，AI 自由输出存在风险。三道防线：
 *   1. 入口：过滤用户输入（长度、字符集、敏感词）
 *   2. Prompt：system 里写死行为边界（见 prompts.ts）
 *   3. 出口：校验模型输出，不合格则回退到安全话术
 *
 * ⚠️ 分级的由来：
 * 早期把「杀 / 死亡 / 武器 / 政治」全塞进一张黑名单，结果古诗讲解成了重灾区
 * ——《出塞》《满江红》讲不了，杜甫的生平提一句抱负就被拦。
 * 现在拆成「硬红线」与「情境词」两级，文学场景只查硬红线。
 */
import type { AiScene } from './types';

/** 硬红线：任何场景、任何年龄都不该出现 */
const HARD_BLOCK = [
  '色情', '性行为', '裸体', '强奸', '卖淫', '嫖娼',
  '毒品', '吸毒', '摇头丸', '海洛因',
  '赌博', '博彩',
  '自杀', '自残',
  '恐怖袭击', '恐怖组织',
];

/**
 * 情境词：在古诗、历史、成语里是正常表达，在孩子自由提问里则要拦。
 * 仅对 child 模式生效。
 */
const SOFT_BLOCK = [
  '暴力', '血腥', '杀人', '屠杀', '尸体',
  '枪支', '炸弹', '诈骗', '仇恨', '歧视', '政治',
];

/** 模型不该说的开场白（说明它跑偏成通用助手了） */
const BAD_OPENER = [
  '作为一个AI', '作为一名AI', '作为人工智能', '我是一个大语言模型',
  '很抱歉，我无法', '抱歉，我不能',
];

/**
 * 校验强度：
 *   child   —— 孩子端自由交互，硬红线 + 情境词全查
 *   literary—— 古诗/历史类讲解，只查硬红线
 *   adult   —— 家长端，只查硬红线，且不做长度截断
 */
export type GuardMode = 'child' | 'literary' | 'adult';

export interface GuardResult {
  ok: boolean;
  /** 处理后的文本 */
  text: string;
  reason?: string;
}

export interface GuardOptions {
  maxLen?: number;
  mode?: GuardMode;
}

/** 场景 → 校验强度与长度上限。集中在这里，调用方不用各自记规则。 */
const SCENE_GUARD: Record<AiScene, Required<GuardOptions>> = {
  'poem.tutor': { mode: 'literary', maxLen: 420 },
  'poem.grade': { mode: 'literary', maxLen: 600 },
  'math.explain': { mode: 'child', maxLen: 260 },
  'math.generate': { mode: 'child', maxLen: 400 },
  'logic.explain': { mode: 'child', maxLen: 260 },
  'letter.story': { mode: 'child', maxLen: 300 },
  'plan.today': { mode: 'child', maxLen: 500 },
  'praise': { mode: 'child', maxLen: 120 },
  // 家长周报是长文，220 字会被拦腰砍掉，必须放宽
  'parent.report': { mode: 'adult', maxLen: 1200 },
  'parent.deepReport': { mode: 'adult', maxLen: 1200 },

  // —— v6 新增 ——
  'number.story': { mode: 'child', maxLen: 200 },
  'count.generate': { mode: 'child', maxLen: 400 },
  'letter.match': { mode: 'child', maxLen: 400 },
  'poem.imagine': { mode: 'literary', maxLen: 150 },
  'poem.compare': { mode: 'literary', maxLen: 200 },
  'poem.prosody': { mode: 'literary', maxLen: 150 },
  'poet.story': { mode: 'literary', maxLen: 200 },
  'quiz.extend': { mode: 'child', maxLen: 80 },
  'adventure.encourage': { mode: 'child', maxLen: 100 },
  'daily.summary': { mode: 'child', maxLen: 100 },
  'wrong.analyze': { mode: 'adult', maxLen: 1200 },
  'recommend.practice': { mode: 'adult', maxLen: 800 },

  // —— 汉字识字：文学场景用 literary（避免古诗字词误杀）——
  'hanzi.story': { mode: 'literary', maxLen: 300 },
  'hanzi.sentence': { mode: 'literary', maxLen: 200 },

  // —— 拼音 & 英语：child 模式 ——
  'pinyin.tutor': { mode: 'child', maxLen: 300 },
  'word.story': { mode: 'child', maxLen: 300 },
  'word.phonics': { mode: 'child', maxLen: 300 },

  // —— AI 故事绘本 ——
  'storybook.generate': { mode: 'child', maxLen: 2000 },

  // —— AI 朗读发音建议（P3-14）——
  'speech.advise': { mode: 'child', maxLen: 600 },

  // —— AI 个性化学习路径 ——
  'path.narrate': { mode: 'child', maxLen: 400 },
  'path.weekly': { mode: 'child', maxLen: 600 },
  'path.coach': { mode: 'adult', maxLen: 1000 },

  // —— AI 陪伴学习伙伴 ——
  'companion.chat': { mode: 'child', maxLen: 240 },
  'companion.explain': { mode: 'child', maxLen: 320 },

  // —— S2 Companion 2.0 新增 ——
  'companion.buddyQuiz': { mode: 'child', maxLen: 600 },
  'companion.dailyQuest': { mode: 'child', maxLen: 800 },
  'companion.comfort': { mode: 'child', maxLen: 200 },
  'companion.celebrate': { mode: 'child', maxLen: 200 },
  'companion.followUp': { mode: 'child', maxLen: 300 },

  // —— 成语 AI 化 ——
  'idiom.story': { mode: 'literary', maxLen: 300 },
  'idiom.sentence': { mode: 'child', maxLen: 400 },
  'idiom.hint': { mode: 'child', maxLen: 200 },

  // —— A3 儿歌学唱升级 ——
  'song.recommend': { mode: 'child', maxLen: 400 },
  'song.explain': { mode: 'child', maxLen: 350 },
  'music.create': { mode: 'child', maxLen: 500 },
  'music.rhythm': { mode: 'child', maxLen: 400 },
  'festival.talk': { mode: 'literary', maxLen: 600 },
  'safety.scene': { mode: 'child', maxLen: 500 },
};

export function guardForScene(scene: AiScene): Required<GuardOptions> {
  return SCENE_GUARD[scene] ?? { mode: 'child', maxLen: 220 };
}

function hitBlocked(text: string, mode: GuardMode): string | undefined {
  const lower = text.toLowerCase();
  const hard = HARD_BLOCK.find((w) => lower.includes(w));
  if (hard) return hard;
  if (mode === 'child') return SOFT_BLOCK.find((w) => lower.includes(w));
  return undefined;
}

/** 入口过滤：孩子/家长输入的自由文本 */
export function guardInput(raw: string, maxLen = 200): GuardResult {
  if (typeof raw !== 'string') return { ok: false, text: '', reason: '内容是空的哦' };
  // 顺手清掉零宽字符与控制符，防止靠不可见字符绕过词表
  const text = raw
    // 清洗零宽/控制字符，防止靠不可见字符绕过词表；刻意匹配控制区间
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!text) return { ok: false, text: '', reason: '内容是空的哦' };

  const hit = hitBlocked(text, 'child');
  if (hit) {
    return { ok: false, text: '', reason: '这个问题我们换一个说法好不好？聊聊学习上的事吧！' };
  }
  return { ok: true, text: text.length > maxLen ? text.slice(0, maxLen) : text };
}

/**
 * 出口校验：模型输出
 * @param opts 传数字等价于 { maxLen }，保持旧调用方式可用
 */
export function guardOutput(raw: string, opts: number | GuardOptions = {}): GuardResult {
  const { maxLen = 220, mode = 'child' } = typeof opts === 'number' ? { maxLen: opts } : opts;

  let text = (raw || '').trim();

  // 去掉模型偶尔套上的 markdown 代码围栏
  text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  // 去掉「作为AI…」这类跑偏开场（可能连续套两层，循环剥到干净为止）
  for (let i = 0; i < 3; i++) {
    const p = BAD_OPENER.find((x) => text.startsWith(x));
    if (!p) break;
    const cut = text.indexOf('。');
    if (cut <= 0 || cut >= text.length - 1) break;
    text = text.slice(cut + 1).trim();
  }

  if (!text) return { ok: false, text: '', reason: 'empty' };

  const hit = hitBlocked(text, mode);
  if (hit) return { ok: false, text: '', reason: `blocked:${hit}` };

  // 超长则在句号处截断，避免半句话
  if (text.length > maxLen) {
    const slice = text.slice(0, maxLen);
    const stop = Math.max(slice.lastIndexOf('。'), slice.lastIndexOf('！'), slice.lastIndexOf('？'));
    text = stop > maxLen * 0.5 ? slice.slice(0, stop + 1) : slice + '…';
  }
  return { ok: true, text };
}

/* ------------------------------------------------------------------ */
/* JSON 抠取                                                           */
/* ------------------------------------------------------------------ */

/** 扫描出第一段括号配对完整的 JSON 片段（正确跳过字符串内的括号与转义） */
function balancedSlice(s: string): string | null {
  const start = (() => {
    const a = s.indexOf('{');
    const b = s.indexOf('[');
    if (a < 0) return b;
    if (b < 0) return a;
    return Math.min(a, b);
  })();
  if (start < 0) return null;

  // Use a stack to track bracket types
  const stack: string[] = [];
  let inStr = false;
  let esc = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i]!
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') {
      stack.push(c);
    } else if (c === '}' || c === ']') {
      // Check if this closing bracket matches the top of stack
      const top = stack[stack.length - 1]!
      if ((c === '}' && top === '{') || (c === ']' && top === '[')) {
        stack.pop();
        if (stack.length === 0) {
          return s.slice(start, i + 1);
        }
      } else {
        // Mismatched bracket - skip it (don't push/pop)
        // This handles cases like {"items": [1,2]} where we encounter ] while expecting }
        continue;
      }
    }
  }
  return null;
}

/**
 * 从模型输出里稳健地抠出 JSON。
 * 即使开了 response_format，也可能偶发带围栏、前后缀或尾逗号，这里全兜住。
 */
export function extractJson<T>(raw: string): T | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw
    .trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();

  const tryParse = (x: string): T | null => {
    try {
      return JSON.parse(x) as T;
    } catch {
      return null;
    }
  };

  return (
    tryParse(s) ??
    (() => {
      const sliced = balancedSlice(s);
      if (!sliced) return null;
      // 修掉尾逗号：{"a":1,} / [1,2,]
      return tryParse(sliced) ?? tryParse(sliced.replace(/,\s*([}\]])/g, '$1'));
    })()
  );
}
