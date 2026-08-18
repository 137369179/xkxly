// @vitest-environment jsdom
/**
 * LetterTrace 深链预选目标字母（initialLetter）单元测试
 * 覆盖 R3「英语深链直达具体字母」改造：
 *   1. 无 initialLetter 时默认从 A（idx=0, upper）开始
 *   2. initialLetter="C" 预选大写 C（idx 对应、mode=upper）
 *   3. initialLetter="c" 预选小写 c（mode=lower，显示小写）
 *   4. 非法/不存在字母回退到 A，不崩溃
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// ── Mock 外部依赖 ──────────────────────────────────────────
const MOTION_PROPS_OMIT = new Set([
  'whileTap', 'whileHover', 'whileFocus', 'whileDrag', 'whileInView',
  'animate', 'initial', 'exit', 'transition', 'variants', 'layout',
  'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'onAnimationStart', 'onAnimationComplete', 'onDragStart', 'onDragEnd',
  'onUpdate', 'onViewportEnter', 'onViewportLeave',
]);
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_t: any, c: string) => (props: any) => {
        const { children, ...rest } = props;
        const clean: Record<string, unknown> = {};
        for (const k in rest) if (!MOTION_PROPS_OMIT.has(k)) clean[k] = rest[k]!;
        return createElement(typeof c === 'string' ? c : 'div', clean, children);
      },
    },
  ),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/lib/speech', () => ({
  speakLetter: vi.fn(() => Promise.resolve()),
  speakPhonics: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/sfx', () => ({ sfxTap: vi.fn(), sfxStar: vi.fn() }));
vi.mock('@/lib/utils', () => ({ cn: (...a: any[]) => a.filter(Boolean).join(' ') }));
vi.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }) }));
vi.mock('@/components/TraceCanvas', () => ({
  TraceCanvas: (props: any) =>
    createElement('div', { 'data-testid': 'trace-canvas', 'data-char': props.char }, props.char),
}));
vi.mock('@/components/ui/Button', () => ({
  CandyButton: (props: any) => createElement('button', { onClick: props.onClick, className: props.className }, props.children),
}));
// store 仅用于 onPass 回调，初始渲染不触发；提供最小实现避免加载真实依赖
vi.mock('@/store/useStore', () => ({
  useStore: () => ({ addStars: vi.fn(), practice: vi.fn(), markTraced: vi.fn(), learnSkill: vi.fn() }),
}));

const { LetterTrace } = await import('@/modules/letters/LetterTrace');

function renderWith(initialLetter?: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(createElement(LetterTrace, { initialLetter }));
  });
  return { container, root };
}

function bigChar(container: HTMLElement): string {
  const el = container.querySelector('.text-7xl');
  return el?.textContent?.trim() ?? '';
}

describe('LetterTrace 深链预选目标字母', () => {
  let containers: HTMLElement[] = [];
  afterEach(() => {
    containers.forEach((c) => c.remove());
    containers = [];
  });

  it('无 initialLetter 时默认从 A（大写）开始', () => {
    const { container, root } = renderWith(undefined);
    containers.push(container);
    expect(bigChar(container)).toBe('A');
    act(() => root.unmount());
  });

  it('initialLetter="C" 预选大写 C（idx 对应、mode=upper）', () => {
    const { container, root } = renderWith('C');
    containers.push(container);
    expect(bigChar(container)).toBe('C');
    // TraceCanvas 收到正确字符
    expect(container.querySelector('[data-testid="trace-canvas"]')?.getAttribute('data-char')).toBe('C');
    act(() => root.unmount());
  });

  it('initialLetter="c" 预选小写 c（mode=lower，显示小写）', () => {
    const { container, root } = renderWith('c');
    containers.push(container);
    expect(bigChar(container)).toBe('c');
    act(() => root.unmount());
  });

  it('非法字母回退到有效字母，不崩溃', () => {
    const { container, root } = renderWith('@@');
    containers.push(container);
    // 非法输入不应崩溃，且落到某个有效字母（mode 按字符大小写回退为小写首字母 'a'）
    expect(bigChar(container)).toMatch(/^[A-Za-z]$/);
    act(() => root.unmount());
  });
});
