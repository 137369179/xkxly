import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { BADGE_MAP } from '@/data/badges';
import { MEDAL_MAP, REWARD_META } from '@/data/medals';
import type { BadgeDef } from '@/types';
import { TONE_STYLE } from '@/lib/tones';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { celebrateBig } from '@/lib/celebrate';
import { sfxWin } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useAiStream } from '@/lib/ai/useAi';
import { praiseTask } from '@/lib/ai/tasks/report';
import { AiPanel } from '@/components/ai';
import { useTranslation } from '@/i18n/useTranslation';

/** 勋章图标：优先展示 AI 生成的图片资源，加载失败则回退到 emoji */
function MedalGlyph({ badge }: { badge: BadgeDef }) {
  const [imgOk, setImgOk] = useState(true);
  if (badge.image && imgOk) {
    return (
      <img
        src={badge.image}
        alt={badge.name}
        className="h-28 w-28 rounded-full object-cover shadow-inner"
        onError={() => setImgOk(false)}
      />
    );
  }
  return <span className="animate-wiggle">{badge.emoji}</span>;
}

/** 全局徽章解锁弹窗：监听 store 中的 pendingBadges 队列 */
export function BadgeUnlock() {
  const { t: tr } = useTranslation();
  const pending = useStore((s) => s.pendingBadges);
  const consume = useStore((s) => s.consumeBadge);
  const currentId = pending[0];
  const badge = currentId ? BADGE_MAP.get(currentId) : undefined;
  const medal = currentId ? MEDAL_MAP.get(currentId) : undefined;

  useEffect(() => {
    if (!badge) return;
    celebrateBig();
    sfxWin();
    const t = setTimeout(() => {
      void speak(`恭喜你获得${badge.name}勋章！`, { rate: 0.85, module: 'praise' });
    }, 420);
    return () => clearTimeout(t);
  }, [badge]);

  // 徽章解锁时，小茜顺带夸一句（AI 挂了静默走本地兜底，不打断庆祝）
  const praise = useAiStream(badge ? praiseTask(`获得${badge.name}勋章：${badge.desc}`) : undefined);

  if (!badge) return null;
  const t = TONE_STYLE[badge.tone] ?? TONE_STYLE.yellow;

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
        <MedalGlyph badge={badge} />
      </motion.div>

      <h3 className="text-3xl font-extrabold" style={{ color: t.deep }}>
        {badge.name}
      </h3>
      <p className="mt-1.5 text-base font-semibold text-ink-soft">{badge.desc}</p>

      {medal?.reward && (
        <div
          className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-extrabold shadow-sm"
          style={{ background: `${t.main}1f`, color: t.deep }}
        >
          🎁 奖励 {REWARD_META[medal.reward.type].emoji} {medal.reward.amount} {REWARD_META[medal.reward.type].label}
        </div>
      )}

      <AiPanel state={praise} tone={badge.tone} title={tr('badge.xiaozhiPraise')} compact />

      <CandyButton tone={badge.tone} size="lg" className="mt-6" fullWidth onClick={consume}>
        {tr('badge.takeIt')} 🎁
      </CandyButton>
    </Modal>
  );
}
