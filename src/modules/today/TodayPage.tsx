import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { LessonSection, Question, Progress } from '@/types';
import {
  useStore,
  useMastery,
  useWrongBook,
  useDailyLog,
  useLessonDate,
  useLessonStep,
} from '@/store/useStore';
import { buildDailyPlan, dateKey } from '@/lib/dailyPlan';
import { rampDifficulty } from '@/lib/difficulty';

import {
  makeMathQuestion,
  makeDailyMixedQuestion,
  questionForSkill,
  type Difficulty,
} from '@/lib/questions';
import { SKILL, weakSkills } from '@/lib/srs';
import { smartDifficulty } from '@/lib/difficulty';
import { PageHeader } from '@/components/ui/Card';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QuizCard } from '@/components/QuizCard';
import { DailyGoal } from '@/components/quiz/DailyGoal';
import { LetterLearn } from '@/components/games/LetterLearn';
import { NumberLearn } from '@/modules/today/NumberLearn';
import { sfxTap, sfxStar, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useStruggle } from '@/lib/struggle';
import { StruggleModal } from '@/components/feedback/StruggleModal';
import { cn } from '@/lib/utils';
import { useRoute, navigate } from '@/lib/router';
import { useTranslation } from '@/i18n/useTranslation';
import {
  DailySummary,
  PoemActivity,
  HanziActivity,
  PinyinActivity,
  WordActivity,
} from './TodaySections';
import { DailySrsMission } from './DailySrsMission';

/* ========================================================================
 * 通用小题循环（复习 / 综合），复用 QuizCard，逐题记录到掌握度
 * ===================================================================== */
function SectionRunner({
  gen,
  record,
  count,
  tone,
  onDone,
  finishLabel,
}: {
  gen: () => Question;
  record: (q: Question, correct: boolean) => void;
  count: number;
  tone: Parameters<typeof ProgressBar>[0]['tone'];
  onDone: () => void;
  finishLabel?: string;
}) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState<Question>(() => gen());
  // P1-5: 学习困难实时干预——连错 3 题弹鼓励 Modal，可选「继续」或「跳过」
  const struggle = useStruggle();

  const next = useCallback(() => {
    if (idx + 1 >= count) {
      onDone();
      return;
    }
    setIdx((i) => i + 1);
    setQ(gen());
  }, [idx, count, gen, onDone]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-extrabold text-ink-soft">
          {t('today.questionProgress', { current: idx + 1, total: count })}
        </span>
        <ProgressBar value={idx} max={count} tone={tone} showLabel={false} />
      </div>
      <QuizCard
        key={q.id}
        question={q}
        autoSpeak
        // 答对 1200ms 自动进下一题（答错不自动推进）；与 DailySrsMission 先例一致
        autoNextMs={1200}
        onAnswer={(correct) => {
          record(q, correct);
          struggle.record(correct);
        }}
        onNext={next}
        nextLabel={idx + 1 >= count ? finishLabel : t('today.nextQuestion')}
        meta={t('today.questionProgress', { current: idx + 1, total: count })}
      />
      <StruggleModal
        open={struggle.isStruggling}
        wrongStreak={struggle.wrongStreak}
        onContinue={() => struggle.reset()}
        onSkip={() => {
          struggle.reset();
          next();
        }}
      />
    </div>
  );
}

/* ========================================================================
 * 各节活动
 * ===================================================================== */
function ReviewActivity({ refs, onDone }: { refs: string[]; onDone: () => void }) {
  const { t } = useTranslation();
  const mastery = useMastery();
  const practice = useStore((s) => s.practice);
  const iRef = useRef(0);
  const count = Math.max(2, Math.min(8, refs.length));

  const gen = useCallback((): Question => {
    const skill = refs[iRef.current % refs.length] ?? 'math:add';
    iRef.current += 1;
    const cat = skill.split(':')[0] ?? 'math';
    const d = rampDifficulty({ mastery } as Progress, cat) as Difficulty;
    const q = questionForSkill(skill, d) ?? makeMathQuestion(d);
    // P1-3: 标注出题难度，供 SRS 难度感知复习
    if (q) q.difficulty = d;
    return q;
  }, [refs, mastery]);

  return (
    <SectionRunner
      gen={gen}
      count={count}
      tone="orange"
      onDone={onDone}
      finishLabel={t('today.reviewDone')}
      record={(q, correct) => q.skill && practice(q.skill, correct, 1, q.difficulty)}
    />
  );
}

