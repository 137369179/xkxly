import { describe, it, expect } from 'vitest';
import { updateAppBadge } from '../badgeSync';

describe('badgeSync', () => {
  it('updateAppBadge handles zero or positive counts safely without throwing', () => {
    expect(() => updateAppBadge(0)).not.toThrow();
    expect(() => updateAppBadge(5)).not.toThrow();
  });
});
