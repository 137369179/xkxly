import { Suspense, lazy, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BADGES } from '@/data/badges';
import { ALBUMS, albumStickers, STICKER_MAP } from '@/data/stickers';
import {
  useBadges,
  useBadgeDates,
  useStickers,
  useResearchStats,
  useDiscoveries,
  useResearchNotes,
  useStars,
  useSpent,
  useStreak,
  useMastery,
  useAvailableStars,
  useStore,
} from '@/store/useStore';
import type { Progress } from '@/types';
import { masteryRate } from '@/lib/srs';
import { mapProgress } from '@/components/games/MapView';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CandyButton } from '@/components/ui/Button';
import { StarCounter } from '@/components/ui/Stars';
import { BigPraise } from '@/components/ui/Feedback';
import { celebrateBig } from '@/lib/celebrate';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { FriendlyLoading } from '@/components/feedback/FriendlyLoading';
import { navigate } from '@/lib/router';
import { useTranslation } from '@/i18n/useTranslation';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { BadgeCollection } from '@/modules/rewards/BadgeCollection';

const GrowthTree = lazy(() =>
  import('@/components/quiz/GrowthTree').then((m) => ({ default: m.GrowthTree })),
);
const StickerScene = lazy(() =>
  import('@/components/feedback/StickerScene').then((m) => ({ default: m.StickerScene })),
);
const MemoryConstellation = lazy(() =>
  import('./MemoryConstellation').then((m) => ({ default: m.MemoryConstellation })),
);

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export type GrowthTab = 'tree' | 'constellation' | 'badges' | 'stickers';

