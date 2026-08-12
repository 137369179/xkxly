import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useProgress } from '@/store/useStore';
import { useAiTask } from '@/lib/ai/useAi';
import { recommendPracticeTask } from '@/lib/ai/tasks';
import { weakSkills, dueSkills, skillLabel, subjectTone } from '@/lib/srs';
import { TONE_STYLE } from '@/lib/tones';
import { navigate } from '@/lib/router';
import { sfxTap } from '@/lib/sfx';
import { Panel, PanelTitle } from '@/components/ui/Card';
import POEMS from '@/data/poems';
import type { RecommendPractice } from '@/lib/ai/prompts';
import { useTranslation } from '@/i18n/useTranslation';

const poemTitle = (id: string) => POEMS.find((p) => p.id === id)?.title;

interface RecommendItem {
  skill: string;
  reason: string;
  tone: keyof typeof TONE_STYLE;
}

/**
 * AI 推荐卡片：合并本地推荐 + AI 增强
 * 本地推荐即时渲染（weakSkills + dueSkills），AI 异步增强
 */
export default function AiRecommendCard() {
  const { t: tr } = useTranslation();
  const p = useProgress();

  // 本地推荐：即时计算
  const localRecs = useMemo(() => {
    const recs: RecommendItem[] = [];

    // 1. 薄弱知识点
    const weak = weakSkills(p, 3);
    for (const { skill } of weak) {
      recs.push({
        skill,
        reason: '错得比较多，再练练',
        tone: subjectTone(skill),
      });
    }

    // 2. 到期复习
    const due = dueSkills(p, Date.now(), 5);
    for (const skill of due) {
      if (recs.length >= 4) break;
      if (!recs.some((r) => r.skill === skill)) {
        recs.push({
          skill,
          reason: '到时间复习啦',
          tone: subjectTone(skill),
        });
      }
    }

    return recs.slice(0, 2);
  }, [p]);

  // AI 增强：异步调用
  const { result, loading } = useAiTask<RecommendPractice>(
    () => recommendPracticeTask(p),
    true,
  );

  // 合并推荐：AI 结果优先，本地补充
  const finalRecs = useMemo<RecommendItem[]>(() => {
    const aiItems = result?.data?.items ?? [];
    const merged: RecommendItem[] = [];

    for (const item of aiItems) {
      if (merged.length >= 2) break;
      merged.push({
        skill: item.skill,
        reason: item.reason,
        tone: subjectTone(item.skill),
      });
    }

    // 本地补充到 2 张
    for (const local of localRecs) {
      if (merged.length >= 2) break;
      if (!merged.some((r) => r.skill === local.skill)) {
        merged.push(local);
      }
    }

    // 如果 AI 没返回且本地也没有，至少展示本地
    if (merged.length === 0) return localRecs;
    return merged;
  }, [result, localRecs]);

  if (finalRecs.length === 0 && !loading) return null;

  return (
    <Panel>
      <PanelTitle emoji="🤖" title={tr('home.aiRecommendTitle')} tone="purple" />
      {result?.data?.greeting && (
        <p className="mb-3 text-sm font-bold text-ink-soft">{result.data.greeting}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loading && finalRecs.length === 0
          ? // 骨架屏
            [0, 1].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="h-24 animate-pulse rounded-2xl bg-white/50"
              />
            ))
          : finalRecs.map((item, i) => {
              const t = TONE_STYLE[item.tone];
              return (
                <motion.button
                  key={`rec-${i}-${item.skill}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 220, damping: 22 }}
                  onClick={() => {
                    sfxTap();
                    navigateToSkill(item.skill);
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="no-select flex items-center gap-3 rounded-2xl p-4 text-left shadow-candy-sm border-2 border-white/90 min-h-[88px]"
                  style={{ background: `linear-gradient(135deg, ${t.soft} 0%, #ffffff 80%)` }}
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold"
                    style={{ background: t.main, color: t.on }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-extrabold" style={{ color: t.deep }}>
                      {skillLabel(item.skill, poemTitle)}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs font-bold text-ink-soft">
                      {item.reason}
                    </div>
                  </div>
                  <span className="text-lg" style={{ color: t.deep }}>→</span>
                </motion.button>
              );
            })}
      </div>

      {result?.fallback && (
        <p className="mt-2 text-xs text-ink-soft">{tr('home.aiOfflineTip')}</p>
      )}
    </Panel>
  );
}

/** 根据知识点 skill id 跳转到对应模块 */
function navigateToSkill(skill: string): void {
  const [prefix] = skill.split(':');
  const routeMap: Record<string, Parameters<typeof navigate>[0]> = {
    letter: 'letters',
    number: 'numbers',
    hanzi: 'hanzi',
    pinyin: 'pinyin',
    word: 'words',
    poem: 'poems',
    math: 'numbers',
    logic: 'logic',
  };
  const route = routeMap[prefix!] ?? 'today';
  navigate(route);
}
