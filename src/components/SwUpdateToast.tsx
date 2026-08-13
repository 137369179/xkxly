/**
 * SW 更新提示 Toast
 * ------------------------------------------------------------------
 * 当 Service Worker 检测到新版本并完成激活后，显示一条温和的提示：
 *   "🌱 应用已更新到最新版，刷新一下就能用啦"
 *
 * 设计原则（针对儿童学习场景）：
 *   1. 不强制刷新 —— 孩子正在学习时突然刷新会打断体验
 *   2. 不静默更新 —— 让家长/孩子知道"刷新一下就有新版"，避免困惑
 *   3. 不反复打扰 —— 同一会话内只提示一次（sessionStorage 标记）
 *   4. 自动消失 —— 15 秒后自动关闭，避免长期占据屏幕
 *   5. 位置温和 —— 顶部 banner 而非中央 modal，不遮挡学习内容
 */
import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { onSwUpdate, type SwUpdateInfo } from '@/lib/sw';
import { sfxTap } from '@/lib/sfx';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

const SESSION_KEY = 'sw-update-notified';
const AUTO_DISMISS_MS = 15_000;

export function SwUpdateToast() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<SwUpdateInfo | null>(null);

  useEffect(() => {
    const unsubscribe = onSwUpdate((next) => {
      // 同一会话内只提示一次，避免刷新前反复弹。
      // 用 safeStorage 而非裸 sessionStorage：部分家长管控 WebView / 隐私模式下
      // 裸 sessionStorage 会抛 SecurityError 把整个外壳拖垮白屏。
      if (safeGetItem(SESSION_KEY)) return;
      safeSetItem(SESSION_KEY, '1');
      setInfo(next);
    });
    return unsubscribe;
  }, []);

  // 自动消失
  useEffect(() => {
    if (!info) return;
    const timer = setTimeout(() => setInfo(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [info]);

  const handleRefresh = () => {
    sfxTap();
    location.reload();
  };

  const handleDismiss = () => {
    sfxTap();
    setInfo(null);
  };

  return (
    <AnimatePresence>
      {info && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-50 mx-auto mt-2 w-[min(92vw,520px)] rounded-2xl border-2 border-candy-green/30 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 p-3 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0" aria-hidden>🌱</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">{t('swUpdateToast.title')}</p>
              <p className="text-xs font-semibold text-ink/60">
                {t('swUpdateToast.body')}{info.clearedCaches > 0 ? t('swUpdateToast.cleared', { count: info.clearedCaches }) : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleRefresh}
                className="min-h-[40px] rounded-xl bg-candy-green px-3 text-sm font-extrabold text-white shadow-sm transition active:translate-y-[2px]"
              >
                {t('swUpdateToast.refreshNow')}
              </button>
              <button
                onClick={handleDismiss}
                aria-label={t('swUpdateToast.later')}
                className="min-h-[40px] min-w-[40px] rounded-xl px-2 text-sm font-bold text-ink/40 transition hover:text-ink/70"
              >
                {t('swUpdateToast.later')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
