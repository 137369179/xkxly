/**
 * 古诗详情面板（4 分组 / 6 标签）
 * ------------------------------------------------------------
 * 儿童化改造：6 个 DetailTab 字面量值一个都不变（被 PoemsPage / TrainView / PlanView
 * 共享，改值会连锁编译错误），只把 UI 从「6 个平铺 tab」收敛成 4 个分组：
 *   📖 读一读 —— 原文（阅读 + 标难点 + 节奏条）/ 注解（逐句串讲 + 典故溯源）
 *   🎮 玩一玩 —— 九宫拼诗小游戏（PoemFill，原孤儿组件，此处首次挂载）
 *   🎒 学一学 —— 语境（作者史料 + 外链）/ 研读（批注 + 对比 + 自测 + 背诵 + 复习计划）/ 问小茜
 *   🎓 小博士 —— 格律（标准谱对照 + AI 解读），成人专业向，默认折叠
 * 功能零删除，只是重新分组成人/儿童的阅读优先级。
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import type { DeepPoem } from '@/types';
import DEEP_POEMS from '@/data/poems-deep';
import { useStore, usePoemFavorites, usePoemNote, useSettings } from '@/store/useStore';
import { CandyButton, IconButton } from '@/components/ui/Button';
import { MarkPanel, LineGloss, ProsodyGrid, PoetCard } from './PoemStudy';
import { ChantBar, QuizRunner, ReciteRunner, PlanSummary } from './PoemTrain';
import { AiChat, AiPanel } from '@/components/ai';
import { poemTutorTask, poemImagineTask, poemCompareTask, poemProsodyTask, poetStoryTask } from '@/lib/ai/tasks';
import type { PoemCtx, PoemCompareInput } from '@/lib/ai/prompts';
import { useAiStream } from '@/lib/ai/useAi';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

// 九宫拼诗是「玩一玩」才用到的游戏，懒加载成独立 chunk，不拖慢详情页首屏。
const PoemFill = lazy(() => import('./PoemFill').then((m) => ({ default: m.PoemFill })));

export type DetailTab = '原文' | '注解' | '格律' | '语境' | '研读' | '问小茜';

/** 儿童向分组：组内再细分 tab，组是孩子唯一需要理解的一层 */
type DetailGroup = '读一读' | '玩一玩' | '学一学' | '小博士';

const GROUPS: { key: DetailGroup; emoji: string; hint: string; tabs: DetailTab[] }[] = [
  { key: '读一读', emoji: '📖', hint: '读诗 · 懂意思', tabs: ['原文', '注解'] },
  { key: '玩一玩', emoji: '🎮', hint: '九宫拼诗', tabs: [] },
  { key: '学一学', emoji: '🎒', hint: '故事 · 自测 · 提问', tabs: ['语境', '研读', '问小茜'] },
  { key: '小博士', emoji: '🎓', hint: '给爸爸妈妈 / 大朋友', tabs: ['格律'] },
];

const GROUP_OF_TAB: Record<DetailTab, DetailGroup> = {
  '原文': '读一读',
  '注解': '读一读',
  '格律': '小博士',
  '语境': '学一学',
  '研读': '学一学',
  '问小茜': '学一学',
};

const TAB_KEYS: Record<DetailTab, string> = {
  '原文': 'poem.detail.tabOriginal',
  '注解': 'poem.detail.tabAnnotation',
  '格律': 'poem.detail.tabProsody',
  '语境': 'poem.detail.tabContext',
  '研读': 'poem.detail.tabStudy',
  '问小茜': 'poem.detail.tabAsk',
};

