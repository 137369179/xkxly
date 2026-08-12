import { motion } from 'motion/react';
import type { StoryBookPageData } from '@/lib/ai/prompts';
import type { StorybookTheme } from './types';
import { getTheme } from './constants';

interface PageIllustrationProps {
  page: StoryBookPageData;
  theme: StorybookTheme;
  isActive: boolean;
}

/** 主题场景 CSS 元素配置 */
function SceneElements({ theme }: { theme: StorybookTheme }) {
  switch (theme) {
    case 'animals':
      return (
        <>
          {/* 大树 */}
          <div className="absolute bottom-0 left-4 w-24 h-32 opacity-70">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-20 bg-amber-700/60 rounded-t-lg" />
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-20 h-20 bg-green-500/50 rounded-full" />
          </div>
          {/* 草地 */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-green-400/30 rounded-t-[50%]" />
        </>
      );
    case 'space':
      return (
        <>
          {/* 星星 */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${4 + (i % 3) * 2}px`,
                height: `${4 + (i % 3) * 2}px`,
                top: `${10 + (i * 11) % 60}%`,
                left: `${5 + (i * 13) % 90}%`,
                opacity: 0.6,
              }}
            />
          ))}
          {/* 月亮 */}
          <div className="absolute top-6 right-8 w-16 h-16 rounded-full bg-yellow-100/80 shadow-[0_0_30px_rgba(255,255,200,0.4)]" />
        </>
      );
    case 'princess':
      return (
        <>
          {/* 城堡 */}
          <div className="absolute bottom-0 right-4 opacity-70">
            <div className="w-3 h-16 bg-purple-300/60 inline-block mx-0.5" />
            <div className="w-3 h-20 bg-purple-300/60 inline-block mx-0.5" />
            <div className="w-3 h-16 bg-purple-300/60 inline-block mx-0.5" />
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-transparent border-b-purple-400/50 relative -top-16 left-[6px]" />
          </div>
          {/* 彩虹拱门 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 h-20 rounded-t-full border-4 border-pink-300/40 border-b-0" />
        </>
      );
    case 'dinosaur':
      return (
        <>
          {/* 火山 */}
          <div className="absolute bottom-0 right-4 opacity-70">
            <div className="w-0 h-0 border-l-[30px] border-r-[30px] border-b-[50px] border-l-transparent border-r-transparent border-b-orange-400/50" />
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-red-400/60 relative -bottom-[50px] left-[20px]" />
          </div>
          {/* 岩石 */}
          <div className="absolute bottom-2 left-6 w-16 h-8 bg-stone-400/40 rounded-full" />
        </>
      );
    case 'ocean':
      return (
        <>
          {/* 海浪 */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-blue-400/30 rounded-t-[50%]" />
          {/* 气泡 */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-white/40"
              style={{
                width: `${8 + i * 4}px`,
                height: `${8 + i * 4}px`,
                bottom: `${20 + i * 12}%`,
                left: `${15 + i * 18}%`,
              }}
            />
          ))}
        </>
      );
    case 'forest':
      return (
        <>
          {/* 树木 */}
          <div className="absolute bottom-0 left-2 w-20 h-28 opacity-70">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-14 bg-amber-800/50 rounded-t" />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-green-600/40 rounded-full" />
          </div>
          {/* 蘑菇 */}
          <div className="absolute bottom-2 right-8 opacity-70">
            <div className="w-6 h-4 bg-red-400/60 rounded-t-full" />
            <div className="w-2 h-4 bg-amber-100/60 mx-auto" />
          </div>
        </>
      );
    default:
      return null;
  }
}

export function PageIllustration({ page, theme, isActive }: PageIllustrationProps) {
  const preset = getTheme(theme);

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-[1.5rem]"
      style={{ background: preset.bgGradient }}
    >
      {/* Layer 1: 背景渐变 + bgColor 半透明蒙版 */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: page.bgColor + '40' }}
      />

      {/* Layer 2: 主题场景元素 */}
      <SceneElements theme={theme} />

      {/* Layer 3: 主 emoji（页面核心 emoji） */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-[7rem] sm:text-[8rem] leading-none drop-shadow-lg"
          initial={{ scale: 0, rotate: -20 }}
          animate={isActive ? { scale: 1, rotate: 0 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          {page.emoji}
        </motion.span>
      </div>

      {/* Layer 4: 装饰 emoji 飘浮动画 */}
      {preset.sceneEmojis.slice(0, 4).map((emoji, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl sm:text-3xl opacity-70"
          style={{
            top: `${15 + i * 20}%`,
            left: `${10 + i * 22}%`,
          }}
          animate={
            isActive
              ? { y: [0, -10, 0], rotate: [0, 5, 0], opacity: [0.5, 0.8, 0.5] }
              : { opacity: 0.5 }
          }
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}