function QuizActivity({ todaySkills, onDone }: { todaySkills: string[]; onDone: () => void }) {
  const { t } = useTranslation();
  const mastery = useMastery();
  const wrongBook = useWrongBook();
  const practice = useStore((s) => s.practice);

  const gen = useCallback((): Question => {
    // 综合小挑战按优先级回扣：错题本 > 薄弱知识点 > 当天内容 > 全题型混合
    // 让孩子每天打开就能先拣回最需要巩固的内容，而不是完全随机出题
    const weak = weakSkills({ mastery } as Progress, 6).map((w) => w.skill);
    const d = smartDifficulty({ mastery } as Progress);
    const q = makeDailyMixedQuestion(todaySkills, d, {
      wrongBook,
      weakSkills: weak,
    });
    // P1-3: 标注出题难度，供 SRS 难度感知复习
    if (q) q.difficulty = d;
    return q;
  }, [mastery, wrongBook, todaySkills]);

  return (
    <SectionRunner
      gen={gen}
      count={6}
      tone="green"
      onDone={onDone}
      finishLabel={t('today.challengeDone')}
      record={(q, correct) => q.skill && practice(q.skill, correct, 1, q.difficulty)}
    />
  );
}

/* ========================================================================
 * 薄弱点专项深链（Phase 3-②）：从家长报告「去练习」进入，针对单一学科强化
 * ===================================================================== */
const FOCUS_SUBJECTS: Record<string, string> = {
  letter: 'today.subject.letter',
  number: 'today.subject.number',
  math: 'today.subject.math',
  poem: 'today.subject.poem',
  hanzi: 'today.subject.hanzi',
  pinyin: 'today.subject.pinyin',
  word: 'today.subject.word',
  logic: 'today.subject.logic',
  idiom: 'today.subject.idiom',
  sentence: 'today.subject.sentence',
};

function FocusActivity({ subject, onDone }: { subject: string; onDone: () => void }) {
  const { t } = useTranslation();
  const mastery = useMastery();
  const wrongBook = useWrongBook();
  const practice = useStore((s) => s.practice);
  const iRef = useRef(0);
  const COUNT = 8;
  const focusKey = FOCUS_SUBJECTS[subject];
  const label = focusKey ? t(focusKey) : subject;

  const gen = useCallback((): Question => {
    // 优先练该学科薄弱点(lv<3)与错题本，再退回到全部已接触知识点，无重复
    const weak = weakSkills({ mastery } as Progress, 40)
      .map((w) => w.skill)
      .filter((s) => s.startsWith(subject + ':'));
    const wrong = wrongBook.filter((s) => s.startsWith(subject + ':'));
    const all = Object.keys(mastery).filter((k) => k.startsWith(subject + ':'));
    const pool = Array.from(new Set([...weak, ...wrong, ...all]));
    const skill = pool.length ? pool[iRef.current % pool.length] : `${subject}:${subject}`;
    iRef.current += 1;
    const targetSkill = skill ?? `${subject}:${subject}`;
    const d = rampDifficulty({ mastery } as Progress, subject) as Difficulty;
    const q = questionForSkill(targetSkill, d) ?? makeDailyMixedQuestion([], d, { weakSkills: weak.slice(0, 1) });
    // P1-3: 标注出题难度，供 SRS 难度感知复习
    if (q) q.difficulty = d;
    return q;
  }, [mastery, wrongBook, subject]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="🎯" title={t('today.focusTitle', { label })} subtitle={t('today.focusSubtitle')} tone="purple" />
      <SectionRunner
        gen={gen}
        count={COUNT}
        tone="purple"
        onDone={onDone}
        finishLabel={t('today.focusDone')}
        record={(q, correct) => q.skill && practice(q.skill, correct, 1, q.difficulty)}
      />
    </div>
  );
}

/**
 * 从课程包的小节里提取「当天已学过的知识点 skill id」列表。
 * 用于综合小挑战回扣当天内容。
 * - letter/number/hanzi/pinyin/poem/word：按 refs 还原成完整 skill id
 * - review：refs 本身就是完整 skill id
 * - quiz：无 refs，跳过
 */
