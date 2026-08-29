import { useState, useCallback } from "react";
import { useTranslation } from '@/i18n/useTranslation';

interface StarRatingProps {
  /** 当前星级（0-5，支持 0.5 步进） */
  rating: number;
  /** 最大星级（默认 5） */
  maxStars?: number;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 颜色 */
  color?: string;
  /** 是否可交互（点击选择星级） */
  interactive?: boolean;
  /** 选择回调 */
  onChange?: (rating: number) => void;
  /** 显示评分数字 */
  showValue?: boolean;
  /** 自定义类名 */
  className?: string;
}

const sizeMap = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  color = '#d9860a',
  interactive = false,
  onChange,
  showValue = false,
  className = '',
}: StarRatingProps) {
  const { t } = useTranslation();
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleClick = useCallback(
    (index: number) => {
      if (interactive && onChange) {
        onChange(index + 1);
      }
    },
    [interactive, onChange]
  );

  const handleMouseEnter = useCallback(
    (index: number) => {
      if (interactive) {
        setHoverRating(index + 1);
      }
    },
    [interactive]
  );

  const handleMouseLeave = useCallback(() => {
    if (interactive) {
      setHoverRating(null);
    }
  }, [interactive]);

  const displayRating = hoverRating ?? rating;

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role={interactive ? 'slider' : 'img'}
      aria-label={t('starRating.rating', { rating, maxStars })}
      aria-valuenow={rating}
      aria-valuemin={0}
      aria-valuemax={maxStars}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        const starValue = index + 1;
        const filled = displayRating >= starValue;
        const halfFilled = !filled && displayRating >= starValue - 0.5;

        return (
          <button
            key={`star-${index}`}
            type="button"
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            disabled={!interactive}
            className={`
              ${sizeMap[size]} transition-transform duration-150
              ${interactive ? 'cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded' : 'cursor-default'}
            `}
            aria-label={t('starRating.star', { value: starValue })}
            style={{ color }}
          >
            {/* 实心星 */}
            {filled || halfFilled ? (
              <svg
                viewBox="0 0 20 20"
                fill={halfFilled ? 'url(#half-gradient)' : color}
                className="w-full h-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="half-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="50%" stopColor={color} />
                    <stop offset="50%" stopColor="#e2c4cb" />
                  </linearGradient>
                </defs>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ) : (
              /* 空心星 */
              <svg
                viewBox="0 0 20 20"
                fill="#e2c4cb"
                className="w-full h-full"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </button>
        );
      })}
      {showValue && (
        <span className="ml-2 text-sm font-medium text-gray-600" aria-live="polite">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export default StarRating;
