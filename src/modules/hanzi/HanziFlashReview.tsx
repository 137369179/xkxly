/**
 * 生字闪卡复习（SRS 间隔重复驱动）
 * ------------------------------------------------------------
 * 对标：wenbun（FSRS 间隔记忆）+ miniFlashcard（生字闪卡翻面）。
 *
 * 机制：
 *   - 复习队列 = 到期知识点（dueSkills 中 hanzi: 前缀）+ 薄弱字（weakSkills），
 *     去重后到期优先，只取本字表（getHanziByChar 命中）的字；
 *   - 每张卡正面显示「大字 + 拼音」，点击翻面显示释义/组词/例句，并可朗读；
 *   - 翻面后由孩子自评「记得 / 忘记」，调用 practice(skill, correct) 更新 SRS
 *     （答对升档排下次复习、答错温和回退），复习完的卡自动出队；
 *   - 单字朗读走本地 mp3（hanziAudio 旁路，离线稳定），整句/例句走系统 TTS。
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMastery, useStore } from '@/store/useStore';
import type { Progress } from '@/types';
import { dueSkills, weakSkills } from '@/lib/srs';
import { getHanziByChar, type HanziEntry } from '@/data/hanziIndex';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useTranslation } from '@/i18n/useTranslation';
import { useSwipe } from '@/lib/useSwipe';

export function HanziFlashReview() {
  const { t } = useTranslation();
  const mastery = useMastery();
  const practice = useStore((s) => s.practice);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  // 复习队列：到期优先 + 薄弱补位，去重并过滤到字表内
  const queue = useMemo<HanziEntry[]>(() => {
    const due = dueSkills({ mastery } as Progress, Date.now(), 200)
      .filter((k) => k.startsWith('hanzi:'))
      .map((k) => k.slice('hanzi:'.length));
    const weak = weakSkills({ mastery } as Progress, 40)
      .filter((x) => x.skill.startsWith('hanzi:'))
      .map((x) => x.skill.slice('hanzi:'.length));
    const seen = new Set<string>();
    const out: HanziEntry[] = [];
    for (const c of [...due, ...weak]) {
      if (seen.has(c)) continue;
      const entry = getHanziByChar(c);
      if (entry) {
        seen.add(c);
        out.push(entry);
      }
    }
    return out;
  }, [mastery]);

  const current = queue[idx];

  const cardRef = useSwipe<HTMLDivElement>({
    onSwipeRight: () => {
      if (flipped) return;
      sfxTap();
      if (idx > 0) setIdx((i) => i - 1);
    },
    onSwipeLeft: () => {
      if (flipped) return;
      sfxTap();
      next();
    },
  });

  const next = () => {
    setFlipped(false);
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
    } else {
      setFinished(true);
    }
  };

  const grade = (correct: boolean) => {
    if (!current) return;
    const skill = `hanzi:${current.c}`;
    practice(skill, correct, 1);
    setReviewed((n) => n + 1);
    if (correct) {
      sfxCorrect();
      celebrateSmall();
    } else {
      sfxWrong();
    }
    next();
  };

  // 空队列：今天没有需要复习的字
  if (!finished && queue.length === 0) {
    return (
      <div className="rounded-3xl bg-candy-green-soft p-8 text-center">
        <div className="text-5xl">🎉</div>
        <p className="mt-3 text-lg font-extrabold text-ink">{t('hanziFlashReview.noneTitle')}</p>
        <p className="mt-1 text-sm font-bold text-ink-soft">{t('hanziFlashReview.noneTip')}</p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="rounded-3xl bg-candy-yellow-soft p-8 text-center">
        <div className="text-5xl">🏆</div>
        <p className="mt-3 text-lg font-extrabold text-ink">{t('hanziFlashReview.doneTitle')}</p>
        <p className="mt-1 text-sm font-bold text-ink-soft">
          {t('hanziFlashReview.doneTip', { count: reviewed })}
        </p>
        <CandyButton
          tone="green"
          size="lg"
          className="mt-5"
          onClick={() => {
            sfxTap();
            setIdx(0);
            setFlipped(false);
            setReviewed(0);
            setFinished(false);
          }}
        >
          {t('hanziFlashReview.again')}
        </CandyButton>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      {/* 进度 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink-soft">
          {t('hanziFlashReview.progress', { current: idx + 1, total: queue.length })}
        </span>
        <span className="text-xs font-bold text-candy-purple-deep">
          {t('hanziFlashReview.reviewedCount', { count: reviewed })}
        </span>
      </div>

      {/* 闪卡主体 */}
      <motion.div
        ref={cardRef}
        className="relative h-72 w-full cursor-pointer select-none [perspective:1200px]"
        onClick={() => {
          if (!flipped) {
            sfxTap();
            setFlipped(true);
          }
        }}
      >
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500"
          animate={{ rotateY: flipped ? 180 : 0 }}
        >
          {/* 正面：大字 + 拼音 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-4 border-candy-purple-soft bg-white shadow-candy-sm [backface-visibility:hidden]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(current.c, { lang: 'zh-CN', module: 'hanzi' });
              }}
              aria-label={t('hanziFlashReview.readAria', { char: current.c })}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-candy-blue-soft text-candy-blue-deep"
            >
              🔊
            </button>
            <span className="text-8xl font-black text-ink">{current.c}</span>
            <span className="mt-3 text-2xl font-extrabold text-candy-purple-deep">{current.pd}</span>
            <span className="mt-4 text-xs font-bold text-ink-soft">{t('hanziFlashReview.tapToFlip')}</span>
          </div>

          {/* 背面：释义/组词/例句 */}
          <div
            className="absolute inset-0 flex flex-col justify-center gap-3 rounded-3xl border-4 border-candy-green-soft bg-gradient-to-br from-candy-green-soft to-candy-blue-soft p-5 shadow-candy-sm [backface-visibility:hidden]"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="text-center">
              <span className="text-5xl font-black leading-tight text-ink sm:text-6xl">{current.c}</span>
              <span className="ml-2 text-lg font-bold text-candy-purple-deep">{current.pd}</span>
            </div>
            <p className="text-sm font-semibold text-ink">{current.origin}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {current.words.map((w) => (
                <button
                  key={w}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(w, { lang: 'zh-CN', rate: 0.75 });
                  }}
                  className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-candy-green-deep active:scale-95"
                >
                  {w}
                </button>
              ))}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(current.sentence, { lang: 'zh-CN', rate: 0.8 });
              }}
              className="mx-auto rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-candy-blue-deep active:scale-95"
            >
              💬 {current.sentence}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* 自评按钮（翻面后出现） */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex gap-3"
          >
            <CandyButton tone="pink" size="lg" fullWidth onClick={() => grade(false)}>
              {t('hanziFlashReview.forgot')}
            </CandyButton>
            <CandyButton tone="green" size="lg" fullWidth onClick={() => grade(true)}>
              {t('hanziFlashReview.remember')}
            </CandyButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
