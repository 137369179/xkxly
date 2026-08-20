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
import { IDIOMS } from '@/data/idioms';
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

    // ①-1 切到「经典回忆」模式：题型恒为 recallWord，执行确定性的原流程
    act(() => buttonByText('idioms.reviewModeRecall')!.click());

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

  it('混合模式下客观题型（填空）自动判错、揭晓回写，完成后仍奖励', () => {
    // 完全覆盖 mastery 为 i1..i4 四项到期掌握度（清空默认初始掌握的其余成语，保证队列确定）。
    // mixed 稳定分配：i1→recallWord、i2→recallMeaning、i3→picGuess、i4→fillBlank（画蛇添足）
    act(() =>
      useStore.setState((s) => ({
        progress: {
          ...s.progress,
          mastery: {
            'idiom:i1': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
            'idiom:i2': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
            'idiom:i3': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
            'idiom:i4': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
          },
        },
      })),
    );
    render();
    act(() => button('open-review')!.click());

    // 前 3 张为回忆型（recallWord/recallMeaning/picGuess），逐张 揭晓→记住
    for (let k = 0; k < 3; k += 1) {
      act(() => buttonByText('idioms.reviewReveal')!.click());
      act(() => buttonByText('idioms.reviewRemember')!.click());
    }

    // 第 4 张 = 填空：出现客观题题干「idioms.reviewObjFill」
    const i4 = IDIOMS.find((i) => i.id === 'i4')!;
    const correct = Array.from(i4.word)[2];
    expect(text()).toContain('idioms.reviewObjFill');

    // 候选字按钮：单字符且非关闭按钮「✕」；点击一个非正确字的候选 → 自动判错
    const charBtns = Array.from(host.querySelectorAll('button')).filter((b) => {
      const t = b.textContent?.trim() ?? '';
      return t.length === 1 && t !== '✕';
    });
    const wrongBtn = charBtns.find((b) => b.textContent?.trim() !== correct);
    expect(wrongBtn).toBeTruthy();
    act(() => wrongBtn!.click());

    // 答错 → 揭晓完整词 + 提示「reviewObjWrong」+「下一题」
    expect(text()).toContain('画蛇添足');
    expect(text()).toContain('idioms.reviewObjWrong');

    // 点「下一题」→ onObjContinue 执行 practice(false)，应把 i4 的 ng 写入 store
    const i4Key = `idiom:${i4.id}`;
    const ngBefore = useStore.getState().progress.mastery[i4Key]?.ng ?? 0;
    act(() => buttonByText('idioms.reviewNext')!.click());

    // 显式对比：store 里的 ng 确实 +1（而非只写>=1）
    const ngAfter = useStore.getState().progress.mastery[i4Key]?.ng;
    expect(ngAfter).toBe(ngBefore + 1);
    expect(text()).toContain('idioms.reviewDone');

    // 完成仍奖励
    expect(useStore.getState().progress.stars).toBeGreaterThanOrEqual(1);
    expect(useStore.getState().progress.reviewDate).toBeTruthy();
  });

  it('客观题答错后未点「下一题」前不写回，点后才提交 —— 延后提交原子性', () => {
    // 边界说明：practice 是同步 localStorage 写入，非网络请求，没有"回滚"的异步事务。
    // 本用例验证设计上的"延后提交"边界：答错只揭晓不写回（ng 不变），点「下一题」
    // 才把这条错误原子地写入 store（ng 0→1），证明答错本身不污染状态，提交明确且一次性。
    act(() =>
      useStore.setState((s) => ({
        progress: {
          ...s.progress,
          mastery: {
            'idiom:i1': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
            'idiom:i2': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
            'idiom:i3': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
            'idiom:i4': { lv: 1, due: 0, ok: 0, ng: 0, last: 0 },
          },
        },
      })),
    );
    render();
    act(() => button('open-review')!.click());

    // 用真实 practice 走到 i4 fillBlank 的揭晓阶段（答错）
    for (let k = 0; k < 3; k += 1) {
      act(() => buttonByText('idioms.reviewReveal')!.click());
      act(() => buttonByText('idioms.reviewRemember')!.click());
    }
    const i4 = IDIOMS.find((i) => i.id === 'i4')!;
    const correct = Array.from(i4.word)[2];
    const wrongBtn = Array.from(host.querySelectorAll('button'))
      .filter((b) => {
        const t = b.textContent?.trim() ?? '';
        return t.length === 1 && t !== '✕';
      })
      .find((b) => b.textContent?.trim() !== correct);
    act(() => wrongBtn!.click());

    // 答错已到揭晓，但此刻仍未写回：ng 保持注入的 0（展示"延后提交"）
    const i4Key = `idiom:${i4.id}`;
    expect(text()).toContain('idioms.reviewObjWrong');
    expect(useStore.getState().progress.mastery[i4Key]?.ng).toBe(0);

    // 点「下一题」才原子提交：ng 0→1，且进入完成态
    act(() => buttonByText('idioms.reviewNext')!.click());
    expect(useStore.getState().progress.mastery[i4Key]?.ng).toBe(1);
    expect(text()).toContain('idioms.reviewDone');
  });
});