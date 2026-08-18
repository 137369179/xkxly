import { navigate, type RouteId } from '@/lib/router';

/**
 * 薄弱点 → 专项训练 一键路由
 *
 * 家长报告中的薄弱知识点（统一 SRS 回写命名空间，如 `hanzi:木`、`pinyin:tone`）
 * 通过 skillToTarget 解出目标模块路由与参数，再由 openTraining 直接导航；
 * 目标模块页可用 paramToTarget / useTrainingTarget 反向解出人类可读训练主题，
 * 用于横幅展示「专项训练中」状态。
 */

export interface TrainingTarget {
  route: RouteId;
  param?: string;
  label: string;
}

/**
 * 各路由 param（子活动标识）→ 中文标签（单一事实源）。
 * 采用贴近儿童认知的文案（如「披萨分数」「玉兔快跑」），
 * skillRouting 的 skillToTarget / paramToTarget 与 useTrainingTarget 的 buildLabel 共用，
 * 确保路由层与页内横幅对同一子技能的称呼完全一致。
 * 未知子技能回退：math → 「计算」、logic → 「思维」。
 */
export const SUB_LABELS: Partial<Record<RouteId, Record<string, string>>> = {
  hanzi: { stroke: '笔顺练习', build: '组词练习' },
  numbers: {
    fraction: '披萨分数',
    money: '认识钱币',
    shape: '形状认知',
    skip: '跳数规律',
    time: '认识时钟',
    compare: '比较测量',
    rabbit: '玉兔快跑',
    tenframe: '十格阵',
    trace: '数字描红',
    word: '图文应用题',
    ladder: '算术梯',
    count: '数数乐',
  },
  letters: { trace: '字母描红', order: '字母排序' },
  words: { sentence: '句型练习', dialogue: '情景对话', phonics: '自然拼读', practice: '综合练习' },
  pinyin: { tone: '四声调', blend: '声韵拼读', dictation: '听音默写', group: '分类连线' },
  logic: {
    pattern: '找规律',
    match: '图形配对',
    order: '排排序',
    mixed: '综合挑战',
    code: '编程机器人',
    codebot: '编程机器人',
    maze: '迷宫挑战',
    sudoku: '趣味数独',
  },
};

/** 提取 `prefix` 前缀之后的内容；前缀不匹配或其后为空时返回 null */
function afterPrefix(skill: string, prefix: string): string | null {
  if (!skill.startsWith(prefix)) return null;
  const rest = skill.slice(prefix.length);
  return rest === '' ? null : rest;
}

/**
 * SRS 知识点键 → 训练目标。
 * skill 键来自统一 SRS 回写命名空间；无法识别的键返回 null。
 */
