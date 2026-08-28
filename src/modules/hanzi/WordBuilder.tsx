/**
 * 🀄 洪恩/叫叫级「汉字偏旁合成与组词造句工坊」 (Word & Sentence Fusion Studio)
 * -------------------------------------------------------------------------
 * 1. 偏旁部首合成魔法锅 (Radical Fusion): 偏旁 + 部件 = 合体字；
 * 2. 趣味词语组装磁吸盘 (Word Assembly): 挑选汉字拼成常用词；
 * 3. 经典童心造句积木轨 (Sentence Builder): 词块组装通顺语句与名师伴读。
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';
import { navigate } from '@/lib/router';

// ── 模式一：偏旁部首合成题库 ──
export interface RadicalFusionItem {
  id: string;
  r1: string;
  r2: string;
  targetChar: string;
  pinyin: string;
  meaning: string;
  emoji: string;
  options: string[];
}

export const FUSION_ITEMS: RadicalFusionItem[] = [
  { id: 'rf1', r1: '日', r2: '月', targetChar: '明', pinyin: 'míng', meaning: '日月同辉，明亮光明', emoji: '🌟', options: ['明', '昭', '阳', '暗'] },
  { id: 'rf2', r1: '木', r2: '木', targetChar: '林', pinyin: 'lín', meaning: '双木成林，郁郁葱葱', emoji: '🌲', options: ['林', '森', '休', '本'] },
  { id: 'rf3', r1: '人', r2: '木', targetChar: '休', pinyin: 'xiū', meaning: '人靠在树边，休息放松', emoji: '🧘', options: ['休', '体', '保', '伴'] },
  { id: 'rf4', r1: '氵', r2: '每', targetChar: '海', pinyin: 'hǎi', meaning: '百川归海，汪洋大海', emoji: '🌊', options: ['海', '江', '河', '湖'] },
  { id: 'rf5', r1: '禾', r2: '火', targetChar: '秋', pinyin: 'qiū', meaning: '稻谷金黄，秋天丰收', emoji: '🍁', options: ['秋', '科', '季', '香'] },
  { id: 'rf6', r1: '口', r2: '鸟', targetChar: '鸣', pinyin: 'míng', meaning: '张口啼叫，百鸟齐鸣', emoji: '🐦', options: ['鸣', '鸭', '叫', '唱'] },
  { id: 'rf7', r1: '门', r2: '日', targetChar: '间', pinyin: 'jiān', meaning: '门缝透光，天地之间', emoji: '🚪', options: ['间', '闲', '闻', '问'] },
  { id: 'rf8', r1: '氵', r2: '木', targetChar: '沐', pinyin: 'mù', meaning: '沐浴清风，滋润生机', emoji: '🍃', options: ['沐', '林', '洗', '润'] },
  { id: 'rf9', r1: '口', r2: '十', targetChar: '叶', pinyin: 'yè', meaning: '绿叶茂密，春意盎然', emoji: '🌿', options: ['叶', '古', '右', '早'] },
  { id: 'rf10', r1: '氵', r2: '青', targetChar: '清', pinyin: 'qīng', meaning: '清清泉水，明澈清冽', emoji: '💧', options: ['清', '情', '请', '晴'] },
  { id: 'rf11', r1: '女', r2: '子', targetChar: '好', pinyin: 'hǎo', meaning: '女子相依，美好幸福', emoji: '👍', options: ['好', '如', '她', '妈'] },
  { id: 'rf12', r1: '田', r2: '力', targetChar: '男', pinyin: 'nán', meaning: '在田间出力，勤劳勇敢', emoji: '👦', options: ['男', '苗', '思', '劳'] },
];

// ── 模式二：趣味词语组装题库 ──
export interface WordAssemblyItem {
  id: string;
  c1: string;
  c2: string;
  targetWord: string;
  pinyin: string;
  meaning: string;
  emoji: string;
  candidateChars: string[];
}

export const WORD_ITEMS: WordAssemblyItem[] = [
  { id: 'wa1', c1: '山', c2: '水', targetWord: '山水', pinyin: 'shān shuǐ', meaning: '高山与秀水的美丽风景', emoji: '🏞️', candidateChars: ['山', '水', '火', '田'] },
  { id: 'wa2', c1: '太', c2: '阳', targetWord: '太阳', pinyin: 'tài yáng', meaning: '白天的金色恒星，温暖大地', emoji: '☀️', candidateChars: ['太', '阳', '月', '光'] },
  { id: 'wa3', c1: '白', c2: '云', targetWord: '白云', pinyin: 'bái yún', meaning: '天空中洁白如棉花般的云朵', emoji: '☁️', candidateChars: ['白', '云', '风', '雨'] },
  { id: 'wa4', c1: '荷', c2: '花', targetWord: '荷花', pinyin: 'hé huā', meaning: '池塘里盛开的粉红荷花', emoji: '🪷', candidateChars: ['荷', '花', '草', '木'] },
  { id: 'wa5', c1: '小', c2: '鸟', targetWord: '小鸟', pinyin: 'xiǎo niǎo', meaning: '在枝头欢快唱歌的小飞鸟', emoji: '🐦', candidateChars: ['小', '鸟', '鱼', '虫'] },
  { id: 'wa6', c1: '星', c2: '星', targetWord: '星星', pinyin: 'xīng xing', meaning: '夜晚天空中闪闪发光的繁星', emoji: '⭐', candidateChars: ['星', '星', '月', '日'] },
  { id: 'wa7', c1: '彩', c2: '虹', targetWord: '彩虹', pinyin: 'cǎi hóng', meaning: '雨后天空中出现的七彩长桥', emoji: '🌈', candidateChars: ['彩', '虹', '云', '雨'] },
  { id: 'wa8', c1: '春', c2: '风', targetWord: '春风', pinyin: 'chūn fēng', meaning: '温暖柔和的春天微风', emoji: '🍃', candidateChars: ['春', '风', '夏', '雨'] },
  { id: 'wa9', c1: '大', c2: '树', targetWord: '大树', pinyin: 'dà shù', meaning: '枝繁叶茂、绿荫如盖的大树', emoji: '🌳', candidateChars: ['大', '树', '小', '草'] },
  { id: 'wa10', c1: '朋', c2: '友', targetWord: '朋友', pinyin: 'péng you', meaning: '互相关心、一起玩耍的好伙伴', emoji: '🤝', candidateChars: ['朋', '友', '伴', '同'] },
];

// ── 模式三：童心造句积木轨 ──
export interface SentenceBlockItem {
  id: string;
  fullSentence: string;
  shuffledBlocks: string[];
  meaning: string;
  emoji: string;
}

export const SENTENCE_ITEMS: SentenceBlockItem[] = [
  {
    id: 'sb1',
    fullSentence: '大大的太阳从东方升起来了。',
    shuffledBlocks: ['从东方', '大大的太阳', '升起来了。'],
    meaning: '早晨太阳升起，迎来崭新美好的一天！',
    emoji: '🌅',
  },
  {
    id: 'sb2',
    fullSentence: '美丽的花儿在春天盛开了。',
    shuffledBlocks: ['盛开了。', '美丽的花儿', '在春天'],
    meaning: '春暖花开，大自然充满了生机与色彩！',
    emoji: '🌸',
  },
  {
    id: 'sb3',
    fullSentence: '可爱的小鱼在清清的河水里游。',
    shuffledBlocks: ['在清清的河水里游。', '可爱的小鱼'],
    meaning: '小鱼在水草间欢快地摆动小尾巴！',
    emoji: '🐟',
  },
  {
    id: 'sb4',
    fullSentence: '小青蛙坐在圆圆的荷叶上唱歌。',
    shuffledBlocks: ['坐在圆圆的荷叶上', '小青蛙', '唱歌。'],
    meaning: '夏天的荷塘里，青蛙奏响了欢快的交响乐！',
    emoji: '🐸',
  },
  {
    id: 'sb5',
    fullSentence: '小白兔在草地上欢快地跳舞。',
    shuffledBlocks: ['欢快地跳舞。', '在草地上', '小白兔'],
    meaning: '毛茸茸的小白兔蹦蹦跳跳，真开心！',
    emoji: '🐰',
  },
  {
    id: 'sb6',
    fullSentence: '天空中挂着一道七彩的彩虹。',
    shuffledBlocks: ['天空中', '挂着一道', '七彩的彩虹。'],
    meaning: '雨过天晴，七色彩虹像一座美丽的拱桥！',
    emoji: '🌈',
  },
];

export type BuilderMode = 'fusion' | 'words' | 'sentences';

const FALLBACK_FUSION = FUSION_ITEMS[0] ?? {
  id: 'rf1',
  r1: '日',
  r2: '月',
  targetChar: '明',
  pinyin: 'míng',
  meaning: '日月同辉，明亮光明',
  emoji: '🌟',
  options: ['明', '昭', '阳', '暗'],
};

const FALLBACK_WORD = WORD_ITEMS[0] ?? {
  id: 'wa1',
  c1: '山',
  c2: '水',
  targetWord: '山水',
  pinyin: 'shān shuǐ',
  meaning: '高山与秀水的美丽风景',
  emoji: '🏞️',
  candidateChars: ['山', '水', '火', '田'],
};

const FALLBACK_SENTENCE = SENTENCE_ITEMS[0] ?? {
  id: 'sb1',
  fullSentence: '大大的太阳从东方升起来了。',
  shuffledBlocks: ['从东方', '大大的太阳', '升起来了。'],
  meaning: '早晨太阳升起，迎来崭新美好的一天！',
  emoji: '🌅',
};

export function WordBuilder({ initialChar: _initialChar }: { initialChar?: string }) {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [mode, setMode] = useState<BuilderMode>('fusion');
  const [fusionIdx, setFusionIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [selectedWordChars, setSelectedWordChars] = useState<string[]>([]);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  const currentFusion = useMemo(() => {
    return FUSION_ITEMS[fusionIdx % FUSION_ITEMS.length] ?? FALLBACK_FUSION;
  }, [fusionIdx]);

  const currentWord = useMemo(() => {
    return WORD_ITEMS[wordIdx % WORD_ITEMS.length] ?? FALLBACK_WORD;
  }, [wordIdx]);

  const currentSentence = useMemo(() => {
    return SENTENCE_ITEMS[sentenceIdx % SENTENCE_ITEMS.length] ?? FALLBACK_SENTENCE;
  }, [sentenceIdx]);

  // 处理偏旁部首合成
  const handlePickFusion = useCallback((opt: string) => {
    sfxTap();
    if (opt === currentFusion.targetChar) {
      sfxCorrect();
      triggerHaptic(45);
      celebrateSmall();
      setStreak((s) => s + 1);
      addStars(1);
      practice(`hanzi-fusion:${opt}`, true, 2, 1);
      void speak(`合体成功！【${currentFusion.r1}】加【${currentFusion.r2}】变成【${currentFusion.targetChar}】！${currentFusion.meaning}`, { lang: 'zh-CN' });
      setTimeout(() => {
        setFusionIdx((i) => (i + 1) % FUSION_ITEMS.length);
      }, 1500);
    } else {
      sfxWrong();
      triggerHaptic(20);
      void speak(`不对哦，再想一想【${currentFusion.r1}】和【${currentFusion.r2}】能组合成哪个字？`, { lang: 'zh-CN' });
    }
  }, [currentFusion, addStars, practice]);

  // 处理词语拼装
  const handlePickWordChar = useCallback((char: string) => {
    sfxTap();
    triggerHaptic(25);
    const nextChars = [...selectedWordChars, char];
    setSelectedWordChars(nextChars);

    if (nextChars.length === 2) {
      const combined = nextChars.join('');
      if (combined === currentWord.targetWord) {
        sfxWin();
        triggerHaptic([60, 40, 60, 40, 100]);
        celebrateBig();
        setStreak((s) => s + 1);
        addStars(1);
        practice(`word-assemble:${combined}`, true, 2, 1);
        void speak(`组词大成功！【${currentWord.targetWord}】(${currentWord.pinyin})，${currentWord.meaning}`, { lang: 'zh-CN' });
        setTimeout(() => {
          setSelectedWordChars([]);
          setWordIdx((i) => (i + 1) % WORD_ITEMS.length);
        }, 1500);
      } else {
        sfxWrong();
        triggerHaptic(20);
        void speak(`词语顺序不对哦，再试一次吧！`, { lang: 'zh-CN' });
        setTimeout(() => {
          setSelectedWordChars([]);
        }, 1000);
      }
    }
  }, [selectedWordChars, currentWord, addStars, practice]);

  // 处理造句拼装
  const handlePickSentenceBlock = useCallback((block: string) => {
    sfxTap();
    triggerHaptic(25);
    const nextBlocks = [...selectedBlocks, block];
    setSelectedBlocks(nextBlocks);

    if (nextBlocks.length === currentSentence.shuffledBlocks.length) {
      const combined = nextBlocks.join('');
      if (combined === currentSentence.fullSentence) {
        sfxWin();
        triggerHaptic([60, 40, 60, 40, 100]);
        celebrateBig();
        setStreak((s) => s + 1);
        addStars(2);
        practice(`sentence-builder:${currentSentence.id}`, true, 3, 1);
        void speak(`造句完美！${currentSentence.fullSentence}`, { lang: 'zh-CN' });
        setTimeout(() => {
          setSelectedBlocks([]);
          setSentenceIdx((i) => (i + 1) % SENTENCE_ITEMS.length);
        }, 1800);
      } else {
        sfxWrong();
        triggerHaptic(20);
        void speak(`语序还不太通顺哦，我们重新排一排！`, { lang: 'zh-CN' });
        setTimeout(() => {
          setSelectedBlocks([]);
        }, 1000);
      }
    }
  }, [selectedBlocks, currentSentence, addStars, practice]);

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        if (mode === 'words') setSelectedWordChars([]);
        if (mode === 'sentences') setSelectedBlocks([]);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (mode === 'fusion') {
          const opt = currentFusion.options[idx];
          if (opt) {
            e.preventDefault();
            handlePickFusion(opt);
          }
        } else if (mode === 'words') {
          const ch = currentWord.candidateChars[idx];
          if (ch && !selectedWordChars.includes(ch)) {
            e.preventDefault();
            handlePickWordChar(ch);
          }
        } else if (mode === 'sentences') {
          const blk = currentSentence.shuffledBlocks[idx];
          if (blk && !selectedBlocks.includes(blk)) {
            e.preventDefault();
            handlePickSentenceBlock(blk);
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate('hanzi');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentFusion, currentWord, currentSentence, selectedWordChars, selectedBlocks, handlePickFusion, handlePickWordChar, handlePickSentenceBlock]);

  return (
    <div className="space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-emerald-900 font-bold bg-emerald-50/90 px-3 py-1 rounded-xl border border-emerald-200">
          ⌨️ 键盘快捷操作：数字键 1-4 选字/词块 · R 重新选择
        </span>
      </div>

      {/* 顶部三大模式切换栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setMode('fusion');
            }}
            className={`py-1.5 px-3.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 border ${
              mode === 'fusion'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
            }`}
          >
            <span>🀄</span>
            <span>偏旁合成魔法锅 (8关)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfxTap();
              setMode('words');
              setSelectedWordChars([]);
            }}
            className={`py-1.5 px-3.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 border ${
              mode === 'words'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
            }`}
          >
            <span>🔗</span>
            <span>组词磁吸盘 (6组)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfxTap();
              setMode('sentences');
              setSelectedBlocks([]);
            }}
            className={`py-1.5 px-3.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 border ${
              mode === 'sentences'
                ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
            }`}
          >
            <span>📝</span>
            <span>童心造句积木轨</span>
          </button>
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {/* 模式一：偏旁部首合成魔法锅 */}
      {mode === 'fusion' && (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 rounded-3xl border-3 border-emerald-300 p-6 shadow-sm space-y-5 text-center">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              🍲 魔法炼字炉 第 {fusionIdx + 1} / {FUSION_ITEMS.length} 关
            </span>
            <span className="text-3xl">{currentFusion.emoji}</span>
          </div>

          {/* 偏旁相加展示槽 */}
          <div className="flex items-center justify-center gap-3 py-2">
            <motion.div
              key={`r1-${currentFusion.r1}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-20 w-20 rounded-2xl bg-white border-3 border-emerald-400 text-emerald-800 font-black text-4xl flex items-center justify-center shadow-md"
            >
              {currentFusion.r1}
            </motion.div>
            <span className="text-3xl font-black text-emerald-600">+</span>
            <motion.div
              key={`r2-${currentFusion.r2}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-20 w-20 rounded-2xl bg-white border-3 border-emerald-400 text-emerald-800 font-black text-4xl flex items-center justify-center shadow-md"
            >
              {currentFusion.r2}
            </motion.div>
            <span className="text-3xl font-black text-slate-400">=</span>
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-4xl flex items-center justify-center shadow-lg border-2 border-emerald-700">
              ?
            </div>
          </div>

          <p className="text-xs font-bold text-slate-600">
            💡 提示：{currentFusion.meaning}
          </p>

          {/* 候选汉字药丸 */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-black text-slate-700">👇 请选择合成后的正确汉字：</span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {currentFusion.options.map((opt) => (
                <motion.button
                  key={opt}
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePickFusion(opt)}
                  className="h-16 w-16 rounded-2xl bg-white border-2 border-emerald-300 font-black text-3xl text-slate-800 shadow hover:border-emerald-600 hover:text-emerald-700 active:scale-95 transition-all"
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 模式二：趣味词语组装磁吸盘 */}
      {mode === 'words' && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-3xl border-3 border-amber-300 p-6 shadow-sm space-y-5 text-center">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
              🔗 词语拼装 第 {wordIdx + 1} / {WORD_ITEMS.length} 关
            </span>
            <span className="text-3xl">{currentWord.emoji}</span>
          </div>

          {/* 拼装槽位 */}
          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1].map((pos) => {
              const char = selectedWordChars[pos];
              return (
                <div
                  key={pos}
                  className={`h-20 w-20 rounded-2xl border-3 flex items-center justify-center text-4xl font-black shadow transition-all ${
                    char
                      ? 'bg-amber-500 text-white border-amber-600 scale-105'
                      : 'bg-white border-dashed border-amber-300 text-slate-300'
                  }`}
                >
                  {char ?? '?'}
                </div>
              );
            })}
          </div>

          <p className="text-xs font-bold text-slate-600">
            💡 词义提示：{currentWord.meaning}
          </p>

          {/* 候选字卡 */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between max-w-xs mx-auto">
              <span className="text-xs font-black text-slate-700">👇 按顺序点选字卡：</span>
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setSelectedWordChars([]);
                }}
                className="text-xs font-bold text-amber-800 underline"
              >
                🔄 重选
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {currentWord.candidateChars.map((ch, idx) => {
                const used = selectedWordChars.includes(ch);
                return (
                  <motion.button
                    key={`${ch}-${idx}`}
                    type="button"
                    disabled={used}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePickWordChar(ch)}
                    className={`h-16 w-16 rounded-2xl font-black text-3xl border-2 shadow transition-all ${
                      used
                        ? 'bg-slate-100 border-slate-200 text-slate-300 opacity-50 cursor-not-allowed'
                        : 'bg-white border-amber-300 text-amber-950 hover:border-amber-500'
                    }`}
                  >
                    {ch}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 模式三：童心造句积木轨 */}
      {mode === 'sentences' && (
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 rounded-3xl border-3 border-purple-300 p-6 shadow-sm space-y-5 text-center">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-800 bg-purple-100 px-3 py-1 rounded-full">
              📝 语句拼装 第 {sentenceIdx + 1} / {SENTENCE_ITEMS.length} 关
            </span>
            <span className="text-3xl">{currentSentence.emoji}</span>
          </div>

          {/* 句子组装轨道 */}
          <div className="min-h-[70px] bg-white/90 rounded-2xl p-3 border-2 border-dashed border-purple-200 flex flex-wrap items-center justify-center gap-2">
            {selectedBlocks.length > 0 ? (
              selectedBlocks.map((blk, i) => (
                <div
                  key={i}
                  className="py-2 px-4 rounded-xl bg-purple-600 text-white font-black text-sm shadow-md"
                >
                  {blk}
                </div>
              ))
            ) : (
              <span className="text-xs font-bold text-slate-400">
                请在下方点击词块，拼装出通顺完整的优美语句
              </span>
            )}
          </div>

          <p className="text-xs font-bold text-slate-600">
            💡 语意解析：{currentSentence.meaning}
          </p>

          {/* 候选词块 */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between max-w-sm mx-auto">
              <span className="text-xs font-black text-slate-700">👇 点击组装词块：</span>
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setSelectedBlocks([]);
                }}
                className="text-xs font-bold text-purple-800 underline"
              >
                🔄 重排
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {currentSentence.shuffledBlocks.map((blk, idx) => {
                const used = selectedBlocks.includes(blk);
                return (
                  <motion.button
                    key={`${blk}-${idx}`}
                    type="button"
                    disabled={used}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePickSentenceBlock(blk)}
                    className={`py-3 px-5 rounded-2xl font-black text-sm border-2 shadow transition-all ${
                      used
                        ? 'bg-slate-100 border-slate-200 text-slate-300 opacity-50 cursor-not-allowed'
                        : 'bg-white border-purple-300 text-purple-950 hover:border-purple-600'
                    }`}
                  >
                    {blk}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
