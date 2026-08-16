import { useTranslation } from '@/i18n/useTranslation';

interface ProgressBarProps {
  /** 当前进度值（0-100） */
  value: number;
  /** 最大值（默认 100） */
  max?: number;
  /** 显示文本 */
  label?: string;
  /** 是否显示百分比数值 */
  showValue?: boolean;
  /** 颜色主题 */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否动画过渡 */
  animated?: boolean;
  /** 自定义类名 */
  className?: string;
  /** @deprecated 兼容旧 API：颜色主题别名（等价 color） */
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange';
  /** @deprecated 兼容旧 API：高度像素 → 映射 size */
  height?: number;
  /** @deprecated 兼容旧 API：是否显示数值标签（等价 showValue） */
  showLabel?: boolean;
}

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-gradient-to-r from-[#FF6B96] to-[#FF9EBA]',
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
  // 兼容旧 API：tone → color，showLabel → showValue，height → size
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
