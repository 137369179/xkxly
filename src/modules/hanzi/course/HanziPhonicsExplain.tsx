import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { HanziEntry } from '@/data/hanzi';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxStar } from '@/lib/sfx';

interface Props {
  char: HanziEntry;
  onComplete: (stars: number) => void;
}

const TONE_NAMES: Record<number, { name: string; curve: string; desc: string }> = {
  1: { name: '第一声（阴平）', curve: '—', desc: '一声平高平又直' },
  2: { name: '第二声（阳平）', curve: '／', desc: '二声向上扬又起' },
  3: { name: '第三声（上声）', curve: '∨', desc: '三声下沉再拐弯' },
  4: { name: '第四声（去声）', curve: '＼', desc: '四声从高往下降' },
};

export function HanziPhonicsExplain({ char, onComplete }: Props) {
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);

  const toneInfo = TONE_NAMES[char.tone] ?? TONE_NAMES[1]!;

  useEffect(() => {
    speak(`认字理，读拼音：${char.c}，拼音是 ${char.pd}。部首是${char.radical}，一共${char.strokes}画。`);
  }, [char]);

  const handlePlayWord = (word: string, idx: number) => {
    sfxTap();
    setActiveWordIdx(idx);
    speak(word);
    setTimeout(() => setActiveWordIdx(null), 1000);
  };

  const handlePlaySentence = () => {
    sfxTap();
    speak(char.sentence);
  };

  const handleFinish = () => {
    sfxCorrect();
    sfxStar();
    onComplete(3);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[460px] p-4 text-slate-800">
      {/* 顶部标签 */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-100/80 border border-sky-300 rounded-full text-sky-900 font-bold text-sm">
          <span>💡 认字音 · 明字理</span>
          <span className="text-xs bg-sky-200 px-2 py-0.5 rounded-full">{toneInfo.name}</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800">
          拼音、部首与常用组词
        </h2>
      </div>

      {/* 核心字理分解卡 (Main Phonics & Radical Card) */}
      <div className="w-full max-w-md my-3 p-5 bg-gradient-to-b from-sky-50 to-blue-50/70 rounded-3xl border-2 border-sky-200 shadow-xl space-y-4">
        {/* 大字与拼音声调展示 */}
        <div className="flex items-center justify-center gap-6 bg-white/90 p-4 rounded-2xl border border-sky-100 shadow-sm">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => speak(`${char.c}，${char.pd}`)}
            className="w-24 h-24 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-5xl font-black shadow-md cursor-pointer relative group"
            role="button"
            tabIndex={0}
            aria-label={`发音示范：${char.c}`}
          >
            {char.c}
            <span className="absolute -bottom-2 -right-2 text-xs bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded-md shadow">
              🔊 点读
            </span>
          </motion.div>

          <div className="flex flex-col justify-center space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-sky-700 tracking-wide font-mono">{char.pd}</span>
              <span className="text-xs font-bold text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
                {toneInfo.curve} {char.tone}声
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{toneInfo.desc}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                部首：{char.radical}
              </span>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                笔画：{char.strokes} 画
              </span>
            </div>
          </div>
        </div>

        {/* 常用生活组词卡片组 (Words Carousel) */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5 px-1">
            <span>✨ 常用组词（轻触朗读）</span>
            <span className="text-sky-600 font-medium">点击听词汇发音</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {char.words.map((w, i) => {
              const active = activeWordIdx === i;
              return (
                <motion.button
                  key={w}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handlePlayWord(w, i)}
                  className={`p-2.5 rounded-xl border text-center font-bold text-sm transition-all shadow-sm ${
                    active
                      ? 'bg-sky-500 text-white border-sky-600 scale-105'
                      : 'bg-white text-slate-800 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  <span className="block text-base font-black">{w}</span>
                  <span className="text-xs text-sky-600 font-normal mt-0.5 block">🔊 朗读</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 场景例句 (Example Sentence) */}
        <div
          onClick={handlePlaySentence}
          className="p-3 bg-white/80 rounded-xl border border-sky-200/80 cursor-pointer hover:bg-sky-50 transition-colors shadow-inner flex items-start gap-2"
          role="button"
          tabIndex={0}
          aria-label="朗读生活场景例句"
        >
          <span className="text-base text-sky-500 mt-0.5">📖</span>
          <div className="flex-1 text-xs text-slate-700">
            <span className="font-bold text-slate-900 block mb-0.5">情境例句：</span>
            <span>
              {char.sentence.split(char.c).map((part, idx, arr) => (
                <span key={idx}>
                  {part}
                  {idx < arr.length - 1 && (
                    <span className="font-black text-sky-600 underline underline-offset-2 decoration-2">
                      {char.c}
                    </span>
                  )}
                </span>
              ))}
            </span>
          </div>
          <span className="text-xs text-sky-600 font-bold self-center">🔊</span>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="w-full max-w-md flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => speak(`${char.c}，${char.pd}。${char.sentence}`)}
          className="px-4 py-2.5 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-sky-300"
        >
          <span>🔊</span>
          <span>整字连读</span>
        </button>

        <button
          type="button"
          onClick={handleFinish}
          className="flex-1 py-3 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-sky-300/50 flex items-center justify-center gap-2 transition-transform active:scale-98"
        >
          <span>🎯 字理已明，进入「趣味练」</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
}
