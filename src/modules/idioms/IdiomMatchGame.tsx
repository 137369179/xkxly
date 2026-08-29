/**
 * 🎴 叫叫阅读/洪恩级「成语消消乐与成语大对决」 (Idiom Match Game Pro)
 * ------------------------------------------------------------------
 * 1. 4 组四字成语（16 块汉字乱序排列在 4x4 网格中）；
 * 2. 依次点选 4 个字组词消除，播放真人成语发音与典故微释义；
 * 3. 消除金光粒子动效、Combo 连击判定与「成语大宗师」荣誉勋章！
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';

// ── 经典成语关卡题库 ──
interface MatchLevel {
  id: number;
  name: string;
  theme: string;
  idioms: {
    word: string;
    meaning: string;
    pinyin: string;
    emoji: string;
  }[];
}

const MATCH_LEVELS: MatchLevel[] = [
  {
    id: 1,
    name: '第 1 关：动物智慧',
    theme: '动物寓言成语',
    idioms: [
      { word: '守株待兔', pinyin: 'shǒu zhū dài tù', meaning: '比喻不主动努力，心存侥幸希望得到意外收获。', emoji: '🐰' },
      { word: '画龙点睛', pinyin: 'huà lóng diǎn jīng', meaning: '比喻在关键时刻加上最重要的一笔，使内容更生动。', emoji: '🐉' },
      { word: '亡羊补牢', pinyin: 'wáng yáng bǔ láo', meaning: '羊丢失后及时修补羊圈，比喻出了问题及时补救。', emoji: '🐑' },
      { word: '掩耳盗铃', pinyin: 'yǎn ěr dào líng', meaning: '捂住自己的耳朵去偷铃铛，比喻自己欺骗自己。', emoji: '🔔' },
    ],
  },
  {
    id: 2,
    name: '第 2 关：勤学笃行',
    theme: '勤奋努力成语',
    idioms: [
      { word: '悬梁刺股', pinyin: 'xuán liáng cì gǔ', meaning: '形容刻苦勤奋、坚持不懈地读书学习。', emoji: '📖' },
      { word: '凿壁借光', pinyin: 'záo bì jiè guāng', meaning: '在墙壁上凿孔引邻居的光读书，形容克服困难勤奋好学。', emoji: '🕯️' },
      { word: '闻鸡起舞', pinyin: 'wén jī qǐ wǔ', meaning: '听到鸡叫就起床练剑，比喻有志气的人及时奋发图强。', emoji: '🐓' },
      { word: '程门立雪', pinyin: 'chéng mén lì xuě', meaning: '冒着大雪站在老师门外等候，比喻尊师重道、虚心求教。', emoji: '❄️' },
    ],
  },
  {
    id: 3,
    name: '第 3 关：自然壮丽',
    theme: '山水自然成语',
    idioms: [
      { word: '山清水秀', pinyin: 'shān qīng shuǐ xiù', meaning: '形容山水风景优美秀丽。', emoji: '⛰️' },
      { word: '鸟语花香', pinyin: 'niǎo yǔ huā xiāng', meaning: '鸟儿鸣叫花儿飘香，形容春天景色极其美好。', emoji: '🌸' },
      { word: '风和日丽', pinyin: 'fēng hé rì lì', meaning: '微风和煦阳光明媚，形容天气非常好。', emoji: '☀️' },
      { word: '冰天雪地', pinyin: 'bīng tiān xuě dì', meaning: '到处是冰和雪，形容极其寒冷的冬天景象。', emoji: '⛄' },
    ],
  },
  {
    id: 4,
    name: '第 4 关：坚持不懈',
    theme: '古代神话毅力成语',
    idioms: [
      { word: '愚公移山', pinyin: 'yú gōng yí shān', meaning: '比喻坚持不懈地改造自然和克服困难。', emoji: '🏔️' },
      { word: '精卫填海', pinyin: 'jīng wèi tián hǎi', meaning: '比喻意志坚决，不畏艰难，坚持不懈。', emoji: '🐦' },
      { word: '铁杵成针', pinyin: 'tiě chǔ chéng zhēn', meaning: '只要有恒心，再难的事也能做成功。', emoji: '🪡' },
      { word: '百折不挠', pinyin: 'bǎi zhé bù náo', meaning: '无论受到多少挫折都不退缩，意志极其坚定。', emoji: '🛡️' },
    ],
  },
  {
    id: 5,
    name: '第 5 关：团结友爱',
    theme: '友谊互助成语',
    idioms: [
      { word: '同舟共济', pinyin: 'tóng zhōu gòng jì', meaning: '大家坐在同一条船上共同渡河，比喻同心协力克服困难。', emoji: '🚣' },
      { word: '众志成城', pinyin: 'zhòng zhì chéng chéng', meaning: '大家心意一致，力量就像坚固的城墙一样强大。', emoji: '🏰' },
      { word: '情同手足', pinyin: 'qíng tóng shǒu zú', meaning: '彼此情谊深厚，亲密得像亲兄弟手足一样。', emoji: '🤝' },
      { word: '团结友爱', pinyin: 'tuán jié yǒu ài', meaning: '大家和睦相处，互相关心和爱护。', emoji: '❤️' },
    ],
  },
  {
    id: 6,
    name: '第 6 关：精神抖擞',
    theme: '生机活力成语',
    idioms: [
      { word: '生龙活虎', pinyin: 'shēng lóng huó hǔ', meaning: '像活泼的龙和勇猛的虎，形容充满生机与活力。', emoji: '🐯' },
      { word: '龙飞凤舞', pinyin: 'lóng fēi fèng wǔ', meaning: '像龙在飞翔凤凰在起舞，形容气势奔放活跃。', emoji: '🦅' },
      { word: '气宇轩昂', pinyin: 'qì yǔ xuān áng', meaning: '形容人精神饱满，风度不凡。', emoji: '🤴' },
      { word: '朝气蓬勃', pinyin: 'zhāo qì péng bó', meaning: '像早晨的朝阳一样充满生机与向上的力量。', emoji: '🌅' },
    ],
  },
];

const FALLBACK_LEVEL: MatchLevel = {
  id: 1,
  name: '第 1 关：动物智慧',
  theme: '动物寓言成语',
  idioms: [
    { word: '守株待兔', pinyin: 'shǒu zhū dài tù', meaning: '比喻不主动努力，心存侥幸希望得到意外收获。', emoji: '🐰' },
    { word: '画龙点睛', pinyin: 'huà lóng diǎn jīng', meaning: '比喻在关键时刻加上最重要的一笔，使内容更生动。', emoji: '🐉' },
    { word: '亡羊补牢', pinyin: 'wáng yáng bǔ láo', meaning: '羊丢失后及时修补羊圈，比喻出了问题及时补救。', emoji: '🐑' },
    { word: '掩耳盗铃', pinyin: 'yǎn ěr dào líng', meaning: '捂住自己的耳朵去偷铃铛，比喻自己欺骗自己。', emoji: '🔔' },
  ],
};

export function IdiomMatchGame() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [levelIdx, setLevelIdx] = useState(0);
  const [selectedChars, setSelectedChars] = useState<{ char: string; gridId: string }[]>([]);
  const [clearedIdioms, setClearedIdioms] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [lastSolvedIdiom, setLastSolvedIdiom] = useState<MatchLevel['idioms'][0] | null>(null);
  const [hintWord, setHintWord] = useState<string | null>(null);

  const currentLevel = useMemo(() => {
    return MATCH_LEVELS[levelIdx % MATCH_LEVELS.length] ?? MATCH_LEVELS[0] ?? FALLBACK_LEVEL;
  }, [levelIdx]);

  // 16 块打乱的汉字卡片
  const gridCards = useMemo(() => {
    const chars: { char: string; idiomWord: string; gridId: string }[] = [];
    currentLevel.idioms.forEach((idiom) => {
      idiom.word.split('').forEach((ch, cIdx) => {
        chars.push({
          char: ch,
          idiomWord: idiom.word,
          gridId: `${idiom.word}-${cIdx}-${ch}`,
        });
      });
    });
    // 伪随机打乱
    return chars.sort(() => Math.random() - 0.5);
  }, [currentLevel]);

  // 重置当前关卡
  const handleResetLevel = useCallback(() => {
    setSelectedChars([]);
    setClearedIdioms([]);
    setLastSolvedIdiom(null);
    setHintWord(null);
  }, []);

  // 切换关卡
  const handleSelectLevel = useCallback((idx: number) => {
    sfxTap();
    triggerHaptic(30);
    setLevelIdx(idx);
    handleResetLevel();
    void speak(`进入${MATCH_LEVELS[idx]?.name ?? ''}！`, { lang: 'zh-CN' });
  }, [handleResetLevel]);

  // 火眼金睛智能提示
  const handleHint = useCallback(() => {
    sfxTap();
    triggerHaptic(35);
    const uncleared = currentLevel.idioms.filter((i) => !clearedIdioms.includes(i.word));
    if (uncleared.length === 0) return;
    const target = uncleared[0]!;
    setHintWord(target.word);
    void speak(`提示：找一找「${target.word}」！`, { lang: 'zh-CN' });
    setTimeout(() => {
      setHintWord(null);
    }, 2500);
  }, [currentLevel, clearedIdioms]);

  // 点选字块
  const handlePickCard = (card: { char: string; gridId: string; idiomWord: string }) => {
    // 已消除或者已被选中的不能再点
    if (clearedIdioms.includes(card.idiomWord)) return;
    if (selectedChars.some((s) => s.gridId === card.gridId)) return;

    sfxTap();
    triggerHaptic(20);
    const nextSelected = [...selectedChars, { char: card.char, gridId: card.gridId }];
    setSelectedChars(nextSelected);

    // 当凑齐 4 个字时进行成语匹配校验
    if (nextSelected.length === 4) {
      const pickedWord = nextSelected.map((s) => s.char).join('');
      const targetIdiom = currentLevel.idioms.find((i) => i.word === pickedWord);

      if (targetIdiom) {
        // 匹配成功！
        sfxCorrect();
        triggerHaptic(45);
        celebrateSmall();
        const nextCleared = [...clearedIdioms, targetIdiom.word];
        setClearedIdioms(nextCleared);
        setSelectedChars([]);
        setLastSolvedIdiom(targetIdiom);
        addStars(1);
        practice('idiom:match-game', true, 2, 1);
        void speak(`消除成功：${targetIdiom.word}！${targetIdiom.meaning}`, { lang: 'zh-CN' });

        // 检查是否全部消除过关
        if (nextCleared.length === currentLevel.idioms.length) {
          sfxWin();
          celebrateBig();
          triggerHaptic([60, 40, 60, 40, 100]);
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          addStars(2);
          void speak(`恭喜通关${currentLevel.name}！成语小达人太厉害啦！`, { lang: 'zh-CN' });
        }
      } else {
        // 匹配失败
        sfxWrong();
        triggerHaptic(20);
        void speak('这四个字不构成完整成语哦，再试一次吧！', { lang: 'zh-CN' });
        setTimeout(() => {
          setSelectedChars([]);
        }, 600);
      }
    }
  };

  const isLevelCleared = clearedIdioms.length === currentLevel.idioms.length;

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (MATCH_LEVELS[idx]) {
          e.preventDefault();
          handleSelectLevel(idx);
        }
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleHint();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleResetLevel();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (isLevelCleared && levelIdx < MATCH_LEVELS.length - 1) {
          e.preventDefault();
          handleSelectLevel(levelIdx + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectLevel, handleHint, handleResetLevel, isLevelCleared, levelIdx]);

  return (
    <div className="space-y-4">
      {/* 关卡选择与连击条 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {MATCH_LEVELS.map((lvl, idx) => {
            const isSel = levelIdx === idx;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => handleSelectLevel(idx)}
                className={`py-1.5 px-3 rounded-2xl font-black text-xs transition-all border-2 ${
                  isSel
                    ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-105'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                }`}
              >
                {lvl.name.split('：')[0]}
              </button>
            );
          })}
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-purple-900 font-bold bg-purple-50/90 px-3 py-1 rounded-xl border border-purple-200">
          ⌨️ 键盘快捷操作：数字键 1-6 选关 · H 火眼金睛提示 · R 重置打乱 · 空格键 下一关
        </span>
      </div>

      {/* 主游戏区 */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 rounded-3xl border-3 border-purple-200 p-5 shadow-sm space-y-4">
        {/* 顶部目标提示 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              <span>🎴</span>
              <span>{currentLevel.name}</span>
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                {currentLevel.theme}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              点击下方打乱的字块，按顺序拼出正确的 4 字成语！(已消 {clearedIdioms.length}/4)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHint}
              disabled={isLevelCleared}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 font-black text-xs shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
              title="火眼金睛提示 (快捷键 H)"
            >
              <span>👁️</span>
              <span>火眼金睛</span>
            </button>
            <button
              type="button"
              onClick={handleResetLevel}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              🔄 重新打乱
            </button>
          </div>
        </div>

        {/* 当前选中的字预览槽位 */}
        <div className="flex justify-center items-center gap-2 py-2">
          {Array.from({ length: 4 }).map((_, i) => {
            const item = selectedChars[i];
            return (
              <div
                key={`slot-${i}`}
                className={`h-13 w-13 rounded-2xl border-2 flex items-center justify-center text-2xl font-black shadow-inner transition-all ${
                  item
                    ? 'bg-white border-purple-400 text-purple-900 shadow-md scale-105'
                    : 'bg-purple-100/50 border-dashed border-purple-300 text-transparent'
                }`}
              >
                {item?.char ?? '·'}
              </div>
            );
          })}
        </div>

        {/* 4x4 汉字方块消除网格 */}
        <div className="grid grid-cols-4 gap-2.5 max-w-md mx-auto">
          {gridCards.map((card) => {
            const isCleared = clearedIdioms.includes(card.idiomWord);
            const isSelected = selectedChars.some((s) => s.gridId === card.gridId);
            const isHinted = hintWord && card.idiomWord === hintWord && !isCleared;

            return (
              <motion.button
                key={card.gridId}
                type="button"
                whileHover={{ scale: isCleared ? 1 : 1.08 }}
                whileTap={{ scale: isCleared ? 1 : 0.92 }}
                disabled={isCleared}
                onClick={() => handlePickCard(card)}
                className={`h-16 rounded-2xl font-black text-2xl border-2 flex items-center justify-center transition-all shadow-sm ${
                  isCleared
                    ? 'bg-slate-100 border-slate-200 text-slate-300 opacity-20 pointer-events-none'
                    : isSelected
                      ? 'bg-purple-600 border-purple-700 text-white shadow-md ring-4 ring-purple-200 scale-105'
                      : isHinted
                        ? 'bg-amber-100 border-amber-400 text-amber-900 ring-4 ring-amber-300 animate-pulse scale-105'
                        : 'bg-white border-purple-200 text-slate-800 hover:border-purple-400 hover:shadow-md'
                }`}
              >
                {card.char}
              </motion.button>
            );
          })}
        </div>

        {/* 刚消除的成语科普释义卡片 */}
        <AnimatePresence>
          {lastSolvedIdiom && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl p-4 border-2 border-purple-100 shadow-sm flex items-start gap-3 text-left"
            >
              <span className="text-3xl">{lastSolvedIdiom.emoji}</span>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-purple-900">{lastSolvedIdiom.word}</span>
                  <span className="text-xs font-bold text-slate-400">{lastSolvedIdiom.pinyin}</span>
                </div>
                <p className="text-xs font-semibold text-slate-600">{lastSolvedIdiom.meaning}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 通关下一关引导 */}
        {isLevelCleared && levelIdx < MATCH_LEVELS.length - 1 && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => handleSelectLevel(levelIdx + 1)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-candy-pink-on font-black text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              🎉 挑战下一关：{MATCH_LEVELS[levelIdx + 1]?.name} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
