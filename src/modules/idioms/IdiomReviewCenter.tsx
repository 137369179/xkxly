/**
 * 成语 SRS 复习中心（T-3.2 / T-3.5）
 * ------------------------------------------------------------
 * 交互：「先回忆，后揭示」的主动提取复习。
 *   A 回忆：展示含义线索 → 儿童先在心里回忆成语
 *   B 揭晓：点「揭晓答案」展示 成语 + 图 + 拼音 + 释义
 *   C 自评：✅「我记住了」 / ❌「又忘了」 → practice 回写 mastery
 * 复习结果为「记得」即标记一轮学习/掌握（复用 learnSkill），随后进入下一条。
 */
import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { IDIOMS, IDIOM_CATEGORIES, type Idiom } from '@/data/idioms';
import { useDueIdiomSkills, idiomSkill, idrLog } from './idiomSrs';
import { variantFor, type DrillVariant } from './drill';
import { DrillObjective } from './DrillObjective';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  onExit: () => void;
}

/** 每日完成一次复习的星星奖励 */
const REVIEW_STARS = 2;

type Phase = 'recall' | 'reveal' | 'judge' | 'done';

export function IdiomReviewCenter({ onExit }: Props) {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const learnSkill = useStore((s) => s.learnSkill);
  const completeDailyReview = useStore((s) => s.completeDailyReview);

  const dueSkills = useDueIdiomSkills();
  // 由 skill -> 成语；skills 全为 'idiom:' 前缀，故能一一对应
  const queue = useMemo(
    () => dueSkills.map((sk) => IDIOMS.find((i) => `idiom:${i.id}` === sk)).filter(Boolean) as Idiom[],
    [dueSkills],
  );

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(queue.length ? 'recall' : 'done');
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  /** 复盘形态：经典回忆（仅自评） / 趣味混合（含客观自动判题型） */
  const [mode, setMode] = useState<'recall' | 'mixed'>('mixed');

  const current: Idiom | undefined = queue[index];

  /**
   * 题型稳定分配（T-3.3）：按 skill 缓存一次题型。
   * 因每次 practice 都会把该条目的 due 推到未来、令其离开到期队列并触发
   * queue.ready→setIndex(0)，若每个成语"每次进来都按 index 重算"，则除了首卡，
   * 后续卡的位次恒为 0、客观题型永远不会出现。改为按成语稳定分配后，
   * 即使队列成员不断收缩，某个成语被轮到复习时仍保持其既定题型。
   */
  const [variantOf, setVariantOf] = useState<Record<string, DrillVariant>>({});
  useEffect(() => {
    if (mode === 'recall') return; // 经典模式恒为 recallWord，不需要分配
    setVariantOf((prev) => {
      const next = { ...prev };
      // 按到期队列顺序，为尚无题型的成语分配（轮回覆盖 5 种形态）
      dueSkills.forEach((sk, i) => {
        if (!next[sk]) next[sk] = variantFor(i, dueSkills.length, 'mixed');
      });
      return next;
    });
  }, [mode, dueSkills]);

  /** 当前题题型：经典模式 recallWord；混合模式取稳定分配的题型 */
  const variant: DrillVariant = current
    ? mode === 'recall'
      ? 'recallWord'
      : variantOf[idiomSkill(current.id)] ?? variantFor(index, queue.length, mode)
    : 'recallWord';
  const isObjective = variant === 'fillBlank' || variant === 'contextPick';

  // —— 渲染探针（性能排查用，`idiomReview_debug=1` 开启，默认零开销）——
  // 记录每次渲染的序号、自上次渲染间隔与当前所处状态，便于识别
  // 因 practice 回写/队列变化等因素触发的重渲染是否属预期。
  const renderNRef = useRef(0);
  const lastRenderMsRef = useRef(0);
  renderNRef.current += 1;
  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const sinceMs = lastRenderMsRef.current ? Math.round(nowMs - lastRenderMsRef.current) : -1;
  lastRenderMsRef.current = nowMs;
  idrLog('render', {
    n: renderNRef.current,
    since_ms: sinceMs,
    phase,
    index,
    current: current?.id ?? null,
    queueLength: queue.length,
  });

  // —— commit 耗时观测（每次渲染提交到屏幕后执行）——
  // lastRenderMsRef 在每次渲染起点被刷新，故此刻 dur_ms≈渲染+提交耗时，
  // 用于定位"单次交互是否触发慢渲染或过多重渲染"。
  useEffect(() => {
    idrLog('render.commit', {
      n: renderNRef.current,
      dur_ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - lastRenderMsRef.current),
      phase,
      index,
      current: current?.id ?? null,
    });
  });

  // —— 关键链路日志（默认关闭，`idiomReview_debug=1` 开启，见 idiomSrs.ts）——
  useEffect(() => {
    idrLog('mount', { dueSkills: dueSkills.length, queue: queue.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    idrLog('queue.ready', { queue: queue.map((i) => i.id).join(',') });
    setIndex(0);
    setPhase(queue.length ? 'recall' : 'done');
  }, [queue]);

  const next = () => {
    if (!current) return;
    idrLog('progress.next', { from: index, total: queue.length, variant });
    if (index + 1 >= queue.length) {
      idrLog('progress.done', { completed: queue.length });
      completeDailyReview(REVIEW_STARS); // 每日首次完成发放星星（store 内防重复）
      idrLog('reward.award', { stars: REVIEW_STARS });
      setPhase('done');
    } else {
      setIndex((i) => i + 1);
      setPhase('recall');
    }
  };

  const onReveal = () => {
    if (!current) return;
    idrLog('stage.reveal', { word: current.word });
    setPhase('reveal');
  };
  const onCorrect = () => {
    if (!current) return;
    idrLog('judge.remember', { skill: idiomSkill(current.id), word: current.word, level: current.level });
    practice(idiomSkill(current.id), true, 0, current.level);
    learnSkill(idiomSkill(current.id));
    next();
  };
  const onWrong = () => {
    if (!current) return;
    idrLog('judge.forgot', { skill: idiomSkill(current.id), word: current.word, level: current.level });
    practice(idiomSkill(current.id), false, 0, current.level);
    next();
  };

  /**
   * 客观题自动判定：
   *   - 对 → practice(true) 立即写回 + 下一题
   *   - 错 → 先揭晓正确答案，但**延后写回**，等点「下一题」时再 practice(false)。
   * 原因：practice 会让该项离开到期队列并触发 queue.ready→setIndex(0)/setPhase，
   * 若答错时立即写回，揭晓正确词会被下一题/完成态抢先覆盖，永远看不到。
   */
  const onObjAnswer = (correct: boolean) => {
    if (!current) return;
    idrLog('judge.objective', { skill: idiomSkill(current.id), word: current.word, variant, correct });
    if (correct) {
      practice(idiomSkill(current.id), true, 0, current.level);
      learnSkill(idiomSkill(current.id));
      next();
    } else {
      setPhase('reveal');
    }
  };

  /** 客观题答错后、看完正确答案时点「下一题」：补写错误并前进 */
  const onObjContinue = () => {
    if (!current) return;
    idrLog('judge.objective.continue', { skill: idiomSkill(current.id), word: current.word, variant });
    practice(idiomSkill(current.id), false, 0, current.level);
    next();
  };

  if (phase === 'done') {
    return (
      <Panel className="text-center">
        <div className="text-5xl">🎉</div>
        <p className="mt-2 text-lg font-black text-ink">{t('idioms.reviewDone')}</p>
        <p className="mt-1 text-sm font-bold text-ink-soft">{queue.length ? t('idioms.reviewDoneCount', { count: queue.length }) : t('idioms.reviewEmpty')}</p>
        {queue.length > 0 && (
          <p className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-sm font-extrabold text-yellow-700">
            ⭐ +{REVIEW_STARS} {t('idioms.reviewDoneReward')}
          </p>
        )}
        <div className="mt-4">
          <CandyButton tone="purple" size="lg" fullWidth onClick={onExit}>
            {t('idioms.reviewBack')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {/* 形态切换：经典回忆（仅自评） / 趣味混合（含客观题） */}
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('recall')}
            className={`rounded-full px-2.5 py-1 text-xs font-extrabold transition ${mode === 'recall' ? 'bg-white text-purple-700 shadow-sm' : 'text-ink-soft'}`}
          >
            {t('idioms.reviewModeRecall')}
          </button>
          <button
            type="button"
            onClick={() => setMode('mixed')}
            className={`rounded-full px-2.5 py-1 text-xs font-extrabold transition ${mode === 'mixed' ? 'bg-white text-purple-700 shadow-sm' : 'text-ink-soft'}`}
          >
            {t('idioms.reviewModeMixed')}
          </button>
        </div>
        <button type="button" onClick={onExit} className="text-sm font-bold text-ink-soft">
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink-soft">
          {t('idioms.reviewProgress', { cur: index + 1, total: queue.length })}
        </span>
        <span className="text-xs font-bold text-ink-soft/70">
          {variant === 'fillBlank' || variant === 'contextPick' ? t('idioms.reviewObjTag') : ''}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.id}-${phase}-${variant}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          {/* 线索/题干区：客观题直接作答；回忆型显示线索，揭晓阶段显示完整卡片 */}
          <Panel className="text-center">
            {phase === 'recall' ? (
              isObjective ? (
                <DrillObjective variant={variant as 'fillBlank' | 'contextPick'} idiom={current} onAnswer={onObjAnswer} />
              ) : (
                <RecallPrompt variant={variant} idiom={current} onReveal={onReveal} />
              )
            ) : (
              <ReviewCard idiom={current} />
            )}
          </Panel>

          {/* 揭晓后：客观答错→「下一题」；回忆型→自评 */}
          {phase === 'reveal' && (
            isObjective ? (
              <div className="pt-1">
                <p className="mb-3 text-center text-sm font-extrabold text-amber-600">{t('idioms.reviewObjWrong')}</p>
                <CandyButton tone="purple" size="lg" fullWidth onClick={onObjContinue}>
                  {t('idioms.reviewNext')}
                </CandyButton>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <CandyButton tone="green" size="lg" onClick={onCorrect}>
                  ✅ {t('idioms.reviewRemember')}
                </CandyButton>
                <CandyButton tone="orange" size="lg" onClick={onWrong}>
                  ❌ {t('idioms.reviewForgot')}
                </CandyButton>
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** 回忆型题干：按题型展示不同线索（含义 / 词面 / 图） */
function RecallPrompt({ variant, idiom, onReveal }: { variant: DrillVariant; idiom: Idiom; onReveal: () => void }) {
  const { t } = useTranslation();

  let prompt: ReactNode;
  if (variant === 'recallMeaning') {
    prompt = (
      <>
        <p className="text-sm font-extrabold text-ink-soft">{t('idioms.reviewRecallMeaningTip')}</p>
        <p className="mt-3 text-3xl font-black text-ink">{idiom.word}</p>
      </>
    );
  } else if (variant === 'picGuess') {
    prompt = (
      <>
        <p className="text-sm font-extrabold text-ink-soft">{t('idioms.reviewPicGuessTip')}</p>
        <div className="mx-auto mt-3 h-28 w-28 overflow-hidden rounded-2xl border-2 border-white shadow-sm">
          {idiom.image ? (
            <img src={idiom.image} alt={idiom.word} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="grid h-full w-full place-items-center text-5xl">{idiom.emoji}</div>
          )}
        </div>
      </>
    );
  } else {
    prompt = (
      <>
        <p className="text-sm font-extrabold text-ink-soft">{t('idioms.reviewRecallTip')}</p>
        <p className="mt-3 text-xl font-black leading-relaxed text-ink">{idiom.meaning}</p>
      </>
    );
  }

  return (
    <>
      {prompt}
      <div className="mt-4">
        <CandyButton tone="purple" size="lg" fullWidth onClick={onReveal}>
          {t('idioms.reviewReveal')}
        </CandyButton>
      </div>
    </>
  );
}

/** 展示完整成语卡片（图 + 词面 + 拼音 + 主题徽章） */
function ReviewCard({ idiom }: { idiom: Idiom }) {
  const { t } = useTranslation();
  // 渲染计数：连续序号上升但 word 未变，说明该卡片被父级重渲染重复触发
  const cardNRef = useRef(0);
  cardNRef.current += 1;
  idrLog('render.card', { word: idiom.word, n: cardNRef.current });

  return (
    <div className="text-center">
      {idiom.image ? (
        <div className="mx-auto h-32 w-32 overflow-hidden rounded-2xl border-2 border-white shadow-sm">
          <img src={idiom.image} alt={idiom.word} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        </div>
      ) : (
        <div className="text-5xl">{idiom.emoji}</div>
      )}
      <div className="mt-3 flex items-center justify-center gap-2">
        <h3 className="text-3xl font-black text-ink">{idiom.word}</h3>
        {idiom.category && (
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2.5 py-0.5 text-[11px] font-extrabold text-pink-700">
            <span>{IDIOM_CATEGORIES.find((c) => c.id === idiom.category)?.emoji}</span>
            <span>{categoryLabel(idiom.category)}</span>
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm font-bold text-ink-soft">{idiom.pinyin}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink">{idiom.meaning}</p>
      <p className="mt-2 text-xs font-bold text-ink-soft">{t('idioms.reviewSelfTip')}</p>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  study: '勤学',
  wisdom: '智慧',
  nature: '自然',
  character: '品格',
  fable: '寓言',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}