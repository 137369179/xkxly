// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  performLogArchival,
  getMergedDailyLogs,
} from '../indexedDbStore';
import type { DailyStat } from '@/types';

describe('indexedDbStore · Cold/Hot Log Archival Engine', () => {
  it('separates logs older than 14 days into cold storage', async () => {
    const mockLogs: Record<string, DailyStat> = {
      '2020-01-01': { sec: 600, items: 10, ok: 9, stars: 2, lesson: true },
      '2020-01-02': { sec: 300, items: 5, ok: 5, stars: 1, lesson: true },
      '2099-01-01': { sec: 120, items: 2, ok: 2, stars: 0, lesson: false },
    };

    const { hotLogs, archivedCount } = await performLogArchival(mockLogs, 14);

    expect(archivedCount).toBe(2);
    expect(hotLogs['2099-01-01']).toBeDefined();
    expect(hotLogs['2020-01-01']).toBeUndefined();
  });

  it('retrieves merged logs from hot store and handles fallback gracefully', async () => {
    const hotLogs: Record<string, DailyStat> = {
      '2099-01-01': { sec: 120, items: 2, ok: 2, stars: 0, lesson: false },
    };

    const merged = await getMergedDailyLogs(hotLogs);
    expect(merged['2099-01-01']).toBeDefined();
  });
});
