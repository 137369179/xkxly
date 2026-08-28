// @vitest-environment jsdom
/**
 * 🫀 BodyAdventure.test.tsx
 * 单元测试：Visible Body 风格人体奥秘 3D 全息探险馆 (Human Body 3D Hologram Explorer)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { BodyAdventure } from '../BodyAdventure';

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

vi.mock('../ScienceAiPanel', () => ({
  ScienceAiPanel: () => <div data-testid="science-ai-panel">AI Panel</div>,
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('BodyAdventure Visible Body Component', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = mkDiv();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders default explore mode and system tabs with 3D holographic title', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BodyAdventure />);
    });

    expect(container.textContent).toContain('3D 全息系统透视');
    expect(container.textContent).toContain('微观生理实验室');
    expect(container.textContent).toContain('人体小考官挑战');
    expect(container.textContent).toContain('消化系统');
    expect(container.textContent).toContain('3D ANATOMICAL HOLO-SCAN');
  });

  it('switches between human body systems and visual layer filters', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BodyAdventure />);
    });

    // 切换系统
    const buttons = Array.from(container.querySelectorAll('button'));
    const respBtn = buttons.find((b) => b.textContent?.includes('呼吸系统'));
    expect(respBtn).toBeDefined();

    await act(async () => {
      respBtn?.click();
    });

    expect(container.textContent).toContain('呼吸系统');

    // 切换分层切片
    const skelBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('骨骼'),
    );
    expect(skelBtn).toBeDefined();
    await act(async () => {
      skelBtn?.click();
    });
  });

  it('selects liver organ and verifies accurate anatomical details', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BodyAdventure />);
    });

    const liverBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('肝脏'),
    );
    expect(liverBtn).toBeDefined();

    await act(async () => {
      liverBtn?.click();
    });

    expect(container.textContent).toContain('身体的化工厂');
    expect(container.textContent).toContain('Liver');
  });

  it('switches to micro physiological lab mode and navigates 3D labs', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BodyAdventure />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const labModeBtn = buttons.find((b) => b.textContent?.includes('微观生理实验室'));
    expect(labModeBtn).toBeDefined();

    await act(async () => {
      labModeBtn?.click();
    });

    expect(container.textContent).toContain('食物消化流光隧道');

    // 切换到肺泡 3D 实验室
    const lungsBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('肺泡 3D 气体交换舱'),
    );
    expect(lungsBtn).toBeDefined();
    await act(async () => {
      lungsBtn?.click();
    });

    expect(container.textContent).toContain('肺泡 3D 气体交换模拟舱');
  });

  it('switches to body quiz mode and handles quiz answer', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<BodyAdventure />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const quizModeBtn = buttons.find((b) => b.textContent?.includes('人体小考官挑战'));
    expect(quizModeBtn).toBeDefined();

    await act(async () => {
      quizModeBtn?.click();
    });

    expect(container.textContent).toContain('小考官');
    expect(container.textContent).toContain('第 1 / 8 关');

    // 点击任一答题选项
    const optButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      ['胃', '大脑', '肺', '心脏'].some((txt) => b.textContent?.includes(txt)),
    );
    expect(optButtons.length).toBeGreaterThan(0);

    await act(async () => {
      optButtons[0]?.click();
    });

    expect(container.textContent).toContain('挑战下一题');
  });

  it('verifies playOrganSpecificSfx executes properly for various organ positions', async () => {
    const { playOrganSpecificSfx } = await import('../BodyAdventure');
    
    // 验证不同系统的器官音效均可正常调度无异常
    expect(() => {
      playOrganSpecificSfx({ id: 'mouth', nameZh: '嘴巴', nameEn: 'Mouth', emoji: '👄', function: '', funFact: '', sizeComparison: '', position: { x: 50, y: 17 } });
      playOrganSpecificSfx({ id: 'stomach', nameZh: '胃', nameEn: 'Stomach', emoji: '🫧', function: '', funFact: '', sizeComparison: '', position: { x: 54, y: 50 } });
      playOrganSpecificSfx({ id: 'liver', nameZh: '肝脏', nameEn: 'Liver', emoji: '🏈', function: '', funFact: '', sizeComparison: '', position: { x: 43, y: 49 } });
      playOrganSpecificSfx({ id: 'heart', nameZh: '心脏', nameEn: 'Heart', emoji: '🫀', function: '', funFact: '', sizeComparison: '', position: { x: 52, y: 39 } });
      playOrganSpecificSfx({ id: 'brain', nameZh: '大脑', nameEn: 'Brain', emoji: '🧠', function: '', funFact: '', sizeComparison: '', position: { x: 50, y: 9 } });
      playOrganSpecificSfx({ id: 'skull', nameZh: '头骨', nameEn: 'Skull', emoji: '💀', function: '', funFact: '', sizeComparison: '', position: { x: 50, y: 10 } });
      playOrganSpecificSfx({ id: 'eyes', nameZh: '眼睛', nameEn: 'Eyes', emoji: '👀', function: '', funFact: '', sizeComparison: '', position: { x: 46, y: 11 } });
    }).not.toThrow();
  });
});
