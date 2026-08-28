// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { review, emptyMastery, INTERVALS } from '../srs';

describe('srs · Latency-Aware review', () => {
  const DAY = 86400000;

  it('fast answer (<2.5s) accelerates mastery upgrade', () => {
    const now = 1000000;
    const initial = emptyMastery(now); // lv 0
    // Fast response (1200ms) with difficulty 2
    const next = review(initial, true, now, 2, 1200);
    // Should leap by 2 levels (lv 2 instead of lv 1)
    expect(next.lv).toBe(2);
    expect(next.due).toBe(now + (INTERVALS[2] ?? 0) * DAY);
  });

  it('hesitant answer (>8s) shortens interval for prompt reinforcement', () => {
    const now = 1000000;
    const initial = { lv: 2, due: now, ok: 2, ng: 0, last: now };
    // Hesitant response (9500ms) with difficulty 2
    const next = review(initial, true, now, 2, 9500);
    expect(next.lv).toBe(3); // upgraded to level 3
    const standardDays = INTERVALS[3] ?? 4;
    const expectedDays = Math.max(1, Math.round(standardDays * 0.7));
    expect(next.due).toBe(now + expectedDays * DAY);
  });

  it('wrong answer gracefully steps down without erasing mastery', () => {
    const now = 1000000;
    const initial = { lv: 4, due: now, ok: 4, ng: 0, last: now };
    const next = review(initial, false, now, 2, 4000);
    expect(next.lv).toBe(3);
    expect(next.ng).toBe(1);
  });
});
