import { motion, AnimatePresence } from 'motion/react';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { useEffect, useState } from 'react';

const HINTS = [
  '小智正在想故事…',
  '正在给故事画画…',
  '快好了快好了…',
];

interface GeneratingOverlayProps {
  onCancel: () => void;
}

export function GeneratingOverlay({ onCancel }: GeneratingOverlayProps) {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex((i) => (i + 1) % HINTS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-12"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AiAvatar size={80} mood="thinking" />
      </motion.div>

      <div className="h-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={hintIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-lg sm:text-xl text-purple-400 font-bold"
          >
            {HINTS[hintIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* 进度指示点 */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-purple-300"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-gray-400 underline"
      >
        取消
      </button>
    </motion.div>
  );
}