export default function PoemDetail({
  poem,
  initialTab = '原文',
  onClose,
  onOpen,
}: {
  poem: DeepPoem;
  initialTab?: DetailTab;
  onClose: () => void;
  onOpen: (id: string, tab?: DetailTab) => void;
}) {
  const { t: tr } = useTranslation();
  const { showPinyin } = useSettings();
  const favorites = usePoemFavorites();
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const togglePoemFavorite = useStore((s) => s.togglePoemFavorite);
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [group, setGroup] = useState<DetailGroup>(() => GROUP_OF_TAB[initialTab]);
  // 小博士（格律）是成人专业向内容，默认折叠，需再点一次「展开」才显示
  const [proOpen, setProOpen] = useState(false);

  const groupTabs = GROUPS.find((g) => g.key === group)?.tabs ?? [];
  // 组内当前 tab：切组时自动落到该组第一个 tab，避免出现「组和内容不一致」
  const activeTab: DetailTab = groupTabs.includes(tab) ? tab : groupTabs[0] ?? tab;

  const switchGroup = (g: DetailGroup) => {
    setGroup(g);
    const tabs = GROUPS.find((x) => x.key === g)?.tabs ?? [];
    if (tabs[0] && !tabs.includes(tab)) setTab(tabs[0]);
    if (g !== '小博士') setProOpen(false);
  };

  const rec = useMemo(() => recommend(poem), [poem]);

  return (
    <div className="max-h-[82vh] overflow-y-auto">
      {/* 标题 */}
      <div className="mb-3 text-center">
        <h2 className="text-4xl font-extrabold leading-tight text-candy-pink-deep sm:text-5xl">{poem.title}</h2>
        <p className="mt-1 text-base font-bold text-ink-soft">
          {poem.dynasty} · {poem.author} · {poem.genre}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {(poem.themes ?? []).map((t) => (
            <span key={t} className="rounded-full bg-candy-purple-soft px-2.5 py-0.5 text-xs font-bold text-candy-purple-deep">{t}</span>
          ))}
        </div>
      </div>

      {/* 分组切换：4 张大卡（≥88px），孩子只需要认识这一层 */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GROUPS.map((g) => {
          const on = group === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => switchGroup(g.key)}
              className={cn(
                'no-select flex min-h-[88px] flex-col items-center justify-center gap-0.5 rounded-3xl border-4 px-2 py-2 transition-transform active:translate-y-[2px]',
                on
                  ? 'border-candy-pink bg-candy-pink-soft shadow-candy-sm'
                  : 'border-white bg-white/80 hover:bg-candy-pink-soft/60',
              )}
            >
              <span className="text-3xl leading-none">{g.emoji}</span>
              <span className={cn('text-base font-black', on ? 'text-candy-pink-deep' : 'text-ink')}>
                {g.key}
              </span>
              <span className="text-center text-[11px] font-bold leading-tight text-ink-soft">{g.hint}</span>
            </button>
          );
        })}
      </div>

      {/* 组内细分：只有多 tab 的组才需要，且小博士展开后才出现 */}
      {groupTabs.length > 1 && !(group === '小博士' && !proOpen) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {groupTabs.map((tk) => (
            <CandyButton key={tk} tone={activeTab === tk ? 'pink' : 'purple'} variant={activeTab === tk ? 'solid' : 'soft'} size="sm" onClick={() => setTab(tk)}>
              {tr(TAB_KEYS[tk] ?? 'poem.detail.tabOriginal')}
            </CandyButton>
          ))}
        </div>
      )}

      <div className="rounded-3xl bg-white/70 p-4">
        {group === '玩一玩' && (
          <Suspense fallback={<p className="py-10 text-center text-base font-extrabold text-ink-soft">🎮 小游戏加载中…</p>}>
            <PoemFill />
          </Suspense>
        )}

        {group === '小博士' &&
          (proOpen ? (
            <div className="space-y-4">
              <ProsodyGrid poem={poem} />
              <PoemProsodyAI poem={poem} />
            </div>
          ) : (
            <ProsodyLocked onExpand={() => setProOpen(true)} />
          ))}

        {group === '读一读' && activeTab === '原文' && (
          <div className="space-y-4">
            <MarkPanel poem={poem} showPinyin={showPinyin} />
            <div>
              <p className="mb-2 font-extrabold text-candy-pink-deep">{tr('poem.detail.reciteChant')}</p>
              <ChantBar poem={poem} />
            </div>
            <PoemImagine poem={poem} />
          </div>
        )}
        {group === '读一读' && activeTab === '注解' && (
          <div className="space-y-4">
            <Annotations poem={poem} />
            <LineGloss poem={poem} />
          </div>
        )}

        {group === '学一学' && activeTab === '语境' && (
          <div className="space-y-4">
            <Context poem={poem} />
            <PoetCard poem={poem} />
            <PoetStoryAI poem={poem} />
          </div>
        )}
        {group === '学一学' && activeTab === '研读' && (
          <div className="space-y-4">
            <StudyTab poem={poem} sim={rec.sim} adv={rec.adv} onOpen={onOpen} />
            <div>
              <p className="mb-2 font-extrabold text-candy-pink-deep">{tr('poem.detail.selfTestBank')}</p>
              <QuizRunner poem={poem} />
            </div>
            <div>
              <p className="mb-2 font-extrabold text-candy-pink-deep">{tr('poem.detail.reciteStaged')}</p>
              <ReciteRunner poem={poem} />
            </div>
            <PlanSummary poem={poem} />
          </div>
        )}
        {group === '学一学' && activeTab === '问小茜' && (
          <div className="space-y-3">
            <p className="font-extrabold text-candy-pink-deep">{tr('poem.detail.aiTutorTitle')}</p>
            <PoemTutor poem={poem} />
          </div>
        )}
      </div>

      {/* 收藏 / 关闭 */}
      <div className="mt-5 flex gap-3">
        <IconButton tone="purple" label={favSet.has(poem.id) ? tr('poem.detail.unfavorite') : tr('poem.detail.favorite')} onClick={() => togglePoemFavorite(poem.id)}>
          {favSet.has(poem.id) ? '❤️' : '🤍'}
        </IconButton>
        <CandyButton tone="green" variant="soft" size="lg" fullWidth onClick={onClose}>{tr('poem.detail.collapseBtn')}</CandyButton>
      </div>
    </div>
  );
}