export default function GrowthMuseumPage({ initialTab = 'tree' }: { initialTab?: GrowthTab }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<GrowthTab>(initialTab);
  const badges = useBadges();
  const stickerList = useStickers();
  const badgeDates = useBadgeDates();
  const researchStats = useResearchStats();
  const discoveries = useDiscoveries();
  const researchNotes = useResearchNotes();
  const stars = useStars();
  const spent = useSpent();
  const streak = useStreak();
  const mastery = useMastery();
  const available = useAvailableStars();
  const buySticker = useStore((s) => s.buySticker);

  const ownedBadges = useMemo(() => new Set(badges), [badges]);
  const ownedStickers = useMemo(() => new Set(stickerList), [stickerList]);

  const [album, setAlbum] = useState(ALBUMS[0] ?? '');
  const [justGot, setJustGot] = useState<string | null>(null);
  const justGotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedBadgeDates = useMemo(
    () =>
      Object.entries(badgeDates ?? {})
        .filter(([, ts]) => ts > 0)
        .sort((a, b) => b[1] - a[1]),
    [badgeDates],
  );

  const discoveryCount = discoveries?.length ?? 0;
  const noteCount = Object.keys(researchNotes ?? {}).filter((k) => researchNotes?.[k]?.trim()).length;

  const statCards = [
    { emoji: '⭐', label: t('growth.stars'), value: String(stars), tone: 'yellow' as Tone },
    { emoji: '🔥', label: t('growth.streak'), value: `${streak} 天`, tone: 'orange' as Tone },
    { emoji: '🏅', label: t('growth.badges'), value: `${ownedBadges.size}/${BADGES.length}`, tone: 'purple' as Tone },
    { emoji: '📈', label: t('growth.mastery'), value: `${Math.round(masteryRate({ mastery } as Progress) * 100)}%`, tone: 'green' as Tone },
  ];

  const levelPct = Math.round(mapProgress({ mastery } as Progress) * 20); // 平均掌握度 0-5 → 0-100
  const stickerItems = albumStickers(album);

  useEffect(() => {
    return () => {
      if (justGotTimerRef.current) clearTimeout(justGotTimerRef.current);
    };
  }, []);

  // 全局键盘快捷键响应 (1-4 切换四大 Tab)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setTab('tree');
      } else if (e.key === '2') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setTab('constellation');
      } else if (e.key === '3') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setTab('badges');
      } else if (e.key === '4') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setTab('stickers');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBuySticker = (id: string, cost: number) => {
    if (ownedStickers.has(id)) return;
    const ok = buySticker(id, cost);
    if (ok) {
      triggerHaptic(40);
      setJustGot(id);
      celebrateBig();
      if (justGotTimerRef.current) clearTimeout(justGotTimerRef.current);
      justGotTimerRef.current = setTimeout(() => setJustGot(null), 2200);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🏆"
        title={t('growth.title')}
        subtitle={t('growth.subtitle')}
        tone="purple"
      />

      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-purple-900 font-bold bg-purple-50/90 px-3.5 py-1.5 rounded-2xl border border-purple-200 shadow-sm">
          ⌨️ 键盘快捷操作：数字 1-4 切换专区 (成长足迹/记忆星图/勋章荣誉/星愿百宝箱)
        </span>
      </div>

      {/* 数据总览 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => {
          const tone = TONE_STYLE[c.tone] ?? TONE_STYLE.purple;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border-4 border-white p-4 text-center shadow-fluffy"
              style={{ background: `linear-gradient(160deg, ${tone.soft}, #fff)` }}
            >
              <div className="text-3xl">{c.emoji}</div>
              <div className="mt-1 text-2xl font-black tabular-nums" style={{ color: tone.deep }}>
                {c.value}
              </div>
              <div className="mt-0.5 text-xs font-bold text-ink-soft">{c.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* 四大主 Tab 导航 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl bg-white/70 p-1.5 shadow-sm border-2 border-purple-100">
        {[
          { id: 'tree' as const, label: '🌱 成长足迹', emoji: '🌳', tone: 'green' as Tone },
          { id: 'constellation' as const, label: '🌌 记忆星图', emoji: '🌌', tone: 'blue' as Tone },
          { id: 'badges' as const, label: `🏅 勋章荣誉 (${ownedBadges.size})`, emoji: '🏅', tone: 'purple' as Tone },
          { id: 'stickers' as const, label: `🎁 星愿百宝箱`, emoji: '🎁', tone: 'pink' as Tone },
        ].map((item) => {
          const active = tab === item.id;
          const toneStyle = TONE_STYLE[item.tone] ?? TONE_STYLE.purple;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'no-select flex-1 rounded-xl py-2.5 text-center text-xs font-black transition-all',
                active ? 'text-white shadow-md scale-[1.02]' : 'text-ink-soft hover:text-ink',
              )}
              style={active ? { background: toneStyle.main } : {}}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Tab 1: 成长足迹 */}
        {tab === 'tree' && (
          <motion.div
            key="tree"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* 平均掌握度进度 */}
            <Panel>
              <PanelTitle emoji="🗺️" title={t('growth.level')} tone="green" />
              <div className="flex items-center gap-3">
                <span className="text-4xl">{levelPct >= 80 ? '🏆' : levelPct >= 50 ? '🌟' : '🌱'}</span>
                <div className="flex-1">
                  <ProgressBar value={levelPct} max={100} tone="green" showLabel />
                </div>
              </div>
            </Panel>

            {/* 研究乐园 */}
            <Panel>
              <PanelTitle emoji="🔬" title={t('research.growthBlock.title')} subtitle={t('research.growthBlock.subtitle')} tone="blue" />
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: t('research.growthBlock.explored'), value: `${researchStats?.topicsExplored.length ?? 0}`, emoji: '🗺️' },
                  { label: t('research.growthBlock.actions'), value: `${researchStats?.exploreActions ?? 0}`, emoji: '🔍' },
                  { label: t('research.growthBlock.sessions'), value: `${researchStats?.sessionsCompleted ?? 0}`, emoji: '🎉' },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl bg-blue-50 px-2 py-2.5">
                    <div className="text-xl">{c.emoji}</div>
                    <div className="mt-0.5 text-lg font-black tabular-nums text-candy-blue-deep">{c.value}</div>
                    <div className="text-xs font-bold text-ink-soft">{c.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <CandyButton tone="blue" size="md" onClick={() => navigate('discoveries')}>
                  ⭐ {t('research.gallery.entry')}（{discoveryCount}）
                </CandyButton>
                <CandyButton tone="pink" size="md" variant="ghost" onClick={() => navigate('research')}>
                  🔬 {t('research.growthBlock.goResearch')}
                </CandyButton>
              </div>
              {noteCount > 0 && (
                <p className="mt-2 text-xs font-bold text-ink-soft">📝 {t('research.growthBlock.notes', { n: noteCount })}</p>
              )}
            </Panel>

            {/* 成长树 */}
            <Suspense fallback={<FriendlyLoading message={t('home.loadingTree')} />}>
              <Panel>
                <PanelTitle emoji="🌳" title={t('growth.tree')} tone="green" />
                <GrowthTree />
              </Panel>
            </Suspense>

            {/* 学习护照成就时间线 */}
            <Panel>
              <PanelTitle emoji="⏳" title={t('growth.timeline')} subtitle="每一次点滴进步，都为你记录在荣誉档案中" tone="orange" />
              {sortedBadgeDates.length === 0 ? (
                <p className="py-6 text-center text-sm font-bold text-ink-soft">✨ {t('growth.timelineEmpty')}</p>
              ) : (
                <div className="relative space-y-4 pl-6">
                  <div className="absolute bottom-2 left-[9px] top-2 w-1 rounded-full bg-gradient-to-b from-yellow-300 via-pink-300 to-purple-300" />
                  {sortedBadgeDates.slice(0, 20).map(([id, ts], i) => {
                    const badge = BADGES.find((b) => b.id === id);
                    const tone = TONE_STYLE[((badge?.tone ?? 'blue') as Tone)];
                    return (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative flex items-center gap-3"
                      >
                        <span
                          className="absolute -left-6 grid h-5 w-5 place-items-center rounded-full border-2 border-white shadow-sm"
                          style={{ background: tone.main }}
                        />
                        <span className="text-2xl">{badge?.emoji ?? '🏅'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-extrabold text-ink">{badge?.name ?? id}</div>
                          <div className="truncate text-xs font-bold text-ink-soft">{badge?.desc}</div>
                        </div>
                        <span className="shrink-0 rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold tabular-nums text-ink-soft">
                          {formatDate(ts)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </motion.div>
        )}

        {/* Tab 2: 记忆星图 */}
        {tab === 'constellation' && (
          <motion.div
            key="constellation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <Suspense fallback={<FriendlyLoading message="正在观测全景知识星空..." />}>
              <MemoryConstellation />
            </Suspense>
          </motion.div>
        )}

        {/* Tab 3: 勋章荣誉 */}
        {tab === 'badges' && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <BadgeCollection />
          </motion.div>
        )}

        {/* Tab 3: 星愿百宝箱 */}
        {tab === 'stickers' && (
          <motion.div
            key="stickers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* 钱包横幅 */}
            <Panel className="!py-4 bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 border-2 border-pink-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FluffyIcon type="box" size="sm" />
                  <div>
                    <span className="text-sm font-extrabold text-pink-900">{t('rewards.wallet')}</span>
                    <p className="text-xs font-bold text-pink-600">
                      {t('rewards.walletSummary', { stars, spent })}
                    </p>
                  </div>
                </div>
                <StarCounter count={available} />
              </div>
            </Panel>

            {/* 贴纸商店 */}
            <Panel>
              <PanelTitle
                iconType="album"
                title={t('rewards.albumTitle')}
                subtitle={t('rewards.albumSubtitle', { collected: ownedStickers.size, total: Object.keys(STICKER_MAP).length })}
                tone="pink"
              />

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {ALBUMS.map((a) => {
                  const stk = albumStickers(a)[0];
                  const t = TONE_STYLE[(stk?.id ? STICKER_MAP.get(stk.id)?.tone : undefined) ?? 'blue'] ?? TONE_STYLE.purple;
                  const active = a === album;
                  return (
                    <button
                      key={a}
                      onClick={() => setAlbum(a ?? '')}
                      className={cn(
                        'no-select shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition-all',
                        active ? 'text-white shadow-sm' : 'text-ink-soft',
                      )}
                      style={active ? { background: t.main } : { background: t.soft }}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {stickerItems.map((s) => {
                  const got = ownedStickers.has(s.id);
                  const toneStyle = TONE_STYLE[s.tone ?? 'blue'] ?? TONE_STYLE.purple;
                  return (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.92 }}
                      disabled={got}
                      onClick={() => handleBuySticker(s.id, s.cost)}
                      className={cn(
                        'no-select flex flex-col items-center gap-1 rounded-[1.4rem] p-3 text-center shadow-candy-sm border-2 border-white',
                        got ? '' : 'opacity-90',
                      )}
                      style={{ background: got ? toneStyle.soft : '#F3EEF6' }}
                    >
                      <span className={cn('text-4xl', !got && 'opacity-35 grayscale')}>{s.emoji}</span>
                      <span className="line-clamp-1 text-xs font-extrabold" style={{ color: got ? toneStyle.deep : '#8B7F96' }}>
                        {s.name}
                      </span>
                      {!got && (
                        <span className="flex items-center gap-0.5 text-xs font-bold text-candy-yellow-deep">
                          ⭐ {s.cost}
                        </span>
                      )}
                      {got && <span className="text-xs font-extrabold text-candy-green-deep">{t('rewards.collected')} ✅</span>}
                    </motion.button>
                  );
                })}
              </div>
            </Panel>

            {/* 场景装扮 */}
            <Suspense fallback={<FriendlyLoading message="加载装扮场景中..." />}>
              <StickerScene />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <BigPraise show={!!justGot} text={t('rewards.exchangeSuccess')} emoji={justGot ? STICKER_MAP.get(justGot)?.emoji ?? '🌟' : '🌟'} />
    </div>
  );
}

