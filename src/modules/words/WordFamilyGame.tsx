/**
 * 词族拼读练习（Word Family Game）
 * ------------------------------------------------------------
 * 自然拼读「见词能读」的核心训练：掌握一个词族规则（如 -at /æt/），
 * 就能拼读整个词族的词（cat/bat/mat/rat）。
 * 每轮：找同族词（选择）+ 点读拼读（发音），答对计入 SRS skill word:family:<id>。
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WORD_FAMILIES, type WordFamily } from '@/data/wordFamilies';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { shuffle, sampleMany } from '@/lib/utils';
import { speak } from '@/lib/speech';

const ROUNDS = 5;

export function WordFamilyGame() {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [fam, setFam] = useState<WordFamily | null>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  // 筛选当前难度的词族
  const currentFamilies = useMemo(() => {
    return WORD_FAMILIES.filter((f) => f.level === level);
  }, [level]);

  // 派生当前目标词
  const target = useMemo(() => {
    if (!fam || fam.words.length === 0) return '';
    return fam.words[round % fam.words.length]!;
  }, [fam, round]);

  // 生成当前轮：目标词 + 3 个异族干扰词
  const options = useMemo(() => {
    if (!fam || !target) return [];
    const others = sampleMany(
      WORD_FAMILIES.filter((f) => f.id !== fam.id).flatMap((f) => f.words),
      3,
    );
    return shuffle([target, ...others]);
  }, [fam, target]);

  const pick = useCallback((w: string) => {
    if (chosen || !fam) return;
    sfxTap();
    setChosen(w);
    const correct = w === target;
    if (correct) {
      sfxCorrect();
      triggerHaptic(45);
      celebrateSmall();
      setScore((s) => s + 1);
      practice(`word:family:${fam.id}`, true, 1);
      speak(`Great! ${w}`, { lang: 'en-US', rate: 0.9 }).catch(() => {});
    } else {
      sfxWrong();
      triggerHaptic(20);
      practice(`word:family:${fam.id}`, false, 0);
      speak(`Try again, looking for ${target}`, { lang: 'en-US', rate: 0.9 }).catch(() => {});
    }
  }, [chosen, fam, target, practice]);

  const next = useCallback(() => {
    sfxTap();
    triggerHaptic(25);
    if (round + 1 >= ROUNDS) {
      setDone(true);
      sfxStar();
      celebrateBig();
      triggerHaptic([60, 40, 60, 40, 100]);
    } else {
      setRound((r) => r + 1);
      setChosen(null);
    }
  }, [round]);

  const start = useCallback((f: WordFamily) => {
    sfxTap();
    triggerHaptic(30);
    setFam(f);
    setRound(0);
    setScore(0);
    setDone(false);
    setChosen(null);
  }, []);

  const handlePlayVoice = useCallback(() => {
    if (!target) return;
    sfxTap();
    triggerHaptic(20);
    speak(target, { lang: 'en-US', rate: 0.85 });
  }, [target]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (fam && !done) {
        if (!chosen && options.length > 0) {
          if (['1', '2', '3', '4'].includes(e.key)) {
            const idx = parseInt(e.key, 10) - 1;
            const opt = options[idx];
            if (opt) {
              e.preventDefault();
              pick(opt);
            }
          } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            handlePlayVoice();
          }
        } else if (chosen) {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            next();
          }
        }
      } else if (done && fam) {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          start(fam);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fam, done, chosen, options, pick, handlePlayVoice, next, start]);

  // 结果页
  if (done && fam) {
    const stars = score === ROUNDS ? 3 : score >= Math.ceil(ROUNDS * 0.7) ? 2 : 1;
    return (
      <Panel className="text-center !py-8 shadow-fluffy">
        <div className="text-7xl mb-2">{stars === 3 ? '🏆' : '🎉'}</div>
        <p className="text-2xl font-black text-ink">{t('words.wordFamily.doneTitle')}</p>
        <p className="mt-2 text-base font-bold text-ink-soft">
          {t('words.wordFamily.doneDesc', {
            ok: String(score),
            total: String(ROUNDS),
            stars: '⭐'.repeat(stars),
          })}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <CandyButton
            tone="blue"
            size="md"
            onClick={() => {
              setFam(null);
              setDone(false);
            }}
          >
            {t('words.wordFamily.back')}
          </CandyButton>
          <CandyButton tone="green" size="md" onClick={() => start(fam)}>
            {t('words.wordFamily.again')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  // 练习页
  if (fam) {
    return (
      <div className="space-y-4">
        {/* 快捷操作提示条 */}
        <div className="text-center">
          <span className="inline-block text-xs text-purple-900 font-bold bg-purple-50/90 px-3 py-1 rounded-xl border border-purple-200">
            ⌨️ 键盘快捷操作：数字键 1-4 选单词 · S 听发音 · 空格/Enter 下一题
          </span>
        </div>

        <div className="flex items-center justify-between">
          <CandyButton
            tone="blue"
            variant="soft"
            size="sm"
            onClick={() => {
              sfxTap();
              setFam(null);
            }}
          >
            ◀️ {t('words.wordFamily.back')}
          </CandyButton>
          <span className="text-sm font-black text-candy-purple-deep">
            第 {round + 1}/{ROUNDS} 题 · 得分: {score}
          </span>
        </div>

        <ProgressBar value={round + 1} max={ROUNDS} tone="purple" />

        <Panel className="text-center !py-6 shadow-fluffy">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800 mb-2">
            <span>{fam.emoji}</span>
            <span>{fam.pattern} 家族 [{fam.sound}]</span>
          </div>
          <p className="text-sm font-bold text-ink-soft mb-2">{fam.desc}</p>
          <p className="text-lg font-black text-ink mb-3">
            {t('words.wordFamily.question', { pattern: fam.pattern })}
          </p>
          <CandyButton
            tone="purple"
            size="md"
            onClick={handlePlayVoice}
            className="min-h-[44px]"
          >
            🔊 听听目标发音
          </CandyButton>
        </Panel>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {options.map((w) => {
            const isTarget = w === target;
            const isPicked = chosen === w;
            return (
              <motion.button
                key={w}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => pick(w)}
                className={`relative flex items-center justify-center p-4 min-h-[56px] rounded-2xl border-3 text-xl font-black transition-all shadow-sm focus-visible:ring-4 focus-visible:ring-purple-300 focus:outline-none ${
                  chosen
                    ? isTarget
                      ? 'border-green-500 bg-green-100 text-green-800 scale-105'
                      : isPicked
                      ? 'border-red-400 bg-red-100 text-red-700'
                      : 'border-gray-200 bg-white/70 opacity-60'
                    : 'border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                {w}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {chosen && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-2xl text-center text-sm font-black border max-w-sm mx-auto ${
                chosen === target
                  ? 'bg-green-100 border-green-300 text-green-800'
                  : 'bg-red-100 border-red-300 text-red-700'
              }`}
            >
              {chosen === target ? (
                <span>🎉 {t('words.wordFamily.correct')}</span>
              ) : (
                <span>🤔 {t('words.wordFamily.wrong', { target })}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {chosen && (
          <div className="flex justify-center pt-2">
            <CandyButton tone="green" size="lg" onClick={next}>
              {round + 1 >= ROUNDS ? '查看成绩 ➔' : '下一题 ➔'}
            </CandyButton>
          </div>
        )}
      </div>
    );
  }

  // 词族选择大厅
  return (
    <div className="space-y-4">
      <PageHeader
        emoji="🎡"
        title={t('words.wordFamily.title')}
        subtitle={t('words.wordFamily.subtitle')}
        tone="purple"
      />

      {/* 难度切换 */}
      <div className="flex justify-center gap-2">
        {[
          { lv: 1 as const, label: '🌱 基础短元音 (L1)' },
          { lv: 2 as const, label: '🌿 进阶长元音 (L2)' },
          { lv: 3 as const, label: '🌳 复杂双元音 (L3)' },
        ].map((item) => (
          <button
            key={item.lv}
            onClick={() => {
              sfxTap();
              setLevel(item.lv);
            }}
            className={`rounded-2xl px-4 py-2 text-xs font-black transition-all ${
              level === item.lv
                ? 'bg-candy-purple-deep text-white shadow-sm scale-105'
                : 'bg-white text-ink-soft border border-purple-100 hover:bg-purple-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 词族卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentFamilies.map((f) => (
          <motion.button
            key={f.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => start(f)}
            className="text-left rounded-3xl border-3 border-purple-200 bg-white p-4 shadow-fluffy flex flex-col justify-between hover:border-purple-300 hover:bg-purple-50/50 transition-all"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-candy-purple-deep">
                  {f.emoji} {f.pattern}
                </span>
                <span className="text-xs font-bold text-ink-soft bg-purple-50 px-2.5 py-1 rounded-full">
                  [{f.sound}]
                </span>
              </div>
              <p className="text-xs font-bold text-ink-soft mt-1">{f.desc}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {f.words.slice(0, 5).map((w) => (
                  <span
                    key={w}
                    className="rounded-xl bg-purple-50 px-2.5 py-0.5 text-xs font-black text-purple-700"
                  >
                    {w}
                  </span>
                ))}
                {f.words.length > 5 && (
                  <span className="text-xs font-bold text-ink-muted">+{f.words.length - 5}</span>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-2 border-t border-purple-100 text-xs font-black text-candy-purple-deep">
              <span>🎯 点击开始拼读挑战</span>
              <span>➔</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
