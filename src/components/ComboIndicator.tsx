import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getCombo, subscribeCombo } from '@/lib/combo';
import { TONE_STYLE } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 全局连击指示器：固定在顶部居中。
 * - 连击数 >= 2 时显示，< 2 时隐藏
 * - 连击增加时有放大动画
 * - 连击中断时温柔提示「差一点就连击啦」
 */
export function ComboIndicator() {
  const { t } = useTranslation();
  const count = useSyncExternalStore(subscribeCombo, getCombo, getCombo);
  const prevCountRef = useRef(count);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = count;
    // 连击中断（从 >=2 掉到 <2）时温柔提示
    if (prev >= 2 && count < 2) {
      setHint(true);
      // Part B · Step 4：动态导入 speak，让 TTS 引擎只在「连击中断」这一
      // 低频事件首次触发时才加载（之后走浏览器模块缓存），离开首屏主包。
      void import('@/lib/speech')
        .then((m) =>
          m.speak('差一点就连击啦，继续加油！', { lang: 'zh-CN', rate: 0.95, module: 'praise' }),
        )
        .catch(() => {
          /* 语音失败不影响连击提示展示 */
        });
      const t = setTimeout(() => setHint(false), 2200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [count]);

  const visible = count >= 2;
  const orange = TONE_STYLE.orange;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="combo-indicator"
            initial={{ scale: 0.6, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.6, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="fixed left-1/2 top-20 z-40 -translate-x-1/2 lg:top-5"
          >
            <div
              className="flex items-center gap-1.5 rounded-full border-4 border-white px-3 py-1.5 shadow-fluffy"
              style={{ background: orange.soft, boxShadow: `0 6px 0 0 ${orange.deep}44, 0 8px 18px -6px ${orange.main}` }}
            >
              {/* 火焰图标：每次连击增加时重新弹出 */}
              <motion.span
                key={count}
                initial={{ scale: 1.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 480, damping: 12 }}
                className="text-xl leading-none"
              >
                🔥
              </motion.span>
              {/* 连击数字 */}
              <motion.span
                key={`n-${count}`}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 14 }}
                className="text-lg font-black leading-none"
                style={{ color: orange.deep }}
              >
                {count}
              </motion.span>
              <span className="text-xs font-extrabold leading-none" style={{ color: orange.deep }}>
                {t('comboIndicator.label')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 连击中断的温柔提示 */}
      <AnimatePresence>
        {hint && (
          <motion.div
            key="combo-hint"
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-full bg-white/95 px-4 py-1.5 text-sm font-bold text-candy-orange shadow-candy-sm lg:top-5"
          >
            {t('comboIndicator.hint')}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
