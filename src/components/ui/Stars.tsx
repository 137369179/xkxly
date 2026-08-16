import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

export function StarIcon({
  filled = true,
  className,
  size = 24,
}: {
  filled?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <path
        d="M12 2.6l2.83 5.98 6.42.93-4.65 4.63 1.1 6.5L12 17.58 6.3 20.64l1.1-6.5L2.75 9.5l6.42-.93L12 2.6z"
        fill={filled ? '#FFC93C' : 'rgba(0,0,0,0.09)'}
        stroke={filled ? '#E5A516' : 'rgba(0,0,0,0.06)'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 三星评分展示 */
export function StarRating({
  value,
  max = 3,
  size = 22,
  animated = false,
}: {
  value: number;
  max?: number;
  size?: number;
  animated?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={`star-${i}`}
          className={cn(animated && i < value && 'animate-pop-in')}
          style={animated ? { animationDelay: `${i * 180}ms`, animationFillMode: 'backwards' } : undefined}
        >
          <StarIcon filled={i < value} size={size} />
        </span>
      ))}
    </div>
  );
}

/** 顶部星星总数徽记 */
export function StarCounter({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <div className="jelly-shine flex items-center gap-1.5 rounded-full bg-candy-yellow-soft px-3.5 py-2 shadow-candy-sm" role="status" aria-label={t('stars.total', { count })}>
      <StarIcon size={20} />
      <span className="text-base font-extrabold text-candy-yellow-deep tabular-nums" aria-live="polite">{count}</span>
    </div>
  );
}
