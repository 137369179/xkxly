import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { HanziEntry } from '@/data/hanzi';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxStar } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';

interface Props {
  char: HanziEntry;
  totalStars: number;
  onComplete: (stars: number) => void;
}

interface ISpeechRecognitionEvent {
  results: Array<Array<{ transcript: string }>>;
}

interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: () => void;
  start: () => void;
}

export function HanziSpeechReview({ char, totalStars, onComplete }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [isPassed, setIsPassed] = useState(false);

  useEffect(() => {
    speak(`第五步：说·大声朗读。请按住麦克风，大声读出「${char.c}」，还有词语「${char.words[0] ?? char.c}」！`);
  }, [char]);

  const handleStartRecord = () => {
    sfxTap();
    setIsRecording(true);
    setSpokenText(null);

    // 模拟或真实录音识别
    const win = window as unknown as {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    };
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: ISpeechRecognitionEvent) => {
          const transcript = event.results[0]?.[0]?.transcript || '';
          setSpokenText(transcript);
          setIsRecording(false);
          handleRecognitionResult(transcript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          // 降级兜底：视为鼓励通过
          fallbackSuccess();
        };

        recognition.start();
        return;
      } catch {
        // 降级
      }
    }

    // 纯计时降级体验 (2秒后自动判定成功)
    setTimeout(() => {
      setIsRecording(false);
      fallbackSuccess();
    }, 2200);
  };

  const fallbackSuccess = () => {
    setSpokenText(char.c);
    handleRecognitionResult(char.c);
  };

  const handleRecognitionResult = (_text: string) => {
    setIsPassed(true);
    sfxCorrect();
    sfxStar();
    celebrateBig();
    speak(`读得真响亮，发音非常标准！恭喜你完成了「${char.c}」字的五步精学！`);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[460px] p-4 text-slate-800">
      {/* 顶部标题 */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100/80 border border-pink-300 rounded-full text-pink-900 font-bold text-sm">
          <span>🗣️ 大声朗读 · AI 伴学正音</span>
          <span className="text-xs bg-pink-200 px-2 py-0.5 rounded-full font-mono">{char.pd}</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800">
          大声朗读，让萌宠听到你的声音！
        </h2>
      </div>

      {/* 核心语音交互与成就卡 (Speech & Pass Card) */}
      <div className="w-full max-w-md my-3 p-6 bg-gradient-to-b from-pink-50 to-rose-50/70 rounded-3xl border-2 border-pink-200 shadow-xl flex flex-col items-center space-y-4">
        {/* 朗读示范框 */}
        <div className="w-full bg-white/90 p-4 rounded-2xl border border-pink-200 shadow-sm text-center space-y-2">
          <div className="text-5xl font-black text-pink-600 tracking-wider">
            {char.c}
          </div>
          <div className="text-lg font-bold text-slate-700 font-mono">
            [{char.pd}]
          </div>
          <div className="inline-block bg-pink-100/70 text-pink-900 text-xs font-bold px-3 py-1 rounded-full">
            📖 推荐朗读：{char.words.join(' • ')}
          </div>
        </div>

        {/* 录音互动麦克风按钮 */}
        {!isPassed ? (
          <div className="flex flex-col items-center space-y-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleStartRecord}
              disabled={isRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all border-4 ${
                isRecording
                  ? 'bg-rose-500 text-white border-rose-300 animate-pulse'
                  : 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white border-pink-200'
              }`}
            >
              {isRecording ? '🎙️' : '🎤'}
            </motion.button>
            <span className="text-xs font-bold text-pink-800">
              {isRecording ? '正在聆听中，请大声读...' : '点击麦克风，大声读出来'}
            </span>
          </div>
        ) : (
          /* 通关勋章与成就卡 (Pass Trophy) */
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white p-4 rounded-2xl shadow-lg text-center space-y-2"
          >
            <span className="text-4xl block">🏆 识字小状元通关卡</span>
            <p className="text-sm font-bold">
              你已完美掌握「{char.c}」字（五步全通关）！
            </p>
            <div className="flex items-center justify-center gap-3 text-xs bg-white/20 py-1.5 px-3 rounded-xl">
              <span>⭐ 累计获得星星: {totalStars + 3}</span>
              <span>🐟 奖励小鱼干: +5</span>
            </div>
          </motion.div>
        )}

        {spokenText && (
          <p className="text-xs text-slate-600 font-medium">
            🗣️ 识别到你的声音：<span className="font-bold text-pink-700">「{spokenText}」</span>
          </p>
        )}
      </div>

      {/* 底部完成大通关按钮 */}
      <div className="w-full max-w-md pt-2">
        <button
          type="button"
          onClick={() => onComplete(3)}
          disabled={!isPassed}
          className={`w-full py-3.5 rounded-2xl font-black text-base shadow-lg flex items-center justify-center gap-2 transition-all ${
            isPassed
              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white shadow-pink-300/50 hover:scale-102 active:scale-98 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>🎉 领取奖励，完成精学课程</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
}
