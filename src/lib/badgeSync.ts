/**
 * PWA 应用图标角标与桌面通知同步器 (App Badging API)
 * ------------------------------------------------------------------
 * 当 SRS 到期复习题数变化时，自动同步至桌面/手机应用图标角标，
 * 提供轻量无感提醒。
 */

export function updateAppBadge(dueCount: number): void {
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      if (dueCount > 0) {
        void navigator.setAppBadge(dueCount).catch(() => {});
      } else {
        void navigator.clearAppBadge().catch(() => {});
      }
    } catch {
      // 忽略不支持平台
    }
  }
}
