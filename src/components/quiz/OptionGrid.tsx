/**
 * 答题选项网格（从 QuizCard 拆分）
 * ------------------------------------------------------------
 * 纯展示组件：渲染选项按钮 + 抖动动画 + 对/错标记。答题状态由父组件维护。
 */
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { TONE_STYLE, toneAt } from '@/lib/tones';

export interface OptionGridProps {
  options: Array<{ id: string; label?: string; emoji?: string; shapes?: string[] }>;
  wrongIds: string[];
  solved: boolean;
  answerId: string | undefined;
  shakeId: string | null;
  onPick: (optId: string) => void;
}

export function OptionGrid({ options, wrongIds, solved, answerId, shakeId, onPick }: OptionGridProps) {
  const optionCount = options.length;
  const gridCols =
    optionCount <= 2 ? 'grid-cols-2' : optionCount === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={cn('mt-6 grid gap-3 sm:gap-4', gridCols)}>
      {options.map((opt, i) => {
        const isWrong = wrongIds.includes(opt.id);
        const isRight = solved && opt.id === answerId;
        const t = TONE_STYLE[toneAt(i)] ?? TONE_STYLE.pink;
        return (
          <motion.button
            key={opt.id}
            onClick={() => onPick(opt.id)}
            disabled={solved || isWrong}
            animate={shakeId === opt.id ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.42 }}
            whileTap={!solved && !isWrong ? { scale: 0.94 } : undefined}
            className={cn(
              'no-select relative grid min-h-[88px] place-items-center gap-1 rounded-[1.5rem] px-3 py-4',
              'text-2xl font-extrabold transition-all duration-150 sm:min-h-[104px] sm:text-3xl',
              'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-purple/60',
              isWrong && 'opacity-40 grayscale',
              isRight && 'ring-4 ring-candy-green ring-offset-2',
            )}
            style={{
              background: isRight ? TONE_STYLE.green.soft : t.soft,
              color: isRight ? TONE_STYLE.green.deep : t.deep,
              boxShadow: solved || isWrong ? 'none' : `0 5px 0 0 ${t.main}55`,
            }}
          >
            {opt.emoji && <span className="text-4xl sm:text-5xl">{opt.emoji}</span>}
            {opt.shapes && (
              <span className="flex flex-wrap items-center justify-center gap-1">
                {opt.shapes.map((s: string, k: number) => (
                  <span key={`optshape-${s}-${k}`} className="text-3xl sm:text-4xl">
                    {s}
                  </span>
                ))}
              </span>
            )}
            {opt.label && <span className="leading-tight break-all">{opt.label}</span>}

            {isRight && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-candy-green text-lg text-white shadow-candy-sm"
              >
                ✓
              </motion.span>
            )}
            {isWrong && (
              <span className="absolute -top-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-candy-orange text-lg text-white">
                ✕
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
