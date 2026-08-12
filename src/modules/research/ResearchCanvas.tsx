import { useMemo } from 'react';
import { ExploreSlot } from '@/modules/research/components/ExploreSlot';
import { CandyButton } from '@/components/ui/Button';
import { densityFor } from '@/lib/research/researchTopics';
import type { ResearchTopic } from '@/lib/research/types';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 研究模式 · 探索画布（D3 / F18 渐进揭示壳层）
 * ------------------------------------------------------------------
 * 布局（UX 规格 §2.3）：
 *   ① 媒体互动区（ExploreSlot，占屏 55–70%，零 props 复用）
 *   ② 「我的发现」采集条（F19：行为激励——奖励探索本身，不奖励对错）
 *   ③ 底部固定操作条：核心按钮「还有吗？」（F18 揭示权归孩子）
 *      + 「我想知道更多 💡」（REQUEST_CARD）+「换主题」（CHANGE_TOPIC）
 *
 * F18 护栏（ADR-002）：
 *   - 首屏只渲染核心层（density.core 条事实）；「还有吗？」每次 +extended 条，
 *     至 maxReveal 封顶；核心层位置不位移（锚点稳定）
 *   - 触发权归孩子：无自动展开、无倒计时
 *   - 揭示不发放物质奖励（ADR-002⑥）
 *
 * 事件委托（C-4）：exploreActions 计数在 ExploreSlot 包装层完成，
 * 本组件不直接监听媒体区内部。
 */

interface ResearchCanvasProps {
  topic: ResearchTopic;
  ageRange: string;
  /** 当前揭示层数（1 = 仅核心层） */
  revealLevel: number;
  /** 探索行为次数（展示用） */
  exploreActions: number;
  onRevealMore: () => void;
  onRequestCard: () => void;
  onChangeTopic: () => void;
  onExploreAction: () => void;
}

/** 展示层模拟：核心层 = 主题首屏注解，扩展层 = 追加事实（均由 i18n 提供） */
function FactLines({ topicId, count }: { topicId: string; count: number }) {
  const { t } = useTranslation();
  const lines = useMemo(
    () =>
      Array.from({ length: Math.max(0, Math.min(count, 5)) }, (_, i) =>
        t(`research.explore.${topicId}.fact${i}`),
      ),
    [topicId, count, t],
  );
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => (
        <p key={i} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-ink-soft shadow-sm">
          {line}
        </p>
      ))}
    </div>
  );
}

export function ResearchCanvas({
  topic,
  ageRange,
  revealLevel,
  exploreActions,
  onRevealMore,
  onRequestCard,
  onChangeTopic,
  onExploreAction,
}: ResearchCanvasProps) {
  const { t } = useTranslation();
  const density = densityFor(ageRange);
  const coreCount = density.core;
  const extendedPerReveal = density.extended;
  // 当前已揭示的事实条数：核心 + 已揭示扩展层数 × 增量（封顶 maxReveal × extended）
  const visibleFacts = Math.min(coreCount + (revealLevel - 1) * extendedPerReveal, density.maxReveal * extendedPerReveal);
  const canRevealMore = revealLevel < density.maxReveal;

  return (
    <div className="flex flex-col gap-3">
      {/* ① 媒体互动区 */}
      <ExploreSlot slotKey={topic.exploreSlot} onExploreAction={onExploreAction} />

      {/* ② 「我的发现」采集条（F19 行为激励） */}
      <div className="flex items-center justify-between rounded-2xl bg-soft px-4 py-2">
        <span className="text-sm font-bold text-ink-soft">
          {t('research.explore.discoveryLabel')} {exploreActions}
        </span>
        <span className="text-xs text-ink-soft/70">{t('research.explore.behaviorHint')}</span>
      </div>

      {/* ③ F18 渐进揭示区（锚点稳定：核心层始终在顶部不位移） */}
      <div className="flex flex-col gap-2">
        <FactLines topicId={topic.id} count={visibleFacts} />
        {canRevealMore && (
          <CandyButton tone="purple" size="lg" onClick={onRevealMore} className="w-full">
            {t('research.explore.more')}
          </CandyButton>
        )}
      </div>

      {/* ④ 底部操作条 */}
      <div className="flex gap-2">
        <CandyButton tone="pink" size="lg" onClick={onRequestCard} className="flex-1">
          {t('research.explore.requestCard')}
        </CandyButton>
        <CandyButton tone="green" size="md" onClick={onChangeTopic} variant="ghost">
          {t('research.explore.changeTopic')}
        </CandyButton>
      </div>
    </div>
  );
}
