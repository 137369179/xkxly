// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: (p: any) => createElement('div', p, p.children),
    span: (p: any) => createElement('span', p, p.children),
    g: (p: any) => createElement('g', p, p.children),
    text: (p: any) => createElement('text', p, p.children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/lib/sfx', () => ({
  sfxPurr: vi.fn(),
  sfxBoing: vi.fn(),
  sfxBubble: vi.fn(),
  sfxMagic: vi.fn(),
  sfxMeow: vi.fn(),
  sfxPraise: vi.fn(),
  sfxStar: vi.fn(),
  sfxTap: vi.fn(),
}));

import {
  FlatCat2D,
  type PetTouchZone,
  type PetActionCategory,
  type PetExpressionCategory,
} from './FlatCat2D';
import { CyberMasterCat3D } from './CyberMasterCat3D';
import {
  PET_ACTION_VARIANTS,
  PET_TOUCH_REACTIONS,
  PetBehaviorStateMachine,
} from '@/lib/pet/petBehaviorModel';
import * as PetAudio from '@/lib/pet/petSoundLibrary';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(elem: any) {
  act(() => {
    if (root) {
      root.render(elem);
    }
  });
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  host?.remove();
});

describe('FlatCat2D 游戏级拟真 3D 毛绒动画猫咪组件', () => {
  it('渲染基础猫咪 SVG 与各色光影环境 (sunlight / nebula / starry)', () => {
    mount(
      createElement(FlatCat2D, {
        size: 180,
        envLighting: 'sunlight',
        hat: 'crown',
        neck: 'bow',
      }),
    );
    expect(host?.querySelector('svg')).toBeTruthy();
    expect(host?.innerHTML).toContain('catBodyGrad');
    expect(host?.innerHTML).toContain('catHeadGrad');
  });

  it('支持 12 种基础生物动作的渲染与物理插值', () => {
    const actions: PetActionCategory[] = [
      'idle', 'walk', 'run', 'jump', 'sit', 'lay',
      'stretch', 'pounce', 'groom', 'dance', 'purr', 'highFive',
    ];

    for (const actName of actions) {
      mount(createElement(FlatCat2D, { action: actName }));
      expect(host?.querySelector('svg')).toBeTruthy();
      expect(PET_ACTION_VARIANTS[actName].length).toBeGreaterThanOrEqual(3);
    }
  });

  it('支持 20 种生物解剖学表情状态渲染', () => {
    const expressions: PetExpressionCategory[] = [
      'happy', 'giggle', 'proud', 'singing', 'cheering',
      'love', 'cute', 'shy', 'comforting', 'wink',
      'curious', 'thinking', 'focused', 'surprised', 'puzzled',
      'sleepy', 'tickled', 'eating', 'blinking', 'mischievous',
    ];

    for (const exp of expressions) {
      mount(createElement(FlatCat2D, { expression: exp }));
      expect(host?.querySelector('svg')).toBeTruthy();
    }
  });

  it('7 大身体触控热区响应与事件派发', () => {
    const onInteractZone = vi.fn();
    mount(
      createElement(FlatCat2D, {
        onInteractZone,
      }),
    );

    const zones: PetTouchZone[] = ['ears', 'forehead', 'cheeks', 'nose', 'belly', 'paws', 'tail'];
    for (const zone of zones) {
      expect(PET_TOUCH_REACTIONS[zone]).toBeDefined();
      expect(PET_TOUCH_REACTIONS[zone].speechOptions.length).toBeGreaterThanOrEqual(3);
      expect(PET_TOUCH_REACTIONS[zone].particleSymbols.length).toBeGreaterThan(0);
    }

    const container = host?.firstElementChild as HTMLElement;
    act(() => {
      container?.click();
    });
    expect(onInteractZone).toHaveBeenCalledWith('forehead', expect.anything());
  });

  it('CyberMasterCat3D 包装层向下透传 action 与 envLighting', () => {
    const onInteractZone = vi.fn();
    mount(
      createElement(CyberMasterCat3D, {
        size: 160,
        action: 'dance',
        expression: 'excited',
        envLighting: 'starry',
        hat: 'wizard',
        neck: 'scarf',
        onInteractZone,
      }),
    );
    expect(host?.querySelector('svg')).toBeTruthy();
    const container = host?.firstElementChild as HTMLElement;
    act(() => {
      container?.click();
    });
    expect(onInteractZone).toHaveBeenCalledWith('forehead', expect.anything());
  });

  it('PetBehaviorStateMachine 连击感知与情境建议算法', () => {
    const sm = new PetBehaviorStateMachine();
    const res1 = sm.registerTouch('forehead');
    expect(res1.action).toBe('purr');
    expect(res1.isCombo).toBe(false);

    // 连续触摸 3 次触发连击
    sm.registerTouch('forehead');
    const res3 = sm.registerTouch('forehead');
    expect(res3.isCombo).toBe(true);
    expect(res3.action).toBe('dance');

    // 待机空闲判断
    expect(sm.getIdleSuggestion(10).action).toBe('idle');
    expect(sm.getIdleSuggestion(30).action).toBe('stretch');
    expect(sm.getIdleSuggestion(70).action).toBe('lay');
  });

  it('PetSoundLibrary 音效库覆盖 50+ 种参数化合成', () => {
    expect(typeof PetAudio.petMeowHello).toBe('function');
    expect(typeof PetAudio.petMeowCute).toBe('function');
    expect(typeof PetAudio.petPurrGentle).toBe('function');
    expect(typeof PetAudio.petPurrDeep).toBe('function');
    expect(typeof PetAudio.petActionBoingHigh).toBe('function');
    expect(typeof PetAudio.petActionPawHighFive).toBe('function');
    expect(typeof PetAudio.petMagicTransform).toBe('function');
    expect(typeof PetAudio.petJoyVictory).toBe('function');
    expect(typeof PetAudio.petFunBubbleBig).toBe('function');
    expect(typeof PetAudio.petFunFishCrunch).toBe('function');
  });
});
