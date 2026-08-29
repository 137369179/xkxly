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
import { useStore, useSettings, usePoemFavorites, usePoemsRead } from '@/store/useStore';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { PageHeader, Panel } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTranslation } from '@/i18n/useTranslation';
// 详情 / 训练 / 计划 都依赖 poems-deep（519KB，gzip ~100KB），懒加载切成独立 chunk，
// 只有真正切到「训练 / 计划」或打开某首诗详情时才拉取，诗库列表首开不背这 100KB。
import type { DetailTab } from './PoemDetail';
import { TodayPoemHero } from './TodayPoemHero';
const PoemDetail = lazy(() => import('./PoemDetail'));
const TrainView = lazy(() => import('./TrainView'));
const PlanView = lazy(() => import('./PlanView'));
const PoemNotes = lazy(() => import('./PoemNotes'));
const PoetTimeline = lazy(() => import('@/modules/poems/PoetTimeline'));
const PoetArchive = lazy(() => import('./PoetArchive'));
const PoetWorks = lazy(() => import('./PoetWorks').then(m => ({ default: m.PoetWorks })));
const FlyingFlowers = lazy(() => import('./FlyingFlowerDuel').then(m => ({ default: m.FlyingFlowerDuel })));

type ViewKey = 'lib' | 'train' | 'plan' | 'notes' | 'timeline' | 'archive' | 'works' | 'flying';

/** 顶部主入口（4 个）：孩子真正会用的三个 + 「更多」收起成人向视图 */
const MAIN_VIEWS: ViewKey[] = ['lib', 'train', 'flying'];
/** 收进「更多」的视图（功能不删，只是降低层级） */
const MORE_VIEWS: { k: ViewKey; e: string; l: string }[] = [
  { k: 'plan', e: '🗺️', l: '计划' },
  { k: 'notes', e: '📝', l: '笔记' },
  { k: 'timeline', e: '⏳', l: '诗人' },
  { k: 'archive', e: '📜', l: '档案' },
  { k: 'works', e: '📖', l: '作品' },
];

/**
 * 儿童化主题大卡（8 个）
 * 原 45 个 themes + 51 个 imagery 全是纯文字 chip，不识字的孩子完全无法使用。
 * 这里取 themes 里覆盖最广的 8 个做成大卡：山水/励志/春天/思乡/植物/花/秋天/动物，
 * 末尾 4 个为并列同位次时优先挑儿童可感知的（动物 > 月亮）。
 * 过滤逻辑与数据完全不动，只换渲染层。
 */
const THEME_CARDS: { key: string; emoji: string }[] = [
  { key: '山水', emoji: '🏔️' },
  { key: '励志', emoji: '💪' },
  { key: '春天', emoji: '🌱' },
  { key: '思乡', emoji: '🏠' },
  { key: '植物', emoji: '🌿' },
  { key: '花', emoji: '🌺' },
  { key: '秋天', emoji: '🍁' },
  { key: '动物', emoji: '🐾' },
];

/** 难度星星卡：复用数据里已有的 difficulty 字段（1-5），收敛成 3 档 */
type DiffKey = 'easy' | 'mid' | 'hard';
const DIFFICULTY_CARDS: { key: DiffKey; label: string; stars: string; test: (d: number) => boolean }[] = [
  { key: 'easy', label: '简单', stars: '🌟', test: (d) => d <= 2 },
  { key: 'mid', label: '中等', stars: '🌟🌟', test: (d) => d === 3 },
  { key: 'hard', label: '挑战', stars: '🌟🌟🌟', test: (d) => d >= 4 },
];

/** 诗卡 —— memo 化，只有 read/fav/deep 状态变化时才重渲染 */
const PoemCard = memo(function PoemCard({
  poem,
  read,
  fav,
  deep,
  onClick,
}: {
  poem: { id: string; title: string; author: string; dynasty: string; genre: string };
  read: boolean;
  fav: boolean;
  deep: boolean;
  onClick: (id: string) => void;
}) {
  return (
    <motion.button
      onClick={() => onClick(poem.id)}
      whileTap={{ scale: 0.95 }}
      className="no-select relative flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-[1.5rem] border-2 border-pink-200/80 bg-white/90 p-3 text-center shadow-candy-sm transition-all hover:-translate-y-0.5 hover:border-candy-pink/60"
    >
      {read && (
        <span className="absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-xs shadow-sm" title="Read">✅</span>
      )}
      {fav && (
        <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-xs shadow-sm" title="Favorited">❤️</span>
      )}
      {deep && (
        <span className="absolute bottom-2 right-2 grid h-5 w-5 place-items-center rounded-full bg-candy-pink/10 text-xs font-extrabold text-candy-pink-deep" title="Has deep notes">研</span>
      )}
      <span className="line-clamp-2 text-lg font-extrabold text-candy-pink-deep">{poem.title}</span>
      <span className="text-xs font-bold text-ink-soft">{poem.author}·{poem.dynasty}</span>
      <span className="text-xs font-semibold text-ink-soft/60">{poem.genre}</span>
    </motion.button>
  );
});

