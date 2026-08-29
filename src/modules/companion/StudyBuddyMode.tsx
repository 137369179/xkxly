/**
 * StudyBuddyMode —— 学习搭子模式
 * ------------------------------------------------------------------
 * 小茜出题，先给出自己的答案（可能故意答错），
 * 孩子判断小茜对不对 → buddyJudge(correct)
 *
 * - 连续 3 题判断正确升难度，答错降难度
 * - 显示统计：判断次数 / 正确率 / 连击
 * - 大字体、大触控区、鲜艳色彩，儿童友好
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { useAiTask } from '@/lib/ai/useAi';
import { buddyQuizTask, type BuddyQuizData } from '@/lib/ai/tasks';
import { useStore } from '@/store/useStore';
import { TONE_STYLE } from '@/lib/tones';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

const SUBJECTS = [
  { id: 'math', emoji: '🧮', labelKey: 'buddy.subjectMath' },
  { id: 'poem', emoji: '🌸', labelKey: 'buddy.subjectPoem' },
  { id: 'hanzi', emoji: '✍️', labelKey: 'buddy.subjectHanzi' },
  { id: 'english', emoji: '🔤', labelKey: 'buddy.subjectEnglish' },
] as const;

export function StudyBuddyMode() {
  const { t: tr } = useTranslation();
  const progress = useStore((s) => s.progress);
  const buddyJudge = useStore((s) => s.buddyJudge);

  const difficulty = progress.buddyDifficulty ?? 1;
  const judgeCount = progress.buddyJudgeCount ?? 0;
  const correctJudge = progress.buddyCorrectJudge ?? 0;
  const streak = progress.buddyStreak ?? 0;
  const accuracy = judgeCount > 0 ? Math.round((correctJudge / judgeCount) * 100) : 0;

  const [subject, setSubject] = useState<string>('math');
  const [quiz, setQuiz] = useState<BuddyQuizData | null>(null);
  const [phase, setPhase] = useState<'loading' | 'question' | 'reveal' | 'result'>('loading');
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);

  const { result, loading, run } = useAiTask<BuddyQuizData>(
    () => buddyQuizTask(
      subject === 'math' ? '数学'
      : subject === 'poem' ? '古诗'
      : subject === 'hanzi' ? '汉字'
      : '英语',
      difficulty,
    ),
  );

  // 获取题目
  const fetchQuiz = useCallback(() => {
    setPhase('loading');
    run();
  }, [run]);

  // 首次加载 & 切换科目时自动获取
  useEffect(() => {
    fetchQuiz();
  }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  // 题目返回
  useEffect(() => {
    if (result?.ok && result.data) {
      setQuiz(result.data);
      setPhase('question');
    }
  }, [result]);

  // 孩子判断小茜对错
  const handleJudge = (correct: boolean) => {
    if (!quiz || phase !== 'question') return;
    sfxTap();
    setPhase('reveal');

    // 孩子判断是否正确 = 孩子说的和小茜实际是否一致
    const childCorrect = correct === quiz.isCorrect;
    buddyJudge(childCorrect);

    if (childCorrect) {
      sfxCorrect();
      setLastResult('correct');
    } else {
      sfxWrong();
      setLastResult('wrong');
    }

    // 1.5 秒后进入下一题
    setTimeout(() => {
      setPhase('question');
      setLastResult(null);
      fetchQuiz();
    }, 2500);
  };

  const tone = TONE_STYLE.blue;

  return (
    <Panel>
      <PanelTitle
        emoji="🎯"
        title={tr('buddy.title')}
        subtitle={tr('buddy.subtitle')}
        tone="blue"
      />

      {/* 统计卡片 */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-candy-blue-soft p-3 text-center">
          <div className="text-2xl font-extrabold" style={{ color: tone.deep }}>
            {judgeCount}
          </div>
          <div className="text-xs font-bold text-ink-soft">{tr('buddy.judgeCount')}</div>
        </div>
        <div className="rounded-2xl bg-candy-green-soft p-3 text-center">
          <div className="text-2xl font-extrabold text-green-600">{accuracy}%</div>
          <div className="text-xs font-bold text-ink-soft">{tr('buddy.accuracy')}</div>
        </div>
        <div className="rounded-2xl bg-candy-yellow-soft p-3 text-center">
          <div className="text-2xl font-extrabold text-orange-500">
            🔥{streak}
          </div>
          <div className="text-xs font-bold text-ink-soft">{tr('buddy.streak')}</div>
        </div>
      </div>

      {/* 科目选择 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SUBJECTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              sfxTap();
              setSubject(s.id);
            }}
            className={`min-h-[44px] rounded-2xl border-2 px-4 text-sm font-extrabold transition active:translate-y-[2px] ${
              s.id === subject ? 'text-white shadow' : 'bg-white'
            }`}
            style={
              s.id === subject
                ? { background: tone.main, borderColor: tone.main }
                : { borderColor: `${tone.main}55`, color: tone.deep }
            }
          >
            {s.emoji} {tr(s.labelKey)}
          </button>
        ))}
      </div>

      {/* 难度标签 */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-sm font-bold"
          style={{ background: tone.soft, color: tone.deep }}
        >
          {tr(`buddy.difficulty${difficulty}` as const)}
        </span>
        {streak >= 3 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-sm font-extrabold text-orange-500"
          >
            🚀 {tr('buddy.levelUp')}
          </motion.span>
        )}
      </div>

      {/* 题目区 */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-8"
          >
            <AiAvatar size={36} mood="thinking" />
            <span className="text-base font-bold text-ink-soft">{tr('buddy.loading')}</span>
          </motion.div>
        )}

        {quiz && phase === 'question' && (
          <motion.div
            key={`q-${quiz.question}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* 题目 */}
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: tone.soft }}
            >
              <p className="text-xs font-bold text-ink-soft mb-2">📝 {tr('buddy.question')}</p>
              <p className="text-2xl font-extrabold" style={{ color: tone.deep }}>
                {quiz.display ?? quiz.question}
              </p>
            </div>

            {/* 小茜的答案 */}
            <div className="flex items-start gap-3">
              <AiAvatar size={36} mood="talking" />
              <div className="flex-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-sm font-bold text-ink-soft">{tr('buddy.buddySays')}</p>
                <p className="text-xl font-extrabold text-ink">
                  {quiz.buddyAnswer}
                </p>
              </div>
            </div>

            {/* 判断按钮 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleJudge(true)}
                className="min-h-[56px] rounded-2xl text-lg font-extrabold transition active:translate-y-[3px]"
                style={{
                  background: '#62CC8A',
                  color: '#FFFFFF',
                  boxShadow: '0 5px 0 0 #3FC26B',
                }}
              >
                ✅ {tr('buddy.correctBtn')}
              </button>
              <button
                type="button"
                onClick={() => handleJudge(false)}
                className="min-h-[56px] rounded-2xl text-lg font-extrabold transition active:translate-y-[3px]"
                style={{
                  background: '#FF9F2E',
                  color: '#FFFFFF',
                  boxShadow: '0 5px 0 0 #b45f09',
                }}
              >
                ❌ {tr('buddy.wrongBtn')}
              </button>
            </div>
          </motion.div>
        )}

        {quiz && phase === 'reveal' && (
          <motion.div
            key={`r-${quiz.question}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* 揭晓答案 */}
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: lastResult === 'correct' ? '#DDF7E7' : '#FFEBDB',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="text-5xl mb-2"
              >
                {lastResult === 'correct' ? '🎉' : '💪'}
              </motion.div>
              <p className="text-lg font-extrabold mb-2" style={{ color: tone.deep }}>
                {lastResult === 'correct' ? tr('buddy.judgeCorrect') : tr('buddy.judgeWrong')}
              </p>
              <div className="rounded-xl bg-white p-3 mt-2">
                <p className="text-sm font-bold text-ink-soft">
                  {tr('buddy.correctAnswer')}<span className="text-base font-extrabold text-green-600">{quiz.correctAnswer}</span>
                </p>
                <p className="text-sm font-medium text-ink mt-1">{quiz.explanation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 连击星星特效 */}
      <AnimatePresence>
        {streak > 0 && streak % 3 === 0 && lastResult === 'correct' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0 }}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 text-4xl"
          >
            {void sfxStar()}
            ⭐⭐⭐
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
