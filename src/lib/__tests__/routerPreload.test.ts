// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { preloadRoute, preloadHighFrequencyRoutes } from '../routerPreload';

describe('routerPreload · Predictive Route Preloader', () => {
  it('preloads route dynamically without throwing', () => {
    expect(() => {
      preloadRoute('today');
      preloadRoute('hanzi');
      preloadRoute('numbers');
    }).not.toThrow();
  });

  it('schedules high frequency preload in idle or timeout', () => {
    vi.useFakeTimers();
    expect(() => preloadHighFrequencyRoutes()).not.toThrow();
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
  });
});
