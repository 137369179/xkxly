/**
 * AI 个性化学习路径 🗺️
 * ------------------------------------------------------------------
 * 三层路径：今日焦点 → 本周目标 → 教练点评
 * 本地引擎 buildLearningPath 永远可用；AI 增强叙事（path.narrate / path.weekly / path.coach）
 * 失败静默降级到本地文案，绝不让孩子看到错误。
 */
import { useMemo } from 'react';
import { useProgress } from '@/store/useStore';
import { buildLearningPath } from '@/lib/learningPath';
import { pathNarrateTask, pathWeeklyTask, pathCoachTask } from '@/lib/ai/tasks';
import { useAiTask } from '@/lib/ai/useAi';
import { AiAvatar, AiDots } from '@/components/ai';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

/* ------------------------------------------------------------------ */
/* 今日焦点                                                            */
/* ------------------------------------------------------------------ */

function FocusCard() {
  const { t: tr } = useTranslation();
  const p = useProgress();
  const path = useMemo(() => buildLearningPath(p), [p]);

  // AI 叙事增强（失败降级本地文案）
  const narrate = useAiTask<{ text: string }>(() => pathNarrateTask(p), true);

  const prioStyle: Record<string, string> = {
    high: 'bg-candy-orange-soft text-candy-orange-deep',
    medium: 'bg-candy-yellow-soft text-candy-yellow-deep',
    low: 'bg-candy-blue-soft text-candy-blue-deep',
  };
  const prioLabel: Record<string, string> = { high: tr('path.prioHigh'), medium: tr('path.prioMedium'), low: tr('path.prioLow') };

  return (
    <Panel>
      <PanelTitle emoji="🎯" title={tr('path.focusTitle')} subtitle={tr('path.focusSub')} tone="orange" />
      {narrate.result?.data?.text && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl bg-candy-purple-soft/60 p-3">
          <AiAvatar size={36} mood={narrate.loading ? 'thinking' : 'talking'} />
          <p className="pt-1 text-sm font-bold leading-relaxed text-ink">{narrate.result.data.text}</p>
        </div>
      )}
      {narrate.loading && !narrate.result && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-candy-purple-soft/60 p-3 text-sm font-bold text-ink-soft">
          <AiAvatar size={36} mood="thinking" />
          <span className="inline-flex items-center gap-1">
            <AiDots /> {tr('path.thinkingProgress')}
          </span>
        </div>
      )}
      {path.focus.length === 0 ? (
        <p className="py-3 text-center text-sm font-bold text-ink-soft">
          {tr('path.allDone')}
        </p>
      ) : (
        <ul className="space-y-2">
          {path.focus.map((f) => (
            <li
              key={f.skill}
              className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 transition hover:bg-white"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-candy-orange-soft text-lg">
                {f.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-extrabold text-ink">{f.label}</div>
                <div className="truncate text-xs font-bold text-ink-soft">{f.reason}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-extrabold', prioStyle[f.priority])}>
                  {prioLabel[f.priority]}
                </span>
                <span className="text-[10px] font-bold text-ink-soft">{f.estMinutes} {tr('path.minutes')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* 本周目标                                                            */
/* ------------------------------------------------------------------ */

function WeeklyCard() {
  const { t: tr } = useTranslation();
  const p = useProgress();
  const path = useMemo(() => buildLearningPath(p), [p]);

  // AI 周计划文案（失败降级）
  const weekly = useAiTask<{ lines: string[] }>(() => pathWeeklyTask(p), true);
  const lines = weekly.result?.data?.lines ?? path.weekly.map((g) => `${g.emoji} ${g.label}：${g.target}`);

  return (
    <Panel>
      <PanelTitle emoji="🗺️" title={tr('path.weeklyTitle')} subtitle={tr('path.weeklySub')} tone="blue" />
      {weekly.loading && !weekly.result ? (
        <div className="flex items-center gap-2 py-3 text-sm font-bold text-ink-soft">
          <AiDots /> {tr('path.thinkingWeekly')}
        </div>
      ) : (
        <ol className="space-y-2">
          {lines.slice(0, 4).map((line, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/70 p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-candy-blue-soft text-xs font-extrabold text-candy-blue-deep">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm font-bold leading-relaxed text-ink">{line}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* 教练点评（家长端）                                                  */
/* ------------------------------------------------------------------ */

function CoachCard() {
  const { t: tr } = useTranslation();
  const p = useProgress();
  const path = useMemo(() => buildLearningPath(p), [p]);
  const coach = useAiTask<{ text: string }>(() => pathCoachTask(p), true);
  const text = coach.result?.data?.text ?? path.coach.suggestion;

  return (
    <Panel>
      <PanelTitle emoji="🧑‍🏫" title={tr('path.coachTitle')} subtitle={tr('path.coachSub')} tone="green" />
      {coach.loading && !coach.result ? (
        <div className="flex items-center gap-2 py-3 text-sm font-bold text-ink-soft">
          <AiDots /> {tr('path.thinkingCoach')}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-2xl bg-candy-green-soft/60 p-3 text-sm font-bold leading-relaxed text-ink">
            {text}
          </p>
          {(path.coach.strengths.length > 0 || path.coach.gaps.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {path.coach.strengths.slice(0, 3).map((s) => (
                <span key={s} className="rounded-full bg-candy-green-soft px-3 py-1 text-xs font-extrabold text-candy-green-deep">
                  💪 {s}
                </span>
              ))}
              {path.coach.gaps.slice(0, 3).map((g) => (
                <span key={g} className="rounded-full bg-candy-orange-soft px-3 py-1 text-xs font-extrabold text-candy-orange-deep">
                  📌 {g}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* 主组件                                                              */
/* ------------------------------------------------------------------ */

export function LearningPath() {
  return (
    <div className="space-y-4">
      <FocusCard />
      <WeeklyCard />
      <CoachCard />
    </div>
  );
}

/** 教练点评单卡（家长中心复用） */
export function LearningCoach() {
  return <CoachCard />;
}
