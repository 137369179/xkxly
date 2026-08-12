import { dueSkills } from '@/lib/srs';
import { rampDifficulty } from '@/lib/difficulty';
import { questionForSkill, type Difficulty } from '@/lib/questions';
import type { Progress, Question } from '@/types';

/**
 * 间隔复习注入器
 * ------------------------------------------------------------
 * 把「自适应复习」叠加到任意出题器上：约 35% 的概率，从当前到期待复习
 * 知识点 + 错题本里挑一个同分类的题目优先考，强化记忆薄弱点。
 *
 * 核心加强 E（bug 修复 + 难度感知）：
 *   1. 去重：dueSkills 与 wrongBook 可能让同一 skill 出现两次，导致它被选中
 *      概率虚高（实际是 2/N 而非 1/N）。改为 Set 去重后再 random。
 *   2. 难度感知：复习题不再统一用用户选的整体难度 d，而是按该 skill 所属
 *      类别用 rampDifficulty 自适应——让"已经会了"的复习题自然变难，
 *      "还薄弱"的复习题保持简单，避免高难度复习题打击信心。
 *
 * 用法：
 *   const make = makeSpacedDrill('math', makeMathQuestion, () => useStore.getState().progress);
 *   <RoundRunner makeQuestion={make} difficulty={diff} ... />
 */
export function makeSpacedDrill(
  category: string,
  base: (d: Difficulty) => Question,
  progressProvider: () => Progress,
): (d: Difficulty) => Question {
  return (d: Difficulty): Question => {
    const p = progressProvider();
    // 去重：合并 dueSkills 与 wrongBook 后用 Set 去掉重复 skill
    const pool = Array.from(new Set([...dueSkills(p), ...p.wrongBook])).filter((s) =>
      s.startsWith(`${category}:`),
    );
    if (pool.length && Math.random() < 0.35) {
      const skill = pool[Math.floor(Math.random() * pool.length)]!
      // 难度感知：按 skill 所属类别 rampDifficulty，而非统一用 d
      const reviewDiff = rampDifficulty(p, category) as Difficulty;
      const q = questionForSkill(skill, reviewDiff);
      if (q) return q;
    }
    return base(d);
  };
}
