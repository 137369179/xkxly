/**
 * 智能推荐练习 🎯 (N7)
 * 激活 recommend.practice AI 场景，分析薄弱点生成练习建议，
 * 支持一键跳转到对应练习页面
 */
import { useMemo } from 'react';
import { useProgress } from '@/store/useStore';
import { dueSkills, weakSkills, skillLabel } from '@/lib/srs';
import { sfxTap } from '@/lib/sfx';
import { navigate } from '@/lib/router';
import { AiButton } from '@/components/ai/AiButton';
import { useAiStream } from '@/lib/ai/useAi';
import type { StreamTask } from '@/lib/ai/tasks';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface RecItem {
  skill: string;
  label: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  navigate?: () => void;
}

function getRecPriority(lv: number, due: boolean): 'high' | 'medium' | 'low' {
  if (due && lv <= 1) return 'high';
  if (due) return 'medium';
  if (lv <= 2) return 'medium';
  return 'low';
}

export function SmartRecommend() {
  const { t } = useTranslation();
  const p = useProgress();
  const ai = useAiStream();

  const runAi = () => {
    const task: StreamTask = {
      scene: 'recommend.practice',
      messages: [{ role: 'user', content: '请根据我的学习情况，推荐适合的练习' }],
      fallback: t('smart.keepPracticing'),
      title: t('smart.aiSuggestion'),
      hint: t('smart.analyzing'),
    };
    ai.run(task);
  };

  const recommendations = useMemo((): RecItem[] => {
    const recs: RecItem[] = [];
    const due = dueSkills(p, 8);
    for (const ds of due.slice(0, 4)) {
      const label = skillLabel(ds);
      const m = p.mastery[ds];
      recs.push({
        skill: ds,
        label: `${label} ${t('smart.pendingReview')}`,
        reason: t('smart.dueDaysAgo', { days: m?.interval ?? 0, level: m?.lv ?? 0 }),
        priority: getRecPriority(m?.lv ?? 0, true),
      });
    }
    const weak = weakSkills(p, 4);
    for (const ws of weak) {
      if (!recs.some(r => r.skill === ws.skill)) {
        const label = skillLabel(ws.skill);
        const errorRate = ws.m.ng / Math.max(1, ws.m.ok + ws.m.ng);
        recs.push({
          skill: ws.skill,
          label: `${label} ${t('smart.weak')}`,
          reason: t('smart.errorRate', { rate: Math.round(errorRate * 100) }),
          priority: getRecPriority(ws.m.lv, false),
        });
      }
    }
    // 补充一些未学但该推进的内容
    const hanziCount = Object.keys(p.mastery).filter(k => k.startsWith('hanzi:')).length;
    if (hanziCount < 10) {
      recs.push({ skill: 'hanzi:mixed', label: t('smart.hanziPractice'), reason: t('smart.dailyHanzi'), priority: 'medium' });
    }
    return recs.slice(0, 6).sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }, [p, t]);

  const navigateTo = (skill: string) => {
    sfxTap();
    if (skill.startsWith('hanzi:')) navigate('hanzi');
    else if (skill.startsWith('pinyin:')) navigate('pinyin');
    else if (skill.startsWith('word:')) navigate('words');
    else if (skill.startsWith('poem:')) navigate('poems');
    else if (skill.startsWith('letter:')) navigate('letters');
    else if (skill.startsWith('number:')) navigate('numbers');
    else if (skill.startsWith('logic:')) navigate('logic');
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('smart.title')}</h3>
      <p className="mb-4 text-center text-xs font-bold text-ink-soft">
        {t('smart.subtitle')}
      </p>

      {recommendations.length > 0 && (
        <div className="mb-4 space-y-2">
          {recommendations.map(rec => (
            <button
              key={rec.skill}
              onClick={() => navigateTo(rec.skill)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl p-3 text-left shadow-sm transition-all hover:scale-[1.01]',
                rec.priority === 'high' ? 'bg-candy-pink-soft' :
                rec.priority === 'medium' ? 'bg-candy-orange-soft' : 'bg-white'
              )}
            >
              <span className={cn(
                'text-lg',
                rec.priority === 'high' ? 'text-candy-pink-deep' :
                rec.priority === 'medium' ? 'text-candy-orange-deep' : 'text-ink-muted'
              )}>
                {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
              </span>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-ink">{rec.label}</div>
                <div className="text-[10px] font-medium text-ink-muted">{rec.reason}</div>
              </div>
              <span className="text-ink-muted">→</span>
            </button>
          ))}
        </div>
      )}

      {recommendations.length === 0 && (
        <p className="text-center text-sm font-bold text-ink-muted">{t('smart.noRecYet')}</p>
      )}

      {/* AI 智能建议 */}
      <div className="mt-4 border-t border-ink-muted/15 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-soft">{t('smart.aiSuggestion')}</span>
          <AiButton loading={ai.status === 'thinking' || ai.status === 'streaming'} onClick={runAi} />
        </div>
        {ai.status === 'thinking' && (
          <div className="mt-2 text-center text-xs font-bold text-ink-muted animate-pulse">
            {t('smart.analyzing')}
          </div>
        )}
        {ai.text && (
          <div className="mt-3 rounded-xl bg-candy-purple-soft p-3 text-sm font-bold text-candy-purple-deep leading-relaxed">
            {ai.text}
          </div>
        )}
        {ai.status === 'done' && !ai.text && (
          <p className="mt-2 text-xs font-medium text-ink-muted">
            {ai.fallback || t('smart.keepPracticing')}
          </p>
        )}
      </div>
    </div>
  );
}
