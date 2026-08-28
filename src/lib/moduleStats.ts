import type { Progress } from '@/types';
import type { RouteId } from '@/lib/router';

/**
 * 模块进度聚合（P1 游戏中心 / 故事馆 / 成长博物馆 共用）
 * ------------------------------------------------------------
 * 每个模块用一套统一的「已学 / 总量」指标，得到 0-1 的掌握进度，
 * 用于卡片上的进度环与条形。纯函数、无副作用，可安全在多个页面复用。
 *
 * - key 类：直接读 progress 上的计数型字段（关卡数 / 已读诗数 / 绘本数…）
 * - prefix 类：按 mastery 前缀聚合 lv 总和，总量按 = 知识点数 × 5（lv 上限）
 *   近似成进度，孩子多练少练都能呈现一条有涨落的曲线，而非非黑即白。
 */
export interface ModuleStat {
  done: number;
  total: number;
  rate: number;
  hasProgress: boolean;
}

interface Def {
  total: number;
  key?: 'levels' | 'funMix' | 'logicCorrect' | 'storybooks' | 'poemsRead' | 'lettersHeard' | 'numbersHeard';
  prefix?: string;
}

const DEF: Record<string, Def> = {
  adventure: { total: 18, key: 'levels' },
  fun: { total: 30, key: 'funMix' },
  vehicles: { total: 12, prefix: 'vehicle' },
  logic: { total: 60, key: 'logicCorrect' },
  music: { total: 5, prefix: 'music' },
  art: { total: 6, prefix: 'art' },
  songs: { total: 10, prefix: 'rhyme' },
  idioms: { total: 60, prefix: 'idiom' },
  storybook: { total: 50, key: 'storybooks' },
  poems: { total: 385, key: 'poemsRead' },
  hanzi: { total: 300, prefix: 'hanzi' },
  pinyin: { total: 63, prefix: 'pinyin' },
  words: { total: 74, prefix: 'word' },
  letters: { total: 26, key: 'lettersHeard' },
  numbers: { total: 101, key: 'numbersHeard' },
};

export function moduleStat(route: RouteId | string, p: Progress): ModuleStat {
  const def = DEF[route as string];
  if (!def) return { done: 0, total: 0, rate: 0, hasProgress: false };

  if (def.prefix) {
    const prefix = def.prefix;
    const entries = Object.entries(p.mastery).filter(([k]) => k.startsWith(`${prefix}:`));
    const done = entries.reduce((s, [, m]) => s + (m?.lv ?? 0), 0);
    const total = Math.max(1, entries.length) * 5;
    return { done: Math.min(done, total), total, rate: Math.min(1, done / total), hasProgress: true };
  }

  let done = 0;
  switch (def.key) {
    case 'levels':
      done = Object.keys(p.levelStars ?? {}).length;
      break;
    case 'funMix':
      done = (p.pkCount ?? 0) + (p.creativeCount ?? 0) + Object.keys(p.gameBest ?? {}).length;
      break;
    case 'logicCorrect':
      done = p.logicCorrect;
      break;
    case 'storybooks':
      done = (p.storybooks ?? []).length;
      break;
    case 'poemsRead':
      done = (p.poemsRead ?? []).length;
      break;
    case 'lettersHeard':
      done = (p.lettersHeard ?? []).length;
      break;
    case 'numbersHeard':
      done = (p.numbersHeard ?? []).length;
      break;
  }
  const rate = Math.min(1, done / def.total);
  return { done: Math.min(done, def.total), total: def.total, rate, hasProgress: true };
}
