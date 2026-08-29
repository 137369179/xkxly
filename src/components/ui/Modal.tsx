import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useSafeTimeout } from '@/lib/useTimer';
import { reportRenderError } from '@/lib/monitor';

/**
 * 弹窗级错误边界（R167）—— 兜底 Modal 内渲染异常
 * ------------------------------------------------------------------
 * 弹窗内组件抛错时，整个弹窗卡死无法关闭，孩子只能看到空白。
 * 现在兜住渲染期异常，显示友好提示 + 关闭按钮，家长可反馈堆栈。
 */
export class ModalErrorBoundary extends Component<
  { children: ReactNode; onClose?: () => void },
  { error: Error | null; stack?: string }
> {
  override state: { error: Error | null; stack?: string } = { error: null, stack: undefined };

  static getDerivedStateFromError(error: Error): { error: Error | null; stack?: string } {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ stack: info.componentStack ?? undefined });
    console.error('[宝贝学习乐园] 弹窗渲染出错：', error, info.componentStack);
    reportRenderError(error, info.componentStack ?? undefined);
  }

  override render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid place-items-center px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-center shadow-md">
          <div className="text-4xl">🙈</div>
          <p className="mt-2 text-sm font-bold text-ink-soft">弹窗里出了点小问题</p>
          <button
            type="button"
            onClick={() => this.props.onClose?.()}
            className="mt-3 min-h-[44px] rounded-xl bg-candy-green px-4 text-sm font-extrabold text-candy-green-on transition active:translate-y-[2px]"
          >
            关闭弹窗
          </button>
          <details className="mt-3 text-left">
            <summary className="cursor-pointer text-xs font-bold text-ink-soft/70">
              错误详情
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-[#fbf6f7] p-2 text-xs leading-relaxed whitespace-pre-wrap text-ink-soft">
              {error.message}
              {stack ? `\n${stack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

export function Modal({
  open,
  onClose,
  children,
  className,
  dismissable = true,
  'aria-label': ariaLabel,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  dismissable?: boolean;
  'aria-label'?: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const scheduleFocus = useSafeTimeout();

  // ESC 键关闭弹窗 + 焦点陷阱（无障碍支持）
  useEffect(() => {
    if (!open) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus modal on open（统一调度，卸载自动清理）
    scheduleFocus(() => modalRef.current?.focus(), 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable && onClose) {
        onClose();
        return;
      }
      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [open, dismissable, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={modalRef}
          className="fixed inset-0 z-50 grid place-items-center p-4 outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          tabIndex={-1}
        >
          <div
            className="absolute inset-0 bg-ink/35 backdrop-blur-[3px]"
            onClick={dismissable ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            initial={{ scale: 0.82, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className={cn(
              'jelly-shine relative z-10 w-full max-w-lg rounded-[2rem] border-4 border-white bg-white/85 p-6 shadow-jelly-lg backdrop-blur-2xl sm:p-8',
              className,
            )}
          >
            {/* R167 弹窗级兜底：内容渲染异常时显示友好提示 + 关闭按钮，
                弹窗随 open=false 卸载时错误状态自动重置（重开即恢复） */}
            <ModalErrorBoundary onClose={dismissable ? onClose : undefined}>
              {children}
            </ModalErrorBoundary>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
