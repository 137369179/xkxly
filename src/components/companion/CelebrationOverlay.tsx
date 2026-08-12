/**
 * CelebrationOverlay —— 成就庆祝覆盖层
 * ------------------------------------------------------------------
 * 当孩子解锁新徽章时弹出全屏庆祝：
 *   1. CSS confetti 彩纸下落动画
 *   2. AiAvatar mood="celebrating"
 *   3. 调用 companionCelebrateTask 流式获取庆祝语
 *   4. 庆祝语流式展示，3 秒后显示"太棒了"按钮关闭
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { useAiStream } from '@/lib/ai/useAi';
import { companionCelebrateTask } from '@/lib/ai/tasks';
import { TONE_STYLE } from '@/lib/tones';
import { sfxStar, sfxTap } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useTranslation } from '@/i18n/useTranslation';

/** 彩纸片 */
interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  size: number;
}

const CONFETTI_COLORS = ['#FF6FA5', '#4FC3F7', '#FFC93C', '#5FD68B', '#A78BFA', '#FF9F5A'];

function useConfetti(count = 40): ConfettiPiece[] {
  return useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 1.5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      rotate: Math.random() * 360,
      size: 8 + Math.random() * 10,
    })),
  [count]);
}

function ConfettiCannon({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: `${p.left}vw`,
            y: -20,
            rotate: p.rotate,
            opacity: 1,
          }}
          animate={{
            y: '110vh',
            rotate: p.rotate + 360,
            opacity: [1, 1, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeIn',
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export function CelebrationOverlay({
  badgeName,
  badgeEmoji,
  onClose,
}: {
  badgeName: string;
  badgeEmoji: string;
  onClose: () => void;
}) {
  const { t: tr } = useTranslation();
  const stream = useAiStream();
  const [showButton, setShowButton] = useState(false);
  const startedRef = useRef(false);
  const pieces = useConfetti(40);
  const tone = TONE_STYLE.yellow;

  // 启动庆祝语流式生成 + 大庆祝特效
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    sfxStar();
    void celebrateBig();
    stream.run(companionCelebrateTask(badgeName, badgeEmoji, badgeEmoji));
  }, []); // intentional: mount-only celebration trigger

  // 流式结束后 3 秒显示按钮
  useEffect(() => {
    if (stream.status !== 'done') return;
    const timer = setTimeout(() => setShowButton(true), 1500);
    return () => clearTimeout(timer);
  }, [stream.status]);

  const handleClose = () => {
    sfxTap();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        {/* 彩纸 */}
        <ConfettiCannon pieces={pieces} />

        {/* 中心卡片 */}
        <motion.div
          initial={{ scale: 0.7, y: 30, rotate: -5 }}
          animate={{ scale: 1, y: 0, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20 }}
          className="relative w-full max-w-sm rounded-[2rem] border-4 border-white bg-white p-6 shadow-2xl"
        >
          {/* 徽章大图标 */}
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
            className="text-center text-7xl mb-3"
          >
            {badgeEmoji}
          </motion.div>

          {/* 徽章名称 */}
          <h2 className="text-center text-2xl font-extrabold mb-1" style={{ color: tone.deep }}>
            🎉 {badgeName} 🎉
          </h2>

          {/* AiAvatar 庆祝中 */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <AiAvatar size={48} mood="celebrating" />
          </div>

          {/* 流式庆祝语 */}
          <div
            className="rounded-2xl p-4 mb-4 min-h-[80px]"
            style={{ background: tone.soft }}
          >
            {stream.status === 'thinking' && (
              <p className="text-base font-bold text-ink-soft text-center pt-3">
                {tr('celebrate.thinking')}
              </p>
            )}
            {(stream.status === 'streaming' || stream.status === 'done') && (
              <p className="text-lg leading-8 font-medium whitespace-pre-wrap text-center" style={{ color: '#3B3355' }}>
                {stream.text}
                {stream.status === 'streaming' && (
                  <motion.span
                    className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[2px] rounded-full"
                    style={{ background: tone.main }}
                    animate={{ opacity: [1, 0.15, 1] }}
                    transition={{ duration: 0.85, repeat: Infinity }}
                  />
                )}
              </p>
            )}
          </div>

          {/* 按钮 */}
          <div className="flex justify-center">
            {showButton ? (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleClose}
                className="min-h-[52px] min-w-[160px] rounded-full px-8 text-lg font-extrabold transition active:translate-y-[3px]"
                style={{
                  background: tone.main,
                  color: tone.on,
                  boxShadow: `0 5px 0 0 ${tone.deep}`,
                }}
              >
                {tr('celebrate.great')}🌟
              </motion.button>
            ) : (
              <div className="h-[52px]" />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
