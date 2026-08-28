import { useMemo } from 'react';
import { CandyButton } from '@/components/ui/Button';
import { TONE_STYLE } from '@/lib/tones';
import { RESEARCH_TOPICS } from '@/lib/research/researchTopics';
import { topicResearchState, launchSummary, MAX_MASTERY } from '@/lib/research/launchHub';
import { useDiscoveries, useMastery, useResearchNotes, useResearchStats } from '@/store/useStore';
import type { Progress } from '@/types';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 研究出发台（Sprint 5 · 连续性入口）
 * ------------------------------------------------------------------
 * 把扁平选题网格升级为「看得见成长」的出发台：
 *   - 每个主题展示 SRS 掌握度进度条（CMML「精熟」可视化）
 *   - 已探索主题标「继续探索」、未探索标「开始探索」
 *   - 笔记/精通状态以小图标指示
 *   - 顶部总览胶囊：已探索数 / 收藏数 / 笔记数
 * 数据全部来自既有 progress（launchHub 纯派生），不新增存储字段。
 *
 * 铁律：C7 文案全走 t()，本文件零中文字面量。
 */
interface ResearchLaunchHubProps {
  onSelectTopic: (topicId: string) => void;
  onOpenGallery: () => void;
}

function MasteryBar({ lv, tone }: { lv: number; tone: keyof typeof TONE_STYLE }) {
  const { main, soft } = TONE_STYLE[tone];
  return (
    <div className="flex gap-1" role="img" aria-label={`mastery ${lv} of ${MAX_MASTERY}`}>
      {Array.from({ length: MAX_MASTERY }, (_, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors"
          style={{ background: i < lv ? main : soft }}
        />
      ))}
    </div>
  );
}

export function ResearchLaunchHub({ onSelectTopic, onOpenGallery }: ResearchLaunchHubProps) {
  const { t } = useTranslation();
  const researchStats = useResearchStats();
  const discoveries = useDiscoveries();
  const researchNotes = useResearchNotes();
  const mastery = useMastery();

  const summary = useMemo(
    () => launchSummary({ researchStats, discoveries, researchNotes } as Progress),
    [researchStats, discoveries, researchNotes],
  );
  const stateP = useMemo(
    () => ({ researchStats, researchNotes, mastery }) as Progress,
    [researchStats, researchNotes, mastery],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 标题 + 总览胶囊 */}
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-ink">{t('research.launch.title')}</h2>
          <p className="text-xs text-ink-soft">{t('research.launch.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-candy-purple-deep">
            🌟 {t('research.launch.summaryExplored', { explored: String(summary.exploredCount), total: String(summary.totalTopics) })}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-candy-yellow-deep">
            ⭐ {t('research.launch.summaryDiscovery', { n: String(summary.discoveryCount) })}
          </span>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-blue-600">
            📝 {t('research.launch.summaryNote', { n: String(summary.noteCount) })}
          </span>
        </div>
      </div>

      {/* 主题网格：掌握度 + 继续探索 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {RESEARCH_TOPICS.map((tp) => {
          const st = topicResearchState(stateP, tp.id);
          const { main, soft, deep, on } = TONE_STYLE[tp.tone];
          return (
            <button
              key={tp.id}
              onClick={() => onSelectTopic(tp.id)}
              className="flex flex-col gap-2 rounded-2xl p-4 text-left shadow-sm transition-transform hover:scale-[1.03] active:scale-95"
              style={{ background: soft }}
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl">{tp.emoji}</span>
                <span className="text-base leading-none">
                  {st.mastered ? '🏆' : st.hasNote ? '📝' : ''}
                </span>
              </div>
              <div>
                <div className="text-base font-extrabold" style={{ color: deep }}>
                  {t(`${tp.i18nKey}.label`)}
                </div>
                <div className="text-xs text-ink-soft">{t(`${tp.i18nKey}.desc`)}</div>
              </div>

              <MasteryBar lv={st.masteryLv} tone={tp.tone} />

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-soft">
                  {st.explored
                    ? t('research.launch.mastery', { n: String(st.masteryLv) })
                    : t('research.launch.notStarted')}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-extrabold"
                  style={st.explored ? { background: main, color: on } : { background: '#FFFFFF', color: deep }}
                >
                  {st.explored ? t('research.launch.continue') : t('research.launch.start')} ▶
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 收藏入口 */}
      <CandyButton tone="orange" size="md" variant="ghost" className="self-start" onClick={onOpenGallery}>
        ⭐ {t('research.gallery.entry')}
      </CandyButton>
    </div>
  );
}