function collectTodaySkills(sections: LessonSection[]): string[] {
  const skills: string[] = [];
  for (const s of sections) {
    if (!s.refs || s.refs.length === 0) continue;
    switch (s.kind) {
      case 'letter':
        skills.push(SKILL.letter(String(s.refs[0])));
        break;
      case 'number':
        s.refs.forEach((n: string | number) => skills.push(SKILL.number(Number(n))));
        break;
      case 'hanzi':
        skills.push(SKILL.hanzi(String(s.refs[0])));
        break;
      case 'pinyin':
        skills.push(SKILL.pinyin(String(s.refs[0])));
        break;
      case 'poem':
        skills.push(SKILL.poem(String(s.refs[0])));
        break;
      case 'word':
        skills.push(SKILL.word(String(s.refs[0])));
        break;
      case 'review':
        // review 的 refs 已经是完整 skill id
        s.refs.forEach((r: string | number) => skills.push(String(r)));
        break;
      default:
        break;
    }
  }
  return skills;
}

/** 空跳过集合：模块级常量，保证引用稳定（换天 / 重新开始 时复用） */
const NO_SKIPS: ReadonlySet<number> = new Set<number>();

/* ========================================================================
 * 主页面
 * ===================================================================== */
/* ========================================================================
 * 今日课程主页
 * ===================================================================== */

/* ========================================================================
 * 今日课程主页
 * ===================================================================== */