/** 小博士（格律）折叠态：明确标注成人向，孩子不会被专业术语劝退 */
function ProsodyLocked({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="space-y-3 py-2 text-center">
      <div className="text-4xl">🎓</div>
      <p className="text-base font-black text-ink">这里是「格律」小知识</p>
      <p className="text-sm font-bold text-ink-soft">
        平仄、押韵、对仗…有点难，是给爸爸妈妈 / 大朋友看的，小朋友可以先跳过哦。
      </p>
      <CandyButton tone="purple" variant="soft" size="lg" onClick={onExpand}>
        我是大朋友，展开看看
      </CandyButton>
    </div>
  );
}

/* ---------------- 智能推荐 ---------------- */
function recommend(poem: DeepPoem) {
  const sim = DEEP_POEMS.filter((p) => p.id !== poem.id)
    .map((p) => {
      let s = 0;
      s += (p.themes ?? []).filter((t) => (poem.themes ?? []).includes(t)).length * 2;
      s += (p.imagery ?? []).filter((i) => (poem.imagery ?? []).includes(i)).length;
      if (p.author === poem.author) s += 3;
      if (p.dynasty === poem.dynasty) s += 1;
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map((x) => x.p);
  const adv = DEEP_POEMS.filter((p) => p.id !== poem.id && p.genre === poem.genre && (p.difficulty ?? 0) >= (poem.difficulty ?? 0))
    .sort((a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0))
    .slice(0, 5);
  return { sim, adv };
}

/* ---------------- AI 古诗导师（多轮答疑） ---------------- */
function PoemTutor({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const ctx: PoemCtx = {
    title: poem.title,
    author: poem.author,
    dynasty: poem.dynasty,
    text: poem.lines.map((l) => l.text).join('\n'),
    // 已有权威串讲作为事实依据，避免模型胡编
    reference: poem.dossier?.translation ?? poem.authorBio,
  };
  return (
    <AiChat
      tone="green"
      buildTask={(q, h) => poemTutorTask(ctx, q, h)}
      quickQuestions={[tr('poem.detail.qWhat'), tr('poem.detail.qFun'), tr('poem.detail.qRecite'), tr('poem.detail.qWhy')]}
    />
  );
}

/* ---------------- 注解 ---------------- */
function Annotations({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const d = poem.dossier;
  if (!d) {
    return (
      <div className="space-y-3 text-sm text-ink-soft">
        <p>{tr('poem.detail.noAnnotation')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.termTranslation')}</p>
        <p className="text-sm leading-relaxed text-ink">{d.translation}</p>
      </div>
      {d.annotations && d.annotations.length > 0 && (
        <div>
          <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.wordAnnotation')}</p>
          <ul className="space-y-1.5">
            {d.annotations.map((a, i) => (
              <li key={`a-${i}`} className="rounded-xl bg-white/70 p-2.5 text-sm">
                <span className="font-extrabold text-candy-purple-deep">{a.term}：</span>
                <span className="text-ink">{a.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.allusions && d.allusions.length > 0 && (
        <div>
          <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.allusionNote')}</p>
          <ul className="space-y-1.5">
            {d.allusions.map((a, i) => (
              <li key={`a-${i}`} className="rounded-xl bg-amber-50 p-2.5 text-sm">
                <span className="font-extrabold text-amber-700">{a.term}：</span>
                <span className="text-ink">{a.explain}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.rhetoric && d.rhetoric.length > 0 && (
        <div>
          <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.rhetoricNote')}</p>
          <ul className="space-y-1.5">
            {d.rhetoric.map((r, i) => (
              <li key={`r-${i}`} className="rounded-xl bg-white/70 p-2.5 text-sm">
                <span className="font-extrabold text-candy-blue-deep">{r.type}</span>
                <span className="text-ink-soft">（{r.where}）</span>
                <p className="text-ink">{r.explain}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------- 语境 ---------------- */
function Context({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.authorBg')}</p>
        <p className="text-sm leading-relaxed text-ink">{poem.authorBio}</p>
      </div>
      {poem.dossier?.context && (
        <div>
          <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.createContext')}</p>
          <p className="text-sm leading-relaxed text-ink">{poem.dossier.context}</p>
        </div>
      )}
      <div>
        <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.imageryLabel')}</p>
        <div className="flex flex-wrap gap-1.5">
          {poem.imagery && poem.imagery.length ? (
            poem.imagery.map((i) => (
              <span key={`tag-${i}`} className="rounded-full bg-candy-green-soft px-2.5 py-0.5 text-xs font-bold text-candy-green-deep">{i}</span>
            ))
          ) : (
            <span className="text-sm text-ink-soft">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 研读（批注 + 对比 + 推荐） ---------------- */
function StudyTab({
  poem,
  sim,
  adv,
  onOpen,
}: {
  poem: DeepPoem;
  sim: DeepPoem[];
  adv: DeepPoem[];
  onOpen: (id: string, tab?: DetailTab) => void;
}) {
  const { t: tr } = useTranslation();
  const note = usePoemNote(poem.id);
  const setPoemNote = useStore((s) => s.setPoemNote);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const comparePoem = compareId ? DEEP_POEMS.find((p) => p.id === compareId) ?? null : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.myNote')}</p>
        <textarea
          value={note}
          onChange={(e) => setPoemNote(poem.id, e.target.value)}
          placeholder={tr('poem.detail.notePlaceholder')}
          rows={3}
          className="w-full rounded-2xl border-2 border-candy-pink-soft bg-white/80 p-3 text-sm font-semibold text-ink outline-none focus:border-candy-pink"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="font-extrabold text-candy-pink-deep">{tr('poem.detail.compareTitle')}</p>
          <CandyButton tone="blue" variant="soft" size="sm" onClick={() => setPicker((v) => !v)}>
            {picker ? tr('poem.detail.collapse') : tr('poem.detail.pickCompare')}
          </CandyButton>
        </div>
        {picker && (
          <div className="mb-2 max-h-40 overflow-y-auto rounded-2xl bg-white/70 p-2">
            {DEEP_POEMS.filter((p) => p.id !== poem.id).slice(0, 60).map((p) => (
              <button key={p.id} onClick={() => { setCompareId(p.id); setPicker(false); }} className="mr-1.5 mb-1.5 rounded-full bg-candy-blue-soft px-3 py-1 text-xs font-bold text-candy-blue-deep">
                {p.title}
              </button>
            ))}
          </div>
        )}
        {comparePoem && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CompareCol poem={poem} />
              <CompareCol poem={comparePoem} />
            </div>
            <PoemCompareAI poemA={poem} poemB={comparePoem} />
          </div>
        )}
      </div>

      <div>
        <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.similarTitle')}</p>
        <RecRow poems={sim} onOpen={onOpen} />
      </div>
      <div>
        <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.advTitle')}</p>
        <RecRow poems={adv} onOpen={onOpen} />
      </div>
    </div>
  );
}

function CompareCol({ poem }: { poem: DeepPoem }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <p className="mb-1 text-center text-sm font-extrabold text-candy-pink-deep">{poem.title}</p>
      <p className="mb-2 text-center text-xs font-bold text-ink-soft">{poem.author}·{poem.genre}</p>
      <div className="space-y-0.5 text-center">
        {poem.lines.map((l, i) => (
          <p key={`l-${i}`} className="text-sm font-semibold text-ink">{l.text}</p>
        ))}
      </div>
      {poem.dossier && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{poem.dossier.translation}</p>}
    </div>
  );
}

function RecRow({ poems, onOpen }: { poems: DeepPoem[]; onOpen: (id: string, tab?: DetailTab) => void }) {
  const { t: tr } = useTranslation();
  if (!poems.length) return <p className="text-sm text-ink-soft">{tr('poem.detail.noMore')}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {poems.map((p) => (
        <button key={p.id} onClick={() => onOpen(p.id)} className="rounded-full bg-candy-purple-soft px-3 py-1.5 text-xs font-extrabold text-candy-purple-deep hover:brightness-105">
          {p.title}·{p.author}
        </button>
      ))}
    </div>
  );
}

/* ---------------- v6 新增：古诗画面想象 ---------------- */
function PoemImagine({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const task = useMemo(
    () => poemImagineTask(
      poem.title, poem.author,
      poem.lines.map((l) => l.text).join('\n'),
      poem.dossier?.translation ?? poem.authorBio,
    ),
    [poem],
  );
  const ai = useAiStream(task);
  return (
    <div>
      <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.imagineTitle')}</p>
      <AiPanel state={ai} tone="pink" compact />
    </div>
  );
}

/* ---------------- v6 新增：格律 AI 解读 ---------------- */
function PoemProsodyAI({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const prosodyInfo = `${poem.genre}，${poem.lines.length} 句，${poem.lines.map(l => l.text).join('，')}`;
  const task = useMemo(
    () => poemProsodyTask(poem.title, poem.author, prosodyInfo),
    [poem],
  );
  const ai = useAiStream(task);
  return (
    <div>
      <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.prosodyTitle')}</p>
      <AiPanel state={ai} tone="purple" compact />
    </div>
  );
}

/* ---------------- v6 新增：诗人故事会 ---------------- */
function PoetStoryAI({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const task = useMemo(
    () => poetStoryTask(poem.author, poem.dynasty, poem.authorBio || `${poem.dynasty}朝诗人`),
    [poem],
  );
  const ai = useAiStream(task);
  return (
    <div>
      <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.poetStoryTitle')}</p>
      <AiPanel state={ai} tone="blue" compact />
    </div>
  );
}

/* ---------------- v6 新增：古诗对比讲解 ---------------- */
function PoemCompareAI({ poemA, poemB }: { poemA: DeepPoem; poemB: DeepPoem }) {
  const { t: tr } = useTranslation();
  const input: PoemCompareInput = useMemo(() => ({
    titleA: poemA.title, authorA: poemA.author, textA: poemA.lines.map(l => l.text).join('\n'),
    titleB: poemB.title, authorB: poemB.author, textB: poemB.lines.map(l => l.text).join('\n'),
  }), [poemA, poemB]);
  const task = useMemo(() => poemCompareTask(input), [input]);
  const ai = useAiStream(task);
  return (
    <div>
      <p className="mb-1 font-extrabold text-candy-pink-deep">{tr('poem.detail.compareDiffTitle')}</p>
      <AiPanel state={ai} tone="green" compact />
    </div>
  );
}
