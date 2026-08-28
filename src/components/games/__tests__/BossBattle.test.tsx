// @vitest-environment jsdom
/**
 * 👾 BossBattle.test.tsx
 * 单元测试：Boss 算术探险闯关对决
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BossBattle } from '../BossBattle';
import type { Question } from '@/types';
import type { BossConfig } from '@/data/adventureChapters';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateBig: vi.fn(),
  celebrateSmall: vi.fn(),
}));

vi.mock('@/components/QuizCard', () => ({
  QuizCard: ({ onAnswer }: { onAnswer: (correct: boolean) => void }) => (
    <div data-testid="quiz-card">
      <button data-testid="btn-correct" onClick={() => onAnswer(true)}>
        答对
      </button>
      <button data-testid="btn-wrong" onClick={() => onAnswer(false)}>
        答错
      </button>
    </div>
  ),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (params?.name) return `${params.name}`;
      if (params?.turn !== undefined) return `第 ${params.turn} 回合`;
      return key;
    },
  }),
}));

const mockBoss: BossConfig = {
  name: '烈焰喷火龙',
  emoji: '🐲',
  hp: 2,
  attackEvery: 2,
  drops: ['fire_crystal'],
  skills: [
    {
      name: '龙之怒火',
      emoji: '🔥',
      triggerHpPct: 50,
      effect: 'doubleDamage',
      desc: '攻击力翻倍',
    },
  ],
};

const mockQuestion: Question = {
  id: 'q-1',
  prompt: '1 + 1 = ?',
  options: [
    { id: 'o1', label: '2' },
    { id: 'o2', label: '3' },
    { id: 'o3', label: '4' },
  ],
  answer: 0,
  skill: 'math:add',
  difficulty: 1,
};

describe('BossBattle Component', () => {
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

  it('renders boss info, player hp, and quiz question', () => {
    act(() => {
      root?.render(
        createElement(BossBattle, {
          boss: mockBoss,
          difficulty: 1,
          makeQuestion: () => mockQuestion,
        })
      );
    });

    expect(container?.textContent).toContain('烈焰喷火龙');
    expect(container?.textContent).toContain('🐲');
    expect(container?.textContent).toContain('2/2');
    expect(container?.querySelector('[data-testid="quiz-card"]')).toBeDefined();
  });

  it('progresses to victory when boss hp is reduced to 0', () => {
    const onVictoryMock = vi.fn();

    act(() => {
      root?.render(
        createElement(BossBattle, {
          boss: mockBoss,
          difficulty: 1,
          makeQuestion: () => mockQuestion,
          onVictory: onVictoryMock,
        })
      );
    });

    const btnCorrect = container?.querySelector('[data-testid="btn-correct"]') as HTMLButtonElement;
    expect(btnCorrect).toBeDefined();

    // Turn 1: Boss HP 2 -> 1
    act(() => {
      btnCorrect?.click();
    });

    // Turn 2: Boss HP 1 -> 0 -> Victory
    act(() => {
      btnCorrect?.click();
    });

    expect(onVictoryMock).toHaveBeenCalled();
  });
});
