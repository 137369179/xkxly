/**
 * 离线状态提示（核心加强 R）
 * ------------------------------------------------------------
 * 现状：AI 调用静默降级、SWR 失败、图片加载失败时，孩子/家长看不到任何提示，
 * 只会觉得"小智变笨了"或"图片坏了"。
 *
 * 方案：
 *   1. 监听 navigator.onLine + online/offline 事件
 *   2. 离线时在 TopBar 显示粉色徽章"📶 离线模式"
 *   3. 切换时给一个 2 秒 toast 提示，避免用户困惑
 *   4. 离线时返回 true，供调用方禁用依赖网络的入口
 */
import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { motion, AnimatePresence } from 'motion/react';

/** 订阅浏览器在线状态，离线时返回 true */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return offline;
}

/** 离线徽章：在 TopBar 显示，离线时可见 */
export function OfflineBadge() {
  const { t } = useTranslation();
  const offline = useOffline();
  return (
    <AnimatePresence>
      {offline && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-1 rounded-full bg-candy-pink-soft px-2.5 py-1.5 text-xs font-extrabold text-candy-pink-deep border border-candy-pink/30"
          title={t('offlineIndicator.badgeTitle')}
        >
          <span>📶</span>
          <span>{t('offlineIndicator.badge')}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** 离线切换 Toast：网络状态变化时短暂提示，避免用户困惑 */
export function OfflineToast() {
  const { t } = useTranslation();
  const offline = useOffline();
  const [show, setShow] = useState(false);

  // 网络状态变化时显示 2 秒提示（首次挂载不显示，避免冗余）
  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(t);
  }, [offline]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-extrabold text-white shadow-candy-sm"
          style={{
            background: offline ? '#FF6B9D' : '#4ECDC4',
          }}
        >
          {offline ? t('offlineIndicator.toastDisconnected') : t('offlineIndicator.toastReconnected')}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
