// @vitest-environment jsdom
/**
 * 成语复习中心 · 集成测试（模拟「从成语页点复习 → 走完整流程」）
 * --------------------------------------------------------------
 * 由于复习入口尚未接入 IdiomsPage，本测试用 Harness 模拟成语页的
 * 复习按钮(onEnter) 与 返回(onExit)，驱动真实 IdiomReviewCenter：
 *   进入复习 → 回忆(含义) → 揭晓(词面) → 自评 → 下一张 → 完成 → 返回
 * 同时验证 practice/learnSkill 对 store 的回写。
 *
 * 数据：注入两项「已到期」的 idiom mastery，使队列确定（i3 守株待兔、i12 水滴石穿）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// ---------- mock 外部依赖 ----------
vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, string | number>) => {
    if (p) return Object.entries(p).reduce((acc, [key, val]) => acc.replace(`{${key}}`, String(val)), k);
    return k;
  } }),
}));
vi.mock('motion/react', () => ({
  motion: {
    div: (p: any) => createElement('div', p, p.children),
    span: (p: any) => createElement('span', p, p.children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { useStore } from '@/store/useStore';
import { IdiomReviewCenter } from './IdiomReviewCenter';

// ---------- Harness：模拟成语页的复习入口与返回 ----------
function Harness() {
  const [inReview, setInReview] = useState(false);
  return inReview
    ? createElement(IdiomReviewCenter, { onExit: () => setInReview(false) })
    : createElement('button', { 'data-testid': 'open-review', onClick: () => setInReview(true) }, '复习');
}

let host: HTMLDivElement;
let root: Root;

function render() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(Harness)));
}
const text = () => host?.textContent ?? '';
const button = (testid: string) => host?.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement | null;
const buttonByText = (txt: string) =>
  Array.from(host?.querySelectorAll('button') ?? []).find((b) => b.textContent?.includes(txt));

// 复用一个 `practice` 记录 spy，观测是否被调用
const practiceSpy = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  // 注入两项已到期(因 due=0 <= now)的成语掌握度
  act(() =>
    useStore.setState((s) => ({
      progress: {
        ...s.progress,
        mastery: {
          ...s.progress.mastery,
          'idiom:i3': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
          'idiom:i12': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
        },
      },
    })),
  );
  practiceSpy.mockImplementation(useStore.getState().practice);
});

describe('从成语页点击「复习」进入复习中心 · 完整流程', () => {
  it('进入→回忆→揭晓→自评两张→完成→返回，并正确回写 mastery', () => {
    render();

    // ① 成语页点复习
    expect(button('open-review')).toBeTruthy();
    act(() => button('open-review')!.click());

    // ② 第一张「守株待兔」：回忆阶段显示含义线索（不含词面）
    expect(text()).toContain('守在树桩旁等兔子来撞');
    expect(text()).not.toContain('守株待兔');

    // ③ 揭晓 → 显示词面
    act(() => buttonByText('idioms.reviewReveal')!.click());
    expect(text()).toContain('守株待兔');

    // ④ 自评「我记住了」→ 下一张
    act(() => buttonByText('idioms.reviewRemember')!.click());
    // 第二张「水滴石穿」进入回忆
    expect(text()).toContain('水不断滴下能把石头滴穿');
    expect(text()).not.toContain('守株待兔');

    // ⑤ 揭晓 + 又忘了 → 完成
    act(() => buttonByText('idioms.reviewReveal')!.click());
    act(() => buttonByText('idioms.reviewForgot')!.click());
    expect(text()).toContain('idioms.reviewDone');

    // ⑥ 返回 → 回到"成语页"入口
    act(() => buttonByText('idioms.reviewBack')!.click());
    expect(button('open-review')).toBeTruthy();

    // ⑦ 回写验证：i3 记住了(+ok)，i12 忘了(+ng)
    const m3 = useStore.getState().progress.mastery['idiom:i3'];
    const m12 = useStore.getState().progress.mastery['idiom:i12'];
    expect(m3?.ok).toBeGreaterThanOrEqual(1);
    expect(m12?.ng).toBeGreaterThanOrEqual(1);

    // ⑧ 每日复习奖励：完成一次复习后发放星星 + 置 reviewDate
    expect(useStore.getState().progress.reviewDate).toBeTruthy();
    expect(useStore.getState().progress.stars).toBeGreaterThanOrEqual(1);
  });

  it('队列为空时直接进入完成空态，不走逐题', () => {
    act(() =>
      useStore.setState((s) => ({
        progress: { ...s.progress, mastery: {} },
      })),
    );
    render();
    act(() => button('open-review')!.click());
    expect(text()).toContain('idioms.reviewEmpty');
  });
});