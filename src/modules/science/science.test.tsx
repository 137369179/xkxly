// @vitest-environment jsdom
/**
 * 科学（science）模块测试 · 2026-08-18
 * 覆盖范围内现有逻辑，不引入任何新功能：
 *   1. WeatherLab 天气/元素/组合/季节数据契约（唯一性、引用完整性、覆盖度）
 *   2. getCombo 组合纯逻辑（元素顺序无关、未知组合兜底）
 *   3. WeatherLab 组件冒烟（渲染不崩溃）
 * 复用既有 mock 范式（motion Proxy / sfx / speech / i18n）。
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

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

// ScienceAiPanel 依赖 AI/外部服务，冒烟时占位
vi.mock('./components/ScienceAiPanel', () => ({
  ScienceAiPanel: () => createElement('div', { 'data-testid': 'ai-panel' }),
}));

import {
  WEATHERS,
  ELEMENTS,
  COMBOS,
  SEASONS,
  SEASON_ITEMS,
  getCombo,
  WeatherLab,
} from './components/WeatherLab';

describe('WeatherLab 数据契约', () => {
  it('WEATHERS：6 种天气，id 唯一，字段完整', () => {
    expect(WEATHERS.length).toBe(6);
    const ids = WEATHERS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of WEATHERS) {
      expect(w.emoji).toBeTruthy();
      expect(w.nameZh).toBeTruthy();
      expect(w.nameEn).toBeTruthy();
      expect(w.gear.length).toBeGreaterThan(0);
      expect(w.formation).toBeTruthy();
      expect(w.activity).toBeTruthy();
    }
  });

  it('ELEMENTS：5 个元素，id 唯一且齐备', () => {
    expect(ELEMENTS.length).toBe(5);
    const ids = ELEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toEqual(expect.arrayContaining(['sun', 'cloud', 'water', 'cold', 'wind']));
  });

  it('COMBOS：组合键均为合法元素，weather 均引用 WEATHERS 成员，6 种天气全部可达', () => {
    const elemIds = new Set(ELEMENTS.map((e) => e.id));
    const weatherIds = new Set(WEATHERS.map((w) => w.id));
    for (const [key, { weather, message }] of Object.entries(COMBOS)) {
      for (const part of key.split('+')) {
        expect(elemIds.has(part), `组合键含未知元素: ${part}`).toBe(true);
      }
      expect(weatherIds.has(weather.id), `weather 不在 WEATHERS 中: ${weather.id}`).toBe(true);
      expect(message).toBeTruthy();
    }
    const covered = new Set(Object.values(COMBOS).map((c) => c.weather.id));
    expect(covered.size).toBe(6);
  });

  it('SEASONS：四季 id 唯一，phenomena 非空', () => {
    expect(SEASONS.length).toBe(4);
    const ids = SEASONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids).toEqual(expect.arrayContaining(['spring', 'summer', 'autumn', 'winter']));
    for (const s of SEASONS) {
      expect(s.phenomena.length).toBeGreaterThan(0);
    }
  });

  it('SEASON_ITEMS：8 个配对项，id 唯一，season 均合法，每季至少 2 项', () => {
    expect(SEASON_ITEMS.length).toBe(8);
    const itemIds = SEASON_ITEMS.map((i) => i.id);
    expect(new Set(itemIds).size).toBe(8);
    const seasonIds = new Set(SEASONS.map((s) => s.id));
    const perSeason: Record<string, number> = {};
    for (const item of SEASON_ITEMS) {
      expect(seasonIds.has(item.season), `未知季节: ${item.season}`).toBe(true);
      perSeason[item.season] = (perSeason[item.season] ?? 0) + 1;
    }
    for (const sid of seasonIds) {
      expect(perSeason[sid] ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('getCombo 组合纯逻辑', () => {
  it('已知组合正确且元素顺序无关', () => {
    expect(getCombo(['cloud', 'water'])!.weather.id).toBe('rainy');
    expect(getCombo(['water', 'cloud'])!.weather.id).toBe('rainy');
    expect(getCombo(['sun', 'water'])!.weather.id).toBe('rainbow');
    expect(getCombo(['cloud', 'water', 'wind'])!.weather.id).toBe('storm');
    expect(getCombo(['cloud', 'cold'])!.weather.id).toBe('snowy');
    expect(getCombo(['sun', 'cloud'])!.weather.id).toBe('cloudy');
    expect(getCombo(['sun'])!.weather.id).toBe('sunny');
  });

  it('未知/不足组合返回 null', () => {
    expect(getCombo([])).toBeNull();
    expect(getCombo(['water'])).toBeNull();
    expect(getCombo(['wind'])).toBeNull();
    expect(getCombo(['sun', 'cold'])).toBeNull();
  });
});

describe('WeatherLab 冒烟', () => {
  it('组件渲染不崩溃', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(createElement(WeatherLab));
    });
    expect(host.childNodes.length).toBeGreaterThan(0);
    act(() => {
      root.unmount();
    });
    host.remove();
  });
});
