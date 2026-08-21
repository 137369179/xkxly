import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAiTask } from '@/lib/ai/useAi';
import { wrongVariantTask } from '@/lib/ai/tasks';
import type { WrongVariantQuestion } from '@/lib/ai/prompts';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { CandyButton } from '@/components/ui/Button';
import { AiAvatar } from '@/components/ai/AiAvatar';

interface AiVariantModalProps {
  skillId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AiVariantModal({ skillId, isOpen, onClose }: AiVariantModalProps) {
  const addStars = useStore((s) => s.addStars);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const { loading, result, run } = useAiTask<WrongVariantQuestion>(
    () => wrongVariantTask(skillId, `练习技能：${skillId}`, '正确项'),
    false,
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(false);
      run();
    }
  }, [isOpen, skillId]);

  if (!isOpen) return null;

  const data = result?.data;

  const handleSelect = (option: string) => {
    if (isAnswered || !data) return;
    sfxTap();
    setSelectedOption(option);
    setIsAnswered(true);
    const correct = option.trim() === data.answer.trim();
    setIsCorrect(correct);
    if (correct) {
      sfxCorrect();
      addStars(2);
      celebrateSmall();
    } else {
      sfxWrong();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border-4 border-candy-purple"
        >
          <header className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <AiAvatar size={34} mood={loading ? 'thinking' : isAnswered ? (isCorrect ? 'celebrating' : 'talking') : 'idle'} />
              <div>
                <h3 className="text-lg font-black text-ink-main">AI 举一反三变式题</h3>
                <span className="text-xs font-bold text-candy-purple">知识点：{skillId}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-cream-dark text-ink-soft hover:bg-cream font-bold"
            >
              ✕
            </button>
          </header>

          {loading ? (
            <div className="py-12 text-center space-y-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="text-4xl"
              >
                🪄
              </motion.div>
              <p className="text-sm font-bold text-ink-soft">小茜正在为你定制变式题…</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-purple-50 p-4 border border-purple-100">
                <p className="text-base font-bold text-ink leading-relaxed">{data.question}</p>
                {data.hint && (
                  <p className="mt-2 text-xs font-bold text-purple-600">💡 提示：{data.hint}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(data.options || []).map((opt: string, i: number) => {
                  const isChosen = selectedOption === opt;
                  const isTarget = opt.trim() === data.answer.trim();
                  let btnBg = 'bg-white hover:bg-purple-50 text-ink border-2 border-purple-100';
                  if (isAnswered) {
                    if (isTarget) btnBg = 'bg-green-500 text-white border-2 border-green-600 font-black';
                    else if (isChosen) btnBg = 'bg-rose-500 text-white border-2 border-rose-600 font-black';
                  }

                  return (
                    <button
                      key={i}
                      disabled={isAnswered}
                      onClick={() => handleSelect(opt)}
                      className={`min-h-[48px] rounded-2xl p-3 text-sm font-bold transition active:scale-95 shadow-sm ${btnBg}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-3 text-sm font-bold ${
                    isCorrect ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
                  }`}
                >
                  <p className="font-extrabold mb-1">
                    {isCorrect ? '🎉 太棒了，变式题完全做对！' : '💪 差一点点就对啦，看看小茜的思路：'}
                  </p>
                  <p className="text-xs font-medium leading-relaxed">{data.explanation}</p>
                </motion.div>
              )}

              <footer className="flex justify-end gap-2 pt-2">
                {isAnswered && (
                  <CandyButton tone="purple" size="sm" onClick={run}>
                    再出一道 ✨
                  </CandyButton>
                )}
              </footer>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm font-bold text-ink-soft">生成失败，稍后再试</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
