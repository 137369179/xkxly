// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { useSound, type UseSoundApi } from './useSound';

class FakeOsc {
  type = 'sine';
  frequency = { value: 0 };
  connect() {}
  start() {}
  stop() {}
}
class FakeGain {
  gain = { value: 0 };
  connect() {}
}
class FakeCtx {
  currentTime = 0;
  destination = {};
  createOscillator() {
    return new FakeOsc();
  }
  createGain() {
    return new FakeGain();
  }
  close() {
    return Promise.resolve();
  }
}

function Harness({ apiRef }: { apiRef: { current: UseSoundApi | null } }) {
  apiRef.current = useSound();
  return null;
}

describe('useSound', () => {
  afterEach(() => {
    try {
      localStorage.removeItem('babystudy.sound.muted');
    } catch {
      /* noop */
    }
  });

  it('无 AudioContext（测试/SSR/旧浏览器）→ play 静默降级，绝不抛错', () => {
    const original = (window as unknown as { AudioContext?: unknown }).AudioContext;
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    const apiRef = { current: null as UseSoundApi | null };
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(Harness, { apiRef })));
    expect(() => act(() => apiRef.current!.play('success'))).not.toThrow();
    act(() => root.unmount());
    if (original !== undefined) (window as unknown as { AudioContext: unknown }).AudioContext = original;
  });

  it('有 AudioContext → play 触发振荡器合成；muted 时不触发', () => {
    const createOscSpy = vi.fn(() => new FakeOsc());
    class SpyCtx extends FakeCtx {
      createOscillator() {
        createOscSpy();
        return new FakeOsc();
      }
    }
    const original = (window as unknown as { AudioContext?: unknown }).AudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = SpyCtx;

    const apiRef = { current: null as UseSoundApi | null };
    const c = document.createElement('div');
    document.body.appendChild(c);
    const root = createRoot(c);
    act(() => root.render(createElement(Harness, { apiRef })));

    act(() => apiRef.current!.play('success'));
    expect(createOscSpy).toHaveBeenCalled();

    act(() => apiRef.current!.setMuted(true));
    const before = createOscSpy.mock.calls.length;
    act(() => apiRef.current!.play('tap'));
    expect(createOscSpy.mock.calls.length).toBe(before); // muted 后不合成

    act(() => root.unmount());
    (window as unknown as { AudioContext: unknown }).AudioContext = original;
  });
});
