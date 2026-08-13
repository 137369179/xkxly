import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { LessonSection, Question } from '@/types';
import { useProgress, useStore } from '@/store/useStore';
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
import { LetterLearn } from '@/components/LetterLearn';
import { NumberLearn } from '@/components/NumberLearn';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useStruggle } from '@/lib/struggle';
import { StruggleModal } from '@/components/StruggleModal';
import { cn } from '@/lib/utils';
import { useRoute, navigate } from '@/lib/router';
import {
  DailySummary,
  PoemActivity,
  HanziActivity,
  PinyinActivity,
  WordActivity,
} from './TodaySections';

/* ========================================================================
 * 通用小题循环（复习 / 综合），复用 QuizCard，逐题记录到掌握度
 * ===================================================================== */
function SectionRunner({
  gen,
  record,
  count,
  tone,
  onDone,
  finishLabel = '完成这一节 →',
}: {
  gen: () => Question;
  record: (q: Question, correct: boolean) => void;
  count: number;
  tone: Parameters<typeof ProgressBar>[0]['tone'];
  onDone: () => void;
  finishLabel?: string;
}) {
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
          第 {idx + 1} / {count} 题
        </span>
        <ProgressBar value={idx} max={count} tone={tone} showLabel={false} />
      </div>
      <QuizCard
        key={q.id}
        question={q}
        autoSpeak
        onAnswer={(correct) => {
          record(q, correct);
          struggle.record(correct);
        }}
        onNext={next}
        nextLabel={idx + 1 >= count ? finishLabel : '下一题'}
        meta={`第 ${idx + 1} / ${count} 题`}
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
  const progress = useProgress();
  const practice = useStore((s) => s.practice);
  const iRef = useRef(0);
  const count = Math.max(2, Math.min(8, refs.length));

  const gen = useCallback((): Question => {
    const skill = refs[iRef.current % refs.length] ?? 'math:add';
    iRef.current += 1;
    const d = rampDifficulty(progress, skill.split(':')[0]!) as Difficulty;
    const q = questionForSkill(skill, d) ?? makeMathQuestion(d);
    // P1-3: 标注出题难度，供 SRS 难度感知复习
    if (q) q.difficulty = d;
    return q;
  }, [refs, progress]);

  return (
    <SectionRunner
      gen={gen}
      count={count}
      tone="orange"
      onDone={onDone}
      finishLabel="复习完啦 →"
      record={(q, correct) => q.skill && practice(q.skill, correct, 1, q.difficulty)}
    />
  );
}

function QuizActivity({ todaySkills, onDone }: { todaySkills: string[]; onDone: () => void }) {
  const progress = useProgress();
  const practice = useStore((s) => s.practice);

  const gen = useCallback((): Question => {
    // 综合小挑战按优先级回扣：错题本 > 薄弱知识点 > 当天内容 > 全题型混合
    // 让孩子每天打开就能先拣回最需要巩固的内容，而不是完全随机出题
    const weak = weakSkills(progress, 6).map((w) => w.skill);
    const d = smartDifficulty(progress);
    const q = makeDailyMixedQuestion(todaySkills, d, {
      wrongBook: progress.wrongBook,
      weakSkills: weak,
    });
    // P1-3: 标注出题难度，供 SRS 难度感知复习
    if (q) q.difficulty = d;
    return q;
  }, [progress, todaySkills]);

  return (
    <SectionRunner
      gen={gen}
      count={6}
      tone="green"
      onDone={onDone}
      finishLabel="挑战成功 →"
      record={(q, correct) => q.skill && practice(q.skill, correct, 1, q.difficulty)}
    />
  );
}

/* ========================================================================
 * 薄弱点专项深链（Phase 3-②）：从家长报告「去练习」进入，针对单一学科强化
 * ===================================================================== */
const FOCUS_SUBJECTS: Record<string, string> = {
  letter: '字母',
  number: '数字',
  math: '数学',
  poem: '古诗',
  hanzi: '汉字',
  pinyin: '拼音',
  word: '英语',
  logic: '逻辑',
  idiom: '成语',
  sentence: '造句',
};

