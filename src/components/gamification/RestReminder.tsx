/**
 * 护眼休息提醒（R 层 · 留存与习惯养成 / 健康节奏）
 * ------------------------------------------------------------
 * 定时（默认 15 分钟）弹出一次轻柔休息提示，呼应「防沉迷 / 护眼」合规与家长诉求。
 * 设计原则（儿童友好、非强制）：
 *   - 文字温和（"让眼睛和小手休息一下吧～"），不恐吓、不阻断学习；
 *   - 家长可 disabled 关闭；用户可一键 dismiss，不打扰后续；
 *   - 仅本地定时器，零网络、零 PII。
 */
import { useEffect, useState } from 'react';

interface RestReminderProps {
  /** 提醒间隔（毫秒），默认 15 分钟 */
  intervalMs?: number;
  /** 家长是否已禁用休息提醒 */
  disabled?: boolean;
  onDismiss?: () => void;
}

export function RestReminder({
  intervalMs = 15 * 60 * 1000,
  disabled = false,
  onDismiss,
}: RestReminderProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const id = window.setInterval(() => setShow(true), intervalMs);
    return () => window.clearInterval(id);
  }, [disabled, intervalMs]);

  if (!show) return null;

  return (
    <div
      className="rest-reminder"
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 16,
        background: 'linear-gradient(90deg,#e0f7fa,#fff3e0)',
        color: '#5d4037',
        fontSize: 15,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 20 }}>
        {'🌿'}
      </span>
      <span style={{ flex: 1 }}>
        让眼睛和小手休息一下吧～看远处 20 秒，马上回来继续冒险！
      </span>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          onDismiss?.();
        }}
        style={{
          border: 'none',
          borderRadius: 12,
          padding: '6px 14px',
          background: '#ff7eb3',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        好的
      </button>
    </div>
  );
}
