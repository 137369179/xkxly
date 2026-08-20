/**
 * 数字王国 · 个性化推荐（纯逻辑，可单测）
 * ------------------------------------------------------------------
 * 目标：在页面内根据 SRS 掌握度，主动推荐「接下来最该练的子玩法」，
 * 作为深链「专项训练」之外的常驻智能建议。
 *
 * 与 skillRouting 的差异：
 *   - skillRouting 服务于「家长报告→一键专项」的深链路由；
 *   - 本模块服务于「页面内常驻推荐」，返回的是 NumbersPage 的子玩法 subTabId。
 *
 * 规则：
 *   1) 优先选「数字域内」已作答且错误率最高/答错最多的技能对应的子玩法；
 *   2) 数字域尚无任何练习记录时，回退到基础「数数乐」(count) 作为上手建议。
 * 非数字域技能（poem/hanzi/letter…）一律忽略。
 */
import type { MasteryItem } from '@/types';

/** 推荐结果：skill=触发推荐的原始技能键，game=NumbersPage 子玩法 subTabId */
export interface NumberRecommendation {
  skill: string;
  game: string;
}

/** 子玩法 subTabId ← 对应 SRS 技能键（精确键；其余 math:xxx 按同后缀映射） */
const GAME_BY_SKILL: Record<string, string> = {
  'math:tenframe': 'tenframe',
  'math:skip': 'skip',
  'math:word': 'word',
  'math:shape': 'shape',
  'math:fraction': 'fraction',
  'math:money': 'money',
  'math:rabbit': 'run',
  'math:ladder': 'ladder',
  'math:mul': 'extra',
  'math:div': 'extra',
  'number:count': 'count',
  'math:count': 'count',
  compare: 'measure',
  time: 'clock',
};

/** 技能键 → 子玩法 subTabId；非数字域返回 null */
export function gameForSkill(skill: string): string | null {
  const direct = GAME_BY_SKILL[skill];
  if (direct) return direct;
  if (skill.startsWith('math:')) return skill.slice('math:'.length);
  return null;
}

/** 子玩法 → 推荐权重：value 越小越优先展示（用于多技能指向同一子玩法时去重排序） */
const GAME_ORDER: Record<string, number> = {
  count: 0,
  tenframe: 1,
  skip: 2,
  word: 3,
  shape: 4,
  fraction: 5,
  money: 6,
  run: 7,
  ladder: 8,
  extra: 9,
  measure: 10,
  clock: 11,
};

export function recommendNumberSkill(mastery: Record<string, MasteryItem>): NumberRecommendation | null {
  // 1) 收集数字域内、已作答的技能，映射到子玩法
  const byGame = new Map<string, { skill: string; ng: number; ok: number }>();
  for (const [skill, m] of Object.entries(mastery)) {
    const game = gameForSkill(skill);
    if (!game || m.ok + m.ng === 0) continue;
    const prev = byGame.get(game);
    // 同一子玩法多个技能时合并作答计数，skill 保留错误率最高者
    if (!prev) {
      byGame.set(game, { skill, ng: m.ng, ok: m.ok });
    } else {
      byGame.set(game, {
        skill: prev.ng / Math.max(1, prev.ok) >= m.ng / Math.max(1, m.ok) ? prev.skill : skill,
        ng: prev.ng + m.ng,
        ok: prev.ok + m.ok,
      });
    }
  }

  if (!byGame.size) {
    // 2) 数字域尚无练习记录 → 回退基础「数数乐」
    return { skill: 'number:count', game: 'count' };
  }

  // 3) 弱项排序：错误率最高 → 答错次数最多 → 子玩法推荐权重优先
  const scored = Array.from(byGame.entries())
    .map(([game, v]) => ({ game, ...v, rate: v.ng / Math.max(1, v.ok + v.ng) }))
    .sort((a, b) => {
      if (b.rate !== a.rate) return b.rate - a.rate;
      if (b.ng !== a.ng) return b.ng - a.ng;
      return (GAME_ORDER[a.game] ?? 9) - (GAME_ORDER[b.game] ?? 9);
    });
  const top = scored[0]!;
  return { skill: top.skill, game: top.game };
}