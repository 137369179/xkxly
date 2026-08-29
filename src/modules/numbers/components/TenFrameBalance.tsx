import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';

interface BalanceWeight {
  id: string;
  name: string;
  weight: number;
  emoji: string;
}

const WEIGHTS: BalanceWeight[] = [
  { id: 'strawberry', name: '小草莓', weight: 1, emoji: '🍓' },
  { id: 'apple', name: '红苹果', weight: 2, emoji: '🍎' },
  { id: 'cat', name: '萌小猫', weight: 3, emoji: '🐱' },
  { id: 'star', name: '魔法星', weight: 4, emoji: '⭐' },
  { id: 'watermelon', name: '大西瓜', weight: 5, emoji: '🍉' },
  { id: 'elephant', name: '小大象', weight: 10, emoji: '🐘' },
];

export function TenFrameBalance() {
  const [activeTab, setActiveTab] = useState<'tenframe' | 'balance'>('tenframe');

  // 十格阵状态
  const [frameDots, setFrameDots] = useState<number>(6);
  const [userFillCount, setUserFillCount] = useState<number>(0);
  const [tenFramePassed, setTenFramePassed] = useState<boolean>(false);

  // 天平状态
  const [leftWeights, setLeftWeights] = useState<BalanceWeight[]>(WEIGHTS.slice(0, 2)); // 1+2=3
  const [rightWeights, setRightWeights] = useState<BalanceWeight[]>([]);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  const leftTotal = leftWeights.reduce((sum, w) => sum + w.weight, 0);
  const rightTotal = rightWeights.reduce((sum, w) => sum + w.weight, 0);
  const tiltAngle = Math.max(-25, Math.min(25, (rightTotal - leftTotal) * 6));
  const isBalanced = leftTotal > 0 && leftTotal === rightTotal;

  useEffect(() => {
    if (activeTab === 'tenframe') {
      speak(`欢迎来到十格阵！当前格子里有 ${frameDots} 个红点，还需要放入几个蓝点才能凑满 10 个呢？`);
    } else {
      speak('欢迎来到重力平衡天平！在右边秤盘放入合适的水果或动物，让天平两端保持平稳平衡吧！');
    }
  }, [activeTab, frameDots]);

  // 十格阵互动
  const handleAddBlueDot = () => {
    if (frameDots + userFillCount < 10) {
      sfxTap();
      setUserFillCount((c) => c + 1);
    }
  };

  const handleRemoveBlueDot = () => {
    if (userFillCount > 0) {
      sfxTap();
      setUserFillCount((c) => c - 1);
    }
  };

  const handleCheckTenFrame = () => {
    if (frameDots + userFillCount === 10) {
      setTenFramePassed(true);
      sfxCorrect();
      sfxWin();
      celebrateBig();
      addStars(5);
      addFish(2);
      speak(`答对啦！${frameDots} 加上 ${userFillCount} 正好等于 10，这就是神奇的凑十法！`);
    } else {
      sfxTap();
      speak(`还差一点点哦，再数数看，要凑满整整 10 格！`);
    }
  };

  // 天平放置砝码
  const handleAddRightWeight = (weight: BalanceWeight) => {
    sfxTap();
    const updated = [...rightWeights, weight];
    setRightWeights(updated);

    const newRight = updated.reduce((s, w) => s + w.weight, 0);
    if (newRight === leftTotal) {
      sfxCorrect();
      sfxWin();
      celebrateBig();
      addStars(6);
      addFish(2);
      speak(`天平平衡啦！左边重量是 ${leftTotal}，右边重量也是 ${newRight}，两边完全相等！`);
    }
  };

  const handleClearRight = () => {
    sfxTap();
    setRightWeights([]);
  };

  return (
    <div className="space-y-6">
      {/* 顶部模式切换 (Ten-frame / Balance) */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            sfxTap();
            setActiveTab('tenframe');
          }}
          className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 ${
            activeTab === 'tenframe'
              ? 'bg-amber-500 text-candy-orange-on border-amber-600 shadow-lg scale-105'
              : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
          }`}
        >
          <span>🔟</span>
          <span>十格阵数感</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfxTap();
            setActiveTab('balance');
          }}
          className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 ${
            activeTab === 'balance'
              ? 'bg-indigo-500 text-candy-blue-on border-indigo-600 shadow-lg scale-105'
              : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          <span>⚖️</span>
          <span>重力平衡天平</span>
        </button>
      </div>

      {/* 模式一：十格阵 (Ten-frame) */}
      {activeTab === 'tenframe' && (
        <div className="bg-white rounded-3xl border-3 border-amber-300 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800">
                🔟 蒙台梭利十格阵 (凑十挑战)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                当前有 {frameDots} 个🔴红球，填入几个🔵蓝球能凑满 10 个？
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                {frameDots} + {userFillCount} = {frameDots + userFillCount} / 10
              </span>
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setFrameDots(Math.floor(Math.random() * 8) + 1);
                  setUserFillCount(0);
                  setTenFramePassed(false);
                }}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold"
              >
                🔄 换一题
              </button>
            </div>
          </div>

          {/* 2x5 十格矩阵画板 */}
          <div className="max-w-md mx-auto grid grid-cols-5 gap-3 p-5 bg-gradient-to-br from-amber-50 to-orange-100 rounded-3xl border-4 border-amber-400 shadow-inner">
            {Array.from({ length: 10 }).map((_, idx) => {
              const isRed = idx < frameDots;
              const isBlue = idx >= frameDots && idx < frameDots + userFillCount;

              return (
                <div
                  key={idx}
                  className="w-16 h-16 bg-white rounded-2xl border-2 border-amber-200 shadow-sm flex items-center justify-center text-3xl select-none"
                >
                  {isRed ? (
                    <span className="animate-pulse">🔴</span>
                  ) : isBlue ? (
                    <span className="scale-110">🔵</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* 成功状态徽章 */}
          {tenFramePassed && (
            <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl font-black text-xs text-center border border-amber-300">
              🎉 凑十挑战成功！{frameDots} + {userFillCount} = 10，获得 5 颗智慧星！
            </div>
          )}

          {/* 蓝球增减控制器 */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleRemoveBlueDot}
              disabled={userFillCount === 0}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm border hover:bg-slate-200 disabled:opacity-40"
            >
              ➖ 拿走一个 🔵
            </button>
            <button
              type="button"
              onClick={handleAddBlueDot}
              disabled={frameDots + userFillCount >= 10}
              className="px-4 py-2 bg-sky-500 text-candy-blue-on rounded-2xl font-black text-sm shadow-md hover:bg-sky-600 disabled:opacity-40"
            >
              ➕ 放入一个 🔵
            </button>
            <button
              type="button"
              onClick={handleCheckTenFrame}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-candy-orange-on rounded-2xl font-black text-sm shadow-lg hover:scale-105"
            >
              ✨ 验证凑十
            </button>
          </div>
        </div>
      )}

      {/* 模式二：重力平衡天平 (Math Balance) */}
      {activeTab === 'balance' && (
        <div className="bg-white rounded-3xl border-3 border-indigo-200 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800">
                ⚖️ 空间重力平衡天平
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                左盘重量：{leftTotal} ⚖️ 右盘重量：{rightTotal} ({isBalanced ? '✨ 完美平衡' : '继续调整'})
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setRightWeights([]);
                  const randomCount = Math.floor(Math.random() * 2) + 1;
                  const shuffled = [...WEIGHTS].sort(() => Math.random() - 0.5);
                  setLeftWeights(shuffled.slice(0, randomCount));
                }}
                className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-xs font-bold rounded-xl"
              >
                🎲 随机左盘
              </button>
              <button
                type="button"
                onClick={handleClearRight}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
              >
                🔄 清空右盘
              </button>
            </div>
          </div>

          {/* 天平舞台与物理杠杆 */}
          <div className="relative w-full h-72 bg-gradient-to-b from-indigo-50/50 via-slate-50 to-indigo-100/50 rounded-3xl border-4 border-indigo-200 flex flex-col items-center justify-center overflow-hidden p-4">
            {/* 支点底座 */}
            <div className="absolute bottom-6 w-12 h-20 bg-slate-700 rounded-t-lg border-2 border-slate-900 shadow-md" />
            <div className="absolute bottom-24 w-6 h-6 bg-amber-400 rounded-full border-2 border-amber-600 z-20 shadow" />

            {/* 旋转杠杆大梁 (Tilting Beam) */}
            <motion.div
              animate={{ rotate: tiltAngle }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="relative w-96 h-4 bg-amber-700 rounded-full shadow-lg flex items-center justify-between px-2 z-10"
            >
              {/* 左秤盘 */}
              <div className="relative -bottom-24 -left-6 flex flex-col items-center">
                <div className="w-0.5 h-20 bg-slate-400" />
                <div className="w-28 h-8 bg-amber-300 rounded-b-2xl border-2 border-amber-500 shadow flex items-center justify-center gap-1 text-base">
                  {leftWeights.map((w, idx) => (
                    <span key={idx} title={w.name}>{w.emoji}</span>
                  ))}
                </div>
                <span className="text-xs font-black text-slate-600 bg-white/90 px-1.5 rounded-full border mt-1">
                  重: {leftTotal}
                </span>
              </div>

              {/* 右秤盘 */}
              <div className="relative -bottom-24 -right-6 flex flex-col items-center">
                <div className="w-0.5 h-20 bg-slate-400" />
                <div className="w-28 h-8 bg-amber-300 rounded-b-2xl border-2 border-amber-500 shadow flex items-center justify-center gap-1 text-base">
                  {rightWeights.length > 0 ? (
                    rightWeights.map((w, idx) => (
                      <span key={idx} title={w.name}>{w.emoji}</span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">空盘</span>
                  )}
                </div>
                <span className="text-xs font-black text-slate-600 bg-white/90 px-1.5 rounded-full border mt-1">
                  重: {rightTotal}
                </span>
              </div>
            </motion.div>
          </div>

          {/* 砝码选择面板 */}
          <div className="space-y-2 text-center">
            <span className="text-xs font-bold text-slate-500">
              👇 点击向右盘添加砝码，尝试让天平平衡：
            </span>
            <div className="flex items-center justify-center gap-3">
              {WEIGHTS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleAddRightWeight(w)}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                >
                  <span className="text-xl">{w.emoji}</span>
                  <span>{w.name}</span>
                  <span className="bg-indigo-200 text-indigo-900 px-1.5 rounded-full text-xs">
                    +{w.weight}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
