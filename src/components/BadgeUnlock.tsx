import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { BADGE_MAP } from '@/data/badges';
import { TONE_STYLE } from '@/lib/tones';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { celebrateBig } from '@/lib/celebrate';
import { sfxWin } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useAiStream } from '@/lib/ai/useAi';
import { praiseTask } from '@/lib/ai/tasks';
import { AiPanel } from '@/components/ai';
import { useTranslation } from '@/i18n/useTranslation';

/** 全局徽章解锁弹窗：监听 store 中的 pendingBadges 队列 */
export function BadgeUnlock() {
  const { t: tr } = useTranslation();
  const pending = useStore((s) => s.pendingBadges);
  const consume = useStore((s) => s.consumeBadge);
  const currentId = pending[0]!!
  const badge = currentId ? BADGE_MAP.get(currentId) : undefined;

  useEffect(() => {
    if (!badge) return;
    celebrateBig();
    sfxWin();
    const t = setTimeout(() => {
      void speak(`恭喜你获得${badge.name}徽章！`, { rate: 0.85, module: 'praise' });
    }, 420);
    return () => clearTimeout(t);
  }, [badge]);

  // 徽章解锁时，小智顺带夸一句（AI 挂了静默走本地兜底，不打断庆祝）
  const praise = useAiStream(badge ? praiseTask(`获得${badge.name}徽章：${badge.desc}`) : undefined);

  if (!badge) return null;
  const t = TONE_STYLE[badge.tone]!

  return (
    <Modal open onClose={consume} className="max-w-md text-center">
      <p className="text-base font-extrabold tracking-widest text-candy-orange">🎊 {tr('badge.unlockNew')} 🎊</p>

      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
        className="mx-auto my-5 grid h-32 w-32 place-items-center rounded-full text-7xl"
        style={{ background: t.soft, boxShadow: `0 0 0 8px ${t.main}33, 0 12px 30px -8px ${t.main}` }}
      >
        <span className="animate-wiggle">{badge.emoji}</span>
      </motion.div>

      <h3 className="text-3xl font-extrabold" style={{ color: t.deep }}>
        {badge.name}
      </h3>
      <p className="mt-1.5 text-base font-semibold text-ink-soft">{badge.desc}</p>

      <AiPanel state={praise} tone={badge.tone} title={tr('badge.xiaozhiPraise')} compact />

      <CandyButton tone={badge.tone} size="lg" className="mt-6" fullWidth onClick={consume}>
        {tr('badge.takeIt')} 🎁
      </CandyButton>
    </Modal>
  );
}
