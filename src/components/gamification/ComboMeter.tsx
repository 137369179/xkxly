/**
 * 连击能量条（ComboMeter）—— 即时反馈强化的视觉层
 * ------------------------------------------------------------
 * 纯受控展示组件：父级（三核心练习循环）调用 recordCombo 后把 count 传下来即可。
 * 复用 combo.COMBO_THRESHOLDS 作为唯一真相源，自动渲染：
 *   - 当前连击数 🔥
 *   - 距下一个连击里程碑的进度条
 *   - 温和的「再对 N 题解锁 ✨/🌟/🔥」引导文案
 * 不依赖全局单例 state，因此可独立测试、零副作用。
 */
import { COMBO_THRESHOLDS, type ComboThreshold } from '@/lib/combo';

interface ComboMeterProps {
  count: number;
  className?: string;
}

export function ComboMeter({ count, className }: ComboMeterProps) {
  const thresholds: ComboThreshold[] = [...COMBO_THRESHOLDS].sort(
    (a, b) => a.count - b.count,
  );
  const reached = thresholds.filter((t) => count >= t.count);
  const lastReached = reached.length ? reached[reached.length - 1] : null;
  const next = thresholds.find((t) => count < t.count) ?? null;

  const prevCount = lastReached ? lastReached.count : 0;
  const nextCount = next ? next.count : prevCount;
  const ratio =
    nextCount > prevCount
      ? Math.min(1, (count - prevCount) / (nextCount - prevCount))
      : 1;
  const isIdle = count === 0;

  return (
    <div
      className={`combo-meter${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}
    >
      <span className="combo-count" aria-label={`当前连击 ${count}`} style={{ fontSize: 18 }}>
        {'🔥'} {count}
      </span>
      {next && !isIdle && (
        <div
          className="combo-track"
          aria-hidden="true"
          style={{
            flex: 1,
            height: 10,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.45)',
            overflow: 'hidden',
            minWidth: 60,
          }}
        >
          <div
            className="combo-fill"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg,#ffd166,#ff7eb3)',
              transition: 'width 240ms ease',
            }}
          />
        </div>
      )}
      <span className="combo-hint" style={{ fontSize: 13, opacity: 0.85 }}>
        {isIdle
          ? '连续答对积累连击'
          : next
            ? `再对 ${next.count - count} 题解锁 ${next.emoji}`
            : lastReached
              ? `已解锁 ${lastReached.emoji} 连击大师！`
              : '连续答对积累连击'}
      </span>
    </div>
  );
}
