/**
 * 错题因果聚类 · 根因归类
 * ------------------------------------------------------------------
 * 错题本（Progress.wrongBook）中的条目是统一 SRS 命名空间的 skill key
 * （如 `math:fraction`、`hanzi-stroke:水`、`word:phonics:a`、`letter:A`、`pinyin:tone`）。
 * 现存的 wrongCategory 只取首段（太粗），这里按根本原因（题型 / 技能类别，
 * 而非具体字词）归并，供「按原因」视图驱动针对性练习。
 */

export interface WrongCluster {
  /** 根因聚合 key，采用「模块:子类」形式，如 `hanzi:stroke`、`math:compare` */
  key: string;
  /** 人类可读中文名，如「汉字·笔顺」「数学·分数」 */
  label: string;
  /** 组内错题条目数 */
  count: number;
  /** 组内 skill key 列表（按错题本原顺序） */
  skills: string[];
}

interface RootCause {
  key: string;
  label: string;
}

/** math 子技能 → 中文名（未知子技能回退「计算」） */
const MATH_SUB_LABEL: Record<string, string> = {
  fraction: '分数',
  money: '钱币',
  shape: '图形',
  skip: '跳数',
  time: '时间',
  compare: '比较',
  ladder: '阶梯',
  word: '应用题',
  rabbit: '速算',
  tenframe: '十格阵',
  trace: '描数',
};

/** logic 子技能 → 中文名（未知子技能回退「思维」） */
const LOGIC_SUB_LABEL: Record<string, string> = {
  maze: '迷宫',
  sudoku: '数独',
  codebot: '编程',
};

/** 提取 `prefix` 前缀之后的内容；前缀不匹配或其后为空时返回 null */
function afterPrefix(skill: string, prefix: string): string | null {
  if (!skill.startsWith(prefix)) return null;
  const rest = skill.slice(prefix.length);
  return rest === '' ? null : rest;
}

/**
 * 将单个 skill key 映射为根因（题型 / 技能类别）。
 * 同一根因（如不同汉字共属「笔顺」、`compare` 与 `math:compare` 同属「比较」）
 * 归入同一个 key，供 clusterWrongBook 聚合。
 */
export function rootCauseOf(skill: string): RootCause {
  // 汉字：笔顺 / 组词 / 认读
  if (afterPrefix(skill, 'hanzi-stroke:') !== null) return { key: 'hanzi:stroke', label: '汉字·笔顺' };
  if (afterPrefix(skill, 'hanzi-build:') !== null) return { key: 'hanzi:build', label: '汉字·组词' };
  if (afterPrefix(skill, 'hanzi:') !== null) return { key: 'hanzi:read', label: '汉字·认读' };

  // 拼音：声调 / 听写精确匹配，拼读 / 归类前缀匹配，其余为基础
  if (skill === 'pinyin:tone') return { key: 'pinyin:tone', label: '拼音·声调' };
  if (afterPrefix(skill, 'pinyin:blend:') !== null) return { key: 'pinyin:blend', label: '拼音·拼读' };
  if (skill === 'pinyin:dictation') return { key: 'pinyin:dictation', label: '拼音·听写' };
  if (afterPrefix(skill, 'pinyin:group:') !== null) return { key: 'pinyin:group', label: '拼音·归类' };
  if (skill.startsWith('pinyin:')) return { key: 'pinyin', label: '拼音·基础' };

  // 字母：书写 / 排序 / 认读
  if (afterPrefix(skill, 'letter-trace:') !== null) return { key: 'letter:trace', label: '字母·书写' };
  if (skill === 'letter-order') return { key: 'letter:order', label: '字母·排序' };
  if (afterPrefix(skill, 'letter-study:') !== null || afterPrefix(skill, 'letter:') !== null) {
    return { key: 'letter:read', label: '字母·认读' };
  }

  // 单词：句子 / 对话 / 自然拼读 / 复习，其余为词汇
  if (afterPrefix(skill, 'word:sentence:') !== null) return { key: 'word:sentence', label: '单词·句子' };
  if (afterPrefix(skill, 'word:dialogue:') !== null) return { key: 'word:dialogue', label: '单词·对话' };
  if (afterPrefix(skill, 'word:phonics:') !== null || afterPrefix(skill, 'word:family:') !== null) {
    return { key: 'word:phonics', label: '单词·自然拼读' };
  }
  if (afterPrefix(skill, 'word:review:') !== null) return { key: 'word:review', label: '单词·复习' };
  if (afterPrefix(skill, 'word:') !== null) return { key: 'word', label: '单词·词汇' };

  // 数学：子技能直映射；number:count / compare / time 归入对应 math 子类
  const mathSub = afterPrefix(skill, 'math:');
  if (mathSub !== null) return { key: `math:${mathSub}`, label: `数学·${MATH_SUB_LABEL[mathSub] ?? '计算'}` };
  if (skill === 'number:count') return { key: 'math:count', label: '数学·数数' };
  if (skill === 'compare') return { key: 'math:compare', label: '数学·比较' };
  if (skill === 'time') return { key: 'math:time', label: '数学·时间' };

  // 逻辑：迷宫 / 数独 / 编程，其余为思维
  const logicSub = afterPrefix(skill, 'logic:');
  if (logicSub !== null) return { key: `logic:${logicSub}`, label: `逻辑·${LOGIC_SUB_LABEL[logicSub] ?? '思维'}` };

  // 未知：以首段兜底（不再细分）
  const first = skill.split(':')[0] ?? skill;
  return { key: first, label: first };
}

/**
 * 按根因归并错题本，返回按 count 降序的聚类列表。
 * 只读聚合，不修改 wrongBook 数据结构本身。
 */
export function clusterWrongBook(progress: { wrongBook?: string[] }): WrongCluster[] {
  const map = new Map<string, WrongCluster>();
  for (const skill of progress.wrongBook ?? []) {
    const { key, label } = rootCauseOf(skill);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.skills.push(skill);
    } else {
      map.set(key, { key, label, count: 1, skills: [skill] });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
