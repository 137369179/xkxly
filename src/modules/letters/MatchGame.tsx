import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LETTERS, type LetterItem } from '@/data/letters';
import { TONE_STYLE, toneOf } from '@/lib/tones';
import { cn, sampleMany, shuffle } from '@/lib/utils';
import { sfxCorrect, sfxFlip, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { randomPraise, speak, playLetterVoice, playWordVoice } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { StarRating } from '@/components/ui/Stars';
import { genLetterMatch } from '@/lib/ai/tasks';
import { AiAvatar } from '@/components/ai';
import { weakSkills } from '@/lib/srs';
import { useTranslation } from '@/i18n/useTranslation';

const PAIRS_PER_ROUND = 6;

interface RoundState {
  items: LetterItem[];
  uppers: LetterItem[];
  lowers: LetterItem[];
}

function makeRound(letters?: string[]): RoundState {
  let items: LetterItem[];
  if (letters && letters.length >= PAIRS_PER_ROUND) {
    // AI 推荐的字母列表
    items = letters
      .slice(0, PAIRS_PER_ROUND)
      .map((u) => LETTERS.find((l) => l.upper === u))
      .filter((x): x is LetterItem => !!x);
    // 不够 6 个就补
    if (items.length < PAIRS_PER_ROUND) {
      items = [...items, ...sampleMany(LETTERS, PAIRS_PER_ROUND - items.length)];
    }
  } else {
    items = sampleMany(LETTERS, PAIRS_PER_ROUND);
  }
  return {
    items,
    uppers: shuffle(items),
    lowers: shuffle(items),
  };
}

export function MatchGame() {
  const { t: tr } = useTranslation();
  const wonMatchGame = useStore((s) => s.wonMatchGame);
  const practice = useStore((s) => s.practice);
  const addStars = useStore((s) => s.addStars);
  const aiOn = useSettingsStore((s) => s.settings.aiEnabled);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [round, setRound] = useState<RoundState>(makeRound);
  const [pickedUpper, setPickedUpper] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [won, setWon] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** AI 推荐请求序号：让过期请求的回调失效，杜绝 AI on/off 快速切换时的竞态覆盖 */
  const aiReqSeqRef = useRef(0);

  const reset = useCallback(() => {
    const reqSeq = ++aiReqSeqRef.current; // 使之前所有 AI 请求回调失效
    if (aiMode && aiOn) {
      // AI 模式：让小智推荐字母
      setAiLoading(true);
      const progress = useStore.getState().progress;
      const learned = progress.lettersHeard;
      const unlearned = LETTERS.map((l) => l.upper).filter((u) => !learned.includes(u));
      const weak = weakSkills(progress, 6)
        .map((w) => w.skill.split(':')[1])
        .filter((x): x is string => !!x && /^[A-Z]$/.test(x));
      genLetterMatch(unlearned, weak, learned)
        .then((r) => {
          if (reqSeq !== aiReqSeqRef.current) return; // 过期请求丢弃
          setRound(makeRound(r.ok ? r.data : undefined));
        })
        .catch(() => {
          if (reqSeq !== aiReqSeqRef.current) return;
          setRound(makeRound());
        })
        .finally(() => {
          if (reqSeq !== aiReqSeqRef.current) return;
          setAiLoading(false);
        });
    } else {
      setRound(makeRound());
    }
    setPickedUpper(null);
    setMatched([]);
    setWrongPair([]);
    setWon(false);
    setMistakes(0);
    setCombo(0);
  }, [aiMode, aiOn]);

  // Switch AI mode or AI enabled change: regenerate round
  useEffect(() => {
    reset();
  }, [aiMode, aiOn]);

  // 全部配对成功
  useEffect(() => {
    if (matched.length === PAIRS_PER_ROUND && !won) {
      setWon(true);
      celebrateBig();
      sfxWin();
      wonMatchGame();
      addStars(3);
      void speak(`太棒了！26字母大小写全部配对成功！`, { rate: 0.85, module: 'praise' });
    }
  }, [matched.length, won, wonMatchGame, addStars]);

  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, []);

  const pickUpper = (item: LetterItem) => {
    if (matched.includes(item.upper)) return;
    sfxFlip();
    setPickedUpper(item.upper);
    void playLetterVoice(item.upper).catch(() => {
      void speak(item.upper, { lang: 'en-US', rate: 0.7 });
    });
  };

  const pickLower = (item: LetterItem) => {
    if (matched.includes(item.upper)) return;
    if (!pickedUpper) {
      // 引导：先选左边
      sfxFlip();
      void speak('请先点左边的大写字母哦', { rate: 0.85, module: 'quiz' });
      return;
    }
    if (pickedUpper === item.upper) {
      sfxCorrect();
      celebrateSmall();
      setCombo((c) => c + 1);
      setMatched((m) => [...m, item.upper]);
      setPickedUpper(null);
      // 记录掌握度
      practice(`letter:${item.upper}`, true);
      void playWordVoice(item.upper).catch(() => {
        void speak(randomPraise(), { rate: 0.95, module: 'praise' });
      });
    } else {
      sfxWrong();
      setCombo(0);
      setMistakes((m) => m + 1);
      setWrongPair([pickedUpper, item.upper]);
      // 记录答错
      practice(`letter:${pickedUpper}`, false);
      practice(`letter:${item.upper}`, false);
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = setTimeout(() => {
        setWrongPair([]);
        setPickedUpper(null);
      }, 620);
    }
  };

  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  return (
    <div className="space-y-5">
      <Panel className="!py-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold text-ink-soft">
            {tr('matchGame.instruction')}
          </span>
          <span className="shrink-0 text-sm font-extrabold text-candy-blue-deep">
            {matched.length} / {PAIRS_PER_ROUND}
          </span>
        </div>
        <ProgressBar value={matched.length} max={PAIRS_PER_ROUND} tone="green" />

        {/* 连击 Combo 飘字提示 */}
        <AnimatePresence>
          {combo >= 2 && (
            <motion.div
              initial={{ scale: 0, y: 10, rotate: -6 }}
              animate={{ scale: 1.1, y: 0, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3.5 py-1 text-xs font-black text-white shadow-md"
            >
              <span>🔥 连对 Combo x{combo}!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {aiOn && (
          <button
            type="button"
            onClick={() => setAiMode((v) => !v)}
            className="mt-3 flex w-full items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-left transition active:translate-y-[2px]"
            style={{
              background: aiMode ? '#dcecfa' : '#FFFFFF',
              borderColor: aiMode ? '#55aee0' : '#e2c4cb',
            }}
          >
            <AiAvatar size={28} mood={aiLoading ? 'talking' : aiMode ? 'talking' : 'sleep'} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-candy-blue-deep">
                {tr('matchGame.aiTitle')} {aiMode ? tr('matchGame.aiOn') : tr('matchGame.aiOff')}
              </span>
              <span className="block text-xs text-ink-soft">
                {aiLoading
                  ? tr('matchGame.aiLoading')
                  : aiMode
                    ? tr('matchGame.aiOnHint')
                    : tr('matchGame.aiOffHint')}
              </span>
            </span>
            <span
              className="grid h-7 w-12 shrink-0 items-center rounded-full px-1 transition"
              style={{ background: aiMode ? '#55aee0' : '#f0dde2' }}
            >
              <span
                className="block h-5 w-5 rounded-full bg-white transition-transform"
                style={{ transform: aiMode ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </span>
          </button>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {/* 大写列 */}
        <div>
          <h3 className="mb-3 text-center text-base font-extrabold text-candy-blue-deep">
            {tr('matchGame.uppercase')}
          </h3>
          <div className="space-y-3">
            {round.uppers.map((item) => {
              const tone = TONE_STYLE[toneOf(item.upper)]!
              const isMatched = matched.includes(item.upper);
              const isPicked = pickedUpper === item.upper;
              const isWrong = wrongPair.includes(item.upper) && wrongPair[0] === item.upper;
              return (
                <motion.button
                  key={`u-${item.upper}`}
                  onClick={() => pickUpper(item)}
                  disabled={isMatched}
                  animate={isWrong ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
                  transition={{ duration: 0.5 }}
                  whileTap={!isMatched ? { scale: 0.94 } : undefined}
                  className={cn(
                    'no-select relative flex min-h-[64px] w-full items-center justify-center gap-2',
                    'rounded-[1.3rem] text-4xl font-extrabold leading-tight transition-all duration-150 sm:min-h-[80px] sm:text-5xl',
                    'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-blue/60',
                    isMatched && 'opacity-55',
                    isPicked && 'ring-4 ring-candy-purple ring-offset-2',
                  )}
                  style={{
                    background: isMatched ? TONE_STYLE.green.soft : tone.soft,
                    color: isMatched ? TONE_STYLE.green.deep : tone.deep,
                    boxShadow: isMatched ? 'none' : `0 5px 0 0 ${tone.main}55`,
                  }}
                >
                  {item.upper}
                  {isMatched && <span className="text-xl">✅</span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 小写列 */}
        <div>
          <h3 className="mb-3 text-center text-base font-extrabold text-candy-pink-deep">
            {tr('matchGame.lowercase')}
          </h3>
          <div className="space-y-3">
            {round.lowers.map((item) => {
              const tone = TONE_STYLE[toneOf(item.lower)]!
              const isMatched = matched.includes(item.upper);
              const isWrong = wrongPair.includes(item.upper) && wrongPair[1] === item.upper;
              return (
                <motion.button
                  key={`l-${item.upper}`}
                  onClick={() => pickLower(item)}
                  disabled={isMatched}
                  animate={isWrong ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
                  transition={{ duration: 0.5 }}
                  whileTap={!isMatched ? { scale: 0.94 } : undefined}
                  className={cn(
                    'no-select relative flex min-h-[64px] w-full items-center justify-center gap-2',
                    'rounded-[1.3rem] text-4xl font-extrabold leading-tight transition-all duration-150 sm:min-h-[80px] sm:text-5xl',
                    'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-pink/60',
                    isMatched && 'opacity-55',
                  )}
                  style={{
                    background: isMatched ? TONE_STYLE.green.soft : tone.soft,
                    color: isMatched ? TONE_STYLE.green.deep : tone.deep,
                    boxShadow: isMatched ? 'none' : `0 5px 0 0 ${tone.main}55`,
                  }}
                >
                  {item.lower}
                  {isMatched && <span className="text-xl">{item.emoji}</span>}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <CandyButton tone="purple" variant="soft" size="md" onClick={reset}>
          🔄 {tr('matchGame.shuffle')}
        </CandyButton>
      </div>

      {/* 胜利弹窗 */}
      <Modal open={won} onClose={reset} className="max-w-sm text-center">
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <div className="text-7xl">🎉</div>
            <h3 className="mt-3 text-3xl font-extrabold text-rainbow">{tr('matchGame.winTitle')}</h3>
            <p className="mt-2 text-base font-bold text-ink-soft">
              {mistakes === 0 ? tr('matchGame.perfect') : tr('matchGame.someMistakes', { count: mistakes })}
            </p>
            <div className="mt-4 flex justify-center">
              <StarRating value={stars} size={40} animated />
            </div>
            <p className="mt-3 text-lg font-extrabold text-candy-yellow-deep">+3 ⭐</p>
            <CandyButton tone="green" size="lg" fullWidth className="mt-6" onClick={reset}>
              {tr('matchGame.playAgain')} 🚀
            </CandyButton>
          </motion.div>
        </AnimatePresence>
      </Modal>
    </div>
  );
}