export default function TodayPage() {
  // —— Rules of Hooks 修复：所有 hook 必须无条件调用，置于任何条件 return 之前 ——
  // 普通分支与焦点学科分支（today/letter ↔ today）必须保持完全一致的 hook 顺序与数量，
  // 否则 <TodayPage/> 因 key 固定不卸载重挂载，会触发 "Rendered fewer hooks than expected" 白屏。
  const { t } = useTranslation();
  const mastery = useMastery();
  const dailyLog = useDailyLog();
  const lessonDate = useLessonDate();
  const lessonStep = useLessonStep();
  const { param } = useRoute();
  const setLessonStep = useStore((s) => s.setLessonStep);
  const finishLesson = useStore((s) => s.finishLesson);
  const addFish = useStore((s) => s.addFish);

  const today = dateKey();
  // 课程包按「天」稳定生成：当天内不随进度变化重排
  // intentional: plan is stable per day, ignore progress changes to avoid daily plan regeneration
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => buildDailyPlan({ mastery } as Progress, Date.now()), [today]);

  const done = !!dailyLog[today]?.lesson;
  const step = done
    ? plan.sections.length
    : lessonDate === today
      ? Math.min(lessonStep, plan.sections.length)
      : 0;

  /* ——————————————————————————————————————————————————————————————
   * 自由选节 + 跳过本节（儿童化：学过的节随时点回去重学，不想学的可以先跳过）
   * - maxStep：主线游标（store 的 lessonStep），即「已解锁到的最高节」，不可越过；
   * - cur：当前正在学的节，可自由回到 cur ≤ maxStep 的任意一节，
   *        但永远到不了从未解锁过的节（保留 maxReached 约束，防跳关刷星）。
   * ——————————————————————————————————————————————————————— */
  const lastIndex = plan.sections.length - 1;
  // 夹到最后一节：历史遗留的 lessonStep 可能大于今天的节数（换天/课程变短），
  // 不夹会导致最后一节学完既不推进也不结算，把孩子卡死。
  const maxStep = Math.min(step, lastIndex);
  const [focus, setFocus] = useState<number | null>(null);
  const cur = focus !== null && focus >= 0 && focus <= maxStep ? focus : maxStep;

  // 当天被跳过的节：只存组件内 state（按天隔离，换天自然失效），不写入 store
  const [skipState, setSkipState] = useState<{ day: string; set: ReadonlySet<number> }>(() => ({
    day: today,
    set: NO_SKIPS,
  }));
  const skipped = skipState.day === today ? skipState.set : NO_SKIPS;

  // 跳过后的短暂提示：儿童产品不弹强确认，只用温和的 aria-live 提示 + 可撤销（点回来即可）
  const [skipHint, setSkipHint] = useState('');
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSkipHint = useCallback((text: string) => {
    setSkipHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      hintTimer.current = null;
      setSkipHint('');
    }, 2800);
  }, []);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  /**
   * 推进的唯一出口（完成一节 / 跳过一节 都走这里）：
   * 只有走在主线游标上（cur === maxStep）才推进主线进度；
   * 回去重学旧节完成时不改变主线进度，只是把视角交还主线。
   */
  const handleDone = useCallback(() => {
    const ns = cur + 1;
    if (ns > maxStep) {
      if (ns >= plan.sections.length) {
        finishLesson(3);
        addFish(2);
        sfxStar();
        celebrateBig();
      } else {
        setLessonStep(ns);
      }
    }
    setFocus(null);
    // 学完就摘掉「已跳过」标记
    setSkipState((prev) => {
      if (!prev.set.has(cur)) return prev;
      const next = new Set(prev.set);
      next.delete(cur);
      return { day: prev.day, set: next };
    });
  }, [cur, maxStep, plan.sections.length, finishLesson, addFish, setLessonStep]);

  /** 跳过当前这一节：先走 handleDone 统一推进，再打上「可回来学」标记 */
  const handleSkip = useCallback(() => {
    handleDone();
    setSkipState((prev) => {
      const next = new Set(prev.day === today ? prev.set : NO_SKIPS);
      next.add(cur);
      return { day: today, set: next };
    });
    showSkipHint(`已跳过「${plan.sections[cur]?.title ?? ''}」，下次还能回来学～`);
  }, [handleDone, cur, today, plan.sections, showSkipHint]);

  /** 关卡地图上自由选节（只能点已解锁过的节） */
  const jumpTo = useCallback(
    (i: number) => {
      if (i < 0 || i > maxStep) return;
      triggerHaptic(12);
      sfxTap();
      setFocus(i);
    },
    [maxStep],
  );

  // 当天已学过的知识点（综合小挑战回扣用）
  const todaySkills = useMemo(
    () => collectTodaySkills(plan.sections.slice(0, step + 1)),
    [plan, step],
  );

  const restart = () => {
    triggerHaptic(20);
    setLessonStep(0);
    setFocus(null);
    setSkipState({ day: today, set: NO_SKIPS });
  };

  const active: LessonSection | undefined = plan.sections[cur];
  /** 只有「主线当前节」可跳过；最后一节必须学完才能开宝箱，避免连跳套奖励 */
  const canSkip = cur === maxStep && cur < lastIndex;

  // 全局键盘快捷键响应 (Esc 返回主页)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerHaptic(20);
        navigate('home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 薄弱点专项深链：从家长报告「去练习」进入，针对单一学科强化巩固。
  // 必须放在所有 hook 调用之后，保证两种分支 hook 数量一致。
  if (param && Object.prototype.hasOwnProperty.call(FOCUS_SUBJECTS, param)) {
    return <FocusActivity subject={param} onDone={() => navigate('today')} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader emoji="📅" title={t('today.title')} subtitle={t('today.subtitle')} tone="purple" />

      {/* 快捷操作提示条 */}
      <div className="space-y-1.5 text-center">
        <span className="inline-block text-xs text-purple-900 font-bold bg-purple-50/90 px-3 py-1 rounded-xl border border-purple-200">
          ⌨️ 键盘快捷操作：点击或按对应题目按键闯关 · Esc 返回乐园主页
        </span>
        <br />
        <span className="inline-block text-xs text-sky-900 font-bold bg-sky-50/90 px-3 py-1 rounded-xl border border-sky-200">
          {t('today.replayTip')}
        </span>
      </div>

      {/* 每日小目标：完成领星星（独立于课程包，当天内稳定） */}
      <DailyGoal />

      {/* ⚡ 每日 3 分钟艾宾浩斯极速复习微习惯 */}
      <DailySrsMission />

      {/* 概览 */}
      <Panel className="!py-4 rounded-[2.2rem] border-4 border-pink-200/90 bg-white/95 shadow-fluffy">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-candy-purple-soft px-3.5 py-1.5 text-xs font-black text-candy-purple-deep">
              ⏱️ {t('today.aboutMinutes', { count: plan.minutes ?? 15 })}
            </span>
            {(plan.dueCount ?? 0) > 0 && (
              <span className="rounded-full bg-candy-orange-soft px-3.5 py-1.5 text-xs font-black text-candy-orange-deep">
                ✨ {t('today.toReview', { count: plan.dueCount ?? 0 })}
              </span>
            )}
          </div>
          <span className="text-xs font-black text-ink-soft">
            {t('today.sectionsDone', { done: Math.min(step, plan.sections.length), total: plan.sections.length })}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar value={step} max={Math.max(1, plan.sections.length)} tone="purple" showLabel={false} />
        </div>
      </Panel>

      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-candy relative overflow-hidden p-8 text-center border-4 border-amber-300 bg-gradient-to-b from-amber-50 via-pink-50 to-amber-100 shadow-fluffy"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-8xl"
          >
            🎁
          </motion.div>
          <div className="mt-2 inline-block rounded-full bg-amber-400 px-4 py-1 text-xs font-black text-amber-950 shadow-sm">
            {t('today.chestOpened')}
          </div>
          <h2 className="mt-3 text-3xl font-black text-pink-600 tracking-wide">{t('today.allDone')}</h2>
          <p className="mt-2 text-base font-extrabold text-ink-soft">{t('today.allDoneDesc')}</p>
          {/* AI 每日总结 */}
          <DailySummary plan={plan} />
          <div className="mt-6 flex gap-3">
            <CandyButton tone="pink" size="lg" fullWidth onClick={restart}>
              {t('today.restartRoute')}
            </CandyButton>
          </div>
        </motion.div>

      ) : (
        <>
          {/* 关卡节点地图 */}
          <div className="relative space-y-4 rounded-[2.2rem] border-4 border-pink-200 bg-gradient-to-b from-pink-100/90 via-rose-50 to-purple-100/90 p-5 shadow-fluffy">
            <div className="mb-2 text-center text-xs font-black text-pink-600 uppercase tracking-widest">
              {t('today.adventureMap')}
            </div>

            {plan.sections.map((sec, i) => {
              const isSkipped = skipped.has(i);
              // done  = 已通关；skipped = 被跳过（可回来学）；next = 主线下一节（孩子正回头重学时）
              const state: 'active' | 'done' | 'skipped' | 'next' | 'locked' =
                i === cur
                  ? 'active'
                  : i > maxStep
                    ? 'locked'
                    : isSkipped
                      ? 'skipped'
                      : i < maxStep
                        ? 'done'
                        : 'next';
              // 已解锁过的节都能自由点回去重学，只有从未到达过的节才锁住
              const clickable = state !== 'locked' && state !== 'active';
              return (

                <div key={sec.id} className="relative flex items-center gap-3">
                  {/* 连接虚线 */}
                  {i < plan.sections.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-1 border-l-4 border-dashed border-pink-300 z-0" />
                  )}

                  <button
                    disabled={!clickable}
                    aria-current={state === 'active' ? 'step' : undefined}
                    onClick={() => {
                      if (clickable) jumpTo(i);
                    }}
                    className={cn(
                      'relative z-10 no-select flex w-full items-center gap-3.5 rounded-[1.8rem] px-4 py-3.5 text-left shadow-fluffy transition-all border-3',
                      state === 'active' && 'ring-4 ring-pink-400/60 scale-[1.02] border-pink-400 bg-white',
                      state === 'done' && 'border-emerald-300 bg-emerald-50/90 hover:border-emerald-400 active:scale-[0.99]',
                      state === 'skipped' && 'border-sky-300 bg-sky-50/80 opacity-80 hover:opacity-100 active:scale-[0.99]',
                      state === 'next' && 'border-indigo-200 bg-white hover:border-indigo-300 active:scale-[0.99]',
                      state === 'locked' && 'opacity-60 grayscale border-gray-200 bg-white/70',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl font-black shadow-md border-2 border-white',
                        state === 'done' && 'bg-emerald-400 text-candy-green-on',
                        state === 'active' && 'bg-pink-500 text-candy-pink-on animate-bounce-soft',
                        state === 'skipped' && 'bg-sky-200 text-sky-700',
                        state === 'next' && 'bg-indigo-100 text-indigo-500',
                        state === 'locked' && 'bg-gray-200 text-gray-400',
                      )}
                    >
                      {state === 'done'
                        ? '✅'
                        : state === 'skipped'
                          ? '⏭️'
                          : state === 'locked'
                            ? '🔒'
                            : sec.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-black text-pink-600">
                          {t('today.levelN', { count: i + 1 })}
                        </span>
                        {isSkipped && (
                          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-700">
                            {t('today.comeBackLater')}
                          </span>
                        )}
                        <span className="truncate text-base font-black text-ink">{sec.title}</span>
                      </span>
                      <span className="block truncate text-xs font-bold text-ink-soft mt-0.5">{sec.sub}</span>
                    </span>
                    {state === 'active' && (
                      <span className="shrink-0 rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-candy-pink-on shadow-sm">
                        {i < maxStep ? '重新玩 🔁' : t('today.startLevel')}
                      </span>
                    )}
                    {state === 'next' && (
                      <span className="shrink-0 rounded-full bg-indigo-400 px-3 py-1 text-xs font-black text-candy-blue-on shadow-sm">
                        去这一节 👉
                      </span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* 终点金色大宝箱 */}
            <div className="relative z-10 mt-6 flex items-center justify-between rounded-[1.8rem] border-3 border-amber-300 bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-200 p-4 shadow-fluffy">
              <div className="flex items-center gap-3">
                <span className="text-4xl animate-bounce-soft">🎁</span>
                <div>
                  <h4 className="text-base font-black text-amber-900">{t('today.finalChest')}</h4>
                  <p className="text-xs font-bold text-amber-700">{t('today.finalChestDesc')}</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950 shadow-sm">
                {t('today.goldStars')}
              </span>
            </div>
          </div>


          {/* 当前节活动 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${cur}-${active?.kind ?? 'none'}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              <Panel>
                {active?.kind === 'review' && <ReviewActivity refs={active.refs ?? []} onDone={handleDone} />}
                {active?.kind === 'letter' && <LetterLearn upper={active.refs?.[0] ?? ''} onDone={handleDone} />}
                {active?.kind === 'number' && <NumberLearn nums={active.refs ?? []} onDone={handleDone} />}
                {active?.kind === 'hanzi' && <HanziActivity char={active.refs?.[0] ?? ''} onDone={handleDone} />}
                {active?.kind === 'pinyin' && <PinyinActivity p={active.refs?.[0] ?? ''} onDone={handleDone} />}
                {active?.kind === 'poem' && <PoemActivity poemId={active.refs?.[0] ?? ''} onDone={handleDone} />}
                {active?.kind === 'word' && <WordActivity word={active.refs?.[0] ?? ''} onDone={handleDone} />}
                {active?.kind === 'quiz' && (
                  <QuizActivity todaySkills={todaySkills} onDone={handleDone} />
                )}
              </Panel>
            </motion.div>
          </AnimatePresence>

          {/* 跳过这节：与「继续」完全不同的位置（活动卡片下方独立一行）+ 冷静蓝虚线配色，防误触 */}
          {canSkip && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <CandyButton
                tone="blue"
                variant="soft"
                size="lg"
                icon={<span aria-hidden="true">⏭️</span>}
                className="w-full max-w-md border-4 border-dashed border-sky-300"
                onClick={handleSkip}
              >
                {t('today.skipSection')}
              </CandyButton>
              <p className="text-center text-xs font-bold text-sky-700/80">
                {t('today.skipHint')}
              </p>
            </div>
          )}

          {/* 回头重学旧节时的回主线入口，避免孩子回不去今天这一节 */}
          {cur < maxStep && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  sfxTap();
                  setFocus(null);
                }}
                className="no-select min-h-[44px] rounded-2xl border-2 border-dashed border-pink-300 bg-white/80 px-4 py-2 text-sm font-black text-pink-600"
              >
                ↩️ {t('today.backToToday', { n: maxStep + 1 })}
              </button>
            </div>
          )}
        </>
      )}

      {/* 跳过提示：无惩罚的温和反馈（常驻容器 + role=status，保证读屏能播报） */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 md:bottom-6"
      >
        <AnimatePresence>
          {skipHint && (
            <motion.div
              key="skip-hint"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              className="max-w-[92vw] rounded-full border-4 border-white bg-sky-600 px-5 py-3 text-center text-sm font-black text-candy-blue-on shadow-fluffy"
            >
              ⏭️ {skipHint}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
