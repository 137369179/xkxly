// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { GameErrorBoundary } from './GameErrorBoundary';

const Boom = (): React.ReactElement => {
  throw new Error('boom');
};

describe('GameErrorBoundary · 防白屏', () => {
  it('子组件抛错时降级为安抚卡片', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    act(() => root.render(<GameErrorBoundary><Boom /></GameErrorBoundary>));
    expect(container.textContent).toContain('小游戏遇到一点小问题');
    spy.mockRestore();
    root.unmount();
  });

  it('自定义 fallback 生效', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    act(() =>
      root.render(
        <GameErrorBoundary fallback={<div>自定义兜底</div>}>
          <Boom />
        </GameErrorBoundary>,
      ),
    );
    expect(container.textContent).toContain('自定义兜底');
    spy.mockRestore();
    root.unmount();
  });
});

