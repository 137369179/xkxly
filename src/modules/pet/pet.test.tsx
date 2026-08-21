// @vitest-environment jsdom
/**
 * 宠物（pet）模块测试 · 2026-08-18
 * 覆盖范围内现有逻辑，不引入任何新功能：
 *   1. catData 数据契约（OUTFITS/QUESTS/EVOLVE_THRESHOLDS/ACTION_IMG/EVOLVE_IMG/EVOLVE_INFO/STAGE_THEME/EMPTY_*）
 *   2. formatDuration / useCountdown 纯逻辑与 hook（fake timers）
 *   3. CatGeometry 程序化 3D 猫咪：结构契约 / 全品种生成 / 颜色更新 / 脏污程度钳制
 * 复用既有测试范式（react-dom createRoot + act，无外部依赖 mock 需求）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

import {
  OUTFITS,
  ACTION_IMG,
  EVOLVE_IMG,
  EVOLVE_INFO,
  QUESTS,
  EVOLVE_THRESHOLDS,
  STAGE_THEME,
  EMPTY_OUTFITS,
  EMPTY_UNLOCKED,
  EMPTY_QUESTS,
  EMPTY_MASTERY,
  formatDuration,
  useCountdown,
} from './catData';
import { createCatGeometry, updateCatColors, setFurDirtyLevel } from './realistic/CatGeometry';
import { BREED_CONFIGS } from './realistic/types';

describe('catData 数据契约', () => {
  it('OUTFITS：id 唯一、类型合法、价格为正', () => {
    expect(OUTFITS.length).toBeGreaterThan(0);
    const ids = OUTFITS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of OUTFITS) {
      expect(['hat', 'neck', 'decor']).toContain(o.type);
      expect(o.cost).toBeGreaterThan(0);
      expect(o.emoji).toBeTruthy();
    }
  });

  it('ACTION_IMG：覆盖全部动作且指向 /cat/ 资源', () => {
    expect(Object.keys(ACTION_IMG).sort()).toEqual([
      'dance', 'groom', 'highFive', 'idle', 'jump', 'pounce', 'purr', 'roll', 'stretch',
    ]);
    for (const v of Object.values(ACTION_IMG)) {
      expect(v.startsWith('/cat/')).toBe(true);
    }
  });

  it('EVOLVE_IMG / EVOLVE_INFO：等级 1-4 齐全', () => {
    expect(Object.keys(EVOLVE_IMG).map(Number).sort()).toEqual([1, 2, 3, 4]);
    expect(Object.keys(EVOLVE_INFO).map(Number).sort()).toEqual([1, 2, 3, 4]);
    for (const info of Object.values(EVOLVE_INFO)) {
      expect(info.title).toBeTruthy();
      expect(info.desc).toBeTruthy();
      expect(info.emoji).toBeTruthy();
    }
  });

  it('QUESTS：id 唯一、时长与奖励为正', () => {
    const ids = QUESTS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['pinyin', 'math', 'hanzi']));
    for (const q of QUESTS) {
      expect(q.durationSec).toBeGreaterThan(0);
      expect(q.reward).toBeGreaterThan(0);
    }
  });

  it('EVOLVE_THRESHOLDS：星星/亲密度随等级单调递增', () => {
    const levels = Object.keys(EVOLVE_THRESHOLDS).map(Number).sort((a, b) => a - b);
    expect(levels).toEqual([1, 2, 3]);
    for (let i = 1; i < levels.length; i++) {
      const prev = EVOLVE_THRESHOLDS[levels[i - 1]!]!;
      const cur = EVOLVE_THRESHOLDS[levels[i]!]!;
      expect(cur.stars).toBeGreaterThan(prev.stars);
      expect(cur.affection).toBeGreaterThanOrEqual(prev.affection);
    }
  });

  it('STAGE_THEME：三种场景齐全且 panel/frame/glow 非空', () => {
    expect(Object.keys(STAGE_THEME).sort()).toEqual(['nebula', 'starry', 'sunlight']);
    for (const theme of Object.values(STAGE_THEME)) {
      expect(theme.panel).toBeTruthy();
      expect(theme.frame).toBeTruthy();
      expect(theme.glow).toBeTruthy();
    }
  });

  it('EMPTY_* 常量冻结且为空', () => {
    expect(EMPTY_OUTFITS).toEqual({});
    expect(EMPTY_UNLOCKED).toEqual([]);
    expect(EMPTY_QUESTS).toEqual([]);
    expect(EMPTY_MASTERY).toEqual({});
    expect(Object.isFrozen(EMPTY_OUTFITS)).toBe(true);
    expect(Object.isFrozen(EMPTY_UNLOCKED)).toBe(true);
    expect(Object.isFrozen(EMPTY_QUESTS)).toBe(true);
    expect(Object.isFrozen(EMPTY_MASTERY)).toBe(true);
  });

  it('formatDuration：秒 → m:ss 文案调用正确', () => {
    const t = vi.fn((k: string, p?: Record<string, string | number>) => `${k}:${p?.m ?? ''}-${p?.s ?? ''}`);
    expect(formatDuration(0, t)).toBe('pet.sec:-0');
    expect(formatDuration(59, t)).toBe('pet.sec:-59');
    expect(formatDuration(60, t)).toBe('pet.minSec:1-0');
    expect(formatDuration(125, t)).toBe('pet.minSec:2-5');
    expect(formatDuration(3661, t)).toBe('pet.minSec:61-1');
    expect(t).toHaveBeenCalledTimes(5);
  });
});

describe('useCountdown hook（fake timers）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function Harness({ endAt }: { endAt?: number }) {
    const sec = useCountdown(endAt);
    return createElement('div', { 'data-sec': String(sec) });
  }

  function renderHarness(endAt?: number) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(createElement(Harness, { endAt }));
    });
    return { host, root };
  }

  it('未设置 endAt 时返回 0', () => {
    const { host, root } = renderHarness(undefined);
    expect(host.querySelector('[data-sec]')!.getAttribute('data-sec')).toBe('0');
    root.unmount();
    host.remove();
  });

  it('endAt 已过期时立即为 0', () => {
    const { host, root } = renderHarness(Date.now() - 1000);
    expect(host.querySelector('[data-sec]')!.getAttribute('data-sec')).toBe('0');
    root.unmount();
    host.remove();
  });

  it('倒计时：ceil 取整并随时间递减，归零后保持 0', () => {
    const { host, root } = renderHarness(Date.now() + 5000);
    expect(host.querySelector('[data-sec]')!.getAttribute('data-sec')).toBe('5');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(host.querySelector('[data-sec]')!.getAttribute('data-sec')).toBe('3');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(host.querySelector('[data-sec]')!.getAttribute('data-sec')).toBe('0');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(host.querySelector('[data-sec]')!.getAttribute('data-sec')).toBe('0');
    root.unmount();
    host.remove();
  });
});

describe('CatGeometry 程序化 3D 猫咪', () => {
  it('默认品种生成完整结构：头/身/肚/鼻/口鼻/双耳/双眼/四肢/尾', () => {
    const group = createCatGeometry();
    expect(group.name).toBe('Cat_Root');
    const names = group.children.map((c) => c.name);
    for (const part of ['Cat_Head', 'Cat_Body', 'Cat_Belly', 'Cat_Nose', 'Cat_Snout', 'Cat_Ear_L', 'Cat_Ear_R', 'Cat_Eye_L', 'Cat_Eye_R', 'Cat_Tail']) {
      expect(names).toContain(part);
    }
    const legs = names.filter((n) => n.startsWith('Cat_Leg_'));
    expect(legs.length).toBe(4);
    const tail = group.children.find((c) => c.name === 'Cat_Tail') as THREE.Group;
    expect(tail.children.length).toBeGreaterThan(0);
    expect(tail.children[0]!.name.startsWith('Cat_Tail_Seg_')).toBe(true);
  });

  it('全部 6 个品种均能生成且关键部位齐全', () => {
    const breeds = Object.keys(BREED_CONFIGS) as Array<keyof typeof BREED_CONFIGS>;
    expect(breeds.length).toBe(6);
    for (const breed of breeds) {
      const group = createCatGeometry(breed);
      expect(group.name).toBe('Cat_Root');
      expect(group.children.some((c) => c.name === 'Cat_Head')).toBe(true);
      expect(group.children.some((c) => c.name === 'Cat_Body')).toBe(true);
      expect(group.children.some((c) => c.name === 'Cat_Tail')).toBe(true);
    }
  });

  it('updateCatColors：按部位更新主色/辅色', () => {
    const group = createCatGeometry('british_shorthair');
    const config = { ...BREED_CONFIGS.british_shorthair, primaryColor: '#123456', secondaryColor: '#654321' };
    updateCatColors(group, config);
    const head = group.children.find((c) => c.name === 'Cat_Head') as THREE.Mesh;
    const belly = group.children.find((c) => c.name === 'Cat_Belly') as THREE.Mesh;
    expect((head.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('123456');
    expect((belly.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('654321');
  });

  it('setFurDirtyLevel：0-100 钳制并线性提高粗糙度', () => {
    const group = createCatGeometry('british_shorthair');
    const mat = () => {
      const body = group.children.find((c) => c.name === 'Cat_Body') as THREE.Mesh;
      return body.material as THREE.MeshStandardMaterial;
    };
    expect(mat().roughness).toBeCloseTo(0.85, 5);
    setFurDirtyLevel(group, 100);
    expect(mat().roughness).toBeCloseTo(0.97, 5);
    setFurDirtyLevel(group, 50);
    expect(mat().roughness).toBeCloseTo(0.91, 5);
    setFurDirtyLevel(group, 0);
    expect(mat().roughness).toBeCloseTo(0.85, 5);
    setFurDirtyLevel(group, 150);
    expect(mat().roughness).toBeCloseTo(0.97, 5); // 钳制到 100
    setFurDirtyLevel(group, -10);
    expect(mat().roughness).toBeCloseTo(0.85, 5); // 钳制到 0
  });
});