function FocusActivity({ subject, onDone }: { subject: string; onDone: () => void }) {
  const progress = useProgress();
  const practice = useStore((s) => s.practice);
  const iRef = useRef(0);
  const COUNT = 8;
  const label = FOCUS_SUBJECTS[subject]! ?? subject;

  const gen = useCallback((): Question => {
    // 优先练该学科薄弱点(lv<3)与错题本，再退回到全部已接触知识点，无重复
    const weak = weakSkills(progress, 40)
      .map((w) => w.skill)
      .filter((s) => s.startsWith(subject + ':'));
    const wrong = progress.wrongBook.filter((s) => s.startsWith(subject + ':'));
    const all = Object.keys(progress.mastery).filter((k) => k.startsWith(subject + ':'));
    const pool = Array.from(new Set([...weak, ...wrong, ...all]));
    const skill = pool.length ? pool[iRef.current % pool.length] : `${subject}:${subject}`;
    iRef.current += 1;
    const d = rampDifficulty(progress, subject) as Difficulty;
    const q = questionForSkill(skill!, d) ?? makeDailyMixedQuestion([], d, { weakSkills: weak.slice(0, 1) });
    // P1-3: 标注出题难度，供 SRS 难度感知复习
    if (q) q.difficulty = d;
    return q;
  }, [progress, subject]);

  return (
    <div className="space-y-5">
      <PageHeader emoji="🎯" title={`${label}专项练习`} subtitle="针对薄弱点强化巩固，练完更扎实～" tone="purple" />
      <SectionRunner
        gen={gen}
        count={COUNT}
        tone="purple"
        onDone={onDone}
        finishLabel="专项练完啦 →"
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
  const progress = useProgress();
  const { param } = useRoute();
  const setLessonStep = useStore((s) => s.setLessonStep);
  const finishLesson = useStore((s) => s.finishLesson);

  const today = dateKey();
  // 课程包按「天」稳定生成：当天内不随进度变化重排
  // intentional: plan is stable per day, ignore progress changes to avoid daily plan regeneration
  const plan = useMemo(() => buildDailyPlan(progress, Date.now()), [today]);

  const done = !!progress.dailyLog[today]?.lesson;
  const step = done
    ? plan.sections.length
    : progress.lessonDate === today
      ? Math.min(progress.lessonStep, plan.sections.length)
      : 0;

  const handleDone = useCallback(() => {
    const ns = step + 1;
    if (ns >= plan.sections.length) {
      finishLesson(3);
      sfxStar();
      celebrateBig();
    } else {
      setLessonStep(ns);
    }
  }, [step, plan, finishLesson, setLessonStep]);

  // 当天已学过的知识点（综合小挑战回扣用）
  const todaySkills = useMemo(
    () => collectTodaySkills(plan.sections.slice(0, step + 1)),
    [plan, step],
  );

  const restart = () => setLessonStep(0);

  const active: LessonSection | undefined = plan.sections[step];

  // 薄弱点专项深链：从家长报告「去练习」进入，针对单一学科强化巩固。
  // 必须放在所有 hook 调用之后，保证两种分支 hook 数量一致。
  if (param && Object.prototype.hasOwnProperty.call(FOCUS_SUBJECTS, param)) {
    return <FocusActivity subject={param} onDone={() => navigate('today')} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader emoji="📅" title="今日课程" subtitle="跟着课程一步步学，每天进步一点点～" tone="purple" />

      {/* 概览 */}
      <Panel className="!py-4 rounded-[2.2rem] border-4 border-pink-200/90 bg-white/95 shadow-fluffy">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-candy-purple-soft px-3.5 py-1.5 text-xs font-black text-candy-purple-deep">
              ⏱️ 约 {plan.minutes} 分钟
            </span>
            {(plan.dueCount ?? 0) > 0 && (
              <span className="rounded-full bg-candy-orange-soft px-3.5 py-1.5 text-xs font-black text-candy-orange-deep">
                ✨ {plan.dueCount} 个待巩固
              </span>
            )}
          </div>
          <span className="text-xs font-black text-ink-soft">
            已完成 {Math.min(step, plan.sections.length)} / {plan.sections.length} 节
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
            金色大宝箱开启啦！
          </div>
          <h2 className="mt-3 text-3xl font-black text-pink-600 tracking-wide">今天课程全通关啦！</h2>
          <p className="mt-2 text-base font-extrabold text-ink-soft">你真棒！获得 20 颗金星 🌟 与专属粉色羊毛毡勋章！</p>
          {/* AI 每日总结 */}
          <DailySummary progress={progress} plan={plan} />
          <div className="mt-6 flex gap-3">
            <CandyButton tone="pink" size="lg" fullWidth onClick={restart}>
              🔄 重新探索探险路线
            </CandyButton>
          </div>
        </motion.div>

      ) : (
        <>
          {/* 关卡节点地图 */}
          <div className="relative space-y-4 rounded-[2.2rem] border-4 border-pink-200 bg-gradient-to-b from-pink-100/90 via-rose-50 to-purple-100/90 p-5 shadow-fluffy">
            <div className="mb-2 text-center text-xs font-black text-pink-600 uppercase tracking-widest">
              🌟 每日金牌探险地图 🌟
            </div>

            {plan.sections.map((sec, i) => {
              const state = i < step ? 'done' : i === step ? 'active' : 'locked';
              return (

                <div key={sec.id} className="relative flex items-center gap-3">
                  {/* 连接虚线 */}
                  {i < plan.sections.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-1 border-l-4 border-dashed border-pink-300 z-0" />
                  )}

                  <button
                    disabled={state !== 'active'}
                    onClick={() => {
                      if (state === 'active') sfxTap();
                    }}
                    className={cn(
                      'relative z-10 no-select flex w-full items-center gap-3.5 rounded-[1.8rem] px-4 py-3.5 text-left shadow-fluffy transition-all border-3',
                      state === 'active' && 'ring-4 ring-pink-400/60 scale-[1.02] border-pink-400 bg-white',
                      state === 'done' && 'border-emerald-300 bg-emerald-50/90',
                      state === 'locked' && 'opacity-60 grayscale border-gray-200 bg-white/70',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl font-black shadow-md border-2 border-white',
                        state === 'done' && 'bg-emerald-400 text-white',
                        state === 'active' && 'bg-pink-500 text-white animate-bounce-soft',
                        state === 'locked' && 'bg-gray-200 text-gray-400',
                      )}
                    >
                      {state === 'done' ? '✅' : state === 'locked' ? '🔒' : sec.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-black text-pink-600">
                          关卡 {i + 1}
                        </span>
                        <span className="truncate text-base font-black text-ink">{sec.title}</span>
                      </span>
                      <span className="block truncate text-xs font-bold text-ink-soft mt-0.5">{sec.sub}</span>
                    </span>
                    {state === 'active' && (
                      <span className="shrink-0 rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-white shadow-sm">
                        开始闯关 🚀
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
                  <h4 className="text-base font-black text-amber-900">终点大宝箱</h4>
                  <p className="text-xs font-bold text-amber-700">完成今天全部关卡即可拆开奖盒！</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950 shadow-sm">
                +20 颗金星 ⭐
              </span>
            </div>
          </div>


          {/* 当前节活动 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active?.kind ?? 'none'}
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
        </>
      )}
    </div>
  );
}
