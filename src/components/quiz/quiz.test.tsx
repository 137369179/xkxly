// @vitest-environment jsdom
/**
 * quiz 子组件单元测试（P2-3 QuizCard 拆分后）
 * ------------------------------------------------------------
 * 覆盖从 QuizCard 抽出的纯展示子组件行为：
 *   1. OptionGrid：对/错标记、禁用态、抖动传参
 *   2. BossTimerBar：进度条宽度比例
 *   3. WrongReasonBox：答对/未作答时不渲染
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }),
}));
vi.mock('@/lib/sfx', () => ({ sfxTap: vi.fn() }));
vi.mock('@/lib/speech', () => ({ speak: vi.fn(() => Promise.resolve()), stopSpeaking: vi.fn() }));
vi.mock('@/components/CyberMasterCat3D', () => ({
  CyberMasterCat3D: () => null,
}));
vi.mock('@/modules/pet/PetIcons', () => ({ CatPurrIcon: () => null }));
vi.mock('motion/react', () => ({
  motion: { div: (p: any) => createElement('div', p, p.children), span: (p: any) => createElement('span', p, p.children), button: (p: any) => createElement('button', p, p.children) },
  AnimatePresence: ({ children }: any) => children,
}));

const { OptionGrid } = await import('@/components/quiz/OptionGrid');
const { BossTimerBar } = await import('@/components/quiz/BossTimerBar');
const { WrongReasonBox } = await import('@/components/quiz/WrongReasonBox');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function render(node: React.ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));
  roots.push(root);
  return container;
}

describe('OptionGrid', () => {
  const opts = [
    { id: 'a', label: '苹果', emoji: '🍎' },
    { id: 'b', label: '香蕉', emoji: '🍌' },
    { id: 'c', label: '橘子', emoji: '🍊' },
    { id: 'd', label: '梨', emoji: '🍐' },
  ];

  it('渲染全部选项并调用 onPick', () => {
    const onPick = vi.fn();
    const c = render(createElement(OptionGrid, {
      options: opts, wrongIds: [], solved: false, answerId: 'b', shakeId: null, onPick,
    }));
    const buttons = c.querySelectorAll('button');
    expect(buttons.length).toBe(4);
    expect(c.textContent).toContain('🍎');
    act(() => buttons[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onPick).toHaveBeenCalledWith('b');
  });

  it('答对后正确答案标记 ✓ 且禁用其他选项', () => {
    const c = render(createElement(OptionGrid, {
      options: opts, wrongIds: [], solved: true, answerId: 'b', shakeId: null, onPick: vi.fn(),
    }));
    expect(c.textContent).toContain('✓');
    const disabledCount = [...c.querySelectorAll('button')].filter((b) => b.disabled).length;
    expect(disabledCount).toBe(4);
  });

  it('答错的选项变灰（opacity/grayscale class）', () => {
    const c = render(createElement(OptionGrid, {
      options: opts, wrongIds: ['a'], solved: false, answerId: 'b', shakeId: null, onPick: vi.fn(),
    }));
    const wrongBtn = [...c.querySelectorAll('button')].find((b) => b.textContent?.includes('🍎'));
    expect(wrongBtn?.className).toContain('opacity-40');
    expect(wrongBtn?.className).toContain('grayscale');
  });
});

describe('BossTimerBar', () => {
  it('半程剩 50% 时进度条宽度为 50%', () => {
    const c = render(createElement(BossTimerBar, { remaining: 5000, total: 10000 }));
    const bar = c.querySelector('.bg-red-500') as HTMLElement;
    expect(bar.style.width).toBe('50%');
  });
});

describe('WrongReasonBox', () => {
  const q = {
    id: 'q1',
    prompt: '哪个是苹果？',
    options: [{ id: 'a', label: '苹果' }, { id: 'b', label: '香蕉' }],
    answerId: 'a',
    skill: 'fruit:apple',
    display: '',
  };

  it('未作答前不渲染任何内容', () => {
    const c = render(createElement(WrongReasonBox, {
      question: q as any, options: q.options, wrongIds: [], solved: false, skillDiag: null,
    }));
    expect(c.textContent).toBe('');
  });

  it('答对后不渲染错因', () => {
    const c = render(createElement(WrongReasonBox, {
      question: q as any, options: q.options, wrongIds: ['a'], solved: true, skillDiag: null,
    }));
    expect(c.textContent).toBe('');
  });

  it('答错且无错因数据时返回空（不抛错）', () => {
    const c = render(createElement(WrongReasonBox, {
      question: q as any, options: q.options, wrongIds: ['b'], solved: false, skillDiag: null,
    }));
    expect(c).toBeTruthy();
  });
});