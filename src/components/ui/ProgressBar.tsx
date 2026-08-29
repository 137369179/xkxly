import { useTranslation } from '@/i18n/useTranslation';

interface ProgressBarProps {
  /** 当前进度值（0-100） */
  value: number;
  /** 最大值（默认 100） */
  max?: number;
  /** 显示文本 */
  label?: string;
  /**
   * 是否显示百分比数值。
   * 注意：与 showLabel 等价，且 **showLabel 优先**（见下方 showLabel 说明）。
   */
  showValue?: boolean;
  /**
   * 颜色主题。与 tone 等价，但**优先级低于 tone**（解析为 `tone ?? color`）。
   * 全仓仅 2 处使用，属次要别名，新代码建议统一用 tone。
   */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange';
  /**
   * 尺寸档位。与 height 二选一，**height 优先**（height 非空时按其像素值映射档位）。
   */
  size?: 'sm' | 'md' | 'lg';
  /** 是否动画过渡 */
  animated?: boolean;
  /** 自定义类名 */
  className?: string;
  /**
   * 颜色主题（**事实主 API**：全仓 31 处使用，远多于 color 的 2 处；
   * 组件内部解析为 `tone ?? color`，tone 优先）。
   *
   * 修订说明（2026-08-29）：此前本项被误标 `@deprecated`，但它是使用量最大的
   * 主流写法，标注与实现矛盾，会误导后续开发者改用冷门的 color 造成风格不一致。
   * 现更正为主 API，改由 color 承担别名角色。
   */
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange';
  /**
   * 高度（像素）→ 自动映射尺寸档位：>=10 → lg，>=6 → md，否则 sm。
   * 精确实心高度需求用本项；只需粗档位时用 size。
   */
  height?: number;
  /**
   * 是否显示数值标签（**事实主 API**，与 showValue 等价但优先级更高）。
   * 修订说明同 tone：此前被误标 @deprecated，实为主流写法。
   */
  showLabel?: boolean;
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-gradient-to-r from-[#FF5C8A] to-[#FF9EBA]',
  orange: 'bg-orange-500',
};

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

type BarColor = keyof typeof colorMap;

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  color,
  size = 'md',
  animated = true,
  className = '',
  tone,
  height,
  showLabel,
}: ProgressBarProps) {
  // 三对等价属性各自的优先级：tone > color、showLabel > showValue、height > size。
  // 左侧三项（tone/showLabel/height）是全仓主流写法（31 处），故以它们为优先。
  const { t } = useTranslation();
  const resolvedColor: BarColor = (tone ?? color ?? 'blue') as BarColor;
  const resolvedShowValue = showLabel ?? showValue;
  const resolvedSize: keyof typeof sizeMap =
    height != null ? (height >= 10 ? 'lg' : height >= 6 ? 'md' : 'sm') : size;
  // 确保 value 在有效范围内
  const safeValue = Math.min(Math.max(0, value), max);
  const percentage = Math.round((safeValue / max) * 100);

  return (
    <div
      className={`w-full ${className}`}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || t('progressBar.progress', { percentage })}
    >
      {(label || resolvedShowValue) && (
        <div className="flex justify-between items-center mb-1 text-sm text-gray-600">
          {label && <span>{label}</span>}
          {resolvedShowValue && <span className="font-medium">{percentage}%</span>}
        </div>
      )}
      <div
        className={`w-full bg-[#F0E4E8] rounded-full overflow-hidden ${sizeMap[resolvedSize]}`}
        role="presentation"
      >
        <div
          className={`${colorMap[resolvedColor]} ${sizeMap[resolvedSize]} rounded-full ${
            animated ? 'transition-all duration-500 ease-out' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
