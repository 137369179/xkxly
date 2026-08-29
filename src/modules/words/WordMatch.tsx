/**
 * 英语单词连连看 - 英文↔中文连线游戏
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { getWordsByLevel, getWordsByTheme, WORD_THEMES } from '@/data/wordIndex';
import type { WordEntry } from '@/data/words';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar, triggerHaptic } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { useRoute } from '@/lib/router';
import { shuffle } from '@/lib/utils';
import { WordStarQuest } from './WordStarQuest';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/study/AdaptiveDifficultyHint';
import { ComboMeter } from '@/components/gamification/ComboMeter';
import { GentleFeedback } from '@/components/gamification/GentleFeedback';
import { RestReminder } from '@/components/gamification/RestReminder';
import { ReducedMotionToggle } from '@/components/gamification/ReducedMotionToggle';
import { MistakeBookPanel } from '@/components/gamification/MistakeBookPanel';
import { StarSettlementCard } from '@/components/gamification/StarSettlementCard';
import { masteryNoteFor, newlyMasteredThisWeek } from '@/game/masteryNarrative';
import { praiseByScene, encourageByScene } from '@/lib/praise';
import { earnStars, type EarnResult } from '@/game/rewardEconomy';
import { speak } from '@/lib/speech';

type Phase = 'playing' | 'result';
type Side = 'en' | 'zh';

interface Pair {
  word: WordEntry;
  matched: boolean;
}

interface DiffEntry {
  id: 1 | 2 | 3;
  label: string;
  pairs: number;
  level: 1 | 2 | 3;
}

const DIFFS: DiffEntry[] = [
  { id: 1, label: 'wordMatch.easy', pairs: 6, level: 1 },
  { id: 2, label: 'wordMatch.medium', pairs: 8, level: 2 },
  { id: 3, label: 'wordMatch.hard', pairs: 10, level: 3 },
];

export function WordMatch() {
  const { t: tr } = useTranslation();
  const progress = useStore((s) => s.progress);
  const { navigate } = useRoute();
  const [diff, setDiff, diffMeta] = useAdaptiveDifficultyState('word');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [enOrder, setEnOrder] = useState<number[]>([]);
  const [zhOrder, setZhOrder] = useState<number[]>([]);
  const [selected, setSelected] = useState<{ side: Side; idx: number } | null>(null);
  const [combo, setCombo] = useState(0);
  /** 本回合最长连击：连对越多，结算奖励越高（与汉字/数学模块一致口径） */
  const [bestCombo, setBestCombo] = useState(0);
  const [score, setScore] = useState(0);
  /** 结算结果：展示的是**实际入账**的星数，成长荣誉馆读的是同一份 */
  const [settlement, setSettlement] = useState<EarnResult | null>(null);
  const addStars = useStore((s) => s.addStars);
  /** 即时反馈气泡状态（任务 #3）：正确积极强化 / 错误温和引导，无障碍 aria-live */
  const [feedback, setFeedback] = useState<{ correct: boolean; msg: string } | null>(null);
  const [time, setTime] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const practice = useStore(s => s.practice);

  const start = useCallback((d: DiffEntry, customTheme?: string) => {
    sfxTap();
    const activeTheme = customTheme ?? themeFilter;
    const pool = activeTheme === 'all'
      ? getWordsByLevel(d.level)
      : (() => {
          const tp = getWordsByTheme(activeTheme);
          return tp.length < d.pairs ? [...tp, ...getWordsByLevel(d.level)] : tp;
        })();
    const picked = shuffle(pool).slice(0, d.pairs);
    const newPairs = picked.map(word => ({ word, matched: false }));
    setPairs(newPairs);
    setEnOrder(shuffle(newPairs.map((_, i) => i)));
    setZhOrder(shuffle(newPairs.map((_, i) => i)));
    setSelected(null);
    setCombo(0);
    setBestCombo(0);
    setScore(0);
    setSettlement(null);
    setFeedback(null);
    setTime(0);
    setPhase('playing');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  }, [themeFilter]);

  /** 按档位 id 开一局（找不到就退回最简单那档） */
  const startById = useCallback((id: 1 | 2 | 3) => {
    const fallbackDiff = DIFFS[0] ?? { id: 1, label: 'wordMatch.easy', pairs: 6, level: 1 };
    start(DIFFS.find(d => d.id === id) ?? fallbackDiff);
  }, [start]);

  /**
   * 回合结算 —— 「赚」的唯一出口，复用全站 `earnStars()` 口径（评级 / 连击 / 全对），
   * 再经 `addStars()` 入全局账本。连连看全部配对成功即视为全部答对（correct = total）。
   */
  const settleRound = useCallback(
    (total: number, correct: number, best: number): EarnResult => {
      const result = earnStars({ module: 'words', total, correct, bestCombo: best });
      if (result.granted > 0) addStars(result.granted);
      setSettlement(result);
      void speak(`恭喜你完成单词连连看！一共获得 ${result.granted} 颗星！`).catch(() => {});
      return result;
    },
    [addStars],
  );

  useEffect(() => {
    // 开局用小茜推荐的档位（而不是恒定最简单那档）
    startById(diff);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [diff, startById]);

  const allMatched = pairs.length > 0 && pairs.every(p => p.matched);
  useEffect(() => {
    if (allMatched && phase === 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      sfxStar();
      celebrateBig();
      // 全部配对成功即全部答对；连击用本回合最长连击结算
      settleRound(pairs.length, pairs.length, bestCombo);
      setPhase('result');
    }
  }, [allMatched, phase, pairs.length, bestCombo, settleRound]);

  const handleClick = (side: Side, idx: number) => {
    if (phase !== 'playing') return;
    const pairIdx = side === 'en' ? enOrder[idx] : zhOrder[idx];
    if (pairIdx === undefined || pairs[pairIdx]?.matched) return;
    sfxTap();

    if (!selected) {
      setSelected({ side, idx });
      return;
    }

    if (selected.side === side) {
      setSelected({ side, idx });
      return;
    }

    // 检查是否匹配
    const enIdx = selected.side === 'en' ? enOrder[selected.idx] : enOrder[idx];
    const zhIdx = selected.side === 'zh' ? zhOrder[selected.idx] : zhOrder[idx];

    if (enIdx !== undefined && zhIdx !== undefined && enIdx === zhIdx) {
      // 匹配成功
      sfxCorrect();
      triggerHaptic(25);
      celebrateSmall();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setBestCombo((b) => Math.max(b, newCombo));
      const gain = 10 + (newCombo - 1) * 2;
      setScore(s => s + gain);
      setPairs(prev => prev.map((p, i) => i === enIdx ? { ...p, matched: true } : p));
      setFeedback({ correct: true, msg: praiseByScene('word') });
      const targetPair = pairs[enIdx];
      if (targetPair) {
        practice(`word:${targetPair.word.word}`, true, 0, diff);
      }
    } else {
      sfxWrong();
      setCombo(0);
      setFeedback({ correct: false, msg: encourageByScene('word') });
    }
    setSelected(null);
  };

  if (phase === 'result') {
    const stars = score >= pairs.length * 12 ? 3 : score >= pairs.length * 8 ? 2 : 1;
    return (
      <Panel className="text-center">
        <div className="text-6xl">🏆</div>
        <p className="mt-3 text-xl font-extrabold text-ink">{tr('wordMatch.complete')}</p>
        <p className="text-3xl font-black text-candy-green-deep">{'⭐'.repeat(stars)}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-candy-blue-soft p-2">
            <div className="text-lg font-extrabold text-candy-blue-deep">{score}</div>
            <div className="text-xs font-bold text-ink-soft">{tr('wordMatch.score')}</div>
          </div>
          <div className="rounded-xl bg-candy-orange-soft p-2">
            <div className="text-lg font-extrabold text-candy-orange-deep">{time}s</div>
            <div className="text-xs font-bold text-ink-soft">{tr('wordMatch.time')}</div>
          </div>
          <div className="rounded-xl bg-candy-pink-soft p-2">
            <div className="text-lg font-extrabold text-candy-pink-deep">{pairs.length}</div>
            <div className="text-xs font-bold text-ink-soft">{tr('wordMatch.pairs')}</div>
          </div>
        </div>
        {/* 展示**实际入账**的星数，与成长荣誉馆同一份数据 */}
        {settlement && (
          <StarSettlementCard
            result={settlement}
            moduleName="单词"
            masteryNote={masteryNoteFor(
              newlyMasteredThisWeek(progress.mastery, ['word']),
              '个单词',
            )}
          />
        )}
        <CandyButton
          tone="green"
          size="sm"
          className="mt-4"
          onClick={() => {
            // 一局结束是安全边界：让小茜把最新建议应用上来
            diffMeta.syncNow();
            const nextDiff = (diffMeta.auto ? diffMeta.recommended : diff) as 1 | 2 | 3;
            startById(nextDiff);
          }}
        >
          🔄 {tr('wordMatch.playAgain')}
        </CandyButton>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="🔗" title={tr('wordMatch.title')} subtitle={tr('wordMatch.subtitle')} tone="green" />

      {/* 主题分类筛选 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setThemeFilter('all');
            const targetDiff = DIFFS.find((d) => d.id === diff) ?? DIFFS[0]!;
            start(targetDiff, 'all');
          }}
          className={`px-3 py-1.5 rounded-xl font-black text-xs whitespace-nowrap transition-all border ${
            themeFilter === 'all'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🌈 全部综合</span>
        </button>
        {WORD_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setThemeFilter(t.id);
              const targetDiff = DIFFS.find((d) => d.id === diff) ?? DIFFS[0]!;
              start(targetDiff, t.id);
            }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs whitespace-nowrap transition-all border flex items-center gap-1 ${
              themeFilter === t.id
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {DIFFS.map(d => (
              <CandyButton
                key={d.id}
                tone={diff === d.id ? 'green' : 'purple'}
                variant={diff === d.id ? 'solid' : 'soft'}
                size="sm"
                onClick={() => { setDiff(d.id); start(d); }}
              >
                {tr(d.label)}
              </CandyButton>
            ))}
          </div>
          <div className="text-sm font-extrabold text-ink-soft">
            ⏱️ {time}s · ⭐ {score} {combo > 1 && `· 🔥${combo}`}
          </div>
        </div>
        <AdaptiveDifficultyHint
          meta={diffMeta}
          labels={{ 1: tr('wordMatch.easy'), 2: tr('wordMatch.medium'), 3: tr('wordMatch.hard') }}
        />
        <ComboMeter count={combo} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 英文列 */}
        <div className="space-y-2">
          {enOrder.map((pairIdx, displayIdx) => {
            const p = pairs[pairIdx];
            if (!p) return null;
            const isSel = selected?.side === 'en' && selected.idx === displayIdx;
            return (
              <motion.button
                key={displayIdx}
                animate={{ opacity: p.matched ? 0.3 : 1, scale: p.matched ? 0.9 : 1 }}
                onClick={() => handleClick('en', displayIdx)}
                disabled={p.matched}
                className={`w-full rounded-2xl border-4 p-3 text-center text-lg font-extrabold transition-all ${
                  p.matched
                    ? 'border-candy-green-soft bg-candy-green-soft text-ink-soft'
                    : isSel
                    ? 'border-candy-green-deep bg-candy-green-soft text-ink scale-105'
                    : 'border-candy-green-soft bg-white text-ink hover:bg-candy-green-soft'
                }`}
              >
                {p.word.word} {p.word.emoji}
              </motion.button>
            );
          })}
        </div>

        {/* 中文列 */}
        <div className="space-y-2">
          {zhOrder.map((pairIdx, displayIdx) => {
            const p = pairs[pairIdx];
            if (!p) return null;
            const isSel = selected?.side === 'zh' && selected.idx === displayIdx;
            return (
              <motion.button
                key={displayIdx}
                animate={{ opacity: p.matched ? 0.3 : 1, scale: p.matched ? 0.9 : 1 }}
                onClick={() => handleClick('zh', displayIdx)}
                disabled={p.matched}
                className={`w-full rounded-2xl border-4 p-3 text-center text-lg font-extrabold transition-all ${
                  p.matched
                    ? 'border-candy-pink-soft bg-candy-pink-soft text-ink-soft'
                    : isSel
                    ? 'border-candy-pink-deep bg-candy-pink-soft text-ink scale-105'
                    : 'border-candy-pink-soft bg-white text-ink hover:bg-candy-pink-soft'
                }`}
              >
                {p.word.zh}
              </motion.button>
            );
          })}
        </div>
      </div>

      {feedback && <GentleFeedback correct={feedback.correct} message={feedback.msg} />}

      <section className="space-y-3">
        <WordStarQuest />
        <MistakeBookPanel progress={progress} onReview={() => navigate('wrongbook')} />
        <RestReminder />
        <ReducedMotionToggle />
      </section>
    </div>
  );
}