export function skillToTarget(skill: string): TrainingTarget | null {
  // 识字：笔顺 / 组词 / 认读
  const hanziStroke = afterPrefix(skill, 'hanzi-stroke:');
  if (hanziStroke) return { route: 'hanzi', param: `stroke:${hanziStroke}`, label: '识字·笔顺' };
  const hanziBuild = afterPrefix(skill, 'hanzi-build:');
  if (hanziBuild) return { route: 'hanzi', param: `build:${hanziBuild}`, label: '识字·组词' };
  const hanzi = afterPrefix(skill, 'hanzi:');
  if (hanzi) return { route: 'hanzi', param: hanzi, label: `识字·${hanzi}` };

  // 拼音：声调 / 听写精确匹配，拼读 / 归类前缀匹配，其余为综合练习
  if (skill === 'pinyin:tone') return { route: 'pinyin', param: 'tone', label: '拼音·声调' };
  if (skill === 'pinyin:dictation') return { route: 'pinyin', param: 'dictation', label: '拼音·听写' };
  if (afterPrefix(skill, 'pinyin:blend:') !== null) return { route: 'pinyin', param: 'blend', label: '拼音·拼读' };
  if (afterPrefix(skill, 'pinyin:group:') !== null) return { route: 'pinyin', param: 'group', label: '拼音·归类' };
  if (skill.startsWith('pinyin:')) return { route: 'pinyin', label: '拼音练习' };

  // 字母：书写 / 排序 / 认读
  const letterTrace = afterPrefix(skill, 'letter-trace:');
  if (letterTrace) return { route: 'letters', param: `trace:${letterTrace}`, label: `字母·书写 ${letterTrace}` };
  if (skill === 'letter-order') return { route: 'letters', param: 'order', label: '字母·排序' };
  const letterStudy = afterPrefix(skill, 'letter-study:');
  if (letterStudy) return { route: 'letters', param: letterStudy, label: `字母·${letterStudy}` };
  const letter = afterPrefix(skill, 'letter:');
  if (letter) return { route: 'letters', param: letter, label: `字母·${letter}` };

  // 单词：句子 / 对话 / 自然拼读，其余为词汇练习
  if (afterPrefix(skill, 'word:sentence:') !== null) return { route: 'words', param: 'sentence', label: '单词·句子' };
  if (afterPrefix(skill, 'word:dialogue:') !== null) return { route: 'words', param: 'dialogue', label: '单词·对话' };
  if (afterPrefix(skill, 'word:phonics:') !== null || afterPrefix(skill, 'word:family:') !== null) {
    return { route: 'words', param: 'phonics', label: '单词·自然拼读' };
  }
  if (skill.startsWith('word:')) return { route: 'words', param: 'practice', label: '单词·词汇' };

  // 数学 / 数数 / 比较 / 时间
  const mathSub = afterPrefix(skill, 'math:');
  if (mathSub) return { route: 'numbers', param: mathSub, label: `数学·${SUB_LABELS.numbers?.[mathSub] ?? '计算'}` };
  if (skill === 'number:count') return { route: 'numbers', param: 'count', label: `数学·${SUB_LABELS.numbers?.count ?? '数数'}` };
  if (skill === 'compare') return { route: 'numbers', param: 'compare', label: `数学·${SUB_LABELS.numbers?.compare ? '比较测量' : '比较'}` };
  if (skill === 'time') return { route: 'numbers', param: 'time', label: `数学·${SUB_LABELS.numbers?.time ?? '时间'}` };

  // 逻辑
  const logicSub = afterPrefix(skill, 'logic:');
  if (logicSub) return { route: 'logic', param: logicSub, label: `逻辑·${SUB_LABELS.logic?.[logicSub] ?? '思维'}` };

  // 古诗
  const poemId = afterPrefix(skill, 'poem:');
  if (poemId) return { route: 'poems', param: poemId, label: '古诗' };

  return null;
}

/**
 * 将知识点键解析为目标模块并导航。
 * @returns 是否成功导航（skill 无法映射为训练目标时为 false）。
 */
export function openTraining(skill: string): boolean {
  const target = skillToTarget(skill);
  if (!target) return false;
  navigate(target.route, target.param);
  return true;
}

/**
 * 把模块页面参数反向解出人类可读训练主题（用于横幅展示）。
 * 规则按 skillToTarget 产出的 param 约定；无 param 或无法解出时返回 null。
 */
export function paramToTarget(route: RouteId, param?: string): TrainingTarget | null {
  if (!param) return null;

  switch (route) {
    case 'hanzi': {
      if (param.startsWith('stroke:')) return { route, param, label: '识字·笔顺' };
      if (param.startsWith('build:')) return { route, param, label: '识字·组词' };
      return { route, param, label: `识字·${param}` };
    }
    case 'pinyin': {
      switch (param) {
        case 'tone': return { route, param, label: '拼音·声调' };
        case 'blend': return { route, param, label: '拼音·拼读' };
        case 'dictation': return { route, param, label: '拼音·听写' };
        case 'group': return { route, param, label: '拼音·归类' };
        default: return null;
      }
    }
    case 'letters': {
      if (param.startsWith('trace:')) return { route, param, label: `字母·书写 ${param.slice('trace:'.length)}` };
      if (param === 'order') return { route, param, label: '字母·排序' };
      return { route, param, label: `字母·${param}` };
    }
    case 'words': {
      switch (param) {
        case 'sentence': return { route, param, label: '单词·句子' };
        case 'dialogue': return { route, param, label: '单词·对话' };
        case 'phonics': return { route, param, label: '单词·自然拼读' };
        case 'practice': return { route, param, label: '单词·词汇' };
        default: return null;
      }
    }
    case 'numbers': {
      const sub = SUB_LABELS.numbers?.[param] ?? '计算';
      return { route, param, label: `数学·${sub}` };
    }
    case 'logic': {
      return { route, param, label: `逻辑·${SUB_LABELS.logic?.[param] ?? '思维'}` };
    }
    case 'poems': {
      return { route, param, label: '古诗' };
    }
    default:
      return null;
  }
}
