/**
 * 古诗学院 · 总览页
 * ------------------------------------------------------------
 * 三视图：诗库（多维检索 + 诗卡）/ 训练中心 / 复习计划。
 * 点开任一首进入「详情面板」（5 标签：原文 / 注解 / 格律 / 语境 / 研读），
 * 集成逐句串讲、标准谱格律、诗人史料、自测、分关背诵与个性化复习路线。
 */
import { lazy, memo, Suspense, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import POEMS from '@/data/poems';
import { DOSSIERS } from '@/data/poemDossiers';
import type { DeepPoem } from '@/types';
import { useStore, useSettings, useProgress } from '@/store/useStore';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { PageHeader, Panel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTranslation } from '@/i18n/useTranslation';
// 详情 / 训练 / 计划 都依赖 poems-deep（519KB，gzip ~100KB），懒加载切成独立 chunk，
// 只有真正切到「训练 / 计划」或打开某首诗详情时才拉取，诗库列表首开不背这 100KB。
import type { DetailTab } from './PoemDetail';
const PoemDetail = lazy(() => import('./PoemDetail'));
const TrainView = lazy(() => import('./TrainView'));
const PlanView = lazy(() => import('./PlanView'));
const PoemNotes = lazy(() => import('./PoemNotes'));
const PoetTimeline = lazy(() => import('@/components/PoetTimeline'));
const PoetArchive = lazy(() => import('./PoetArchive'));
const PoetWorks = lazy(() => import('./PoetWorks').then(m => ({ default: m.PoetWorks })));
const FlyingFlowers = lazy(() => import('./FlyingFlowers').then(m => ({ default: m.FlyingFlowers })));

type ViewKey = 'lib' | 'train' | 'plan' | 'notes' | 'timeline' | 'archive' | 'works' | 'flying';

/** 诗卡 —— memo 化，只有 read/fav/deep 状态变化时才重渲染 */
const PoemCard = memo(function PoemCard({
  poem,
  read,
  fav,
  deep,
  toneStyle,
  onClick,
}: {
  poem: { id: string; title: string; author: string; dynasty: string; genre: string };
  read: boolean;
  fav: boolean;
  deep: boolean;
  toneStyle: { soft: string; deep: string };
  onClick: (id: string) => void;
}) {
  return (
    <motion.button
      onClick={() => onClick(poem.id)}
      whileTap={{ scale: 0.95 }}
      className="no-select relative flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-[1.5rem] p-3 text-center shadow-candy-sm transition-shadow"
      style={{ background: toneStyle.soft }}
    >
      {read && <span className="absolute top-2 left-2 text-sm" title="Read">✅</span>}
      {fav && <span className="absolute top-2 right-2 text-sm" title="Favorited">❤️</span>}
      {deep && <span className="absolute bottom-2 right-2 text-[10px] font-extrabold text-candy-purple-deep" title="Has deep notes">研</span>}
      <span className="line-clamp-2 text-lg font-extrabold" style={{ color: toneStyle.deep }}>{poem.title}</span>
      <span className="text-xs font-bold text-ink-soft">{poem.author}·{poem.dynasty}</span>
      <span className="text-[11px] font-semibold text-ink-soft/80">{poem.genre}</span>
    </motion.button>
  );
});

export default function PoemsPage({ param }: { param?: string }) {
  const { t } = useTranslation();
  const { showPinyin } = useSettings();
  const setShowPinyin = useStore((s) => s.setShowPinyin);
  const readPoem = useStore((s) => s.readPoem);
  const progress = useProgress();
  const favSet = useMemo(() => new Set(progress.poemFavorites), [progress.poemFavorites]);
  const readSet = useMemo(() => new Set(progress.poemsRead), [progress.poemsRead]);

  const [view, setView] = useState<ViewKey>('lib');
  const [openId, setOpenId] = useState<string | null>(
    () => (param && POEMS.some((p) => p.id === param) ? param : null),
  );
  const [openTab, setOpenTab] = useState<DetailTab>('原文');
  // 详情需要的深层数据（译文/注释/用典）按需动态加载，不进首屏与列表
  const [deepPoem, setDeepPoem] = useState<DeepPoem | null>(null);
  const [deepLoaded, setDeepLoaded] = useState(false);

  // —— 诗库检索 ——
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [dyn, setDyn] = useState<Set<string>>(new Set());
  const [gen, setGen] = useState<Set<string>>(new Set());
  const [thm, setThm] = useState<Set<string>>(new Set());
  const [img, setImg] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    setter(n);
  };

  const dossierIds = useMemo(() => new Set(Object.keys(DOSSIERS)), []);

  const DYNASTIES = useMemo(() => [...new Set(POEMS.map((p) => p.dynasty))], []);
  const GENRES = useMemo(() => [...new Set(POEMS.map((p) => p.genre))], []);
  const THEMES = useMemo(() => [...new Set(POEMS.flatMap((p) => p.themes))].sort(), []);
  const IMAGERY = useMemo(() => [...new Set(POEMS.flatMap((p) => p.imagery))].sort(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POEMS.filter((p) => {
      if (favOnly && !favSet.has(p.id)) return false;
      if (dyn.size && !dyn.has(p.dynasty)) return false;
      if (gen.size && !gen.has(p.genre)) return false;
      if (thm.size && !p.themes.some((t) => thm.has(t))) return false;
      if (img.size && !p.imagery.some((i) => img.has(i))) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.dynasty.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.themes.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, favOnly, dyn, gen, thm, img, favSet]);

  // 性能优化（核心加强 P）：诗卡分页加载
  // 最多 385 首诗一次性渲染 385 个 motion.button，DOM 节点 + 动画监听开销大。
  // 每页 60 首，滚动到底加载下一批，首次 DOM 节点降到 60。
  const POEM_PAGE_SIZE = 60;
  const [poemVisible, setPoemVisible] = useState(POEM_PAGE_SIZE);
  const poemSentinelRef = useRef<HTMLDivElement | null>(null);

  // 筛选条件变化时重置分页
  useEffect(() => {
    setPoemVisible(POEM_PAGE_SIZE);
  }, [query, favOnly, dyn, gen, thm, img, favSet]);

  const poemVisible_list = filtered.slice(0, poemVisible);
  const poemHasMore = poemVisible < filtered.length;

  const loadMorePoems = useCallback(() => {
    setPoemVisible((c) => Math.min(c + POEM_PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const el = poemSentinelRef.current;
    if (!el || !poemHasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]!.isIntersecting) loadMorePoems();
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [poemHasMore, loadMorePoems]);

  const openPoem = (id: string, tab?: DetailTab) => {
    sfxTap();
    readPoem(id);
    setOpenTab(tab ?? '原文');
    setOpenId(id);
  };
  const close = () => setOpenId(null);

  // 打开某首诗时，按需动态加载其深层数据（译文/注释/用典），不阻塞列表
  useEffect(() => {
    if (!openId) {
      setDeepPoem(null);
      setDeepLoaded(false);
      return;
    }
    let cancelled = false;
    import('@/data/poems-deep').then((m) => {
      if (!cancelled) {
        setDeepPoem(m.default.find((p) => p.id === openId) ?? null);
        setDeepLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [openId]);


  // 视图切换时重置检索态
  useEffect(() => {
    if (view === 'lib') {
      /* 保持当前检索态 */
    }
    // intentional: only reset when view changes to 'lib'
  }, [view]);

  return (
    <div>
      {/* 三视图切换 */}
      <PageHeader emoji="🌸" title={t('poem.academy')} subtitle={t('poem.academySubtitle', { count: POEMS.length })} tone="pink" />

      <div className="mb-5 flex gap-2">
        <Seg active={view === 'lib'} onClick={() => setView('lib')} emoji="📚" label={t('poem.lib')} />
        <Seg active={view === 'train'} onClick={() => setView('train')} emoji="🎯" label={t('poem.train')} />
        <Seg active={view === 'plan'} onClick={() => setView('plan')} emoji="🗺️" label={t('poem.plan')} />
        <Seg active={view === 'notes'} onClick={() => setView('notes')} emoji="📝" label={t('poem.notes')} />
        <Seg active={view === 'timeline'} onClick={() => setView('timeline')} emoji="⏳" label={t('poem.poets')} />
        <Seg active={view === 'archive'} onClick={() => setView('archive')} emoji="📜" label={t('poem.archive')} />
        <Seg active={view === 'works'} onClick={() => setView('works')} emoji="📖" label={t('poem.works')} />
        <Seg active={view === 'flying'} onClick={() => setView('flying')} emoji="🌸" label={t('poem.flying')} />
      </div>

      {view === 'lib' && (
        <>
          <Panel className="!py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔎</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('poem.searchPlaceholder')}
                  className="tap-target w-full rounded-2xl border-2 border-candy-pink-soft bg-white/80 px-11 py-2.5 text-base font-bold text-ink outline-none placeholder:text-ink-soft/70 focus:border-candy-pink focus-visible:outline-4 focus-visible:outline-candy-pink/40"
                />
              </div>
              <div className="flex flex-wrap gap-2.5">
                <CandyButton tone={favOnly ? 'pink' : 'purple'} variant={favOnly ? 'solid' : 'soft'} size="sm" onClick={() => setFavOnly((v) => !v)}>
                  {t('poem.favorite')}
                </CandyButton>
                <CandyButton tone={showPinyin ? 'blue' : 'purple'} variant={showPinyin ? 'solid' : 'soft'} size="sm" onClick={() => setShowPinyin(!showPinyin)}>
                  {t('poem.pinyinToggle')}
                </CandyButton>
              </div>
            </div>
          </Panel>

          <div className="mt-4 space-y-2.5">
            <Facet label={t('poem.dynastyLabel')} values={DYNASTIES} sel={dyn} onToggle={(v) => toggle(dyn, setDyn, v)} />
            <Facet label={t('poem.genreLabel')} values={GENRES} sel={gen} onToggle={(v) => toggle(gen, setGen, v)} />
            <Facet label={t('poem.themeLabel')} values={THEMES} sel={thm} onToggle={(v) => toggle(thm, setThm, v)} />
            <Facet label={t('poem.imageryLabel')} values={IMAGERY} sel={img} onToggle={(v) => toggle(img, setImg, v)} />
          </div>

          <p className="mb-3 mt-4 text-sm font-extrabold text-ink-soft">
            {t('poem.foundCount', { count: filtered.length })}{readSet.size > 0 && ` · ${t('poem.readCount', { count: readSet.size })}`}
            {(dyn.size || gen.size || thm.size || img.size) > 0 && (
              <button className="ml-2 text-candy-pink underline" onClick={() => { setDyn(new Set()); setGen(new Set()); setThm(new Set()); setImg(new Set()); }}>
                {t('poem.clearFilter')}
              </button>
            )}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {poemVisible_list.map((p, i) => (
              <PoemCard
                key={p.id}
                poem={p}
                read={readSet.has(p.id)}
                fav={favSet.has(p.id)}
                deep={dossierIds.has(p.id)}
                toneStyle={TONE_STYLE[toneAt(i)]}
                onClick={openPoem}
              />
            ))}
          </div>

          {/* 滚动哨兵：进入视口时加载下一页 */}
          {poemHasMore && <div ref={poemSentinelRef} className="h-4" />}
        </>
      )}

      {view === 'train' && (
        <ErrorBoundary variant="inline" resetKey={`train:${openId ?? ''}`}>
          <Suspense fallback={<SubLoading label={t('poem.loadingTrain')} />}>
            <TrainView onOpen={openPoem} />
          </Suspense>
        </ErrorBoundary>
      )}
      {view === 'plan' && (
        <ErrorBoundary variant="inline" resetKey={`plan:${openId ?? ''}`}>
          <Suspense fallback={<SubLoading label={t('poem.loadingPlan')} />}>
            <PlanView onOpen={openPoem} />
          </Suspense>
        </ErrorBoundary>
      )}

      {view === 'notes' && (
        <ErrorBoundary variant="inline" resetKey="notes">
          <Suspense fallback={<SubLoading label={t('poem.loadingNotes')} />}>
            <PoemNotes />
          </Suspense>
        </ErrorBoundary>
      )}

      {view === 'timeline' && (
        <ErrorBoundary variant="inline" resetKey="timeline">
          <Suspense fallback={<SubLoading label={t('poem.loadingTimeline')} />}>
            <PoetTimeline />
          </Suspense>
        </ErrorBoundary>
      )}

      {view === 'archive' && (
        <ErrorBoundary variant="inline" resetKey="archive">
          <Suspense fallback={<SubLoading label={t('poem.loadingArchive')} />}>
            <PoetArchive />
          </Suspense>
        </ErrorBoundary>
      )}

      {view === 'works' && (
        <ErrorBoundary variant="inline" resetKey="works">
          <Suspense fallback={<SubLoading label={t('poem.loadingWorks')} />}>
            <PoetWorks />
          </Suspense>
        </ErrorBoundary>
      )}

      {view === 'flying' && (
        <ErrorBoundary variant="inline" resetKey="flying">
          <Suspense fallback={<SubLoading label={t('poem.loadingFlying')} />}>
            <FlyingFlowers />
          </Suspense>
        </ErrorBoundary>
      )}


      <Modal open={!!openId} onClose={close} className="max-w-2xl">
        {deepPoem ? (
          <ErrorBoundary variant="inline" resetKey={`detail:${openId ?? ''}`}>
            <Suspense fallback={<SubLoading label={t('common.loading')} />}>
              <PoemDetail poem={deepPoem} initialTab={openTab} onClose={close} onOpen={openPoem} />
            </Suspense>
          </ErrorBoundary>
        ) : deepLoaded ? (
          <div className="grid min-h-[30vh] place-items-center text-center">
            <div className="space-y-3">
              <div className="text-5xl">📭</div>
              <p className="text-base font-extrabold text-ink-soft">{t('poem.noDeepNote')}</p>
              <CandyButton tone="pink" size="sm" onClick={close}>{t('poem.backToLib')}</CandyButton>
            </div>
          </div>
        ) : (
          <SubLoading label={t('common.loading')} />
        )}
      </Modal>
    </div>
  );
}

/* ---------------- 子组件 ---------------- */
function SubLoading({ label }: { label: string }) {
  return (
    <div className="grid min-h-[30vh] place-items-center text-base font-extrabold text-ink-soft">
      <span className="animate-pulse">{label}</span>
    </div>
  );
}

function Seg({ active, onClick, emoji, label }: { active: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'no-select flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-lg font-extrabold transition-all active:translate-y-[2px]',
        active ? 'bg-candy-pink text-white shadow-candy-sm' : 'bg-white/80 text-ink-soft hover:bg-candy-pink-soft',
      )}
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}

function Facet({ label, values, sel, onToggle }: { label: string; values: string[]; sel: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 w-10 shrink-0 text-xs font-extrabold text-ink-soft">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            className={cn(
              'tap-target rounded-full px-3 py-1.5 text-sm font-extrabold transition-colors',
              sel.has(v) ? 'bg-candy-pink text-white shadow-candy-sm' : 'bg-white/80 text-ink-soft hover:bg-candy-pink-soft',
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
