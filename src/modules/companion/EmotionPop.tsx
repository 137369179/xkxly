/**
 * EmotionPop —— 情绪陪伴全局弹层
 * ------------------------------------------------------------------
 * 当孩子在数学/逻辑/计数练习中连续答错 3 次（wrongStreak ≥ 3），
 * store 会自动设置 comfortingActive = true，本组件监听该状态弹出全屏安抚。
 *
 * 流程：
 *   comfortingActive=true → 弹出遮罩 → 调用 companionComfortTask 流式获取安抚文本
 *   → AiAvatar mood="talking" + 流式文本展示 → 结束后显示"谢谢小茜"按钮
 *   → 点击按钮 → setComforting(false) + resetWrongStreak()
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { useAiStream } from '@/lib/ai/useAi';
import { companionComfortTask } from '@/lib/ai/tasks';
import { useStore } from '@/store/useStore';
import { TONE_STYLE } from '@/lib/tones';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

export function EmotionPop() {
  const { t: tr } = useTranslation();
  const comfortingActive = useStore((s) => s.comfortingActive);
  const setComforting = useStore((s) => s.setComforting);
  const resetWrongStreak = useStore((s) => s.resetWrongStreak);
  const stream = useAiStream();
  const triggeredRef = useRef(false);

  // 当 comfortingActive 变为 true 时自动启动安抚流
  useEffect(() => {
    if (comfortingActive && !triggeredRef.current) {
      triggeredRef.current = true;
      stream.run(
        companionComfortTask('数学', 3, '连续答错'),
      );
    }
    if (!comfortingActive) {
      triggeredRef.current = false;
      stream.reset();
    }
  }, [comfortingActive]); // intentional: reset on comforting toggle

  const handleClose = () => {
    sfxTap();
    setComforting(false);
    resetWrongStreak();
  };

  const tone = TONE_STYLE.purple;
  const showButton = stream.status === 'done';

  return (
    <AnimatePresence>
      {comfortingActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="w-full max-w-md rounded-[2rem] border-4 border-white bg-white p-6 shadow-2xl"
          >
            {/* 头像区 */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <AiAvatar
                size={64}
                mood={stream.status === 'streaming' || stream.status === 'done' ? 'talking' : 'thinking'}
              />
              <span className="text-2xl">💜</span>
            </div>

            {/* 标题 */}
            <h2 className="text-center text-xl font-extrabold mb-3" style={{ color: tone.deep }}>
              {tr('emotion.companionTitle')}
            </h2>

            {/* 内容区 */}
            <div
              className="rounded-2xl p-4 mb-4 min-h-[100px]"
              style={{ background: tone.soft }}
            >
              {stream.status === 'thinking' && (
                <p className="text-base font-bold text-ink-soft text-center pt-4">
                  {tr('emotion.thinkingComfort')}
                </p>
              )}
              {(stream.status === 'streaming' || stream.status === 'done') && (
                <p className="text-lg leading-8 font-medium whitespace-pre-wrap" style={{ color: '#5c2e3d' }}>
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

            {/* 按钮区 */}
            <div className="flex justify-center">
              {showButton ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={handleClose}
                  className="min-h-[52px] min-w-[160px] rounded-full px-8 text-lg font-extrabold transition active:translate-y-[3px]"
                  style={{
                    background: tone.main,
                    color: tone.on,
                    boxShadow: `0 5px 0 0 ${tone.deep}`,
                  }}
                >
                  {tr('emotion.thanks')} 💕
                </motion.button>
              ) : (
                <div className="h-[52px]" />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
