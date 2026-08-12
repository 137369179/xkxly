import { describe, it, expect } from 'vitest';
import { makeResearchQuestion, factBankFor, hasFactBank } from './questions';
import { RESEARCH_TOPICS } from './researchTopics';

/**
 * questions 单元测试（E1 / C2 零 AI 依赖 + C7 无中文字面量）
 * ------------------------------------------------------------------
 * 1. 每个 topic 都能出题，题目结构完整（id/prompt/options/answerId/skill/difficulty）
 * 2. 题目 skill 前缀为 research:<topicId>
 * 3. 题池非空（每主题 ≥3 题，保证 3–5 题轮次不重题）
 * 4. 数据文件无中文字面量（C7）
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

  it('题池每主题 ≥3 题（3–5 题轮次不重题）', () => {
    for (const tp of RESEARCH_TOPICS) {
      expect(factBankFor(tp.id).length, tp.id).toBeGreaterThanOrEqual(3);
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
