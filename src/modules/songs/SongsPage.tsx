import { useMemo, useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useMastery } from '@/store/useStore';
import { sfxTap } from '@/lib/sfx';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { NURSERY_RHYMES, RHYME_MAP, THEME_LABEL, type RhymeTheme } from '@/data/nurseryRhymes';
import { useTranslation } from '@/i18n/useTranslation';
import RhymePlayer from './RhymePlayer';
import RecommendCard from './RecommendCard';
import RhymeCard from './RhymeCard';

export default function SongsPage() {
  const { t } = useTranslation();
  const mastery = useMastery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RhymeTheme | 'all'>('all');

  const selected = selectedId ? RHYME_MAP.get(selectedId) : null;

  // 已学会集合
  const learnedSet = useMemo(() => {
    const s = new Set<string>();
    for (const k of Object.keys(mastery)) {
      if (k.startsWith('rhyme:') && mastery[k]!.lv >= 1) {
        s.add(k.replace('rhyme:', ''));
      }
    }
    return s;
  }, [mastery]);

  if (selected) {
    return <RhymePlayer rhyme={selected} onBack={() => setSelectedId(null)} />;
  }

  const filtered = filter === 'all' ? NURSERY_RHYMES : NURSERY_RHYMES.filter((r) => r.theme === filter);
  const learnedCount = NURSERY_RHYMES.filter((r) => learnedSet.has(r.id)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="storybook"
        title={t('song.pageTitle')}
        subtitle={t('song.pageSubtitle', { count: NURSERY_RHYMES.length })}
        tone="pink"
      />

      {/* 今日推荐卡片 */}
      <RecommendCard onPick={(id) => { sfxTap(); setSelectedId(id); }} />

      {/* 3D 羊毛毡童话故事小剧场 */}
      <Panel className="border-2 border-pink-300 bg-gradient-to-r from-pink-100 via-rose-50 to-purple-100 p-5 shadow-fluffy overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <img
            src="/icons/felt_storybook.jpg"
            alt="3D Felt Storybook"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="w-32 h-32 shrink-0 rounded-2xl object-cover border-4 border-white shadow-md transform hover:scale-105 transition-transform"
          />
          <div className="flex-1 text-center sm:text-left">
            <span className="inline-block rounded-full bg-pink-500 px-3 py-0.5 text-xs font-black text-white">
              {t('song.specialEpisode')}
            </span>
            <h3 className="mt-1 text-xl font-black text-pink-900">{t('song.feltBookTitle')}</h3>
            <p className="mt-1 text-xs font-bold text-pink-700">
              {t('song.feltBookDesc')}
            </p>
            <div className="mt-3 flex justify-center sm:justify-start">
              <CandyButton
                tone="pink"
                size="sm"
                onClick={() => {
                  sfxTap();
                  if (NURSERY_RHYMES[0]) setSelectedId(NURSERY_RHYMES[0]!.id);
                }}
              >
                {t('song.startRead')}
              </CandyButton>
            </div>
          </div>
        </div>
      </Panel>

      {/* 学习统计 */}
      <Panel className="!py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FluffyIcon type="storybook" size="sm" />
            <div>
              <div className="text-base font-extrabold text-ink">
                {t('song.learnedCount', { learned: learnedCount, total: NURSERY_RHYMES.length })}
              </div>
              <div className="text-xs font-bold text-ink-soft">{t('song.learnedTip')}</div>
            </div>
          </div>
          <ProgressBar value={learnedCount} max={NURSERY_RHYMES.length} tone="pink" showLabel={false} />
        </div>
      </Panel>

      {/* 主题筛选 */}
      <div className="flex flex-wrap gap-2">
        <CandyButton
          tone={filter === 'all' ? 'pink' : 'blue'}
          variant={filter === 'all' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => {
            sfxTap();
            setFilter('all');
          }}
        >
          {t('song.filterAll')}
        </CandyButton>
        {(Object.keys(THEME_LABEL) as RhymeTheme[]).map((theme) => (
          <CandyButton
            key={theme}
            tone={filter === theme ? 'pink' : 'blue'}
            variant={filter === theme ? 'solid' : 'soft'}
            size="sm"
            onClick={() => {
              sfxTap();
              setFilter(theme);
            }}
          >
            {THEME_LABEL[theme]!.emoji} {THEME_LABEL[theme]!.label}
          </CandyButton>
        ))}
      </div>

      {/* 儿歌卡片网格 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {filtered.map((r, i) => (
          <RhymeCard
            key={r.id}
            rhyme={r}
            index={i}
            learned={learnedSet.has(r.id)}
            onClick={() => {
              sfxTap();
              setSelectedId(r.id);
            }}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <Panel className="text-center">
          <p className="py-6 text-sm font-bold text-ink-soft">{t('song.themeEmpty')}</p>
        </Panel>
      )}
    </div>
  );
}
