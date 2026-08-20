// @vitest-environment node
/**
 * completeDailyReview 单测：每日成语复习奖励（幂等，每日一次）
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('completeDailyReview 每日复习奖励', () => {
  beforeEach(() => {
    useStore.setState((s) => ({ progress: { ...s.progress, reviewDate: '', stars: 0 } }));
  });

  it('首次发放：星星 +n，并记录 reviewDate', () => {
    const s0 = useStore.getState().progress;
    expect(s0.stars).toBe(0);

    useStore.getState().completeDailyReview(2);
    const s1 = useStore.getState().progress;
    expect(s1.stars).toBe(2);
    expect(s1.reviewDate).toBeTruthy();
  });

  it('同日重复调用不再重复加星（防刷）', () => {
    useStore.getState().completeDailyReview(2);
    useStore.getState().completeDailyReview(2);
    const s = useStore.getState().progress;
    expect(s.stars).toBe(2);
  });
});