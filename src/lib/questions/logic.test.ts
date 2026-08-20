// @vitest-environment node
/**
 * 逻辑出题器契约测试（找规律 / 配对 / 排序 / 条件判断 / 步骤排序）
 * ------------------------------------------------------------
 * 覆盖：条件判断三档难度（L1 分类 / L2 规则 / L3 推理）、
 * 步骤排序三档（L1 三步 / L2 四步 / L3 细节流程）、
 * 既有题型回归、makeLogicQuestion 路由与 mixed 全覆盖。
 */
import { describe, it, expect } from 'vitest';
import type { Question } from '@/types';
import type { Difficulty } from '@/lib/questions';
import {
  makeLogicQuestion,
  makePatternQuestion,
  makeMatchQuestion,
  makeOrderQuestion,
  makeConditionQuestion,
  makeStepsQuestion,
} from './logic';

const ROUNDS = 40;

/** 循环难度：1/2/3 轮换（收窄为 Difficulty 联合类型） */
const cycleDiff = (i: number): Difficulty => ((i % 3) + 1) as Difficulty;

/** 通用题型契约校验：选项≥3、答案在选项中且唯一、文案非空、skill 前缀正确 */
function assertValidQuestion(q: Question, skillPrefix: string) {
  expect(q.kind).toBe('logic');
  expect((q.prompt ?? '').trim().length).toBeGreaterThan(0);
  expect((q.hint ?? '').trim().length).toBeGreaterThan(0);
  expect((q.why ?? '').trim().length).toBeGreaterThan(0);
  expect(q.options.length).toBeGreaterThanOrEqual(3);
  expect((q.answerId ?? '').length).toBeGreaterThan(0);
  expect(q.skill.startsWith(skillPrefix)).toBe(true);
  const ids = q.options.map((o) => o.id);
  expect(ids).toContain(q.answerId);
  expect(new Set(ids).size).toBe(q.options.length);
  for (const o of q.options) {
    expect(o.label ?? o.emoji ?? o.shapes).toBeTruthy();
  }
}

describe('makeConditionQuestion 条件判断（新增题型）', () => {
  it('L1 生活分类：恒 4 选项且契约完整（40 轮）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      const q = makeConditionQuestion(1);
      expect(q.options.length).toBe(4);
      assertValidQuestion(q, 'logic:condition');
    }
  });

  it('L2 真假/规则：恒 4 选项且契约完整（40 轮）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      const q = makeConditionQuestion(2);
      expect(q.options.length).toBe(4);
      assertValidQuestion(q, 'logic:condition');
    }
  });

  it('L3 多条件推理：恒 4 选项且契约完整（40 轮）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      const q = makeConditionQuestion(3);
      expect(q.options.length).toBe(4);
      assertValidQuestion(q, 'logic:condition');
    }
  });

  it('L1 为图形选项（emoji 归类，低门槛）', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeConditionQuestion(1);
      expect(q.options.some((o) => o.emoji)).toBe(true);
    }
  });

  it('L2 含文字陈述形态（真假判断/场景规则 label 选项）', () => {
    let labelHit = false;
    let emojiHit = false;
    for (let i = 0; i < 60; i++) {
      const q = makeConditionQuestion(2);
      if (q.options.every((o) => o.label)) labelHit = true;
      if (q.options.some((o) => o.label?.includes('🛑') || o.label?.includes('🌂'))) emojiHit = true;
    }
    expect(labelHit).toBe(true);
    // 场景规则题会包含 emoji 前缀选项（如 🛑 停下来）
    expect(emojiHit).toBe(true);
  });

  it('L3 覆盖三种推理形态（交集/传递/数量）', () => {
    const prompts = new Set<string>();
    for (let i = 0; i < 60; i++) prompts.add(makeConditionQuestion(3).prompt);
    expect(prompts.size).toBeGreaterThanOrEqual(3);
  });
});

describe('makeStepsQuestion 步骤排序（新增题型）', () => {
  it('L1 三步流程：恒 4 选项且契约完整（40 轮）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      const q = makeStepsQuestion(1);
      expect(q.options.length).toBe(4);
      assertValidQuestion(q, 'logic:steps');
    }
  });

  it('L2 四步流程：恒 4 选项且契约完整（40 轮）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      const q = makeStepsQuestion(2);
      expect(q.options.length).toBe(4);
      assertValidQuestion(q, 'logic:steps');
    }
  });

  it('L3 细节流程：恒 4 选项且契约完整（40 轮）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      const q = makeStepsQuestion(3);
      expect(q.options.length).toBe(4);
      assertValidQuestion(q, 'logic:steps');
    }
  });

  it('prompt 指向具体生活流程且答案含正确顺序', () => {
    for (let i = 0; i < 30; i++) {
      const q = makeStepsQuestion(2);
      expect(q.prompt).toContain('正确顺序');
      const answer = q.options.find((o) => o.id === q.answerId);
      expect(answer?.label).toBeTruthy();
      // 选项 label 用箭头连接步骤，至少有 3 个步骤片段
      const segments = (answer?.label ?? '').split(' → ');
      expect(segments.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('三档流程池互异（L1 三步 / L2-L3 四步）', () => {
    const l1 = makeStepsQuestion(1);
    const l2 = makeStepsQuestion(2);
    const l3 = makeStepsQuestion(3);
    const seg = (q: Question) => (q.options.find((o) => o.id === q.answerId)?.label ?? '').split(' → ').length;
    expect(seg(l1)).toBe(3);
    expect(seg(l2)).toBe(4);
    expect(seg(l3)).toBe(4);
  });
});

describe('既有题型契约回归', () => {
  it('pattern：40 轮契约完整（覆盖 L1-L3）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      assertValidQuestion(makePatternQuestion(cycleDiff(i)), 'logic:pattern');
    }
  });

  it('match：40 轮契约完整（覆盖 L1-L3）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      assertValidQuestion(makeMatchQuestion(cycleDiff(i)), 'logic:match');
    }
  });

  it('order：40 轮契约完整（覆盖 L1-L3）', () => {
    for (let i = 0; i < ROUNDS; i++) {
      assertValidQuestion(makeOrderQuestion(cycleDiff(i)), 'logic:order');
    }
  });
});

describe('makeLogicQuestion 路由', () => {
  it('condition 直达：skill 恒为 logic:condition', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeLogicQuestion('condition', cycleDiff(i));
      expect(q.skill).toBe('logic:condition');
      assertValidQuestion(q, 'logic:condition');
    }
  });

  it('steps 直达：skill 恒为 logic:steps', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeLogicQuestion('steps', cycleDiff(i));
      expect(q.skill).toBe('logic:steps');
      assertValidQuestion(q, 'logic:steps');
    }
  });

  it('mixed 覆盖全部五种题型', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 150; i++) seen.add(makeLogicQuestion('mixed', 2).skill);
    expect(seen.has('logic:pattern')).toBe(true);
    expect(seen.has('logic:match')).toBe(true);
    expect(seen.has('logic:order')).toBe(true);
    expect(seen.has('logic:condition')).toBe(true);
    expect(seen.has('logic:steps')).toBe(true);
  });
});
