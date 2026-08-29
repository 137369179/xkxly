import { useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import type { StoryBeat } from '@/data/adventureStory';
import { CandyButton } from '@/components/ui/Button';
import { sfxStar } from '@/lib/sfx';
import { speak } from '@/lib/speech';

/**
 * 剧情解锁弹窗
 * 通关新关卡后自动弹出，展示该关的探险剧情。
 * motion/react 弹出动画（scale + opacity），大 emoji + 标题 + 旁白。
 */
export function StoryUnlock({
  story,
  onContinue,
}: {
  story?: StoryBeat;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const open = !!story;

  // 弹出时播放音效 + 朗读旁白
  useEffect(() => {
    if (!story) return;
    sfxStar();
    const timer = setTimeout(() => {
      void speak(story.narrative, { lang: 'zh-CN', rate: 0.9, module: 'praise' });
    }, 350);
    return () => clearTimeout(timer);
  }, [story]);

  return (
    <AnimatePresence>
      {open && story && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-ink/35 backdrop-blur-[3px]"
            onClick={onContinue}
          />

          {/* 剧情卡片 */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[2.2rem] border-4 border-white bg-cream p-6 text-center shadow-pop sm:p-8"
          >
            {/* 顶部标签 */}
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-sm font-extrabold tracking-widest text-candy-orange"
            >
              {t('storyUnlock.label')}
            </motion.p>

            {/* 大 emoji（带弹跳入场） */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
              className="mx-auto my-4 grid h-28 w-28 place-items-center rounded-full text-6xl"
              style={{
                background: 'linear-gradient(135deg, #FFF3D2 0%, #FFE4EF 100%)',
                boxShadow: '0 0 0 6px #FFC93C22, 0 10px 26px -6px #FF9F2E',
              }}
            >
              <motion.span
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {story.emoji}
              </motion.span>
            </motion.div>

            {/* 标题 */}
            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-black text-rainbow sm:text-3xl"
            >
              {t('storyUnlock.title', { levelId: story.levelId, title: story.title })}
            </motion.h3>

            {/* 旁白 */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-3 text-base font-semibold leading-relaxed text-ink-soft"
            >
              {story.narrative}
            </motion.p>

            {/* 继续按钮 */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CandyButton tone="orange" size="lg" className="mt-6" fullWidth onClick={onContinue}>
                {t('storyUnlock.continueBtn')}
              </CandyButton>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
