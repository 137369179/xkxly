// React 测试环境标记：让 react-dom/test-utils 的 act() 不输出警告
// 仅在组件测试（jsdom 环境）生效，不影响纯函数测试
import { vi } from 'vitest';

// @ts-expect-error React 19 act 环境标记
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// i18n：jsdom 默认 navigator.language 为 en-US，会导致组件渲染英文文案
// 而测试断言大多基于中文 —— 统一固定为 zh-CN
Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });

// jsdom 不实现的 API 补丁
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as unknown as typeof IntersectionObserver;
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as unknown as typeof ResizeObserver;
  }
}
