import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxBubble, sfxCorrect, sfxWin } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';

interface Germ {
  id: number;
  x: number; // percentage
  y: number;
  hp: number;
  type: 'sugar' | 'bacteria' | 'dirt';
}

const INITIAL_GERMS: Germ[] = [
  { id: 1, x: 25, y: 35, hp: 3, type: 'bacteria' },
  { id: 2, x: 50, y: 30, hp: 3, type: 'sugar' },
  { id: 3, x: 75, y: 35, hp: 3, type: 'bacteria' },
  { id: 4, x: 30, y: 65, hp: 3, type: 'dirt' },
  { id: 5, x: 50, y: 70, hp: 3, type: 'bacteria' },
  { id: 6, x: 70, y: 65, hp: 3, type: 'sugar' },
];

const HAND_WASH_STEPS = [
  { id: 1, name: '掌心对掌心', desc: '双手掌心相对，手指并拢相互揉搓', emoji: '🤲' },
  { id: 2, name: '手心擦手背', desc: '手心对手背，沿指缝相互揉搓', emoji: '🖐️' },
  { id: 3, name: '十指交错搓', desc: '掌心相对，双手交叉沿指缝揉搓', emoji: '👐' },
  { id: 4, name: '指关节弯弯', desc: '弯曲手指关节在掌心旋转揉搓', emoji: '✊' },
  { id: 5, name: '大拇指转转', desc: '一手握住另一手大拇指旋转揉搓', emoji: '👍' },
  { id: 6, name: '指尖聚掌心', desc: '将五指指尖并拢在掌心旋转揉搓', emoji: '🤌' },
  { id: 7, name: '手腕洗干净', desc: '清洗手腕，螺旋式揉搓', emoji: '🧼' },
];

