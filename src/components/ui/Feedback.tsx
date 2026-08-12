import { AnimatePresence, motion } from 'motion/react';

export type FeedbackKind = 'correct' | 'wrong' | null;

/** 答题后的即时反馈横幅（幼儿友好：大字 + 表情 + 鼓励语） */
export function FeedbackBanner({ kind, text }: { kind: FeedbackKind; text: string }) {
  return (
    <AnimatePresence mode="wait">
      {kind && (
        <motion.div
          key={kind + text}
          initial={{ opacity: 0, y: 14, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="flex items-center justify-center gap-3 rounded-[1.4rem] px-5 py-4 text-center"
          style={{
            background: kind === 'correct' ? '#DDF7E7' : '#FFEBDB',
            color: kind === 'correct' ? '#2E9257' : '#C9601F',
          }}
          role="status"
          aria-live="polite"
        >
          <span className="text-3xl">{kind === 'correct' ? '🎉' : '💪'}</span>
          <span className="text-lg font-extrabold sm:text-xl">{text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 居中弹出的大号奖励提示 */
export function BigPraise({ show, text, emoji = '🌟' }: { show: boolean; text: string; emoji?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.35 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="pointer-events-none fixed inset-0 z-40 grid place-items-center"
          role="status"
          aria-live="assertive"
        >
          <div className="rounded-[2rem] border-4 border-white bg-white/92 px-9 py-7 text-center shadow-pop backdrop-blur">
            <div className="mb-1 text-6xl">{emoji}</div>
            <div className="text-2xl font-extrabold text-rainbow">{text}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
