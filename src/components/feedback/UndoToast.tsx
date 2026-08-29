/**
 * 通用撤销 Toast（容错设计 · 防误触可撤销）
 * ------------------------------------------------------------
 * 幼儿误操作（连点、手滑、误触）非常频繁，任何"不可逆"的操作
 * 都会让孩子产生挫败感。本组件在屏幕底部弹出一条提示，
 * 并在 `durationMs` 内提供一次「撤销」机会，符合 Material Snackbar 模式。
 *
 * 设计要点：
 *   1) 即时反馈：首帧即渲染，不等网络/动画；
 *   2) 撤销按钮 min-height 48px，满足幼儿手指触控热区；
 *   3) 深色底 + 奶油白字 + 黄底深字按钮，对比度 > 7:1；
 *   4) role="status" + aria-live="polite"，读屏器自动播报；
 *   5) 尊重 prefers-reduced-motion：降级为无动画直接显示。
 *
 * 用法 A（推荐，配 useUndoToast）：
 *   const toast = useUndoToast();          // 自动收起的计时由 Hook 负责
 *   <UndoToast open={toast.open} message={toast.message} onUndo={toast.undo} />
 *   toast.show('已获得 10 颗星星', () => rollback());
 *
 * 用法 B（受控）：自行管理 open；若希望组件自己倒计时，额外传 onClose 接收
 *   "到点了"的通知（此时 onClose 应把 open 置为 false）。不传 onClose 则
 *   由调用方/外层 Hook 负责收起。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@/game/useReducedMotion';

export interface UndoToastProps {
  /** 是否显示 */
  open: boolean;
  /** 提示文案，例如「已获得 10 颗星星」 */
  message: string;
  /** 点击「撤销」时执行 */
  onUndo: () => void;
  /** 自动消失倒计时（毫秒），默认 5000 */
  durationMs?: number;
  /**
   * 可选：需要组件自己倒计时自动消失时传入，到点会被调用（应把 open 置为 false）。
   * 配 useUndoToast 使用时无需传 —— 计时已由 Hook 负责，传了才会出现两条定时器。
   */
  onClose?: () => void;
  /** 撤销按钮文案，默认「撤销」 */
  undoLabel?: string;
}

export function UndoToast({
  open,
  message,
  onUndo,
  durationMs = 5000,
  onClose,
  undoLabel = '撤销',
}: UndoToastProps) {
  const reduced = useReducedMotion();

  // 自动消失：open 或 message 变化（连着触发第二条）时重新计时，卸载时清理
  useEffect(() => {
    if (!open || !onClose) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, message, durationMs, onClose]);

  // 撤销后立刻收起，避免同一动作被连续触发两次
  const handleUndo = useCallback(() => {
    onUndo();
    onClose?.();
  }, [onUndo, onClose]);

  return (
    // 常驻的 live region：读屏器才能可靠播报"后来插入"的内容
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? false : { y: 72, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 32, opacity: 0, scale: 0.96 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 26 }}
            className="pointer-events-auto flex w-full max-w-[28rem] items-center gap-3 rounded-[var(--radius-hero)] px-4 py-3 sm:px-5"
            style={{
              background: 'var(--color-ink)',
              color: 'var(--color-cream)',
              boxShadow: 'var(--shadow-jelly-lg)',
            }}
          >
            <span aria-hidden="true" className="shrink-0 text-xl leading-none">
              ✨
            </span>
            <span className="min-w-0 flex-1 text-base font-extrabold leading-snug">{message}</span>
            <button
              type="button"
              onClick={handleUndo}
              className="shrink-0 rounded-2xl px-4 text-base font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-warning)]"
              style={{
                minHeight: 48,
                background: 'var(--color-warning)',
                color: 'var(--color-ink)',
                boxShadow: 'var(--shadow-candy-sm)',
              }}
            >
              {undoLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface UndoToastController {
  /** 是否显示 */
  open: boolean;
  /** 当前提示文案 */
  message: string;
  /** 弹出提示；action 为点「撤销」时要回滚的动作 */
  show: (msg: string, action?: () => void) => void;
  /** 执行撤销：运行 show 时登记的动作并收起 */
  undo: () => void;
  /** 直接收起，不执行撤销 */
  hide: () => void;
}

/**
 * UndoToast 的状态控制器
 * ------------------------------------------------------------
 * 定时器由 Hook 自己持有：弹出即开始倒计时，到点自动收起，
 * 因此即使调用方只写 `<UndoToast open message onUndo />`（不传 onClose），
 * 也一定会在 durationMs 后消失，不会出现"永远挂着"的 Toast。
 *
 * 清理保证（避免内存泄漏与 setState on unmounted）：
 *   1) 定时器 id 存在 ref 里，show/undo/hide 都会先清掉上一个，不会叠加；
 *   2) 组件卸载时统一 clearTimeout；
 *   3) 定时器回调与 undo/hide 都先过 mountedRef 守卫，卸载后不再 setState。
 *
 * 组件侧的 UndoToast 另有一个"仅在传了 onClose 时启动"的定时器，
 * 用于纯受控（不配本 Hook）的场景；两者不会同时跑，不会互相打架。
 */
export function useUndoToast(durationMs = 5000): UndoToastController {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const actionRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  // 挂载标记：卸载后所有 setState 路径直接短路
  const mountedRef = useRef(true);

  /** 清掉待执行的自动收起定时器（幂等，可重复调用） */
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 卸载时清理定时器；StrictMode 下二次挂载会重新标记为已挂载
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /** 收起并丢弃已登记的撤销动作 */
  const dismiss = useCallback(() => {
    if (!mountedRef.current) return;
    setOpen(false);
    actionRef.current = null;
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    dismiss();
  }, [clearTimer, dismiss]);

  const show = useCallback(
    (msg: string, action?: () => void) => {
      actionRef.current = action ?? null;
      setMessage(msg);
      setOpen(true);
      // 连着弹第二条时重置倒计时，而不是叠加一个新定时器
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        dismiss();
      }, durationMs);
    },
    [clearTimer, dismiss, durationMs],
  );

  const undo = useCallback(() => {
    // 先停表再执行，避免撤销动作里再次 show 时倒计时被冲掉
    clearTimer();
    const action = actionRef.current;
    actionRef.current = null;
    dismiss();
    action?.();
  }, [clearTimer, dismiss]);

  return { open, message, show, undo, hide };
}
