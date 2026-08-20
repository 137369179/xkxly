// @vitest-environment node
/**
 * 统一即时反馈助手单测
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { answerCorrect, answerWrong } from './feedback';

vi.mock('@/lib/sfx', () => ({ sfxCorrect: vi.fn(), sfxWrong: vi.fn() }));
vi.mock('@/lib/celebrate', () => ({ celebrateSmall: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/praise', () => ({
  praiseByScene: (s: string) => `praise:${s}`,
  encourageByScene: (s: string) => `encourage:${s}`,
  skillToPraiseScene: vi.fn(),
  skillToEncourageScene: vi.fn(),
}));
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';

describe('answerCorrect 答对反馈', () => {
  beforeEach(() => vi.clearAllMocks());

  it('触发答对音效与彩带，返回非空表扬话术', () => {
    const msg = answerCorrect('math');
    expect(sfxCorrect).toHaveBeenCalledTimes(1);
    expect(celebrateSmall).toHaveBeenCalledTimes(1);
    expect(msg).toBe('praise:math');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('默认场景为 general', () => {
    expect(answerCorrect()).toBe('praise:general');
  });
});

describe('answerWrong 答错反馈', () => {
  beforeEach(() => vi.clearAllMocks());

  it('触发答错音效，不触发彩带，返回温和鼓励话术', () => {
    const msg = answerWrong('math');
    expect(sfxWrong).toHaveBeenCalledTimes(1);
    expect(celebrateSmall).not.toHaveBeenCalled();
    expect(msg).toBe('encourage:math');
  });
});