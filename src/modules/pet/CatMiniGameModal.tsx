import { useState, useEffect } from "react";
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { CyberMasterCat3D } from '@/components/games/CyberMasterCat3D';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { CatFishIcon } from '@/modules/pet/PetIcons';
import { useTranslation } from '@/i18n/useTranslation';

interface GameQuestion {
  id: number;
  prompt: string;
  options: string[];
  answerIdx: number;
}

const GAME_QUESTIONS: GameQuestion[] = [
  { id: 1, prompt: '1 + 2 = ?', options: ['3', '2', '4'], answerIdx: 0 },
  { id: 2, prompt: '5 - 3 = ?', options: ['1', '2', '3'], answerIdx: 1 },
  { id: 3, prompt: '4 + 4 = ?', options: ['6', '7', '8'], answerIdx: 2 },
  { id: 4, prompt: '拼音「b」接「a」', options: ['bā', 'mā', 'pā'], answerIdx: 0 },
  { id: 5, prompt: '拼音「m」接「o」', options: ['pō', 'mō', 'fō'], answerIdx: 1 },
  { id: 6, prompt: '“山”字代表什么？', options: ['河流', '高山', '太阳'], answerIdx: 1 },
  { id: 7, prompt: '2 + 5 = ?', options: ['6', '7', '8'], answerIdx: 1 },
  { id: 8, prompt: '10 - 4 = ?', options: ['6', '5', '7'], answerIdx: 0 },
];

export function CatMiniGameModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const addFish = useStore((s) => s.addFish);
  const petCat = useStore((s) => s.petCat);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [caughtFish, setCaughtFish] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  const currentQ = GAME_QUESTIONS[currentQIdx % GAME_QUESTIONS.length]!;

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (timeLeft <= 0) {
      setGameState('done');
      celebrateBig();
      speak(`游戏结束啦！恭喜接到了 ${caughtFish} 条小鱼干！`, { lang: 'zh-CN' });
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft, caughtFish]);

  if (!isOpen) return null;

  const startGame = () => {
    sfxTap();
    setGameState('playing');
    setCurrentQIdx(0);
    setScore(0);
    setCaughtFish(0);
    setTimeLeft(30);
    speak('猫爪接鱼干开始啦！快速答题接住小鱼干吧！', { lang: 'zh-CN' });
  };

  const handleChoice = (idx: number) => {
    if (gameState !== 'playing') return;

    if (idx === currentQ.answerIdx) {
      sfxCorrect();
      celebrateSmall();
      setScore((s) => s + 10);
      setCaughtFish((f) => f + 1);
      addFish(1);
      petCat();
      setCurrentQIdx((q) => q + 1);
    } else {
      sfxWrong();
      setCurrentQIdx((q) => q + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        className="relative w-full max-w-md rounded-3xl border-4 border-amber-400 bg-gradient-to-b from-amber-50 via-orange-50 to-pink-50 shadow-2xl p-5 text-center space-y-4 overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={() => {
            sfxTap();
            onClose();
          }}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 border-2 border-amber-300 text-amber-950 font-black flex items-center justify-center shadow-xs hover:bg-amber-100 active:scale-95"
        >
          ✕
        </button>

        {/* Modal Header */}
        <h2 className="text-xl font-black text-amber-950 flex items-center justify-center gap-2">
          {t('pet.fishCatchTitle')}
        </h2>

        {gameState === 'idle' && (
          <div className="space-y-4 py-4">
            <CyberMasterCat3D size={130} expression="excited" />
            <p className="text-xs font-black text-amber-800 bg-white/80 p-3 rounded-2xl border border-amber-200 shadow-xs">
              {t('pet.fishCatchRule')}
            </p>
            <CandyButton tone="orange" size="lg" onClick={startGame} className="w-full">
              {t('pet.fishCatchStart')}
            </CandyButton>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-4">
            {/* Header Status */}
            <div className="flex justify-between items-center text-xs font-black bg-white/80 p-2.5 rounded-2xl border border-amber-200 shadow-xs">
              <span className="text-rose-600 font-extrabold">{t('pet.timeLeft', { time: timeLeft })}</span>
              <span className="text-amber-600 flex items-center gap-1"><CatFishIcon size={18} /> {t('pet.caught', { count: caughtFish })}</span>
              <span className="text-purple-600">{t('pet.score', { score })}</span>
            </div>

            {/* Stage Drop Animation */}
            <div className="relative h-44 rounded-2xl bg-white/90 border-2 border-amber-200 overflow-hidden p-3 flex flex-col justify-between shadow-inner">
              {/* Falling Fish */}
              <motion.div
                key={currentQIdx}
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 10, opacity: 1 }}
                className="flex items-center justify-center gap-2 bg-amber-100 border-2 border-amber-400 px-4 py-2 rounded-2xl text-amber-950 font-black text-base shadow-md mx-auto"
              >
                <CatFishIcon size={24} />
                <span>{currentQ.prompt}</span>
              </motion.div>

              {/* Answer Buckets */}
              <div className="grid grid-cols-3 gap-2">
                {currentQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChoice(idx)}
                    className="rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-100 to-orange-100 p-3 text-sm font-black text-amber-950 shadow-xs hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-lg">🪣</span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'done' && (
          <div className="space-y-4 py-4">
            <CyberMasterCat3D size={130} expression="happy" />
            <div className="bg-white/90 p-4 rounded-2xl border-2 border-amber-300 shadow-xs space-y-1">
              <h3 className="text-lg font-black text-amber-950">{t('pet.challengeSuccess')}</h3>
              <p className="text-sm font-bold text-amber-800">{t('pet.caughtFishTotal', { count: caughtFish })}</p>
              <p className="text-xs text-amber-700">{t('pet.finalScore', { score, affection: caughtFish * 2 })}</p>
            </div>
            <CandyButton tone="orange" size="md" onClick={startGame} className="w-full">
              {t('pet.playAgain')}
            </CandyButton>
          </div>
        )}
      </motion.div>
    </div>
  );
}
