import { useState } from "react";
import { motion } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong, sfxTap } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { getRandomCatHelpQuestion, type CatHelpQuestion } from '@/lib/catStudyHelp';
import { CatManorIcon } from '@/components/pet/PetIcons';
import { useTranslation } from '@/i18n/useTranslation';

const EMPTY_OUTFITS: Record<string, string> = Object.freeze({});

/** 求助姿势 → 统一羊毛毡图片映射 */
const HELP_POSE_IMG: Record<'thinking' | 'excited' | 'happy' | 'cute', string> = {
  thinking: '/cat/cat-idle-default.jpg',
  excited: '/cat/cat-jump-excited.jpg',
  happy: '/cat/cat-purr-love.jpg',
  cute: '/cat/cat-roll-playful.jpg',
};

/** 表情 → 覆盖层贴纸提示文案 */
const HELP_POSE_EMOJI: Record<'thinking' | 'excited' | 'happy' | 'cute', string> = {
  thinking: '🤔',
  excited: '🎉',
  happy: '💖',
  cute: '🎀',
};

export function CatStudyHelpCard() {
  const { t: tr } = useTranslation();
  const addFish = useStore((s) => s.addFish);
  const petCat = useStore((s) => s.petCat);
  const equippedOutfits = useStore((s) => s.progress.equippedOutfits ?? EMPTY_OUTFITS);

  const [question, setQuestion] = useState<CatHelpQuestion>(() => getRandomCatHelpQuestion());
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [expression, setExpression] = useState<'thinking' | 'excited' | 'happy' | 'cute'>('thinking');

  const handleNext = () => {
    sfxTap();
    setQuestion(getRandomCatHelpQuestion());
    setSelectedIdx(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setExpression('thinking');
  };

  const handleChoice = (idx: number) => {
    if (isAnswered) return;
    setSelectedIdx(idx);
    setIsAnswered(true);

    if (idx === question.answerIdx) {
      setIsCorrect(true);
      setExpression('excited');
      sfxCorrect();
      celebrateSmall();
      addFish(question.rewardFish);
      petCat(); // Boost affection

      const msg = `哇！小老师解答太棒了！猫咪学会了喵！获得 ${question.rewardFish} 条小鱼干！`;
      speak(msg, { lang: 'zh-CN' });
    } else {
      setIsCorrect(false);
      setExpression('cute');
      sfxWrong();

      const msg = '喵呜~ 没关系，小老师我们再试一次喵！';
      speak(msg, { lang: 'zh-CN' });
    }
  };

  return (
    <Panel className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 space-y-4 relative overflow-hidden shadow-lg">
      <div className="flex justify-between items-center border-b border-amber-200/80 pb-2">
        <h3 className="text-lg font-black text-amber-950 flex items-center gap-2">
          <CatManorIcon size={26} /> {tr('catStudyHelp.title')}
        </h3>
        <span className="text-xs font-black text-amber-800 bg-white/80 px-3 py-1 rounded-full shadow-xs border border-amber-200">
          {tr('catStudyHelp.reward', { fish: question.rewardFish, heart: question.rewardAffection })}
        </span>
      </div>

      {/* 猫咪求助对话面板 */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/90 rounded-3xl p-4 border-2 border-amber-200 shadow-xs relative">
        {/* 猫咪形象 - 统一羊毛毡风格 */}
        <div className="flex-shrink-0 relative cursor-pointer" onClick={() => handleNext()}>
          <motion.div
            key={expression}
            initial={{ scale: 0.9, rotate: -2, opacity: 0 }}
            animate={{
              scale: [1, 1.04, 1],
              rotate: expression === 'excited' ? [0, -3, 3, 0] : expression === 'cute' ? [0, 4, -2, 0] : 0,
              opacity: 1,
            }}
            transition={{ duration: expression === 'thinking' ? 2.2 : 0.7, repeat: expression === 'thinking' ? Infinity : 0, ease: 'easeOut' }}
            className="relative h-28 w-28 overflow-hidden rounded-3xl border-4 border-amber-300 bg-white shadow-md"
          >
            <img
              src={HELP_POSE_IMG[expression]}
              alt={`Help cat - ${expression}`}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            {/* 表情表情包角标（统一 icon-chip 风格） */}
            <div className="icon-chip icon-chip--lg icon-chip--pos-tl select-none">
              {HELP_POSE_EMOJI[expression]}
            </div>
            {/* 已装备的装扮角标（统一 badge-chip 风格） */}
            {(equippedOutfits['hat'] || equippedOutfits['neck']) && (
              <div className="badge-chip badge-chip--amber" style={{ top: '0.25rem', right: '0.25rem' }}>
                {[equippedOutfits['hat'], equippedOutfits['neck']]
                  .filter(Boolean)
                  .map((id) =>
                    id === 'crown' ? '👑' :
                    id === 'glasses' ? '👓' :
                    id === 'bow' ? '🎀' :
                    id === 'tie' ? '👔' : ''
                  )
                  .join(' ')}
              </div>
            )}
          </motion.div>
          <div className="absolute -bottom-1 inset-x-0 text-center">
            <span className="badge-chip badge-chip--amber" style={{ position: 'static', fontSize: '0.625rem' }}>
              {tr('catStudyHelp.asking', { subject: question.subjectName })}
            </span>
          </div>
        </div>

        {/* 气泡提问文案 */}
        <div className="flex-1 space-y-2 text-left">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-3 text-sm font-black text-amber-950 relative shadow-xs">
            <span className="mb-1 flex items-start gap-2">
              <span className="icon-chip icon-chip--static icon-chip--sm shrink-0">💬</span>
              <span className="text-base">{question.catPrompt}</span>
            </span>
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-2 p-2 rounded-xl text-xs font-bold ${
                  isCorrect ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {isCorrect ? tr('catStudyHelp.explain', { text: question.explanation }) : tr('catStudyHelp.answerIs', { answer: question.options[question.answerIdx] ?? '' })}
              </motion.div>
            )}
          </div>

          {/* 3 个选项 */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {question.options.map((opt, idx) => {
              const isSelected = selectedIdx === idx;
              let btnStyle = 'border-amber-300 bg-white text-amber-950 hover:bg-amber-100';

              if (isAnswered) {
                if (idx === question.answerIdx) {
                  btnStyle = 'border-emerald-500 bg-emerald-100 text-emerald-950 font-black scale-105';
                } else if (isSelected) {
                  btnStyle = 'border-rose-400 bg-rose-100 text-rose-900';
                } else {
                  btnStyle = 'border-amber-200 bg-gray-50 text-gray-400 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleChoice(idx)}
                  disabled={isAnswered}
                  className={`rounded-2xl border-2 py-2.5 px-2 text-sm font-black shadow-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1 ${btnStyle}`}
                >
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部换题/结算按钮 */}
      {isAnswered && (
        <div className="flex justify-end pt-1">
          <CandyButton tone="orange" size="sm" onClick={handleNext}>
            {tr('catStudyHelp.next')}
          </CandyButton>
        </div>
      )}
    </Panel>
  );
}
