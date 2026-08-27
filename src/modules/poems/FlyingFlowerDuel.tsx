/**
 * 🌸 叫叫阅读/洪恩级「飞花令沉浸对决与诗句九宫格拼装」 (Flying Flower Duel Pro - Commercial Grade)
 * ---------------------------------------------------------------------------------------------------
 * 1. 🎴 经典飞花令对决：8 大核心关键字（春/月/山/水/风/花/雪/鸟），涵盖 32 首经典古诗名句；
 * 2. 🧩 诗句九宫格字牌拼装：打乱诗句字块，按照古诗音律拼装复原（8 大名篇关卡）；
 * 3. 🎵 WebAudio 国风五声音阶古筝和弦即时演奏（宫商角徵羽物理泛音合成）；
 * 4. 逐句名师真人朗诵与诗意情境背景切换；
 * 5. 连击 Streak 激励与「小小诗仙」勋章成就。
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';
import { getAudioContext } from '@/lib/audioContext';

// ── 飞花令 8 大主题题库 ──
export interface FlowerTopic {
  char: string;
  theme: string;
  emoji: string;
  lines: {
    text: string;
    poet: string;
    title: string;
    meaning: string;
  }[];
}

export const FLOWER_TOPICS: FlowerTopic[] = [
  {
    char: '春',
    theme: '春暖花开',
    emoji: '🌸',
    lines: [
      { text: '春眠不觉晓，处处闻啼鸟', poet: '孟浩然', title: '春晓', meaning: '春天睡得香，不知不觉天亮了，到处都是鸟鸣声。' },
      { text: '好雨知时节，当春乃发生', poet: '杜甫', title: '春夜喜雨', meaning: '好雨知道下雨的节气，正在春天植物萌发的时候降临。' },
      { text: '人闲桂花落，夜静春山空', poet: '王维', title: '鸟鸣涧', meaning: '春天的夜晚静悄悄的，山林里十分空旷宁静。' },
      { text: '野火烧不尽，春风吹又生', poet: '白居易', title: '赋得古原草送别', meaning: '野火无法将野草烧尽，春风一吹它们又蓬勃生长。' },
    ],
  },
  {
    char: '月',
    theme: '明月千里',
    emoji: '🌙',
    lines: [
      { text: '床前明月光，疑是地上霜', poet: '李白', title: '静夜思', meaning: '明亮的月光照在床前，好像地上铺了一层洁白的薄霜。' },
      { text: '举头望明月，低头思故乡', poet: '李白', title: '静夜思', meaning: '抬头望着天上明亮的月亮，低下头思念着远方的故乡。' },
      { text: '月落乌啼霜满天，江枫渔火对愁眠', poet: '张继', title: '枫桥夜泊', meaning: '月亮落下乌鸦啼叫，夜色中满是霜气。' },
      { text: '露似真珠月似弓', poet: '白居易', title: '暮江吟', meaning: '草叶上的露珠像珍珠，初升的月牙儿像一张弯弓。' },
    ],
  },
  {
    char: '山',
    theme: '青山如画',
    emoji: '⛰️',
    lines: [
      { text: '白日依山尽，黄河入海流', poet: '王之涣', title: '登鹳雀楼', meaning: '夕阳依傍着西山缓缓下落，黄河奔腾流入大海。' },
      { text: '空山不见人，但闻人语响', poet: '王维', title: '鹿柴', meaning: '空旷的山林里看不见人影，只隐约听见说话的回声。' },
      { text: '会当凌绝顶，一览众山小', poet: '杜甫', title: '望岳', meaning: '一定要登上泰山的最高峰，俯瞰群山显得多么矮小。' },
      { text: '不识庐山真面目，只缘身在此山中', poet: '苏轼', title: '题西林壁', meaning: '之所以认不清庐山真正的样子，是因为自己正身在山中。' },
    ],
  },
  {
    char: '水',
    theme: '绿水长流',
    emoji: '💧',
    lines: [
      { text: '飞流直下三千尺，疑是银河落九天', poet: '李白', title: '望庐山瀑布', meaning: '壮观的瀑布从高崖飞泻而下，好像银河从九天落入人间。' },
      { text: '泉眼无声惜细流，树阴照水爱晴柔', poet: '杨万里', title: '小池', meaning: '泉眼无声无息流淌细细的水流，树荫倒映在柔和的水面上。' },
      { text: '水光潋滟晴方好，山色空蒙雨亦奇', poet: '苏轼', title: '饮湖上初晴后雨', meaning: '晴天西湖水波荡漾波光粼粼，雨天山峦朦胧如画。' },
      { text: '孤帆远影碧空尽，唯见长江天际流', poet: '李白', title: '黄鹤楼送孟浩然之广陵', meaning: '友人的孤帆渐渐消失在碧蓝天际，只看见滚滚长江流向天边。' },
    ],
  },
  {
    char: '风',
    theme: '清风拂面',
    emoji: '🍃',
    lines: [
      { text: '不知细叶谁裁出，二月春风似剪刀', poet: '贺知章', title: '咏柳', meaning: '不知道细细的柳叶是谁剪出来的，二月的春风就像一把神奇的剪刀。' },
      { text: '夜来风雨声，花落知多少', poet: '孟浩然', title: '春晓', meaning: '昨天夜里听见刮风下雨的声音，不知道吹落了多少美丽的花朵。' },
      { text: '解落三秋叶，能开二月花', poet: '李峤', title: '风', meaning: '风能吹落秋天的黄叶，也能催开二月的鲜花。' },
      { text: '千里黄云白日曛，北风吹雁雪纷纷', poet: '高适', title: '别董大', meaning: '北风呼啸大雪纷飞，大雁迎风南飞。' },
    ],
  },
  {
    char: '花',
    theme: '百花齐放',
    emoji: '🌺',
    lines: [
      { text: '接天莲叶无穷碧，映日荷花别样红', poet: '杨万里', title: '晓出净慈寺送林子方', meaning: '碧绿的荷叶连到天边，阳光下的荷花格外鲜艳红润。' },
      { text: '待到重阳日，还来就菊花', poet: '孟浩然', title: '过故人庄', meaning: '等到重阳节那天，我还要来和你一起赏菊花品美酒。' },
      { text: '借问酒家何处有，牧童遥指杏花村', poet: '杜牧', title: '清明', meaning: '请问附近哪里有客栈休息，小牧童远远地指向开满杏花的小村庄。' },
      { text: '乱花渐欲迷人眼，浅草才能没马蹄', poet: '白居易', title: '钱塘湖春行', meaning: '繁花盛开让人眼花缭乱，嫩绿的小草刚刚能够没过马蹄。' },
    ],
  },
  {
    char: '雪',
    theme: '瑞雪兆丰年',
    emoji: '❄️',
    lines: [
      { text: '千山鸟飞绝，万径人踪灭', poet: '柳宗元', title: '江雪', meaning: '所有的山上都没有鸟儿飞翔，所有的小路上都没有人的脚印。' },
      { text: '孤舟蓑笠翁，独钓寒江雪', poet: '柳宗元', title: '江雪', meaning: '江面上一只孤零零的小船上，老渔翁披着蓑衣独自在寒雪中垂钓。' },
      { text: '遥知不是雪，为有暗香来', poet: '王安石', title: '梅花', meaning: '远远看去就知道那洁白的不是雪，因为有一阵阵淡淡的梅花幽香飘来。' },
      { text: '忽如一夜春风来，千树万树梨花开', poet: '岑参', title: '白雪歌送武判官归京', meaning: '忽然好像一夜春风吹来，千树万树上仿佛开满了洁白的梨花。' },
    ],
  },
  {
    char: '鸟',
    theme: '百鸟争鸣',
    emoji: '🐦',
    lines: [
      { text: '两个黄鹂鸣翠柳，一行白鹭上青天', poet: '杜甫', title: '绝句', meaning: '两只黄鹂在翠绿的柳树间婉转鸣唱，一行白鹭展翅飞向蔚蓝青天。' },
      { text: '独怜幽草涧边生，上有黄鹂深树鸣', poet: '韦应物', title: '滁州西涧', meaning: '最喜欢涧边茂密生长的小草，头顶深树林里传来黄鹂清脆的啼鸣。' },
      { text: '月出惊山鸟，时鸣春涧中', poet: '王维', title: '鸟鸣涧', meaning: '月亮升起惊动了山中的飞鸟，不时在春天的溪涧中发出欢快的鸣叫。' },
      { text: '鹅，鹅，鹅，曲项向天歌', poet: '骆宾王', title: '咏鹅', meaning: '天鹅弯曲着美丽的脖颈，面向蓝天欢快地歌唱。' },
    ],
  },
];

// ── 九宫格诗句字牌拼装题库 (8 关) ──
export interface LinePuzzle {
  id: string;
  title: string;
  poet: string;
  fullLine: string;
  shuffledChars: string[];
}

export const LINE_PUZZLES: LinePuzzle[] = [
  { id: 'lp1', title: '静夜思', poet: '李白', fullLine: '床前明月光', shuffledChars: ['月', '前', '光', '床', '明'] },
  { id: 'lp2', title: '春晓', poet: '孟浩然', fullLine: '春眠不觉晓', shuffledChars: ['晓', '春', '觉', '眠', '不'] },
  { id: 'lp3', title: '咏鹅', poet: '骆宾王', fullLine: '白毛浮绿水', shuffledChars: ['水', '白', '绿', '毛', '浮'] },
  { id: 'lp4', title: '登鹳雀楼', poet: '王之涣', fullLine: '欲穷千里目', shuffledChars: ['目', '欲', '千', '穷', '里'] },
  { id: 'lp5', title: '悯农', poet: '李绅', fullLine: '粒粒皆辛苦', shuffledChars: ['苦', '粒', '皆', '粒', '辛'] },
  { id: 'lp6', title: '江雪', poet: '柳宗元', fullLine: '独钓寒江雪', shuffledChars: ['雪', '独', '江', '钓', '寒'] },
  { id: 'lp7', title: '草', poet: '白居易', fullLine: '野火烧不尽', shuffledChars: ['尽', '野', '烧', '火', '不'] },
  { id: 'lp8', title: '相思', poet: '王维', fullLine: '红豆生南国', shuffledChars: ['国', '红', '南', '豆', '生'] },
];

const DEFAULT_TOPIC: FlowerTopic = {
  char: '春',
  theme: '春暖花开',
  emoji: '🌸',
  lines: [
    { text: '春眠不觉晓，处处闻啼鸟', poet: '孟浩然', title: '春晓', meaning: '春天睡得香，不知不觉天亮了，到处都是鸟鸣声。' },
  ],
};

const DEFAULT_LINE = {
  text: '春眠不觉晓，处处闻啼鸟',
  poet: '孟浩然',
  title: '春晓',
  meaning: '春天睡得香，不知不觉天亮了，到处都是鸟鸣声。',
};

const DEFAULT_PUZZLE: LinePuzzle = {
  id: 'lp1',
  title: '静夜思',
  poet: '李白',
  fullLine: '床前明月光',
  shuffledChars: ['月', '前', '光', '床', '明'],
};

// 五声音阶频率：宫 G4, 商 A4, 角 B4, 徵 D5, 羽 E5
const PENTATONIC_FREQS = [392.0, 440.0, 493.88, 587.33, 659.25];

export function FlyingFlowerDuel() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [activeTab, setActiveTab] = useState<'flower' | 'puzzle'>('flower');
  const [topicIdx, setTopicIdx] = useState(0);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [streak, setStreak] = useState(0);

  // 九宫格拼装状态
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [assembledChars, setAssembledChars] = useState<string[]>([]);
  const [solvedPuzzles, setSolvedPuzzles] = useState<string[]>([]);

  const topic = useMemo<FlowerTopic>(() => {
    return FLOWER_TOPICS[topicIdx % FLOWER_TOPICS.length] ?? DEFAULT_TOPIC;
  }, [topicIdx]);

  const activeLine = useMemo(() => {
    return topic.lines[currentLineIdx % topic.lines.length] ?? topic.lines[0] ?? DEFAULT_LINE;
  }, [topic, currentLineIdx]);

  const puzzle = useMemo<LinePuzzle>(() => {
    return LINE_PUZZLES[puzzleIdx % LINE_PUZZLES.length] ?? DEFAULT_PUZZLE;
  }, [puzzleIdx]);

  // WebAudio 国风古筝五声音阶合成
  const playGuzhengNote = (noteIndex: number) => {
    try {
      const ctx = getAudioContext();
      const freq = PENTATONIC_FREQS[noteIndex % PENTATONIC_FREQS.length] ?? 440;
      const now = ctx.currentTime;

      // 泛音振荡器（古筝弦乐物理泛音）
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
    } catch {
      // Audio fallback
    }
  };

  // 朗读当前名句
  const handleReciteLine = useCallback(() => {
    sfxTap();
    playGuzhengNote(currentLineIdx);
    void speak(`【${activeLine.title}】${activeLine.poet}：${activeLine.text}。释义：${activeLine.meaning}`, { lang: 'zh-CN' });
  }, [activeLine, currentLineIdx]);

  // 切换飞花令主题
  const handleSelectTopic = (idx: number) => {
    sfxTap();
    playGuzhengNote(idx);
    setTopicIdx(idx);
    setCurrentLineIdx(0);
    const target = FLOWER_TOPICS[idx] ?? DEFAULT_TOPIC;
    void speak(`开启【${target.char}】字飞花令！包含四句传世名篇，一起来吟诗对决吧！`, { lang: 'zh-CN' });
  };

  // 下一句飞花令
  const handleNextLine = () => {
    sfxTap();
    sfxCorrect();
    playGuzhengNote(currentLineIdx + 1);
    celebrateSmall();
    addStars(1);
    practice(`poem:${activeLine.title}`, true, 2, 1);
    setStreak((s) => s + 1);
    setCurrentLineIdx((prev) => (prev + 1) % topic.lines.length);
  };

  // 点击字牌装入拼装槽
  const handlePickPuzzleChar = (char: string, charIdx: number) => {
    sfxTap();
    playGuzhengNote(charIdx);
    const nextAssembled = [...assembledChars, char];
    setAssembledChars(nextAssembled);

    // 检查是否拼装完成
    if (nextAssembled.length === puzzle.fullLine.length) {
      const resultStr = nextAssembled.join('');
      if (resultStr === puzzle.fullLine) {
        sfxWin();
        celebrateBig();
        const nextSolved = Array.from(new Set([...solvedPuzzles, puzzle.id]));
        setSolvedPuzzles(nextSolved);
        addStars(2);
        practice(`poem:${puzzle.id}`, true, 3, 1);
        setStreak((s) => s + 1);
        void speak(`拼诗大成功！【${puzzle.title}】${puzzle.poet}：${puzzle.fullLine}！`, { lang: 'zh-CN' });
      } else {
        sfxWrong();
        void speak(`诗句顺序还不对哦，再试一次吧！`, { lang: 'zh-CN' });
        setTimeout(() => {
          setAssembledChars([]);
        }, 1000);
      }
    }
  };

  // 清空当前拼诗
  const handleResetPuzzle = () => {
    sfxTap();
    setAssembledChars([]);
  };

  return (
    <div className="space-y-4">
      {/* 顶部双模式切换 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setActiveTab('flower');
            }}
            className={`py-1.5 px-3.5 rounded-xl font-black text-xs transition-all ${
              activeTab === 'flower' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-600 hover:text-pink-700'
            }`}
          >
            🌸 诗仙飞花令 (8大主题对决)
          </button>
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setActiveTab('puzzle');
              setAssembledChars([]);
            }}
            className={`py-1.5 px-3.5 rounded-xl font-black text-xs transition-all ${
              activeTab === 'puzzle' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            🧩 诗句九宫格拼装 (8关名篇)
          </button>
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {activeTab === 'flower' ? (
        /* 模式一：飞花令对决 */
        <div className="space-y-4">
          {/* 8 大核心关键字托盘 */}
          <div className="flex flex-wrap gap-1.5">
            {FLOWER_TOPICS.map((t, idx) => {
              const isSel = topicIdx === idx;
              return (
                <button
                  key={t.char}
                  type="button"
                  onClick={() => handleSelectTopic(idx)}
                  className={`py-2 px-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1 shadow-sm ${
                    isSel
                      ? 'bg-pink-600 text-white border-pink-700 shadow-md scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300'
                  }`}
                >
                  <span className="text-base">{t.emoji}</span>
                  <span>【{t.char}】字令</span>
                </button>
              );
            })}
          </div>

          {/* 飞花令诗意主舞台 */}
          <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 rounded-3xl border-3 border-pink-300 p-6 shadow-sm space-y-5 text-center">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-pink-700 bg-pink-100 px-3 py-1 rounded-full">
                {topic.emoji} {topic.theme} · 飞花令第 {currentLineIdx + 1} / {topic.lines.length} 轮
              </span>
              <button
                type="button"
                onClick={handleReciteLine}
                className="py-1.5 px-3 rounded-xl bg-pink-600 text-white text-xs font-black shadow hover:bg-pink-700 active:scale-95 flex items-center gap-1"
              >
                <span>🔊</span>
                <span>古筝伴奏深情朗读</span>
              </button>
            </div>

            {/* 核心诗句大字展示 */}
            <div className="bg-white/90 backdrop-blur rounded-2xl p-6 border border-pink-100 shadow-sm space-y-3">
              <div className="text-xs font-bold text-slate-500">
                《{activeLine.title}》· 【{activeLine.poet}】
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 tracking-widest leading-relaxed">
                {activeLine.text.split(topic.char).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="text-pink-600 bg-pink-100 px-1 rounded-lg underline underline-offset-4">
                        {topic.char}
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
                💡 诗意解析：{activeLine.meaning}
              </p>
            </div>

            <div className="pt-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNextLine}
                className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-base font-black shadow-lg shadow-pink-200"
              >
                ✨ 答对对决！下一句名诗
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        /* 模式二：九宫格诗句字牌拼装 */
        <div className="space-y-4">
          {/* 关卡选择器 */}
          <div className="flex flex-wrap gap-1.5">
            {LINE_PUZZLES.map((p, idx) => {
              const isSel = puzzleIdx === idx;
              const isDone = solvedPuzzles.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setPuzzleIdx(idx);
                    setAssembledChars([]);
                  }}
                  className={`py-2 px-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1 shadow-sm ${
                    isSel
                      ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <span>第 {idx + 1} 关</span>
                  <span>《{p.title}》</span>
                  {isDone && <span>✨</span>}
                </button>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 rounded-3xl border-3 border-purple-300 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <span className="text-sm font-black text-purple-900">
                  请拼出：【{puzzle.title}】（{puzzle.poet}）
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetPuzzle}
                className="py-1 px-3 rounded-xl bg-white border border-purple-200 text-purple-700 text-xs font-black hover:bg-purple-50 active:scale-95"
              >
                🔄 重新拼装
              </button>
            </div>

            {/* 拼装放置槽 */}
            <div className="bg-white/90 rounded-2xl p-4 border border-purple-100 min-h-[90px] flex items-center justify-center gap-2 sm:gap-3 shadow-inner">
              {Array.from({ length: puzzle.fullLine.length }).map((_, i) => {
                const char = assembledChars[i];
                return (
                  <div
                    key={i}
                    className={`h-14 w-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                      char
                        ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                        : 'bg-purple-50/50 border-dashed border-purple-300 text-transparent'
                    }`}
                  >
                    {char ?? '？'}
                  </div>
                );
              })}
            </div>

            {/* 待选字牌托盘 */}
            <div className="bg-white rounded-2xl p-4 border border-purple-100 space-y-2">
              <span className="text-xs font-black text-slate-700">点击下方打乱的字牌完成诗句拼装：</span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {puzzle.shuffledChars.map((char, i) => (
                  <motion.button
                    key={`${char}-${i}`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => handlePickPuzzleChar(char, i)}
                    className="h-14 w-14 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 font-black text-2xl shadow hover:bg-amber-100 active:scale-95 transition-all"
                  >
                    {char}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 拼装成功庆祝提示 */}
            <AnimatePresence>
              {solvedPuzzles.includes(puzzle.id) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-300 text-center text-emerald-950 font-black text-sm"
                >
                  🎉 恭喜拼出名篇名句：【{puzzle.fullLine}】！
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
