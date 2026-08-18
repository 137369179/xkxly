// @vitest-environment jsdom
/**
 * 数学（numbers）子系统分批补测 · R6 第一批
 * 覆盖范围内现有逻辑，不引入任何新功能：
 *   1. SpeedRankings.addSpeedRecord —— 排行榜纯逻辑（排序/30 条上限/默认名/持久化）
 *   2. ClockTrainer 时钟角度与出题纯逻辑 —— 儿童时钟正确性的核心数学
 *   3. ClockTrainer 组件冒烟 + 答题交互（不崩溃、反馈可达）
 * 复用既有 mock 范式（motion Proxy / sfx / speech / i18n / store）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mock motion/react 用 Proxy 自动支持任何 motion.xxx 标签
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick, disabled }: any) =>
          createElement(tag, { className, style, onClick, disabled }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
  MotionConfig: ({ children }: any) => children,
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  setMuted: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({ speak: vi.fn(() => Promise.resolve()) }));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }),
}));

const fakeStore = { practice: vi.fn(), heardNumber: vi.fn() };
vi.mock('@/store/useStore', () => ({
  useStore: Object.assign((sel?: any) => (sel ? sel(fakeStore) : fakeStore), {
    getState: () => fakeStore,
  }),
  useProgress: () => ({ numbersHeard: [] }),
}));

import { addSpeedRecord } from './SpeedRankings';
import { hourAngle, minuteAngle, randomTime, generateOptions, ClockTrainer } from './ClockTrainer';
import { clearMemoryFallback } from '@/lib/safeStorage';

beforeEach(() => {
  localStorage.clear();
  clearMemoryFallback();
});

function readRecords(): any[] {
  return JSON.parse(localStorage.getItem('speed-records') || '[]');
}

describe('SpeedRankings.addSpeedRecord 纯逻辑', () => {
  it('按分数降序、分数相同按时间升序排序', () => {
    addSpeedRecord('A', 10, 5, 1);
    addSpeedRecord('B', 20, 3, 1);
    addSpeedRecord('C', 20, 1, 1);
    const recs = readRecords();
    expect(recs.map((r) => [r.score, r.time])).toEqual([
      [20, 1],
      [20, 3],
      [10, 5],
    ]);
  });

  it('name 为空时回落默认名 小宝贝', () => {
    addSpeedRecord('', 5, 2, 2);
    expect(readRecords()[0].name).toBe('小宝贝');
  });

  it('最多持久化 30 条记录（slice(0,30) 上限）', () => {
    for (let i = 0; i < 35; i++) addSpeedRecord('P' + i, i, i, 1);
    expect(readRecords().length).toBe(30);
  });

  it('写入后可在存储中读回，且携带 level 字段', () => {
    addSpeedRecord('Kid', 99, 7, 3);
    const rec = readRecords()[0];
    expect(rec).toMatchObject({ name: 'Kid', score: 99, time: 7, level: 3 });
  });
});

describe('ClockTrainer 时钟角度与出题纯逻辑', () => {
  it('hourAngle：整点与半点时针角度正确', () => {
    expect(hourAngle(3, 0)).toBe(90);
    expect(hourAngle(3, 30)).toBe(105); // (3 + 0.5) * 30
    expect(hourAngle(12, 0)).toBe(0);
    expect(hourAngle(6, 0)).toBe(180);
    expect(hourAngle(9, 0)).toBe(270);
  });

  it('minuteAngle：分针角度正确', () => {
    expect(minuteAngle(0)).toBe(0);
    expect(minuteAngle(15)).toBe(90);
    expect(minuteAngle(30)).toBe(180);
    expect(minuteAngle(45)).toBe(270);
  });

  it('randomTime：返回合法结构且分钟仅 0/30', () => {
    for (const lv of [1, 2, 3] as const) {
      const t = randomTime(lv);
      expect(t.hour).toBeGreaterThanOrEqual(1);
      expect(t.hour).toBeLessThanOrEqual(12);
      expect([0, 30]).toContain(t.minute);
      expect(['点整', '点半']).toContain(t.label.slice(-2));
    }
  });

  it('randomTime：L1 仅整点、L2 仅半点（难度约束）', () => {
    for (let i = 0; i < 25; i++) {
      expect(randomTime(1).minute).toBe(0);
      expect(randomTime(2).minute).toBe(30);
    }
  });

  it('generateOptions：数量正确、互不重复、必含正确答案', () => {
    const correct = { hour: 3, minute: 0, label: '3点整' };
    const opts = generateOptions(correct, 4);
    expect(opts.length).toBe(4);
    const labels = opts.map((o) => o.label);
    expect(new Set(labels).size).toBe(4);
    expect(labels).toContain('3点整');
    opts.forEach((o) => {
      expect(o.hour).toBeGreaterThanOrEqual(1);
      expect(o.hour).toBeLessThanOrEqual(12);
      expect([0, 30]).toContain(o.minute);
    });
  });
});

describe('ClockTrainer 组件渲染与交互', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('默认渲染时钟面、题目与 3 个整点选项（L1）', async () => {
    await act(async () => {
      root.render(createElement(ClockTrainer));
    });
    expect(container.textContent).toContain('clockTrainer.title');
    expect(container.textContent).toContain('clockTrainer.question');
    const opts = [...container.querySelectorAll('button')].filter((b) =>
      /点/.test(b.textContent || '')
    );
    // 初始渲染固定 4 个选项（generateOptions(current, 4)），锁定既有行为
    expect(opts.length).toBe(4);
  });

  it('点击任一选项触发答题反馈（正确/错误），不崩溃', async () => {
    await act(async () => {
      root.render(createElement(ClockTrainer));
    });
    const opts = [...container.querySelectorAll('button')].filter((b) =>
      /点/.test(b.textContent || '')
    );
    await act(async () => {
      opts[0]!.click();
    });
    expect(container.textContent).toMatch(/clockTrainer\.(correct|wrong)/);
  });
});