export function HabitSimulator() {
  const [activeMode, setActiveMode] = useState<'teeth' | 'hand'>('teeth');
  const [germs, setGerms] = useState<Germ[]>(INITIAL_GERMS);
  const [brushingCount, setBrushingCount] = useState<number>(0);
  const [isTeethClean, setIsTeethClean] = useState<boolean>(false);

  // 七步洗手法状态
  const [washStep, setWashStep] = useState<number>(0);
  const [isHandClean, setIsHandClean] = useState<boolean>(false);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  useEffect(() => {
    if (activeMode === 'teeth') {
      speak('欢迎来到刷牙小卫士！用小牙刷轻触牙齿上的蛀牙小细菌，把它们通通消灭吧！');
    } else {
      speak('欢迎来到七步洗手操！跟着儿歌一步一步洗干净双手，做个讲卫生的好宝宝！');
    }
  }, [activeMode]);

  // 刷牙消除细菌
  const handleBrushGerm = (id: number) => {
    sfxBubble();
    setBrushingCount((c) => c + 1);
    setGerms((prev) =>
      prev
        .map((g) => (g.id === id ? { ...g, hp: g.hp - 1 } : g))
        .filter((g) => g.hp > 0)
    );

    // 检查是否全部清理干净
    if (germs.length === 1 && germs[0]?.id === id && (germs[0]?.hp ?? 0) <= 1) {
      setIsTeethClean(true);
      sfxCorrect();
      sfxWin();
      celebrateBig();
      addStars(5);
      addFish(2);
      speak('太厉害了！牙齿变得白白亮亮的，蛀牙细菌全被你消灭啦！');
    }
  };

  const handleResetTeeth = () => {
    sfxTap();
    setGerms(INITIAL_GERMS);
    setBrushingCount(0);
    setIsTeethClean(false);
  };

  // 七步洗手推进
  const handleNextWashStep = () => {
    sfxBubble();
    celebrateSmall();
    if (washStep < HAND_WASH_STEPS.length - 1) {
      const next = washStep + 1;
      setWashStep(next);
      const stepInfo = HAND_WASH_STEPS[next];
      if (stepInfo) {
        speak(`第${next + 1}步：${stepInfo.name}，${stepInfo.desc}`);
      }
    } else {
      setIsHandClean(true);
      sfxCorrect();
      sfxWin();
      celebrateBig();
      addStars(5);
      addFish(2);
      speak('冲水啦！七步洗手法全部完成，双手变得干干净净，细菌全跑光啦！');
    }
  };

  const handleResetHand = () => {
    sfxTap();
    setWashStep(0);
    setIsHandClean(false);
  };

  return (
    <div className="space-y-6">
      {/* 顶部模式切换 (Teeth / Hand) */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            sfxTap();
            setActiveMode('teeth');
          }}
          className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 ${
            activeMode === 'teeth'
              ? 'bg-sky-500 text-white border-sky-600 shadow-lg scale-105'
              : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50'
          }`}
        >
          <span>🪥</span>
          <span>刷牙小卫士</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfxTap();
            setActiveMode('hand');
          }}
          className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 ${
            activeMode === 'hand'
              ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-105'
              : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <span>🧼</span>
          <span>七步洗手操</span>
        </button>
      </div>

      {/* 模式一：刷牙小卫士 (Brush Teeth Guard) */}
      {activeMode === 'teeth' && (
        <div className="bg-white rounded-3xl border-3 border-sky-200 p-6 shadow-xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span>🪥 刷牙大作战</span>
                <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full">
                  巴氏刷牙法
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                点击/轻触牙齿上的残渣细菌，挥动牙刷消灭它们！已刷 {brushingCount} 下
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetTeeth}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
            >
              🔄 重新挑战
            </button>
          </div>

          {/* 牙齿画板舞台 (Mouth & Teeth Canvas) */}
          <div className="relative w-full h-72 bg-gradient-to-b from-rose-100 via-rose-50 to-rose-200 rounded-3xl border-4 border-rose-300 shadow-inner flex flex-col items-center justify-center overflow-hidden">
            {/* 上排洁白牙齿 */}
            <div className="flex gap-2 mb-8">
              {[1, 2, 3, 4, 5, 6].map((t) => (
                <motion.div
                  key={t}
                  animate={isTeethClean ? { y: [0, -3, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 2, delay: t * 0.1 }}
                  className="w-10 h-14 bg-white rounded-b-2xl shadow-md border-2 border-slate-200 flex items-end justify-center pb-1 text-base select-none"
                >
                  {isTeethClean ? '✨' : '🦷'}
                </motion.div>
              ))}
            </div>

            {/* 下排洁白牙齿 */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((t) => (
                <motion.div
                  key={t}
                  animate={isTeethClean ? { y: [0, 3, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 2, delay: t * 0.1 }}
                  className="w-10 h-14 bg-white rounded-t-2xl shadow-md border-2 border-slate-200 flex items-start justify-center pt-1 text-base select-none"
                >
                  {isTeethClean ? '✨' : '🦷'}
                </motion.div>
              ))}
            </div>

            {/* 分布的细菌泡泡 */}
            <AnimatePresence>
              {germs.map((g) => (
                <motion.button
                  key={g.id}
                  type="button"
                  initial={{ scale: 0 }}
                  animate={{
                    scale: [1, 1.15, 1],
                    rotate: [-5, 5, -5],
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  onClick={() => handleBrushGerm(g.id)}
                  style={{
                    position: 'absolute',
                    left: `${g.x}%`,
                    top: `${g.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="w-12 h-12 bg-amber-400/90 border-2 border-amber-600 rounded-full shadow-lg flex flex-col items-center justify-center cursor-pointer hover:scale-125 active:scale-90 transition-transform"
                >
                  <span className="text-xl select-none">
                    {g.type === 'sugar' ? '🍬' : g.type === 'bacteria' ? '👾' : '🍫'}
                  </span>
                  <span className="text-[9px] font-black text-amber-950 bg-white/80 px-1 rounded-full">
                    {'❤️'.repeat(g.hp)}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>

            {/* 通关闪耀彩带 */}
            {isTeethClean && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-sky-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center space-y-2"
              >
                <div className="text-6xl animate-bounce">🏆</div>
                <h4 className="text-2xl font-black">牙齿亮晶晶！</h4>
                <p className="text-xs text-sky-100">
                  每天早晚刷牙2分钟，饭后漱口，远离蛀牙小细菌！
                </p>
                <div className="flex gap-4 pt-2">
                  <span className="px-3 py-1 bg-amber-400 text-amber-950 font-black text-xs rounded-xl shadow">
                    ⭐ +5 星星
                  </span>
                  <span className="px-3 py-1 bg-orange-400 text-white font-black text-xs rounded-xl shadow">
                    🐟 +2 小鱼干
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* 模式二：七步洗手操 (7-Step Hand Washing) */}
      {activeMode === 'hand' && (
        <div className="bg-white rounded-3xl border-3 border-emerald-200 p-6 shadow-xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span>🧼 七步洗手操</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  第 {washStep + 1} / 7 步
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                口诀：内、外、夹、弓、大、立、腕，把细菌通通冲走！
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetHand}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
            >
              🔄 重新学习
            </button>
          </div>

          {/* 步骤图解与互动演示卡片 */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 rounded-3xl border-2 border-emerald-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
            <motion.div
              key={washStep}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-36 h-36 bg-white rounded-3xl border-4 border-emerald-300 shadow-xl flex items-center justify-center text-7xl select-none"
            >
              {HAND_WASH_STEPS[washStep]?.emoji ?? '🧼'}
            </motion.div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="inline-block px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-black">
                口诀第 {washStep + 1} 字：{HAND_WASH_STEPS[washStep]?.name}
              </div>
              <h4 className="text-2xl font-black text-slate-800">
                {HAND_WASH_STEPS[washStep]?.name}
              </h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                {HAND_WASH_STEPS[washStep]?.desc}
              </p>

              <div className="pt-2">
                {!isHandClean ? (
                  <button
                    type="button"
                    onClick={handleNextWashStep}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 mx-auto sm:mx-0"
                  >
                    <span>🫧 我做好了，下一步</span>
                    <span>➔</span>
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-100 text-emerald-900 rounded-2xl font-black text-sm flex items-center gap-2">
                    <span>🎉 恭喜获得「卫生洁净小卫士」勋章！</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
