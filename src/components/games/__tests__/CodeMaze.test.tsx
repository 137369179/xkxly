// @vitest-environment jsdom
/**
 * 🧭 CodeMaze.test.tsx
 * 单元测试：方向迷宫与指令序列编程
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CodeMaze } from '../CodeMaze';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const dict: Record<string, string> = {
        'codeMaze.title': '方向迷宫编程',
        'codeMaze.subtitle': '给小机器人写指令到达终点',
        'codeMaze.emptyHint': '点击下方箭头添加指令',
        'codeMaze.run': '运行',
        'codeMaze.reset': '重置',
        'codeMaze.next': '下一关',
        'codeMaze.fail': '没有到达终点，再试一次！',
      };
      if (params?.i) return `第${params.i}关`;
      if (params?.current) return `已添加 ${params.current}/${params.max} 条指令`;
      if (params?.got) return `通关成功！收集了 ${params.got}/${params.total} 颗星星`;
      return dict[key] ?? key;
    },
  }),
}));

describe('CodeMaze Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  it('renders maze, command buttons, and level tabs', () => {
    act(() => {
      root?.render(createElement(CodeMaze));
    });

    expect(container?.textContent).toContain('方向迷宫编程');
    expect(container?.textContent).toContain('第1关');
    expect(container?.textContent).toContain('第2关');
    expect(container?.textContent).toContain('运行');
    expect(container?.textContent).toContain('重置');
    expect(container?.textContent).toContain('🤖');
  });

  it('allows adding and removing direction commands', () => {
    act(() => {
      root?.render(createElement(CodeMaze));
    });

    const arrowDownBtn = Array.from(container?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === '⬇️'
    );
    expect(arrowDownBtn).toBeDefined();

    act(() => {
      arrowDownBtn?.click();
    });

    expect(container?.textContent).toContain('已添加 1/');
  });
});
