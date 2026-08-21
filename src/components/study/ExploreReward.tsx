/**
 * 探索型学习组件的「完成打卡」游戏化按钮（可复用原语）
 * ------------------------------------------------------------------
 * 任何「探索/认知型」子组件（字源演变、部件拆解、部首浏览、字母精学、
 * 数字描红……）只需在末尾渲染一行 <ExploreReward rewardKey="..." />，
 * 即可获得：
 *   - 积分：完成即把星星写入全局货币（useStore.addStars）→ 自动驱动 star-* 成就徽章；
 *   - 即时反馈：answerCorrect 触发音效 + 彩带 + 场景表扬（正确强化）；
 *   - 奖励解锁：已探索状态持久化，刷新后仍记为「已探索」（成长目标感）；
 *   - 儿童审美：糖果色按钮 + 星星动效，符合低龄审美偏好。
 *
 * 严格复用既有基础设施（useStore / lib/feedback / lib/sfx / lib/celebrate），
 * 不新增依赖、不改写既有业务 schema。
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore } from '@/store/useStore';
import { answerCorrect } from '@/lib/feedback';
import type { PraiseScene } from '@/lib/praise';
import { sfxStar } from '@/lib/sfx';
import { claimExplore, isExplored, DEFAULT_EXPLORE_STARS } from '@/lib/exploreReward';
import type { Tone } from '@/lib/tones';

interface ExploreRewardProps {
  /** 唯一标识，建议 `模块-功能`，例如 `hanzi-evolve` / `letter-wall` */
  rewardKey: string;
  /** 完成授予的星星数，默认 2 */
  stars?: number;
  /** 表扬场景，影响 answerCorrect 的回话口径；识字/字母/数学可分别传 hanzi/letter/number */
  scene?: PraiseScene;
  /** 按钮色调，默认橙色（星星感） */
  tone?: Tone;
}

export function ExploreReward({
  rewardKey,
  stars = DEFAULT_EXPLORE_STARS,
  scene = 'general',
  tone = 'orange',
}: ExploreRewardProps) {
  const { t } = useTranslation();
  const [claimed, setClaimed] = useState<boolean>(() => isExplored(rewardKey));

  const handleClaim = () => {
    if (claimed) return;
    sfxStar();
    useStore.getState().addStars(stars);
    answerCorrect(scene); // 音效 + 彩带 + 场景表扬（即时正向强化）
    claimExplore(rewardKey);
    setClaimed(true);
  };

  if (claimed) {
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-candy-green-soft px-4 py-2 text-sm font-extrabold text-candy-green-deep"
      >
        ✅ {t('exploreReward.claimed', { n: stars })}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="mt-3 flex justify-center"
    >
      <CandyButton tone={tone} size="lg" onClick={handleClaim}>
        🌟 {t('exploreReward.claim', { n: stars })}
      </CandyButton>
    </motion.div>
  );
}
