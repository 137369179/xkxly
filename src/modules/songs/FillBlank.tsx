/**
 * 趣味填词游戏
 * ------------------------------------------------------------------
 * 从歌词中挖空 1-2 个词，让孩子选择正确答案。
 * 3 个难度等级，答对有星星奖励。
 * 纯本地逻辑，不调用 AI。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { TONE_STYLE } from '@/lib/tones';
import type { Tone } from '@/lib/tones';
import type { NurseryRhyme } from '@/data/nurseryRhymes';
import { recordAttempt } from '@/lib/adaptChain';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/study/AdaptiveDifficultyHint';
import { useTranslation } from '@/i18n/useTranslation';

type Difficulty = 1 | 2 | 3;

interface BlankQuestion {
  /** 完整歌词行 */
  fullLine: string;
  /** 挖空前的文本 */
  before: string;
  /** 挖空的词 */
  answer: string;
  /** 挖空后的文本 */
  after: string;
  /** 3 个选项（含正确答案） */
  options: string[];
  /** 正确答案在 options 中的下标 */
  answerIdx: number;
}

/** 把中文歌词行拆成有意义的词 */
function tokenize(line: string): string[] {
  // 去掉标点
  const clean = line.replace(/[，。！？，！？、…—\s]/g, '');
  // 按自然断点分组：每 2-3 个字一组
  const tokens: string[] = [];
  let i = 0;
  while (i < clean.length) {
    // 优先取 2 字词，偶尔取 1 字或 3 字
    const len = (i + 2 <= clean.length) ? 2 : 1;
    tokens.push(clean.slice(i, i + len));
    i += len;
  }
  return tokens;
}

/** 生成填词题 */
function generateQuestion(
  rhyme: NurseryRhyme,
  difficulty: Difficulty,
): BlankQuestion | null {
  const lines = rhyme.lyrics.filter((l) => l.replace(/[，。！？，！？、…—\s]/g, '').length >= 4);
  if (lines.length === 0) return null;

  const lineIdx = Math.floor(Math.random() * lines.length);
  const line = lines[lineIdx]!;
  const tokens = tokenize(line);
  if (tokens.length < 3) return null;

  // 难度 1：挖简单词（第 1 个词）；难度 2：挖难词（中间词）；难度 3：挖 2 个词
  // 对于难度 1 和 2，挖 1 个词
  const targetIdx = difficulty === 1 ? 0 : difficulty === 2 ? Math.floor(tokens.length / 2) : 0;
  const targetWord = tokens[targetIdx];
  if (!targetWord) return null;

  // 找到 targetWord 在原行中的位置
  const cleanLine = line.replace(/[，。！？，！？、…—\s]/g, '');
  const pos = cleanLine.indexOf(targetWord);
  if (pos < 0) return null;

  const before = cleanLine.slice(0, pos);
  const after = cleanLine.slice(pos + targetWord.length);

  // 生成干扰选项：从其他歌词中取长度相同的词
  const allTokens = new Set<string>();
  for (const l of rhyme.lyrics) {
    const ts = tokenize(l);
    for (const t of ts) {
      if (t !== targetWord && t.length === targetWord.length) {
        allTokens.add(t);
      }
    }
  }
  const distractors = Array.from(allTokens).sort(() => Math.random() - 0.5).slice(0, 2);

  // 如果干扰项不足，用随机字补充
  while (distractors.length < 2) {
    const filler: string = targetWord.length === 1 ? '呀' : '什么';
    if (!distractors.includes(filler) && filler !== targetWord) {
      distractors.push(filler);
    } else {
      break;
    }
  }

  const options = [targetWord, ...distractors].sort(() => Math.random() - 0.5);
  const answerIdx = options.indexOf(targetWord);

  return {
    fullLine: line,
    before,
    answer: targetWord,
    after,
    options,
    answerIdx,
  };
}

interface FillBlankProps {
  rhyme: NurseryRhyme;
  tone: Tone;
}

