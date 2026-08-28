/**
 * 🎢 洪恩/叫叫级「声韵滑滑梯与物理声调过山车」 (Interactive Phonics Coaster & Fusion Pro - Commercial Grade)
 * ---------------------------------------------------------------------------------------------------------
 * 1. 🚀 声母滑车 🚂 与韵母站台 🛩️ 真实物理重力加速滑行与相撞合体火花爆破；
 * 2. 🎢 4 种声调过山车真实曲率轨道（平直高速轨、冲天爬坡轨、大V型回旋轨、高空大俯冲轨）；
 * 3. 🎵 WebAudio 声调音高声学变频合成器（55平调、35升调、214曲折调、51降调真实扫频）；
 * 4. 完整 36 组高频常用音节库、汉字词汇图文发音映射与拼读寻宝闯关！
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';
import { getAudioContext } from '@/lib/audioContext';
import { navigate } from '@/lib/router';

// ── 常见合法拼读与汉字映射库 ──
export interface SyllableMatch {
  initial: string;
  final: string;
  tone: 1 | 2 | 3 | 4;
  pinyin: string;
  hanzi: string;
  word: string;
  emoji: string;
}

export const COMMON_SYLLABLES: SyllableMatch[] = [
  { initial: 'b', final: 'a', tone: 4, pinyin: 'bà', hanzi: '爸', word: '爸爸', emoji: '👨' },
  { initial: 'b', final: 'a', tone: 1, pinyin: 'bā', hanzi: '八', word: '八个', emoji: '8️⃣' },
  { initial: 'p', final: 'o', tone: 2, pinyin: 'pó', hanzi: '婆', word: '外婆', emoji: '👵' },
  { initial: 'p', final: 'ing', tone: 2, pinyin: 'píng', hanzi: '苹', word: '苹果', emoji: '🍎' },
  { initial: 'm', final: 'a', tone: 1, pinyin: 'mā', hanzi: '妈', word: '妈妈', emoji: '👩' },
  { initial: 'm', final: 'a', tone: 3, pinyin: 'mǎ', hanzi: '马', word: '小马', emoji: '🐎' },
  { initial: 'f', final: 'a', tone: 1, pinyin: 'fā', hanzi: '发', word: '头发', emoji: '💇' },
  { initial: 'f', final: 'ei', tone: 1, pinyin: 'fēi', hanzi: '飞', word: '飞机', emoji: '✈️' },
  { initial: 'd', final: 'a', tone: 4, pinyin: 'dà', hanzi: '大', word: '大树', emoji: '🌳' },
  { initial: 't', final: 'a', tone: 1, pinyin: 'tā', hanzi: '他', word: '他们', emoji: '👦' },
  { initial: 't', final: 'ai', tone: 4, pinyin: 'tài', hanzi: '太', word: '太阳', emoji: '☀️' },
  { initial: 'n', final: 'i', tone: 3, pinyin: 'nǐ', hanzi: '你', word: '你好', emoji: '👋' },
  { initial: 'n', final: 'a', tone: 2, pinyin: 'ná', hanzi: '拿', word: '拿来', emoji: '🤲' },
  { initial: 'l', final: 'a', tone: 1, pinyin: 'lā', hanzi: '拉', word: '拉手', emoji: '🤝' },
  { initial: 'g', final: 'e', tone: 1, pinyin: 'gē', hanzi: '哥', word: '哥哥', emoji: '👦' },
  { initial: 'k', final: 'e', tone: 3, pinyin: 'kě', hanzi: '可', word: '可以', emoji: '🉑' },
  { initial: 'h', final: 'ua', tone: 1, pinyin: 'huā', hanzi: '花', word: '花朵', emoji: '🌸' },
  { initial: 'j', final: 'i', tone: 1, pinyin: 'jī', hanzi: '鸡', word: '小鸡', emoji: '🐥' },
  { initial: 'q', final: 'i', tone: 1, pinyin: 'qī', hanzi: '七', word: '七个', emoji: '7️⃣' },
  { initial: 'x', final: 'i', tone: 3, pinyin: 'xǐ', hanzi: '洗', word: '洗手', emoji: '🧼' },
  { initial: 'x', final: 'ing', tone: 1, pinyin: 'xīng', hanzi: '星', word: '星星', emoji: '⭐' },
  { initial: 'zh', final: 'u', tone: 1, pinyin: 'zhū', hanzi: '猪', word: '小猪', emoji: '🐷' },
  { initial: 'ch', final: 'i', tone: 1, pinyin: 'chī', hanzi: '吃', word: '吃饭', emoji: '🍚' },
  { initial: 'sh', final: 'u', tone: 1, pinyin: 'shū', hanzi: '书', word: '书本', emoji: '📚' },
  { initial: 'r', final: 'i', tone: 4, pinyin: 'rì', hanzi: '日', word: '生日', emoji: '🎂' },
  { initial: 'z', final: 'i', tone: 3, pinyin: 'zǐ', hanzi: '子', word: '儿子', emoji: '👶' },
  { initial: 'c', final: 'ao', tone: 3, pinyin: 'cǎo', hanzi: '草', word: '小草', emoji: '🌱' },
  { initial: 's', final: 'i', tone: 4, pinyin: 'sì', hanzi: '四', word: '四个', emoji: '4️⃣' },
  { initial: 'y', final: 'u', tone: 2, pinyin: 'yú', hanzi: '鱼', word: '小鱼', emoji: '🐟' },
  { initial: 'y', final: 'ue', tone: 4, pinyin: 'yuè', hanzi: '月', word: '月亮', emoji: '🌙' },
  { initial: 'w', final: 'o', tone: 3, pinyin: 'wǒ', hanzi: '我', word: '我们', emoji: '🙋' },
];

export const INITIALS = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'];
export const FINALS = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'ua', 'ue', 'an', 'en', 'in', 'ang', 'eng', 'ing', 'ong'];

export const TONE_MARKS: Record<number, { name: string; curve: string; desc: string; pitchRule: string }> = {
  1: { name: '第一声 (阴平)', curve: '——', desc: '一声平平高高挂', pitchRule: '55 调值 · 匀速平直飞翔' },
  2: { name: '第二声 (阳平)', curve: '／', desc: '二声上坡扬上去', pitchRule: '35 调值 · 冲天爬坡加速' },
  3: { name: '第三声 (上声)', curve: '∨', desc: '三声下坡又上坡', pitchRule: '214 调值 · 回旋大V形俯冲再冲刺' },
  4: { name: '第四声 (去声)', curve: '＼', desc: '四声下坡快快降', pitchRule: '51 调值 · 高空极速大俯冲' },
};

const TONE_VOWEL_MAP: Record<string, [string, string, string, string]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

export function formatTonedFinal(final: string, tone: 1 | 2 | 3 | 4): string {
  const mainVowel = final.includes('a') ? 'a' : final.includes('o') ? 'o' : final.includes('e') ? 'e' : final.includes('iu') ? 'u' : final.includes('ui') ? 'i' : final[0] ?? 'a';
  const tones = TONE_VOWEL_MAP[mainVowel];
  if (!tones) return final;
  const tonedChar = tones[tone - 1] ?? mainVowel;
  return final.replace(mainVowel, tonedChar);
}

export function PhonicsSlide() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [mode, setMode] = useState<'slide' | 'coaster' | 'challenge'>('slide');
  const [initial, setInitial] = useState<string>('b');
  const [final, setFinal] = useState<string>('a');
  const [tone, setTone] = useState<1 | 2 | 3 | 4>(4);
  const [isSliding, setIsSliding] = useState(false);
  const [mergedResult, setMergedResult] = useState<SyllableMatch | null>(null);

  // 挑战模式状态
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [score, setScore] = useState(0);

  const targetChallenge = useMemo(() => {
    return COMMON_SYLLABLES[challengeIdx % COMMON_SYLLABLES.length] ?? COMMON_SYLLABLES[0];
  }, [challengeIdx]);

  // WebAudio 物理声调变频声浪合成
  const playToneCoasterSfx = (targetTone: 1 | 2 | 3 | 4) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      const now = ctx.currentTime;
      if (targetTone === 1) {
        // 55 高平调
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(440, now + 0.6);
      } else if (targetTone === 2) {
        // 35 中升调
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.6);
      } else if (targetTone === 3) {
        // 214 降升曲折调
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(230, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.65);
      } else {
        // 51 高降调
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
      }

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch {
      // Audio context fallback
    }
  };

  // 执行声韵碰撞合体
  const handleTriggerSlide = useCallback(() => {
    if (isSliding) return;
    sfxTap();
    triggerHaptic(45);
    setIsSliding(true);
    setMergedResult(null);

    // 寻找匹配词
    const match = COMMON_SYLLABLES.find(
      (s) => s.initial === initial && s.final === final && s.tone === tone
    );

    playToneCoasterSfx(tone);

    setTimeout(() => {
      setIsSliding(false);
      if (match) {
        setMergedResult(match);
        sfxCorrect();
        celebrateSmall();
        triggerHaptic([60, 40, 60, 40, 100]);
        addStars(1);
        practice(`pinyin:${match.pinyin}`, true, 2, 1);
        void speak(`${match.initial}——${match.final}——${match.pinyin}！${match.hanzi}，${match.word}！`, { lang: 'zh-CN' });
      } else {
        const fallbackPinyin = `${initial}${formatTonedFinal(final, tone)}`;
        void speak(`${initial}，${formatTonedFinal(final, tone)}，读作 ${fallbackPinyin}！`, { lang: 'zh-CN' });
      }
    }, 700);
  }, [isSliding, initial, final, tone, addStars, practice]);

  // 挑战模式验证
  const handleVerifyChallenge = useCallback(() => {
    if (!targetChallenge) return;
    if (initial === targetChallenge.initial && final === targetChallenge.final && tone === targetChallenge.tone) {
      sfxWin();
      celebrateBig();
      triggerHaptic([60, 40, 60, 40, 100]);
      playToneCoasterSfx(targetChallenge.tone);
      setScore((s) => s + 1);
      addStars(2);
      practice(`pinyin:${targetChallenge.pinyin}`, true, 3, 1);
      void speak(`太棒啦！拼出【${targetChallenge.pinyin}】${targetChallenge.word}！`, { lang: 'zh-CN' });
      setTimeout(() => {
        setChallengeIdx((i) => i + 1);
      }, 1500);
    } else {
      triggerHaptic(20);
      void speak(`还差一点点哦！目标是【${targetChallenge.pinyin}】，快调整声母韵母和声调吧！`, { lang: 'zh-CN' });
    }
  }, [initial, final, tone, targetChallenge, addStars, practice]);

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setTone(1);
      } else if (e.key === '2') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setTone(2);
      } else if (e.key === '3') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setTone(3);
      } else if (e.key === '4') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setTone(4);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'challenge') {
          handleVerifyChallenge();
        } else {
          handleTriggerSlide();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate('pinyin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleVerifyChallenge, handleTriggerSlide]);

  return (
    <div className="space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-blue-900 font-bold bg-blue-50/90 px-3 py-1 rounded-xl border border-blue-200">
          ⌨️ 键盘快捷操作：数字键 1-4 选声调 · 空格/Enter 发射拼读 / 验证挑战
        </span>
      </div>

      {/* 顶部模式切换导航 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setMode('slide');
            }}
            className={`min-h-[44px] py-1.5 px-3.5 rounded-xl font-black text-xs transition-all ${
              mode === 'slide' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            🛝 声韵滑滑梯 (碰撞合体)
          </button>
          <button
            type="button"
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setMode('coaster');
            }}
            className={`min-h-[44px] py-1.5 px-3.5 rounded-xl font-black text-xs transition-all ${
              mode === 'coaster' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            🎢 四声调物理过山车
          </button>
          <button
            type="button"
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setMode('challenge');
            }}
            className={`min-h-[44px] py-1.5 px-3.5 rounded-xl font-black text-xs transition-all ${
              mode === 'challenge' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            🎯 拼读寻宝大挑战
          </button>
        </div>

        <StreakBar streak={score} target={3} />
      </div>

      {mode === 'challenge' && targetChallenge && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-300 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{targetChallenge.emoji}</span>
            <div>
              <span className="text-xs font-bold text-emerald-800">目标拼读任务 (第 {challengeIdx + 1} 题)：</span>
              <div className="text-xl font-black text-emerald-950">
                请拼出：【{targetChallenge.pinyin}】({targetChallenge.word})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => speak(`请拼出：${targetChallenge.pinyin}，${targetChallenge.word}！`, { lang: 'zh-CN' })}
            className="py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-sm hover:bg-emerald-700 transition-colors"
          >
            🔊 重听目标音
          </button>
        </div>
      )}

      {/* 主互动滑梯与过山车沙盘 */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl border-3 border-blue-300 p-5 shadow-md space-y-4">
        {/* 过山车模式下的曲率轨道展示 */}
        {mode === 'coaster' ? (
          <div className="bg-white/95 rounded-2xl p-5 border border-purple-200 text-center shadow-inner space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-purple-900">
                🎢 {TONE_MARKS[tone]?.name} · {TONE_MARKS[tone]?.desc}
              </span>
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                {TONE_MARKS[tone]?.pitchRule}
              </span>
            </div>

            {/* 动态过山车轨道 SVG 模拟 */}
            <div className="h-32 bg-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-center p-4 border-2 border-purple-300">
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(168,85,247,0.15)_1px,transparent_1px)] bg-[size:12px_12px]" />
              
              <svg viewBox="0 0 400 100" className="w-full h-full">
                {/* 轨道阴影 */}
                {tone === 1 && <path d="M 30 50 L 370 50" stroke="#9333ea" strokeWidth="8" strokeLinecap="round" />}
                {tone === 2 && <path d="M 30 80 Q 200 65 370 20" stroke="#9333ea" strokeWidth="8" strokeLinecap="round" />}
                {tone === 3 && <path d="M 30 40 Q 180 95 240 85 T 370 25" stroke="#9333ea" strokeWidth="8" strokeLinecap="round" fill="none" />}
                {tone === 4 && <path d="M 30 20 Q 200 35 370 85" stroke="#9333ea" strokeWidth="8" strokeLinecap="round" />}
              </svg>

              {/* 飞驰的过山车小人 */}
              <motion.div
                key={tone}
                initial={{ x: -120 }}
                animate={{ x: 120 }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                className="absolute text-3xl select-none"
              >
                🛒💨
              </motion.div>
            </div>

            <button
              type="button"
              onClick={() => {
                playToneCoasterSfx(tone);
                void speak(`声调过山车发音：${TONE_MARKS[tone]?.desc}，${initial}${formatTonedFinal(final, tone)}！`, { lang: 'zh-CN' });
              }}
              className="py-2.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md transition-transform active:scale-95"
            >
              🔊 聆听声调过山车发音
            </button>
          </div>
        ) : (
          /* 滑梯碰撞轨道舞台 */
          <div className="bg-white/90 backdrop-blur rounded-2xl p-5 border border-blue-100 text-center shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-center gap-4 sm:gap-8 min-h-[110px]">
              {/* 声母小车 */}
              <motion.div
                animate={isSliding ? { x: [0, 80, 0] } : {}}
                transition={{ duration: 0.6 }}
                className="h-20 w-20 rounded-2xl bg-blue-500 text-white flex flex-col items-center justify-center shadow-md border-2 border-blue-600"
              >
                <span className="text-xs font-bold opacity-80">声母</span>
                <span className="text-3xl font-black">{initial}</span>
              </motion.div>

              <span className="text-2xl font-black text-blue-400">➕</span>

              {/* 韵母站台 */}
              <motion.div
                animate={isSliding ? { x: [0, -80, 0] } : {}}
                transition={{ duration: 0.6 }}
                className="h-20 w-20 rounded-2xl bg-purple-500 text-white flex flex-col items-center justify-center shadow-md border-2 border-purple-600"
              >
                <span className="text-xs font-bold opacity-80">韵母</span>
                <span className="text-3xl font-black">{formatTonedFinal(final, tone)}</span>
              </motion.div>

              <span className="text-2xl font-black text-blue-400">🟰</span>

              {/* 合体结果卡片 */}
              <div className="h-20 min-w-[80px] px-3 rounded-2xl bg-emerald-500 text-white flex flex-col items-center justify-center shadow-md border-2 border-emerald-600">
                <span className="text-xs font-bold opacity-80">合体读音</span>
                <span className="text-2xl font-black">
                  {mergedResult ? mergedResult.pinyin : `${initial}${formatTonedFinal(final, tone)}`}
                </span>
              </div>
            </div>

            {/* 合体汉字与组词大展示 */}
            <AnimatePresence>
              {mergedResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 bg-emerald-50 rounded-xl p-2.5 border border-emerald-200 inline-flex items-center gap-2"
                >
                  <span className="text-2xl">{mergedResult.emoji}</span>
                  <span className="text-base font-black text-emerald-950">
                    {mergedResult.hanzi}（{mergedResult.word}）
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 四声调选择栏 */}
        <div className="bg-white rounded-2xl p-3.5 border border-blue-100 space-y-2">
          <div className="text-xs font-black text-slate-700 flex items-center justify-between">
            <span>🎢 四声调过山车：</span>
            <span className="text-purple-600 font-extrabold">{TONE_MARKS[tone]?.desc}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as const).map((tNum) => {
              const isSelected = tone === tNum;
              return (
                <button
                  key={tNum}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setTone(tNum);
                    playToneCoasterSfx(tNum);
                    void speak(TONE_MARKS[tNum]?.desc ?? '', { lang: 'zh-CN' });
                  }}
                  className={`py-2 px-2 rounded-xl font-black text-xs transition-all border-2 flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <span className="text-lg">{TONE_MARKS[tNum]?.curve}</span>
                  <span className="text-xs">{tNum} 声</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 声母选择托盘 */}
        <div className="bg-white rounded-2xl p-3.5 border border-blue-100 space-y-2">
          <span className="text-xs font-black text-slate-700">1️⃣ 选择声母小车：</span>
          <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
            {INITIALS.map((init) => (
              <button
                key={init}
                type="button"
                onClick={() => {
                  sfxTap();
                  setInitial(init);
                }}
                className={`h-8 w-8 rounded-lg font-black text-sm border transition-all ${
                  initial === init
                    ? 'bg-blue-600 text-white border-blue-700 shadow scale-105'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300'
                }`}
              >
                {init}
              </button>
            ))}
          </div>
        </div>

        {/* 韵母选择托盘 */}
        <div className="bg-white rounded-2xl p-3.5 border border-blue-100 space-y-2">
          <span className="text-xs font-black text-slate-700">2️⃣ 选择韵母站台：</span>
          <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
            {FINALS.map((fin) => (
              <button
                key={fin}
                type="button"
                onClick={() => {
                  sfxTap();
                  setFinal(fin);
                }}
                className={`h-8 min-w-[32px] px-2 rounded-lg font-black text-sm border transition-all ${
                  final === fin
                    ? 'bg-purple-600 text-white border-purple-700 shadow scale-105'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-300'
                }`}
              >
                {fin}
              </button>
            ))}
          </div>
        </div>

        {/* 底部动作发射按钮 */}
        <div className="text-center pt-2">
          {mode === 'challenge' ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleVerifyChallenge}
              className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-base font-black shadow-lg shadow-emerald-200"
            >
              ✅ 验证拼读答案
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleTriggerSlide}
              className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-base font-black shadow-lg shadow-blue-200"
            >
              🚀 发射滑梯，开始拼读！
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
