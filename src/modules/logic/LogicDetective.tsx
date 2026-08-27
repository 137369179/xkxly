/**
 * 🕵️‍♂️ 逻辑小侦探探案馆 (Interactive Detective Casebook)
 * ------------------------------------------------------------
 * 1. 经典逻辑线索链 (Clues deduction matrix)
 * 2. 4 位动物嫌疑人卡片与证词审查
 * 3. 互动指认与探案推理分析 + AI 侦探助手
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { useAiStream } from '@/lib/ai/useAi';
import { logicDetectiveTask } from '@/lib/ai/tasks';
import { AiPanel } from '@/components/ai/AiPanel';

export interface Suspect {
  id: string;
  name: string;
  emoji: string;
  feature: string;
  isCulprit: boolean;
  confession: string;
}

export interface DetectiveCase {
  id: string;
  title: string;
  emoji: string;
  sceneDesc: string;
  clues: string[];
  suspects: Suspect[];
  verdictExplanation: string;
}

export const DETECTIVE_CASES: DetectiveCase[] = [
  {
    id: 'cake',
    title: '谁吃了森林大蛋糕？',
    emoji: '🎂',
    sceneDesc: '森林厨房里的草莓大蛋糕少了一大块，地面留下了神秘脚印与甜甜的果酱痕迹！',
    clues: [
      '🔍 线索 1：吃蛋糕的小动物嘴角留下了红红的草莓果酱！',
      '🧣 线索 2：他脖子上围着一条温暖的红围巾！',
      '🐾 线索 3：他有一对三角形尖尖的小猫耳！',
    ],
    suspects: [
      { id: 'fox', name: '小狐狸', emoji: '🦊', feature: '嘴巴很干净，戴着蓝色领结', isCulprit: false, confession: '我一直在看书，才没有去厨房呢！' },
      { id: 'cat', name: '小猫咪', emoji: '🐱', feature: '嘴角有红果酱，系着红围巾', isCulprit: true, confession: '喵呜~ 蛋糕太香了，我忍不住尝了一大块！' },
      { id: 'squirrel', name: '小松鼠', emoji: '🐿️', feature: '抱着大松果，嘴边没有果酱', isCulprit: false, confession: '我刚刚一直在树上采松果呢！' },
      { id: 'dog', name: '小狗狗', emoji: '🐶', feature: '戴着黄色安全帽，正在啃骨头', isCulprit: false, confession: '汪汪！我只喜欢香喷喷的肉骨头！' },
    ],
    verdictExplanation: '根据线索，小猫咪嘴角有草莓果酱、系着红围巾、长着三角耳，正是吃蛋糕的小淘气！',
  },
  {
    id: 'hat',
    title: '谁戴了魔法小红帽？',
    emoji: '🎩',
    sceneDesc: '森林派对上有一顶会变魔术的小红帽，究竟在哪只小动物头上呢？',
    clues: [
      '🔍 线索 1：他不是个头最高的大动物。',
      '🐰 线索 2：他头上长着两只长长的白耳朵！',
      '🥕 线索 3：他手里还拿着一根甜甜的胡萝卜！',
    ],
    suspects: [
      { id: 'giraffe', name: '长颈鹿', emoji: '🦒', feature: '个子高高的，戴着黄色圆帽', isCulprit: false, confession: '我个子太高啦，小红帽戴不下哦！' },
      { id: 'bear', name: '小棕熊', emoji: '🐻', feature: '圆圆的小耳朵，正在喝蜂蜜', isCulprit: false, confession: '我正在专心品尝甜甜的蜂蜜！' },
      { id: 'rabbit', name: '小白兔', emoji: '🐰', feature: '长耳朵，戴红帽，拿胡萝卜', isCulprit: true, confession: '嘻嘻！魔法小红帽就在我的长耳朵上变魔术呢！' },
      { id: 'elephant', name: '小大象', emoji: '🐘', feature: '大大的耳朵，长长的鼻子', isCulprit: false, confession: '我的耳朵太大啦，戴不下小红帽！' },
    ],
    verdictExplanation: '小白兔不仅长着长长白耳朵、拿着胡萝卜，还戴着鲜艳的魔法红帽！',
  },
  {
    id: 'hide',
    title: '捉迷藏谁藏在树后？',
    emoji: '🌳',
    sceneDesc: '大橡树后面露出了一截毛茸茸的尾巴，地上还撒着金黄色的坚果壳！',
    clues: [
      '🔍 线索 1：大树后面露出了一条蓬松蓬松的大尾巴！',
      '🌰 线索 2：树根底下散落着几颗剥开的松果和坚果壳！',
      '🐿️ 线索 3：这只小动物非常擅长在树枝间敏捷跳跃！',
    ],
    suspects: [
      { id: 'frog', name: '小青蛙', emoji: '🐸', feature: '绿绿的皮肤，没有毛茸茸尾巴', isCulprit: false, confession: '呱呱！我正准备去池塘游泳呢！' },
      { id: 'pig', name: '小粉猪', emoji: '🐷', feature: '短短的小卷尾，正在吃西瓜', isCulprit: false, confession: '哼哼~ 我的尾巴细细小小的，才不蓬松！' },
      { id: 'squirrel', name: '小松鼠', emoji: '🐿️', feature: '蓬松大尾巴，口袋装满坚果', isCulprit: true, confession: '哎呀被你发现啦！我的大尾巴藏不住啦！' },
      { id: 'duck', name: '小黄鸭', emoji: '🦆', feature: '扁扁的尾巴，扁扁的嘴巴', isCulprit: false, confession: '嘎嘎！我才不会爬树捉迷藏呢！' },
    ],
    verdictExplanation: '小松鼠拥有蓬松大尾巴，爱吃松果坚果，正是藏在树后的小伙伴！',
  },
  {
    id: 'train',
    title: '谁坐在动物小火车的第1节车厢？',
    emoji: '🚂',
    sceneDesc: '动物小火车嘟嘟出发啦！排在最前面的车头第 1 节车厢里坐着谁？',
    clues: [
      '🔍 线索 1：小猴子坐在小棕熊的正前方。',
      '🔍 线索 2：小猴子的前面再也没有别的小动物了。',
      '🍌 线索 3：第 1 节车厢里飘出了香蕉的香味！',
    ],
    suspects: [
      { id: 'monkey', name: '小猴子', emoji: '🐒', feature: '坐在最前排，开心地吃香蕉', isCulprit: true, confession: '吱吱！我就是今天的森林火车领头小队长！' },
      { id: 'bear', name: '小棕熊', emoji: '🐻', feature: '坐在第 2 节车厢里打瞌睡', isCulprit: false, confession: '我坐在小猴子的后面一节车厢呢！' },
      { id: 'bunny', name: '小萌兔', emoji: '🐰', feature: '坐在第 3 节车厢里看风景', isCulprit: false, confession: '我坐在小火车的中间位置哦！' },
      { id: 'deer', name: '小花鹿', emoji: '🦌', feature: '坐在最后的车尾车厢', isCulprit: false, confession: '我在最后一节车厢跟大家招手呢！' },
    ],
    verdictExplanation: '小猴子前面没有其他动物，且坐在小熊前面，正是第 1 节车厢的小队长！',
  },
];

const FALLBACK_CASE = DETECTIVE_CASES[0] ?? {
  id: 'cake',
  title: '谁吃了森林大蛋糕？',
  emoji: '🎂',
  sceneDesc: '森林厨房里的草莓大蛋糕少了一大块，地面留下了神秘脚印与甜甜的果酱痕迹！',
  clues: [
    '🔍 线索 1：吃蛋糕的小动物嘴角留下了红红的草莓果酱！',
    '🧣 线索 2：他脖子上围着一条温暖的红围巾！',
    '🐾 线索 3：他有一对三角形尖尖的小猫耳！',
  ],
  suspects: [
    { id: 'cat', name: '小猫咪', emoji: '🐱', feature: '嘴角有红果酱，系着红围巾', isCulprit: true, confession: '喵呜~ 蛋糕太香了！' },
  ],
  verdictExplanation: '小猫咪正是吃蛋糕的小淘气！',
};

export function LogicDetective() {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [solved, setSolved] = useState(false);
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);
  const stream = useAiStream();

  const currentCase = useMemo(() => {
    return DETECTIVE_CASES[selectedCaseIdx % DETECTIVE_CASES.length] ?? FALLBACK_CASE;
  }, [selectedCaseIdx]);

  const handleSelectCase = (idx: number) => {
    sfxTap();
    setSelectedCaseIdx(idx);
    setSolved(false);
    setSelectedSuspectId(null);
    setFeedback(null);
    const targetCase = DETECTIVE_CASES[idx % DETECTIVE_CASES.length] ?? FALLBACK_CASE;
    void speak(`小侦探出动！当前案件：${targetCase.title}。${targetCase.sceneDesc}`, { lang: 'zh-CN' });
  };

  const handlePickSuspect = (suspect: Suspect) => {
    sfxTap();
    setSelectedSuspectId(suspect.id);

    if (suspect.isCulprit) {
      setSolved(true);
      sfxWin();
      celebrateBig();
      addStars(3);
      addFish(1);
      setFeedback(`🎉 破案成功！【${suspect.name}】招供：「${suspect.confession}」${currentCase.verdictExplanation}`);
      void speak(`破案大成功！真相只有一个，就是${suspect.name}！`, { lang: 'zh-CN' });
    } else {
      sfxWrong();
      setFeedback(`❌ 不是【${suspect.name}】哦！他的证词：「${suspect.confession}」请再仔细对照线索！`);
      void speak(`不对哦，再仔细观察线索，看看是谁符合所有特征！`, { lang: 'zh-CN' });
    }
  };

  const handleAskAi = () => {
    sfxTap();
    setShowAi(true);
    stream.run(logicDetectiveTask(currentCase.title));
  };

  return (
    <div className="space-y-5">
      {/* 案件导航栏 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {DETECTIVE_CASES.map((c, idx) => {
          const active = selectedCaseIdx === idx;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCase(idx)}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm border-2 ${
                active
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105'
                  : 'bg-white text-slate-700 border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              <span className="text-lg">{c.emoji}</span>
              <span>{c.title}</span>
            </button>
          );
        })}
      </div>

      {/* 案情看板 */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-3xl border-3 border-emerald-300 p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-900 bg-emerald-200/80 px-3 py-1 rounded-full">
                🕵️ 案件档案 #{selectedCaseIdx + 1}
              </span>
              <h3 className="text-xl font-black text-slate-800">
                {currentCase.title}
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {currentCase.sceneDesc}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAskAi}
            className="px-3.5 py-1.5 bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1"
          >
            <span>🤖</span>
            <span>AI 侦探助手提示</span>
          </button>
        </div>

        {/* 关键线索板 */}
        <div className="bg-white/90 rounded-2xl p-4 border border-emerald-200 space-y-2">
          <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1">
            <span>📋</span>
            <span>现场搜集到的关键线索：</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {currentCase.clues.map((clue, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-emerald-50/70 rounded-xl text-xs font-bold text-slate-700 border border-emerald-100"
              >
                {clue}
              </div>
            ))}
          </div>
        </div>

        {/* 嫌疑人审查席 */}
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-black text-slate-700 text-center">
            👇 点击嫌疑人头像指认目标，找出真正符合全部线索的动物：
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {currentCase.suspects.map((suspect) => {
              const isSelected = selectedSuspectId === suspect.id;
              return (
                <motion.button
                  key={suspect.id}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handlePickSuspect(suspect)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-between text-center gap-2 transition-all shadow-sm ${
                    isSelected
                      ? suspect.isCulprit
                        ? 'bg-emerald-100 border-emerald-500 shadow-md ring-2 ring-emerald-400'
                        : 'bg-rose-50 border-rose-400 shadow-md'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-5xl select-none">{suspect.emoji}</span>
                  <div>
                    <span className="font-black text-sm text-slate-800 block">
                      {suspect.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                      {suspect.feature}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                    👉 点击指认
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 判决与反馈区 */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-2xl border-2 text-xs font-black ${
                solved
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                  : 'bg-rose-100 border-rose-400 text-rose-950'
              }`}
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI 侦探流式分析 */}
        {showAi && (
          <div className="pt-2">
            <AiPanel state={stream} tone="green" />
          </div>
        )}
      </div>
    </div>
  );
}
