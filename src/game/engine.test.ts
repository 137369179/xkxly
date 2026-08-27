import { describe, it, expect } from 'vitest';
import { applyAnswer } from './engine';
import { createInitialProgress } from '@/lib/progress';
import { SKILL } from '@/lib/srs';

describe('applyAnswer · 核心闭环引擎', () => {
  it('答对：升 SRS 等级并发 1 星', () => {
    const p = createInitialProgress();
    const out = applyAnswer(p, { skill: SKILL.hanzi('水'), correct: true });
    expect(out.progress.stars).toBe(p.stars + 1);
    expect(out.starsEarned).toBe(1);
    expect(out.masteryAfter.lv).toBe(1);
    expect(out.progress.mastery[SKILL.hanzi('水')]?.lv).toBe(1);
    expect(out.wasWrong).toBe(false);
  });

  it('答错：进错题本且不加星', () => {
    const p = createInitialProgress();
    const out = applyAnswer(p, { skill: 'math:add', correct: false });
    expect(out.progress.wrongBook).toContain('math:add');
    expect(out.wasWrong).toBe(true);
    expect(out.starsEarned).toBe(0);
  });

  it('连续答对升到 lv3 后自动移出错题本（消灭错题闭环）', () => {
    const p = createInitialProgress();
    let cur = applyAnswer(p, { skill: 'math:add', correct: false }).progress;
    expect(cur.wrongBook).toContain('math:add');
    for (let i = 0; i < 8; i++) cur = applyAnswer(cur, { skill: 'math:add', correct: true }).progress;
    expect(cur.wrongBook).not.toContain('math:add');
    expect(cur.mastery['math:add']?.lv ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('首次达到熟练(lv>=4)额外奖励 2 星', () => {
    const p = createInitialProgress();
    let cur = p;
    let newlyMastered = false;
    for (let i = 0; i < 6; i++) {
      const out = applyAnswer(cur, { skill: 'letter:A', correct: true });
      if (out.isNewlyMastered) newlyMastered = true;
      cur = out.progress;
    }
    expect(newlyMastered).toBe(true);
  });

  it('严格不可变：不修改入参 Progress', () => {
    const p = createInitialProgress();
    const skill = SKILL.hanzi('火');
    const before = p.mastery[skill];
    applyAnswer(p, { skill, correct: true });
    expect(p.mastery[skill]).toBe(before);
    expect(p.stars).toBe(0);
    expect(p.wrongBook).toHaveLength(0);
  });

  it('难度感知：高难度答对升 2 级', () => {
    const p = createInitialProgress();
    const out = applyAnswer(p, { skill: 'hanzi:难', correct: true, difficulty: 3 });
    expect(out.masteryAfter.lv).toBe(2);
  });
});