export default function PoemsPage({ param }: { param?: string }) {
  const { t } = useTranslation();
  const { showPinyin } = useSettings();
  const setShowPinyin = useStore((s) => s.setShowPinyin);
  const readPoem = useStore((s) => s.readPoem);
  const favorites = usePoemFavorites();
  const readList = usePoemsRead();
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const readSet = useMemo(() => new Set(readList), [readList]);

  const [view, setView] = useState<ViewKey>('lib');
  const [openId, setOpenId] = useState<string | null>(
    () => (param && POEMS.some((p) => p.id === param) ? param : null),
  );
  const [openTab, setOpenTab] = useState<DetailTab>('原文');
  // 详情需要的深层数据（译文/注释/用典）按需动态加载，不进首屏与列表
  const [deepPoem, setDeepPoem] = useState<DeepPoem | null>(null);
  const [deepLoaded, setDeepLoaded] = useState(false);

  // 诗库检索 / 高级筛选折叠
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [dyn, setDyn] = useState<Set<string>>(new Set());
  const [gen, setGen] = useState<Set<string>>(new Set());
  const [thm, setThm] = useState<Set<string>>(new Set());
  const [img, setImg] = useState<Set<string>>(new Set());
  // 难度星星卡：Set<DiffKey>，为空即「全部」
  const [diff, setDiff] = useState<Set<DiffKey>>(new Set());

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    setter(n);
  };

  const toggleDiff = (v: DiffKey) => {
    const n = new Set(diff);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    setDiff(n);
  };

  const dossierIds = useMemo(() => new Set(Object.keys(DOSSIERS)), []);

  const DYNASTIES = useMemo(() => [...new Set(POEMS.map((p) => p.dynasty))], []);
  const GENRES = useMemo(() => [...new Set(POEMS.map((p) => p.genre))], []);
  const THEMES = useMemo(() => [...new Set(POEMS.flatMap((p) => p.themes))].sort(), []);
  const IMAGERY = useMemo(() => [...new Set(POEMS.flatMap((p) => p.imagery))].sort(), []);

  /** 主题大卡上的诗数（385 首只扫一遍，列表渲染不参与） */
  const THEME_COUNTS = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of POEMS) for (const t of p.themes) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, []);
  /** 难度星星卡上的诗数 */
  const DIFF_COUNTS = useMemo(() => {
    const m = new Map<DiffKey, number>();
    for (const c of DIFFICULTY_CARDS) m.set(c.key, POEMS.filter((p) => c.test(p.difficulty ?? 0)).length);
    return m;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POEMS.filter((p) => {
      if (favOnly && !favSet.has(p.id)) return false;
      if (dyn.size && !dyn.has(p.dynasty)) return false;
      if (gen.size && !gen.has(p.genre)) return false;
      if (thm.size && !p.themes.some((t) => thm.has(t))) return false;
      if (img.size && !p.imagery.some((i) => img.has(i))) return false;
      // 难度星星卡：命中任一被选中的档位即保留；未选任何档位 = 全部
      if (diff.size && !DIFFICULTY_CARDS.some((c) => diff.has(c.key) && c.test(p.difficulty ?? 0))) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.dynasty.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.themes.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, favOnly, dyn, gen, thm, img, diff, favSet]);

  // 性能优化（核心加强 P）：诗卡分页加载
  // 最多 385 首诗一次性渲染 385 个 motion.button，DOM 节点 + 动画监听开销大。
  // 每页 60 首，滚动到底加载下一批，首次 DOM 节点降到 60。
  const POEM_PAGE_SIZE = 60;
  const [poemVisible, setPoemVisible] = useState(POEM_PAGE_SIZE);
  const poemSentinelRef = useRef<HTMLDivElement | null>(null);

  // 筛选条件变化时重置分页
  useEffect(() => {
    setPoemVisible(POEM_PAGE_SIZE);
  }, [query, favOnly, dyn, gen, thm, img, diff, favSet]);

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
    triggerHaptic(30);
    readPoem(id);
    setOpenTab(tab ?? '原文');
    setOpenId(id);
  };
  const close = () => {
    triggerHaptic(20);
    setOpenId(null);
  };

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


  // 全局键盘快捷键响应 (1-3 专区切换，F 飞花令，Esc 关闭详情)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (openId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          triggerHaptic(20);
          close();
        }
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        triggerHaptic(20);
        setView('lib');
      } else if (e.key === '2') {
        e.preventDefault();
        triggerHaptic(20);
        setView('train');
      } else if (e.key === '3') {
        e.preventDefault();
        triggerHaptic(20);
        setView('flying');
      } else if (e.key === '4') {
        e.preventDefault();
        triggerHaptic(20);
        setView('plan');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        triggerHaptic(30);
        setView('flying');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openId]);

  return (
    <div>
      {/* 页头 */}
      <PageHeader emoji="🌸" title={t('poem.academy')} subtitle={t('poem.academySubtitle', { count: POEMS.length })} tone="pink" />

      {/* 快捷操作提示条 */}
      <div className="text-center mb-3">
        <span className="inline-block text-xs text-pink-900 font-bold bg-pink-50/90 px-3 py-1 rounded-xl border border-pink-200">
          ⌨️ 键盘快捷操作：数字 1-3 切换专区（诗库/训练/飞花令）· F 飞花令对决 · Esc 关闭详情
        </span>
      </div>

      {/* 主导航：孩子常用的 3 个 + 「更多」下拉（成人向视图收进更多，功能不删） */}
      <div className="mb-4 flex gap-2">
        <Seg
          active={view === 'lib'}
          onClick={() => {
            triggerHaptic(20);
            setView('lib');
          }}
          emoji="📚"
          label={t('poem.lib')}
        />
        <Seg
          active={view === 'train'}
          onClick={() => {
            triggerHaptic(20);
            setView('train');
          }}
          emoji="🎯"
          label={t('poem.train')}
        />
        <Seg
          active={view === 'flying'}
          onClick={() => {
            triggerHaptic(20);
            setView('flying');
          }}
          emoji="🌸"
          label={t('poem.flying')}
        />
        <div className="relative">
          <Seg
            active={!MAIN_VIEWS.includes(view)}
            onClick={() => {
              triggerHaptic(20);
              setShowMoreMenu((v) => !v);
            }}
            emoji="⋯"
            label={t('poem.more')}
          />
          {showMoreMenu && (
            <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white/95 p-1 shadow-candy-sm backdrop-blur">
              {MORE_VIEWS.map((m) => (
                <button
                  key={m.k}
                  onClick={() => {
                    triggerHaptic(20);
                    setView(m.k as ViewKey);
                    setShowMoreMenu(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-extrabold transition-colors',
                    view === m.k ? 'bg-candy-pink text-candy-pink-on' : 'text-ink-soft hover:bg-pink-50',
                  )}
                >
                  <span>{m.e}</span>
                  {m.l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === 'lib' && (
        <>
          {/* 今日推荐诗：首页直达「开始学」，从古诗首页到学一首诗 ≤2 层 */}
          <TodayPoemHero onOpen={openPoem} />

          {/* 一行完成：搜索 + 收藏 + 拼音 + 高级筛选入口 */}
          <Panel className="!py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-ink-soft">🔎</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('poem.searchPlaceholder')}
                  className="input-jelly w-full px-10 py-2 text-sm font-bold text-ink outline-none placeholder:text-ink-soft/70"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ChipBtn active={favOnly} onClick={() => setFavOnly((v) => !v)} emoji="❤️">
                  {t('poem.favorite')}
                </ChipBtn>
                <ChipBtn active={showPinyin} onClick={() => setShowPinyin(!showPinyin)} emoji="🔤">
                  {t('poem.pinyinToggle')}
                </ChipBtn>
                <ChipBtn
                  active={showAdvanced || (dyn.size + gen.size + img.size) > 0}
                  onClick={() => setShowAdvanced((v) => !v)}
                  emoji="🎛️"
                  badge={(dyn.size + gen.size + img.size) || undefined}
                >
                  {t('poem.advanced')}
                </ChipBtn>
              </div>
            </div>

            {/* 挑一挑：主题大卡 + 难度星星卡（点一下即筛选，不识字的孩子看图就能选） */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-sm font-black text-ink">🎯 挑一挑 · 想读哪一类？</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {THEME_CARDS.map((c) => (
                  <BigPickCard
                    key={c.key}
                    emoji={c.emoji}
                    label={c.key}
                    count={THEME_COUNTS.get(c.key) ?? 0}
                    selected={thm.has(c.key)}
                    onClick={() => {
                      sfxTap();
                      triggerHaptic(20);
                      toggle(thm, setThm, c.key);
                    }}
                  />
                ))}
              </div>

              <p className="mb-2 mt-3 text-sm font-black text-ink">⭐ 选难度 · 能读多难的？</p>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_CARDS.map((c) => (
                  <BigPickCard
                    key={c.key}
                    emoji={c.stars}
                    label={c.label}
                    count={DIFF_COUNTS.get(c.key) ?? 0}
                    selected={diff.has(c.key)}
                    onClick={() => {
                      sfxTap();
                      triggerHaptic(20);
                      toggleDiff(c.key);
                    }}
                  />
                ))}
              </div>

              {(thm.size > 0 || diff.size > 0) && (
                <div className="mt-2 flex justify-end">
                  <button
                    className="text-xs font-extrabold text-ink-soft underline-offset-2 hover:text-candy-pink hover:underline"
                    onClick={() => { setThm(new Set()); setDiff(new Set()); }}
                  >
                    不看分类，看全部
                  </button>
                </div>
              )}
            </div>

            {/* 高级筛选：成人向的文字分面（朝代 / 体裁 / 全量主题 / 意象），默认折叠 */}
            {showAdvanced && (
              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                <FacetCompact label={t('poem.dynastyLabel')} values={DYNASTIES} sel={dyn} onToggle={(v) => toggle(dyn, setDyn, v)} />
                <FacetCompact label={t('poem.genreLabel')} values={GENRES} sel={gen} onToggle={(v) => toggle(gen, setGen, v)} />
                <FacetCompact label={t('poem.themeLabel')} values={THEMES} sel={thm} onToggle={(v) => toggle(thm, setThm, v)} />
                <FacetCompact label={t('poem.imageryLabel')} values={IMAGERY} sel={img} onToggle={(v) => toggle(img, setImg, v)} />
                <div className="flex justify-end">
                  <button
                    className="text-xs font-extrabold text-ink-soft underline-offset-2 hover:text-candy-pink hover:underline"
                    onClick={() => { setDyn(new Set()); setGen(new Set()); setThm(new Set()); setImg(new Set()); setDiff(new Set()); }}
                  >
                    {t('poem.clearFilters')}
                  </button>
                </div>
              </div>
            )}
          </Panel>

          <p className="mb-3 mt-4 text-xs font-extrabold text-ink-soft">
            {t('poem.foundCount', { count: filtered.length })}
            {readSet.size > 0 && ` · ${t('poem.readCount', { count: readSet.size })}`}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {poemVisible_list.map((p) => (
              <PoemCard
                key={p.id}
                poem={p}
                read={readSet.has(p.id)}
                fav={favSet.has(p.id)}
                deep={dossierIds.has(p.id)}
                onClick={openPoem}
              />
            ))}
          </div>

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
        'no-select flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-extrabold transition-all active:translate-y-[2px] sm:text-base',
        active ? 'bg-candy-pink text-candy-pink-on shadow-candy-sm' : 'bg-gray-100 text-ink-soft hover:bg-pink-100',
      )}
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}

/** 紧凑 chips 按钮（搜索栏右侧切换用） */
function ChipBtn({
  active, onClick, emoji, children, badge,
}: {
  active: boolean; onClick: () => void; emoji: string; children: React.ReactNode; badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'tap-target relative inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition-colors sm:text-sm',
        active ? 'bg-candy-pink text-candy-pink-on shadow-candy-sm' : 'bg-gray-100 text-ink-soft hover:bg-pink-100',
      )}
    >
      <span>{emoji}</span>
      {children}
      {badge !== undefined && (
        <span className="ml-0.5 rounded-full bg-white px-1.5 py-0 text-xs font-black text-candy-pink-deep">
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * 儿童化筛选大卡（≥88px 触控，图标 + 中文名 + 数量）
 * 选中态：粉底 + 粉边 + 右上角 ✅，孩子一眼看得出「我选了这个」。
 */
function BigPickCard({
  emoji, label, count, selected, onClick,
}: {
  emoji: string;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'no-select relative flex min-h-[88px] flex-col items-center justify-center gap-0.5 rounded-3xl border-4 px-2 py-2 transition-transform active:translate-y-[2px]',
        selected
          ? 'border-candy-pink bg-candy-pink-soft shadow-candy-sm'
          : 'border-white bg-white/85 hover:bg-candy-pink-soft/50',
      )}
    >
      {selected && (
        <span className="absolute right-1.5 top-1.5 text-sm leading-none">✅</span>
      )}
      <span className="text-2xl leading-none">{emoji}</span>
      <span className={cn('text-base font-black', selected ? 'text-candy-pink-deep' : 'text-ink')}>
        {label}
      </span>
      <span className="text-xs font-bold text-ink-soft">{count} 首</span>
    </button>
  );
}

/** 极简版分面：中性灰标签，选中才用果冻粉强调 */
function FacetCompact({ label, values, sel, onToggle }: { label: string; values: string[]; sel: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 w-10 shrink-0 text-xs font-extrabold text-ink-soft">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            className={cn(
              'tap-target rounded-full px-2.5 py-0.5 text-xs font-extrabold transition-colors',
              sel.has(v) ? 'bg-candy-pink text-candy-pink-on shadow-candy-xs' : 'bg-gray-100 text-ink-soft hover:bg-pink-100',
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
