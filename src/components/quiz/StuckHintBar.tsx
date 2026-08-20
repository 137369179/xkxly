/**
 * 超时干预提示条（从 QuizCard 拆分，P3）
 * ------------------------------------------------------------
 * 纯展示组件：孩子 60s 未作答时温和浮现「再听一遍」。
 */
import { motion } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';

export function StuckHintBar({ onReplay }: { onReplay: () => void }) {
  const { t: translate } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex items-center justify-between rounded-2xl bg-candy-pink-soft px-4 py-3 shadow-candy-sm"
    >
      <span className="text-sm font-extrabold text-candy-purple-deep">
        {translate('quiz.stuckHint')}
      </span>
      <button
        onClick={onReplay}
        className="rounded-full bg-candy-purple-deep px-4 py-1.5 text-sm font-extrabold text-white shadow-candy-sm active:translate-y-[1px]"
      >
        {translate('quiz.listenAgainBtn')}
      </button>
    </motion.div>
  );
}
