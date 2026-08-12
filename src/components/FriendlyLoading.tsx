import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';

/**
 * 友好加载组件：用伙伴动物蹦跳动画替代冰冷 Loading，
 * 让小朋友在路由切换时知道“正在准备”，不会以为卡住。
 *
 * - 随机一只伙伴动物（🐰🐱🐶🐻）蹦跳
 * - 默认文案“正在准备中...”
 * - 超过 2 秒切换为“马上就好啦”并出现旋转的星星，安抚等待情绪
 */
const PETS = ['🐰', '🐱', '🐶', '🐻'] as const;

export function FriendlyLoading({ message }: { message?: string }) {
  // mount 期间稳定一只伙伴，避免每次重渲染换脸
  const pet = useMemo(() => PETS[Math.floor(Math.random() * PETS.length)], []);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const text = message ?? (slow ? '马上就好啦' : '正在准备中...');

  return (
    <div
      className="grid min-h-[60vh] place-items-center"
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className="flex flex-col items-center gap-4">
        {/* 伙伴动物蹦跳 + 慢加载时的旋转星星 */}
        <div className="relative">
          <motion.span
            className="text-7xl"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            {pet}
          </motion.span>
          {slow && (
            <motion.span
              className="absolute -right-3 -top-1 text-2xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              aria-hidden
            >
              ⭐
            </motion.span>
          )}
        </div>

        {/* 文案 */}
        <p className="text-lg font-extrabold text-candy-pink-deep">{text}</p>

        {/* 三个点 dot loading */}
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={`dot-${i}`}
              className="h-2.5 w-2.5 rounded-full bg-candy-pink"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
