// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  hasCachedAudio,
  playCachedAudioBuffer,
  preloadCoreAudioAssets,
} from '../audioCache';

describe('audioCache · Zero-Latency Audio Cache', () => {
  it('returns false for uncached keys', () => {
    expect(hasCachedAudio('uncached_key_xyz')).toBe(false);
    expect(playCachedAudioBuffer('uncached_key_xyz')).toBe(false);
  });

  it('preloadCoreAudioAssets runs without error', () => {
    expect(() => preloadCoreAudioAssets()).not.toThrow();
  });
});
