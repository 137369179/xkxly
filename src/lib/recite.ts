/**
 * 背诵训练引擎
 * ------------------------------------------------------------
 * 为古诗生成分难度的「遮挡默写」版本（关卡 1→4 由易到难），并对照用户
 * 默写文本评分。遮挡等级：
 *   1 隐一字（句中）      2 隐二字        3 隐全句仅留首字    4 全隐（纯回忆）
 * 评分按「内容字逐字比对」（忽略标点与空格），输出综合分与逐句明细，
 * 供 PoemsPage 回写 SRS 掌握度（见 useStore.recordRecite）。
 */
import type { DeepPoem } from '@/types';

/** 全角占位符 */
const BLANK = '＿';

export interface MaskedPoem {
  level: number;
  /** 遮挡后的逐句文本（含标点，隐去处用 BLANK） */
  lines: string[];
  /** 内容字总数（供进度展示） */
  total: number;
  /** 各句隐去字数 */
  blanks: number[];
}

function hanIndices(line: DeepPoem['lines'][number]): number[] {
  return line.chars.map((c, i) => (/[一-龥]/.test(c.c) ? i : -1)).filter((i) => i >= 0);
}

/** 生成某关卡的遮挡诗 */
export function maskPoem(poem: DeepPoem, level: 1 | 2 | 3 | 4): MaskedPoem {
  const lines: string[] = [];
  const blanks: number[] = [];
  let total = 0;

  poem.lines.forEach((line) => {
    const han = hanIndices(line);
    total += han.length;
    const hide = new Set<number>();

    if (han.length >= 2) {
      if (level === 1) {
        hide.add(han[Math.floor(han.length / 2)] ?? -1);
      } else if (level === 2) {
        const mid = Math.floor(han.length / 2);
        hide.add(han[mid] ?? -1);
        const m1 = han[mid - 1];
        if (m1 !== undefined) hide.add(m1);
      } else if (level === 3) {
        // 仅留首字
        han.slice(1).forEach((i) => hide.add(i));
      } else {
        // level 4：全隐（纯回忆）
        han.forEach((i) => hide.add(i));
      }
    }

    const text = line.chars
      .map((c, i) => (hide.has(i) ? BLANK : c.c))
      .join('');
    lines.push(text);
    blanks.push(hide.size);
  });

  return { level, lines, total, blanks };
}

export interface ReciteLineScore {
  correct: number;
  total: number;
}
export interface ReciteResult {
  /** 综合分 0-100 */
  score: number;
  correct: number;
  total: number;
  perLine: ReciteLineScore[];
}

function onlyHan(s: string): string {
  return s.replace(/[^一-龥]/g, '');
}

/** 对照用户默写文本评分 */
export function scoreRecite(poem: DeepPoem, userLines: string[]): ReciteResult {
  let correct = 0;
  let total = 0;
  const perLine: ReciteLineScore[] = [];

  poem.lines.forEach((line, i) => {
    const gold = onlyHan(line.chars.map((c) => c.c).join(''));
    const user = onlyHan(userLines[i] ?? '');
    const len = Math.max(gold.length, user.length);
    let lineCorrect = 0;
    for (let k = 0; k < len; k++) {
      if (gold[k] && gold[k] === user[k]) lineCorrect++;
    }
    correct += lineCorrect;
    total += gold.length;
    perLine.push({ correct: lineCorrect, total: gold.length });
  });

  const score = total ? Math.round((correct / total) * 100) : 0;
  return { score, correct, total, perLine };
}
