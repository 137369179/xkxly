import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore, useProgress } from '@/store/useStore';
import { navigate, type RouteId } from '@/lib/router';
import { stopSpeaking, speak } from '@/lib/speech';
import { sfxTap, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { TONE_STYLE } from '@/lib/tones';
import {
  NURSERY_RHYMES,
  RHYME_MAP,
  THEME_LABEL,
  type NurseryRhyme,
  type RhymeTheme,
} from '@/data/nurseryRhymes';
import type { Tone } from '@/lib/tones';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { FollowRead } from '@/components/FollowRead';
import { FillBlank } from './FillBlank';
import { BeatTap } from './BeatTap';
import { useAiStream, useAiTask } from '@/lib/ai/useAi';
import { useTranslation } from '@/i18n/useTranslation';
import { songRecommendTask, songExplainTask } from '@/lib/ai/tasks/song';

/** 判断儿歌是否为英文（用于切换朗读语言） */
function isEnglishRhyme(r: NurseryRhyme): boolean {
  return /[a-zA-Z]/.test(r.lyrics[0] ?? '');
}

/**
 * 把 NurseryRhyme 的 Tone 映射到 FollowRead/KaraokeReader 支持的 5 色。
 * 'yellow' / 'orange' 统一收敛到 'amber'（色系最接近）。
 */
function mapReaderTone(t: Tone): 'purple' | 'pink' | 'green' | 'amber' | 'blue' {
  if (t === 'yellow' || t === 'orange') return 'amber';
  return t;
}

/* ========================================================================
 * AI 歌词解读面板
 * ===================================================================== */
function SongExplainPanel({ rhyme, tone }: { rhyme: NurseryRhyme; tone: Tone }) {
  const { t: translate } = useTranslation();
  const t = TONE_STYLE[tone]!;
  const task = useMemo(() => songExplainTask(rhyme), [rhyme]);
  const { status, text, fallback, run, reset } = useAiStream();
  const [showExplain, setShowExplain] = useState(false);

  const handleToggle = () => {
    sfxTap();
    if (!showExplain) {
      setShowExplain(true);
      if (status === 'idle') {
        run(task);
      }
    } else {
      setShowExplain(false);
      reset();
      stopSpeaking();
    }
  };

  const handleSpeak = () => {
    sfxTap();
    if (text) {
      const lang = isEnglishRhyme(rhyme) ? 'en-US' : 'zh-CN';
      speak(text, { lang, rate: 0.8 });
    }
  };

  if (!showExplain) {
    return (
      <div className="text-center">
        <CandyButton tone={tone} variant="soft" size="sm" onClick={handleToggle}>
          {translate('song.aiExplainBtn')}
        </CandyButton>
      </div>
    );
  }

  return (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-lg"
            style={{ background: t.soft }}
          >
            🤖
          </span>
          <span className="text-base font-black" style={{ color: t.deep }}>
            {translate('song.aiExplainTitle')}
          </span>
        </div>
        <div className="flex gap-1.5">
          {text && status === 'done' && (
            <CandyButton tone={tone} variant="ghost" size="sm" onClick={handleSpeak}>
              {translate('song.listenShort')}
            </CandyButton>
          )}
          <CandyButton tone="purple" variant="ghost" size="sm" onClick={handleToggle}>
            ✕
          </CandyButton>
        </div>
      </div>

      {/* 内容区 */}
      <div
        className="min-h-[60px] rounded-xl p-3 text-sm font-bold leading-relaxed"
        style={{ background: t.soft, color: t.deep }}
      >
        {status === 'thinking' && (
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}>
            {translate('song.aiThinking')}
          </motion.span>
        )}
        {status === 'streaming' && (
          <span>{text}</span>
        )}
        {status === 'done' && (
          <span>{text}</span>
        )}
        {status === 'idle' && (
          <span className="text-ink-soft">{translate('song.aiIdleTip')}</span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-center gap-2">
        {status === 'idle' && (
          <CandyButton tone={tone} size="sm" onClick={() => run(task)}>
            {translate('song.startExplain')}
          </CandyButton>
        )}
        {(status === 'done' || status === 'error') && (
          <CandyButton tone={tone} variant="soft" size="sm" onClick={() => run(task)}>
            {translate('song.explainAgain')}
          </CandyButton>
        )}
        {fallback && status === 'done' && (
          <span className="text-xs text-ink-soft/60">{translate('song.localContent')}</span>
        )}
      </div>
    </Panel>
  );
}

/* ========================================================================
 * 今日推荐卡片
 * ===================================================================== */
function RecommendCard({ onPick }: { onPick: (id: string) => void }) {
  const { t: translate } = useTranslation();
  const progress = useProgress();
  const age = 5; // 默认 5 岁

  // 获取已学过的儿歌 id
  const learnedIds = useMemo(() => {
    const ids: string[] = [];
    for (const k of Object.keys(progress.mastery)) {
      if (k.startsWith('rhyme:') && progress.mastery[k]!.lv >= 1) {
        ids.push(k.replace('rhyme:', ''));
      }
    }
    return ids;
  }, [progress.mastery]);

  const hour = new Date().getHours();

  // 获取 AI 推荐
  const { result, loading } = useAiTask(
    () => songRecommendTask(age, learnedIds, hour),
    true,
  );

  const recommend = result?.data;
  const recommendedRhyme = recommend ? RHYME_MAP.get(recommend.rhymeId) : null;

  if (!recommendedRhyme) {
    return null;
  }

  const t = TONE_STYLE[recommendedRhyme.tone]!;
  const timeLabel =
    hour < 6 ? translate('song.timeDawn') :
    hour < 11 ? translate('song.timeMorning') :
    hour < 14 ? translate('song.timeNoon') :
    hour < 18 ? translate('song.timeAfternoon') :
    hour < 21 ? translate('song.timeEvening') :
    translate('song.timeNight');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.8rem] border-3 border-white/90 p-4 shadow-candy-sm"
      style={{ background: `linear-gradient(135deg, ${t.soft} 0%, #ffffff 70%)` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-full px-2.5 py-0.5 text-xs font-black text-white" style={{ background: t.main }}>
          {translate('song.recommendBadge', { time: timeLabel })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-5xl">{recommendedRhyme.emoji}</span>
        <div className="flex-1">
          <div className="text-lg font-black" style={{ color: t.deep }}>
            {recommendedRhyme.title}
          </div>
          {loading ? (
            <div className="text-xs font-bold text-ink-soft">{translate('song.aiChoosing')}</div>
          ) : (
            <div className="text-xs font-bold text-ink-soft leading-snug">
              {recommend?.reason}
            </div>
          )}
        </div>
        <CandyButton
          tone={recommendedRhyme.tone}
          size="sm"
          onClick={() => {
            sfxTap();
            onPick(recommendedRhyme.id);
          }}
        >
          {translate('song.goSing')}
        </CandyButton>
      </div>
    </motion.div>
  );
}

/* ========================================================================
 * 儿歌详情播放器：专业跟读 + AI 歌词解读 + 填词/打拍 Tab
 * ===================================================================== */
function RhymePlayer({
  rhyme,
  onBack,
}: {
  rhyme: NurseryRhyme;
  onBack: () => void;
}) {
  const learnSkill = useStore((s) => s.learnSkill);
  const practice = useStore((s) => s.practice);
  const progress = useProgress();
  const { t: translate } = useTranslation();
  const t = TONE_STYLE[rhyme.tone]!
  const skill = `rhyme:${rhyme.id}`;
  const learned = !!progress.mastery[skill];
  const masteryLv = progress.mastery[skill]?.lv ?? 0;
  const lang = isEnglishRhyme(rhyme) ? 'en-US' : 'zh-CN';

  // Tab 切换：sing（跟唱）/ fillblank（填词）/ beattap（打拍）
  const [tab, setTab] = useState<'sing' | 'fillblank' | 'beattap'>('sing');

  // 切换儿歌时停止朗读
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [rhyme.id]);

  // 跟读评测通过 → 标记学会
  const handlePass = () => {
    learnSkill(skill);
    practice(skill, true, 1);
    celebrateBig();
    sfxWin();
  };

  // 手动标记"我会唱了"
  const handleMarkLearned = () => {
    sfxWin();
    learnSkill(skill);
    practice(skill, true, 1);
    celebrateBig();
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => {
          sfxTap();
          stopSpeaking();
          onBack();
        }}
        className="no-select inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-base font-extrabold text-ink-soft shadow-candy-sm active:translate-y-[2px]"
      >
        {translate('song.backToList')}
      </button>

      <PageHeader emoji={rhyme.emoji} title={rhyme.title} subtitle={rhyme.desc} tone={rhyme.tone} />

      {/* 主题标签 + 年龄 + 已学标记 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-extrabold"
          style={{ background: t.soft, color: t.deep }}
        >
          {THEME_LABEL[rhyme.theme].emoji} {THEME_LABEL[rhyme.theme].label}
        </span>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-ink-soft">
          {translate('song.agePlus', { age: rhyme.ageMin })}
        </span>
        {learned && (
          <span
            className="rounded-full px-3 py-1 text-xs font-extrabold"
            style={{ background: TONE_STYLE.green.soft, color: TONE_STYLE.green.deep }}
          >
            {translate('song.learnedBadge', { lv: masteryLv })}
          </span>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="flex justify-center gap-2">
        <CandyButton
          tone={tab === 'sing' ? 'pink' : 'purple'}
          variant={tab === 'sing' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => {
            sfxTap();
            setTab('sing');
          }}
        >
          {translate('song.singTab')}
        </CandyButton>
        <CandyButton
          tone={tab === 'fillblank' ? 'pink' : 'purple'}
          variant={tab === 'fillblank' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => {
            sfxTap();
            setTab('fillblank');
          }}
        >
          {translate('song.fillTab')}
        </CandyButton>
        <CandyButton
          tone={tab === 'beattap' ? 'pink' : 'purple'}
          variant={tab === 'beattap' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => {
            sfxTap();
            setTab('beattap');
          }}
        >
          {translate('song.beatTab')}
        </CandyButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'sing' && (
          <motion.div
            key="sing"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-5"
          >
            {/* 专业跟读：逐字高亮范读 + 跟读评测 + AI 发音建议 */}
            <FollowRead
              text={rhyme.lyrics.join('，')}
              lines={rhyme.lyrics}
              lang={lang}
              module="story"
              rate={0.78}
              tone={mapReaderTone(rhyme.tone)}
              threshold={60}
              enableAiAdvice
              onPass={handlePass}
            />

            {/* AI 歌词解读 */}
            <SongExplainPanel rhyme={rhyme} tone={rhyme.tone} />

            {/* 教育寓意 */}
            <div className="rounded-2xl bg-white/70 p-3 text-center">
              <span className="text-xs font-bold text-ink-soft">{translate('song.moralLabel')}</span>
              <span className="text-sm font-extrabold text-ink">{rhyme.moral}</span>
            </div>

            {/* 手动标记学会 */}
            {!learned && (
              <div className="text-center">
                <CandyButton tone="green" variant="soft" size="sm" onClick={handleMarkLearned}>
                  {translate('song.markLearned')}
                </CandyButton>
              </div>
            )}

            {/* 进度记录 */}
            {learned && (
              <Panel className="!py-4">
                <PanelTitle emoji="📊" title={translate('song.progressTitle')} tone="green" />
                <ProgressBar value={masteryLv} max={5} tone="green" showLabel />
                <p className="mt-2 text-sm font-bold text-ink-soft">
                  {translate('song.progressTip')}
                </p>
              </Panel>
            )}

            {/* 跨模块联动：关联模块入口 */}
            {rhyme.relatedPrefix && (
              <RelatedModuleHint prefix={rhyme.relatedPrefix} tone={rhyme.tone} />
            )}
          </motion.div>
        )}

        {tab === 'fillblank' && (
          <motion.div
            key="fillblank"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <FillBlank rhyme={rhyme} tone={rhyme.tone} />
          </motion.div>
        )}

        {tab === 'beattap' && (
          <motion.div
            key="beattap"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <BeatTap rhyme={rhyme} tone={rhyme.tone} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 关联模块提示：把儿歌与对应学习模块串联 */
function RelatedModuleHint({ prefix, tone }: { prefix: string; tone: Tone }) {
  const { t: translate } = useTranslation();
  const map: Record<string, { route: RouteId; label: string; emoji: string }> = {
    letter: { route: 'letters', label: '字母乐园', emoji: '🔤' },
    number: { route: 'numbers', label: '数字王国', emoji: '🔢' },
    hanzi: { route: 'hanzi', label: '汉字识字', emoji: '🀄' },
    pinyin: { route: 'pinyin', label: '拼音学习', emoji: '📋' },
    word: { route: 'words', label: '英语单词', emoji: '🌐' },
    poem: { route: 'poems', label: '古诗花园', emoji: '🌸' },
  };
  const target = map[prefix]!!
  if (!target) return null;

  return (
    <Panel className="!py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-ink">{translate('song.relatedTitle')}</p>
          <p className="text-xs font-bold text-ink-soft mt-0.5">{translate('song.relatedDesc', { label: target.label })}</p>
        </div>
        <CandyButton
          tone={tone}
          size="md"
          onClick={() => {
            sfxTap();
            navigate(target.route);
          }}
        >
          {target.emoji} {translate('song.goSee')}
        </CandyButton>
      </div>
    </Panel>
  );
}

/* ========================================================================
 * 儿歌列表页：按主题分类展示
 * ===================================================================== */
function RhymeCard({
  rhyme,
  index,
  learned,
  onClick,
}: {
  rhyme: NurseryRhyme;
  index: number;
  learned: boolean;
  onClick: () => void;
}) {
  const { t: translate } = useTranslation();
  const t = TONE_STYLE[rhyme.tone]!
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      className="no-select relative flex flex-col gap-2 rounded-[1.8rem] p-4 text-left shadow-candy-sm border-3 border-white/90"
      style={{ background: `linear-gradient(150deg, ${t.soft} 0%, #ffffff 75%)` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{rhyme.emoji}</span>
        {learned && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
            style={{ background: TONE_STYLE.green.soft, color: TONE_STYLE.green.deep }}
          >
            {translate('song.learnedShort')}
          </span>
        )}
      </div>
      <div>
        <div className="text-base font-black" style={{ color: t.deep }}>
          {rhyme.title}
        </div>
        <div className="line-clamp-1 text-[11px] font-bold text-ink-soft">{rhyme.desc}</div>
      </div>
      <div
        className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
        style={{ background: 'rgba(255,255,255,0.6)', color: t.deep }}
      >
        {THEME_LABEL[rhyme.theme].emoji} {THEME_LABEL[rhyme.theme].label} · {translate('song.agePlus', { age: rhyme.ageMin })}
      </div>
    </motion.button>
  );
}

export default function SongsPage() {
  const { t } = useTranslation();
  const progress = useProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RhymeTheme | 'all'>('all');

  const selected = selectedId ? RHYME_MAP.get(selectedId) : null;

  // 已学会集合
  const learnedSet = useMemo(() => {
    const s = new Set<string>();
    for (const k of Object.keys(progress.mastery)) {
      if (k.startsWith('rhyme:') && progress.mastery[k]!.lv >= 1) {
        s.add(k.replace('rhyme:', ''));
      }
    }
    return s;
  }, [progress.mastery]);

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
