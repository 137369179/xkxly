import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useSafeTimeout } from '@/lib/useTimer';

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
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
