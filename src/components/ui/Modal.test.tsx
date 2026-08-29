// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ModalErrorBoundary } from './Modal';

vi.mock('@/lib/monitor', () => ({ reportRenderError: vi.fn() }));

const Boom = (): React.ReactElement => {
  throw new Error('modal-boom');
};

function mount(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  act(() => root.render(ui));
  return {
    container,
    cleanup: () => {
      spy.mockRestore();
      root.unmount();
      container.remove();
    },
  };
}

describe('ModalErrorBoundary · 弹窗级兜底（R167）', () => {
  it('内容正常时原样渲染 children', () => {
    const { container, cleanup } = mount(
      <ModalErrorBoundary><p>弹窗内容</p></ModalErrorBoundary>,
    );
    expect(container.textContent).toContain('弹窗内容');
    cleanup();
  });

  it('内容抛错时降级为友好提示，不再白屏卡死', () => {
    const { container, cleanup } = mount(
      <ModalErrorBoundary onClose={() => undefined}><Boom /></ModalErrorBoundary>,
    );
    expect(container.textContent).toContain('弹窗里出了点小问题');
    cleanup();
  });

  it('兜底卡提供关闭按钮，点击触发 onClose', () => {
    const onClose = vi.fn();
    const { container, cleanup } = mount(
      <ModalErrorBoundary onClose={onClose}><Boom /></ModalErrorBoundary>,
    );
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('关闭弹窗'),
    );
    expect(btn).toBeDefined();
    act(() => {
      btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('关闭按钮满足 44px 触摸目标', () => {
    const { container, cleanup } = mount(
      <ModalErrorBoundary onClose={() => undefined}><Boom /></ModalErrorBoundary>,
    );
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('关闭弹窗'),
    );
    expect(btn?.className).toContain('min-h-[44px]');
    cleanup();
  });
});
