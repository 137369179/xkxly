// @vitest-environment jsdom
/**
 * 🚒 CityRescueSim.test.tsx
 * 单元测试：城市交通救援与职业大冒险模拟器
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CityRescueSim } from '../CityRescueSim';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/audioContext', () => ({
  getAudioContext: () => ({
    currentTime: 0,
    createOscillator: () => ({
      type: 'sine',
      frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }),
    destination: {},
  }),
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('CityRescueSim Component', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = mkDiv();
  });

  afterEach(() => {
    act(() => { root?.unmount(); });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders default fire rescue mission and interactive targets', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<CityRescueSim />);
    });

    expect(container.textContent).toContain('消防灭火与高空救援');
    expect(container.textContent).toContain('重型水罐云梯消防车');
    expect(container.textContent).toContain('拉响警笛出发');
    expect(container.textContent).toContain('黄色小轿车');
  });

  it('clicking interactive target marks it as solved and updates progress', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<CityRescueSim />);
    });

    const carBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('黄色小轿车')
    );
    expect(carBtn).toBeDefined();

    await act(async () => {
      carBtn?.click();
    });

    expect(container.textContent).toContain('1 / 3');
  });

  it('switches missions cleanly (e.g. 急救中心出诊医疗)', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<CityRescueSim />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const ambBtn = buttons.find((b) => b.textContent?.includes('急救中心'));
    expect(ambBtn).toBeDefined();

    await act(async () => {
      ambBtn?.click();
    });

    expect(container.textContent).toContain('急救中心出诊医疗');
    expect(container.textContent).toContain('救护车紧急出发');
  });
});
