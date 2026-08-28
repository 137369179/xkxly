// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getDevicePerfProfile } from '../deviceAdapt';

describe('deviceAdapt · Low-Power Device Adapter', () => {
  it('returns valid performance profile structure', () => {
    const profile = getDevicePerfProfile();
    expect(profile).toBeDefined();
    expect(typeof profile.recommendedDpr).toBe('number');
    expect(profile.recommendedDpr).toBeGreaterThanOrEqual(1.0);
    expect(typeof profile.reduceParticles).toBe('boolean');
    expect(typeof profile.touchThrottleMs).toBe('number');
    expect(typeof profile.isLowEnd).toBe('boolean');
  });
});
