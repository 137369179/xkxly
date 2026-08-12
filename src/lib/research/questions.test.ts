import { describe, it, expect } from 'vitest';
import { makeResearchQuestion, makeResearchFactQuestion, factBankFor, hasFactBank } from './questions';
import { RESEARCH_TOPICS } from './researchTopics';

/**
 * questions 单元测试（E1 / C2 零 AI 依赖 + C7 无中文字面量 + Sprint 4-C）
 * ------------------------------------------------------------------
 * 1. 每个 topic 都能出题，题目结构完整（id/prompt/options/answerId/skill/difficulty）
 * 2. 题目 skill 前缀为 research:<topicId>
 * 3. 题池非空（Sprint 4-C：每主题 8 题，保证 3–5 题轮次不重题）
 * 4. 数据文件无中文字面量（C7）
 * 5. Sprint 4-C：claim 与正确答案一致（错误陈述 → 「错」为正确答案）
 * 6. Sprint 4-C：SRS 到期复习混入（dueKeys 注入后能出跨主题复习题）
 */

const t = (k: string) => k; // 测试用恒等翻译器：断言键存在性而非文案

describe('E1 · 静态出题闭包（C2）', () => {
  it('每个 topic 都能出题且结构完整', () => {
    for (const tp of RESEARCH_TOPICS) {
      const q = makeResearchQuestion(tp.id, t)(1);
      expect(q.id, tp.id).toBeTruthy();
      expect(q.prompt, tp.id).toBeTruthy();
      expect(q.options.length, tp.id).toBeGreaterThanOrEqual(2);
      expect(q.skill, tp.id).toBe(`research:${tp.id}`);
      expect([1, 2, 3], tp.id).toContain(q.difficulty);
    }
  });

  it('题目选项包含对/错两个，且含正确答案', () => {
    const q = makeResearchQuestion('dino', t)(1);
    expect(q.options.some((o) => o.correct)).toBe(true);
    expect(q.options.some((o) => !o.correct)).toBe(true);
  });

  it('Sprint 4-C：claim=true 的陈述「对」为正确答案；claim=false 的陈述「错」为正确答案', () => {
    // dino q1「翼龙会在海里游泳」claim=false → 正确答案应为「错」
    const q = makeResearchFactQuestion('dino', t, 1, factBankFor('dino')[1]!);
    const trueOpt = q.options.find((o) => o.label === 'research.quiz.opt.true')!;
    const falseOpt = q.options.find((o) => o.label === 'research.quiz.opt.false')!;
    expect(falseOpt.correct).toBe(true);
    expect(trueOpt.correct).toBe(false);
    // color q0「红色是苹果的颜色」claim=true → 「对」正确
    const q2 = makeResearchFactQuestion('color', t, 1, factBankFor('color')[0]!);
    expect(q2.options.find((o) => o.label === 'research.quiz.opt.true')!.correct).toBe(true);
  });

  it('Sprint 4-C：题池每主题 8 题（3–5 题轮次不重题，含正误混合）', () => {
    for (const tp of RESEARCH_TOPICS) {
      const bank = factBankFor(tp.id);
      expect(bank.length, tp.id).toBe(8);
      expect(bank.some((f) => f.claim), tp.id).toBe(true); // 有对题
      expect(bank.some((f) => !f.claim), tp.id).toBe(true); // 有错题（辨别力）
    }
  });

  it('Sprint 4-C：注入 dueKeys 后能出跨主题复习题（skill 保持原到期主题）', () => {
    const makeQ = makeResearchQuestion('color', t, ['research:dino']);
    let sawReview = false;
    for (let i = 0; i < 60; i++) {
      const q = makeQ(1);
      if (q.skill === 'research:dino') {
        sawReview = true;
        break;
      }
    }
    expect(sawReview).toBe(true);
  });

  it('Sprint 4-C：无到期项时不混入复习（纯当前主题）', () => {
    const makeQ = makeResearchQuestion('color', t, []);
    for (let i = 0; i < 20; i++) {
      expect(makeQ(1).skill).toBe('research:color');
    }
  });

  it('未知 topicId 回退 color 题池（不抛错，C2 保证任何主题都能出题）', () => {
    const q = makeResearchQuestion('nonexistent', t)(1);
    expect(q.id).toBeTruthy();
  });

  it('hasFactBank 与注册表一致', () => {
    for (const tp of RESEARCH_TOPICS) {
      expect(hasFactBank(tp.id)).toBe(true);
    }
    expect(hasFactBank('nope')).toBe(false);
  });

  it('不同难度档产出不同题目（id 不同）', () => {
    const q1 = makeResearchQuestion('dino', t)(1);
    const q2 = makeResearchQuestion('dino', t)(3);
    expect(q1.id).not.toBe(q2.id);
  });

  it('数据文件无中文字面量（C7）', () => {
    const src = require('fs').readFileSync(__filename.replace('.test.ts', '.ts'), 'utf-8');
    const codeLines = src.split('\n').filter(
      (l: string) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/**'),
    );
    const cjk = codeLines.filter((l: string) => /[\u4e00-\u9fff]/.test(l));
    expect(cjk).toEqual([]);
  });
});
