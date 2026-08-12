import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initMonitor } from '@/lib/monitor';
import { registerSW } from '@/lib/sw';

// 初始化前端监控：错误兜底 + Web Vitals 采集
initMonitor();
// 注册 Service Worker：离线缓存 + 更新通知
registerSW();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element with id "root" not found in the document.');
}

// 全局错误边界：兜底整个 App 外壳（TopBar / Sidebar / CatCompanion 等），
// 单页渲染期异常不至于整页白屏 —— 仅降级为可恢复的提示卡片。
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