export function FillBlank({ rhyme, tone }: FillBlankProps) {
  // 'rhyme' 是儿歌填词自己的自适应桶，不和古诗背诵(poem)混在一起算水平
  const [difficulty, setDifficulty, diffMeta] = useAdaptiveDifficultyState('rhyme');
  const { t: tr } = useTranslation();
  const [question, setQuestion] = useState<BlankQuestion | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [stars, setStars] = useState(0);

  const t = TONE_STYLE[tone]!;

  /** 本题出现的时刻，用来给自适应引擎提供反应时信号 */
  const askedAtRef = useRef(0);

  // 生成新一题
  const newQuestion = useCallback(() => {
    const q = generateQuestion(rhyme, difficulty);
    setQuestion(q);
    setSelectedIdx(null);
    setAnswered(false);
    askedAtRef.current = Date.now();
  }, [rhyme, difficulty]);

  // 初始化 & 难度切换时重新出题
  useEffect(() => {
    newQuestion();
    setScore(0);
    setRound(0);
    setStars(0);
  }, [rhyme.id, difficulty]); // intentional: reset on rhyme/difficulty change

  const handleSelect = (idx: number) => {
    if (answered || !question) return;
    sfxTap();
    setSelectedIdx(idx);

    const correct = idx === question.answerIdx;
    setAnswered(true);

    // 喂给自适应引擎（本模块是自定义 UI，不走 QuizCard，得自己记）
    recordAttempt('rhyme', {
      correct,
      ms: askedAtRef.current ? Date.now() - askedAtRef.current : 0,
      hintUsed: false,
      ...(correct ? {} : { errorType: 'rhyme-fill' }),
    });

    if (correct) {
      sfxCorrect();
      const points = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3;
      setScore((s) => s + points);
      setStars((s) => s + 1);
      setRound((r) => r + 1);
      celebrateSmall();
    } else {
      sfxWrong();
    }
  };

  const handleNext = () => {
    sfxTap();
    // 出下一题是安全边界：让小智把最新建议应用上来
    diffMeta.syncNow();
    newQuestion();
  };

  if (!question) {
    return (
      <Panel className="text-center">
        <p className="py-6 text-sm font-bold text-ink-soft">
          {tr('rhyme.lyricsTooShort')}
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <PanelTitle emoji="🎮" title={tr('rhyme.title')} tone={tone} />

      {/* 难度选择 */}
      <div className="flex justify-center gap-2">
        {([1, 2, 3] as Difficulty[]).map((d) => (
          <CandyButton
            key={d}
            tone={difficulty === d ? 'pink' : 'purple'}
            variant={difficulty === d ? 'solid' : 'soft'}
            size="sm"
            onClick={() => {
              sfxTap();
              setDifficulty(d);
            }}
          >
            {d === 1 ? tr('rhyme.level1') : d === 2 ? tr('rhyme.level2') : tr('rhyme.level3')}
          </CandyButton>
        ))}
      </div>
      <AdaptiveDifficultyHint
        meta={diffMeta}
        labels={{ 1: tr('rhyme.level1'), 2: tr('rhyme.level2'), 3: tr('rhyme.level3') }}
        className="justify-center"
      />

      {/* 得分显示 */}
      <div className="flex items-center justify-center gap-4">
        <div className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-extrabold text-ink">
          {tr('rhyme.score')} <span style={{ color: t.deep }}>{score}</span>
        </div>
        <div className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-extrabold text-ink">
          ⭐ {tr('rhyme.stars', { stars })}
        </div>
        <div className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-bold text-ink-soft">
          {tr('rhyme.questionNum', { n: round + 1 })}
        </div>
      </div>

      {/* 题目 */}
      <Panel>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${rhyme.id}-${round}-${difficulty}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* 歌词填空 */}
            <div
              className="rounded-2xl p-5 text-center text-xl font-black leading-relaxed"
              style={{ background: t.soft, color: t.deep }}
            >
              <span>{question.before}</span>
              <span
                className="inline-block mx-1 min-w-[3em] rounded-lg border-b-4 px-2"
                style={{
                  borderColor: t.main,
                  color: answered
                    ? (selectedIdx === question.answerIdx ? t.deep : '#e53e3e')
                    : 'transparent',
                  background: answered ? 'rgba(255,255,255,0.6)' : 'transparent',
                }}
              >
                {answered && selectedIdx !== null ? question.options[selectedIdx as number] : '???'}
              </span>
              <span>{question.after}</span>
            </div>

            {/* 选项 */}
            <div className="grid grid-cols-3 gap-3">
              {question.options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                const isCorrect = idx === question.answerIdx;
                const showResult = answered && (isSelected || isCorrect);

                return (
                  <motion.button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    whileHover={{ scale: answered ? 1 : 1.05 }}
                    whileTap={{ scale: answered ? 1 : 0.95 }}
                    disabled={answered}
                    className="min-h-[56px] rounded-2xl border-3 text-lg font-black transition-all"
                    style={{
                      background: showResult
                        ? (isCorrect ? TONE_STYLE.green.soft : '#FFE0E0')
                        : 'white',
                      borderColor: showResult
                        ? (isCorrect ? TONE_STYLE.green.main : '#ff5c7a')
                        : 'white',
                      color: showResult
                        ? (isCorrect ? TONE_STYLE.green.deep : '#C53030')
                        : t.deep,
                      opacity: answered && !showResult ? 0.5 : 1,
                    }}
                  >
                    {opt}
                    {answered && isCorrect && ' ✅'}
                    {answered && isSelected && !isCorrect && ' ❌'}
                  </motion.button>
                );
              })}
            </div>

            {/* 结果提示 */}
            {answered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                {selectedIdx === question.answerIdx ? (
                  <p className="text-lg font-black" style={{ color: TONE_STYLE.green.deep }}>
                    {tr('rhyme.correctPrefix')}{difficulty === 3 ? tr('rhyme.challengeSuccess') : tr('rhyme.great')}
                  </p>
                ) : (
                  <p className="text-base font-bold text-ink-soft">
                    {tr('rhyme.wrongAnswer', { answer: question.answer })}
                  </p>
                )}
              </motion.div>
            )}

            {/* 下一题按钮 */}
            {answered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <CandyButton tone={tone} size="sm" onClick={handleNext}>
                  {tr('rhyme.nextQuestion')}
                </CandyButton>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </Panel>
    </div>
  );
}
