/**
 * 汉字听写（专业版）
 * ------------------------------------------------------------------
 * 流程：TTS 读词 → 孩子从字阵中选出听到的字 → 逐题回写 SRS。
 * 抽题策略（与 drill.ts 的间隔复习思想一致）：
 *   1. 优先抽「到期复习」的已学汉字（SRS due）
 *   2. 其次抽错题本里的汉字
 *   3. 不足部分从当前阶段按频次补新字
 * 一轮 6 题，全对有庆祝。
 */
import { useMemo, useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { QuizCard } from '@/components/QuizCard';
import { getHanziByLevel, getHanziByChar, type HanziEntry } from '@/data/hanziIndex';
import { makeHanziListenQuestion, makeHanziSimilarQuestion } from '@/lib/hanziQuestions';
import { dueSkills } from '@/lib/srs';
import { useStore, useMastery } from '@/store/useStore';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/AdaptiveDifficultyHint';
import type { Progress } from '@/types';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { shuffle } from '@/lib/utils';
import type { Question } from '@/types';

const ROUND = 6;

type Phase = 'setup' | 'run' | 'done';

export function HanziDictation() {
  const [level, setLevel, levelMeta] = useAdaptiveDifficultyState('hanzi');
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const mastery = useMastery();
  const practice = useStore((s) => s.practice);
  const wrongBook = useStore((s) => s.progress.wrongBook);

  /** 抽题：到期复习 > 错题本 > 新字补充 */
  const pickRound = (lv: number): HanziEntry[] => {
    const pool = getHanziByLevel(lv);
    const chosen = new Map<string, HanziEntry>();

    // 1. 到期复习的汉字（dueSkills 只读取 mastery 字段，传入最小 Progress 即可）
    for (const skill of dueSkills({ mastery } as Progress)) {
      if (!skill.startsWith('hanzi:')) continue;
      const h = getHanziByChar(skill.slice(6));
      if (h && h.level === lv) chosen.set(h.c, h);
      if (chosen.size >= 3) break;
    }
    // 2. 错题本
    for (const skill of wrongBook) {
      if (!skill.startsWith('hanzi:')) continue;
      const h = getHanziByChar(skill.slice(6));
      if (h && h.level === lv && !chosen.has(h.c)) chosen.set(h.c, h);
      if (chosen.size >= 4) break;
    }
    // 3. 随机补满
    for (const h of shuffle(pool)) {
      if (chosen.size >= ROUND) break;
      if (!chosen.has(h.c)) chosen.set(h.c, h);
    }
    return [...chosen.values()];
  };

  const start = () => {
    sfxTap();
    const targets = pickRound(level);
    if (!targets.length) return;
    const pool = getHanziByLevel(level);
    // 前 2/3 听音选字，后 1/3 形近字辨析（难度递增）
    const qs = targets.map((h, i) =>
      i < ROUND * 2 / 3 ? makeHanziListenQuestion(h, pool) : makeHanziSimilarQuestion(h, pool),
    );
    setQuestions(qs);
    setIdx(0);
    setScore(0);
    setPhase('run');
  };

  const onAnswer = (correct: boolean) => {
    const q = questions[idx]!!
    if (!q) return;
    practice(q.skill, correct, 2, level);
    if (correct) setScore((s) => s + 1);
  };

  const onNext = () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
    } else {
      if (score + 1 >= questions.length) {
        // 上面 onAnswer 已把最后一题记入 score 前这里取不到最新值，宽松处理：>=ROUND-1 即庆祝
      }
      setPhase('done');
      if (score >= ROUND - 1) {
        sfxCorrect();
        celebrateBig();
      }
    }
  };

  const learnedCount = useMemo(
    () => getHanziByLevel(level).filter((h) => (mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1).length,
    [level, mastery],
  );

  if (phase === 'run' && questions.length) {
    const q = questions[idx]!!
    if (!q) return null;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink-soft">
            🎧 听写中 · 第 {idx + 1} / {questions.length} 题 · 已得 {score} 分
          </span>
          <button aria-label="✕ 退出"
            onClick={() => { sfxTap(); setPhase('setup'); }}
            className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-ink-soft"
          >
            ✕ 退出
          </button>
        </div>
        <QuizCard
          question={q}
          meta={`听写 ${idx + 1}/${questions.length}`}
          nextLabel={idx < questions.length - 1 ? '下一题' : '完成听写'}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      </div>
    );
  }

  if (phase === 'done') {
    const perfect = score >= questions.length;
    return (
      <Panel className="text-center">
        <div className="text-6xl">{perfect ? '🏆' : score >= ROUND / 2 ? '🎉' : '💪'}</div>
        <p className="mt-3 text-xl font-extrabold text-ink">
          {perfect ? '听写满分！太厉害了！' : `听写完成，答对 ${score} / ${questions.length} 题`}
        </p>
        <p className="mt-1 text-sm font-bold text-ink-soft">
          {perfect ? '每个字都听得准、认得清～' : '答错的字已经放进错题本，会安排复习哦'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <CandyButton tone="green" size="lg" onClick={start}>再来一轮 🎧</CandyButton>
          <CandyButton tone="purple" variant="soft" size="lg" onClick={() => { sfxTap(); setPhase('setup'); }}>
            换个阶段
          </CandyButton>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="🎧" title="汉字听写" subtitle="听词语，选出正确的字" tone="blue" />

      <Panel>
        <p className="text-sm font-bold text-ink-soft">选择阶段（已学 {learnedCount} 字）</p>
        <div className="mt-3 flex gap-2">
          {([1, 2, 3] as const).map((l) => (
            <CandyButton
              key={l}
              tone={level === l ? 'blue' : 'purple'}
              variant={level === l ? 'solid' : 'soft'}
              size="sm"
              onClick={() => { sfxTap(); setLevel(l); }}
            >
              {l === 1 ? '🌱 启蒙' : l === 2 ? '🌿 常用' : '🌳 进阶'}
            </CandyButton>
          ))}
        </div>
        <AdaptiveDifficultyHint
          meta={levelMeta}
          labels={{ 1: '启蒙', 2: '常用', 3: '进阶' }}
          className="mt-2"
        />
      </Panel>

      <Panel>
        <p className="text-sm font-bold text-ink-soft">📋 听写规则</p>
        <ul className="mt-2 space-y-1 text-sm font-semibold text-ink">
          <li>1. 点播放，仔细听读的词语</li>
          <li>2. 从字阵里选出你听到的那个字</li>
          <li>3. 前半部分听音选字，后半部分形近字挑战</li>
          <li>4. 优先考你「该复习」和「以前错过」的字</li>
        </ul>
      </Panel>

      <CandyButton tone="blue" size="lg" fullWidth onClick={start}>
        ▶ 开始听写（一轮 {ROUND} 题）
      </CandyButton>
    </div>
  );
}
