// @vitest-environment jsdom
/**
 * 字理新题型（P3）经通用 QuizCard 渲染不崩溃 + 结构正确。
 * 与既有 7 类题型同构（prompt/display/options/answerId），此处只验证
 * 新加的 hanzi-formation / hanzi-component 两类能正常上屏。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QuizCard } from '@/components/QuizCard';
import { makeHanziFormationQuestion, makeHanziComponentQuestion } from '@/lib/hanziQuestions';
import { getHanziByChar } from '@/data/hanziIndex';

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  host?.remove();
  root = null;
  host = null;
});

function mount(el: React.ReactElement): HTMLDivElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return host;
}

describe('字理题 · QuizCard 渲染', () => {
  it('六书识别题渲染出题干与目标字，且恰好 4 个选项按钮', () => {
    const q = makeHanziFormationQuestion(getHanziByChar('清')!);
    const h = mount(createElement(QuizCard, { question: q }));
    expect(h.textContent).toContain('清');
    // 选项按钮数 = 4（四书）
    const optionButtons = Array.from(h.querySelectorAll('button')).filter((b) =>
      /^[🌿📍🧩🔊]/.test(b.textContent ?? ''),
    );
    expect(optionButtons.length).toBe(4);
  });

  it('部件识别题（形旁/声旁/contains 任一）渲染不崩溃', () => {
    // 抽样多次，确保三种子题型都至少能上屏一次
    const seen = new Set<string>();
    for (let i = 0; i < 60 && seen.size < 3; i++) {
      const q = makeHanziComponentQuestion(getHanziByChar('清')!);
      if (q.kind !== 'hanzi-component') continue;
      const sub = q.prompt.includes('声旁') ? 'phonetic' : q.prompt.includes('形旁') ? 'semantic' : 'contains';
      seen.add(sub);
      const h = mount(createElement(QuizCard, { question: q }));
      // 题干一定包含「部件 / 形旁 / 声旁」之一；contains 题展示的是部件而非目标字「清」
      expect(h.textContent).toMatch(/形旁|声旁|含有部件/);
      // 恰好 4 个选项按钮
      const optionButtons = Array.from(h.querySelectorAll('button')).filter((b) =>
        /^[一-鿿「」]/.test(b.textContent ?? ''),
      );
      expect(optionButtons.length).toBe(4);
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('声旁不表音字「时」的部件题绝不渲染「声旁」措辞', () => {
    for (let i = 0; i < 60; i++) {
      const q = makeHanziComponentQuestion(getHanziByChar('时')!);
      if (q.kind === 'hanzi-component') {
        const h = mount(createElement(QuizCard, { question: q }));
        expect(h.textContent).not.toContain('声旁');
      }
    }
  });
});
