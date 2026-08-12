/**
 * 页面级错误边界
 * ------------------------------------------------------------------
 * 之前任何一个模块抛未捕获异常，整个 SPA 直接白屏，孩子只能看到空白页，
 * 家长也拿不到任何线索。现在兜住渲染期异常：
 *   - 孩子端看到的是一只"小智摔倒了"的友好卡片 + 重试按钮
 *   - 错误详情折叠在下面，家长展开就能看到堆栈，便于反馈
 *
 * 两种用法：
 *   1. 页面级（默认）：包住整页，出错显示大卡片占满 55vh
 *   2. 内嵌（variant="inline"）：包住页面内的某个子视图/弹窗，
 *      出错只显示小卡片，不影响页面其他部分。
 *      例：PoemsPage 的 TrainView/PlanView/PoemDetail 各自包一层，
 *      某个详情渲染异常不会让整个古诗学院页崩掉。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportRenderError } from '@/lib/monitor';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 用于在路由变化时自动重置错误状态 */
  resetKey?: string;
  /** 渲染样式：page = 大卡片占满（默认），inline = 小卡片内嵌 */
  variant?: 'page' | 'inline';
}

interface State {
  error: Error | null;
  stack?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidUpdate(prev: ErrorBoundaryProps) {
    // resetKey 变化（如切换 tab/路由）就给一次重新来过的机会
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, stack: undefined });
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ stack: info.componentStack ?? undefined });
    // 生产环境也留一条控制台记录，方便家长截屏反馈
    console.error('[宝贝学习乐园] 页面渲染出错：', error, info.componentStack);
    // 上报到 BFF /api/log，开发者事后能拿到堆栈
    reportRenderError(error, info.componentStack ?? undefined);
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    const { variant = 'page' } = this.props;

    // 内嵌变体：紧凑小卡片，不占满整屏，适合子视图隔离
    if (variant === 'inline') {
      return (
        <div className="grid place-items-center px-4 py-8">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-center shadow-md">
            <div className="text-4xl">🙈</div>
            <p className="mt-2 text-sm font-bold text-ink-soft">这一块出了点小问题</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null, stack: undefined })}
              className="mt-3 min-h-[40px] rounded-xl bg-candy-green px-4 text-sm font-extrabold text-white transition active:translate-y-[2px]"
            >
              重新试一次
            </button>
            <details className="mt-3 text-left">
              <summary className="cursor-pointer text-[11px] font-bold text-ink-soft/70">
                错误详情
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-[#F5F3FA] p-2 text-[10px] leading-relaxed whitespace-pre-wrap text-ink-soft">
                {error.message}
                {stack ? `\n${stack}` : ''}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    // 页面级变体：大卡片占满 55vh
    return (
      <div className="grid min-h-[55vh] place-items-center px-4">
        <div className="w-full max-w-md rounded-[1.8rem] bg-white p-6 text-center shadow-lg">
          <div className="text-6xl">🙈</div>
          <h2 className="mt-3 text-2xl font-extrabold text-ink">哎呀，小智绊了一跤</h2>
          <p className="mt-2 text-base font-medium text-ink-soft">
            这一页出了点小问题，点下面的按钮再试一次就好啦。
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => this.setState({ error: null, stack: undefined })}
              className="min-h-[48px] rounded-2xl bg-candy-green px-5 text-base font-extrabold text-white transition active:translate-y-[2px]"
            >
              重新试一次
            </button>
            <button
              type="button"
              onClick={() => {
                location.hash = '';
                location.reload();
              }}
              className="min-h-[48px] rounded-2xl bg-candy-purple-soft px-5 text-base font-extrabold text-candy-purple-deep transition active:translate-y-[2px]"
            >
              回到首页
            </button>
          </div>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs font-bold text-ink-soft/70">
              给家长看的错误详情
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-[#F5F3FA] p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-ink-soft">
              {error.message}
              {stack ? `\n${stack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
