import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { getAudioContext } from '@/lib/audioContext';

interface FossilPart {
  id: string;
  name: string;
  emoji: string;
  discovered: boolean;
  assembled: boolean;
  x: number; // percentage in sand
  y: number;
}

interface DinoSpec {
  id: string;
  name: string;
  type: string;
  period: string;
  diet: string;
  length: string;
  emoji: string;
  roarTone: number; // Hz for roar oscillator
  funFact: string;
  habitat: string;
  parts: FossilPart[];
}

const DINOS: DinoSpec[] = [
  {
    id: 'trex',
    name: '霸王龙 (T-Rex)',
    type: '大型兽脚类',
    period: '白垩纪晚期 (约6800万年前)',
    diet: '肉食性 🥩',
    length: '体长约 12 米，重达 8 吨',
    emoji: '🦖',
    roarTone: 75,
    funFact: '霸王龙的咬合力非常惊人，牙齿像锋利的香蕉一样大！',
    habitat: '北美茂密古森林与河谷湿地',
    parts: [
      { id: 'head', name: '巨大头骨', emoji: '💀', discovered: false, assembled: false, x: 25, y: 30 },
      { id: 'ribs', name: '强壮胸肋骨', emoji: '🦴', discovered: false, assembled: false, x: 50, y: 40 },
      { id: 'legs', name: '粗壮后肢爪', emoji: '🐾', discovered: false, assembled: false, x: 75, y: 55 },
      { id: 'tail', name: '平衡长尾骨', emoji: '🦎', discovered: false, assembled: false, x: 35, y: 70 },
    ],
  },
  {
    id: 'triceratops',
    name: '三角龙 (Triceratops)',
    type: '大型角龙类',
    period: '白垩纪晚期 (约6600万年前)',
    diet: '植食性 🌿',
    length: '体长约 8 米，重达 6 吨',
    emoji: '🦕',
    roarTone: 110,
    funFact: '三角龙长着三只锋利的角和坚固的颈盾，能抵御霸王龙的攻击！',
    habitat: '开阔的针叶灌木平原与河岸',
    parts: [
      { id: 'head', name: '三角颈盾头骨', emoji: '🛡️', discovered: false, assembled: false, x: 30, y: 35 },
      { id: 'ribs', name: '厚实身躯骨', emoji: '🦴', discovered: false, assembled: false, x: 55, y: 45 },
      { id: 'legs', name: '稳固四肢骨', emoji: '🐾', discovered: false, assembled: false, x: 70, y: 65 },
      { id: 'tail', name: '粗短尾骨', emoji: '🦎', discovered: false, assembled: false, x: 40, y: 65 },
    ],
  },
  {
    id: 'pterosaur',
    name: '翼手龙 (Pterosaur)',
    type: '飞行动物/翼龙目',
    period: '白垩纪晚期 (约7000万年前)',
    diet: '肉食性 (捕鱼) 🐟',
    length: '翼展约 9 米，体重仅 20 公斤',
    emoji: '🦅',
    roarTone: 280,
    funFact: '翼手龙拥有超轻的骨骼和皮膜双翼，是天空中的飞行霸主！',
    habitat: '阳光明媚的海滨悬崖与内陆湖泊',
    parts: [
      { id: 'head', name: '尖嘴头冠骨', emoji: '🪶', discovered: false, assembled: false, x: 35, y: 25 },
      { id: 'wings', name: '皮膜翼指骨', emoji: '🦅', discovered: false, assembled: false, x: 65, y: 35 },
      { id: 'body', name: '超轻胸腔骨', emoji: '🦴', discovered: false, assembled: false, x: 45, y: 55 },
      { id: 'claws', name: '抓鱼利爪', emoji: '🐾', discovered: false, assembled: false, x: 60, y: 70 },
    ],
  },
  {
    id: 'stegosaurus',
    name: '剑龙 (Stegosaurus)',
    type: '装甲类恐龙',
    period: '侏罗纪晚期 (约1.5亿年前)',
    diet: '植食性 🌿',
    length: '体长约 9 米，重达 4 吨',
    emoji: '🛡️',
    roarTone: 95,
    funFact: '剑龙背上长着两排巨大的骨板，尾巴末端有 4 根锋利的骨刺用来防卫！',
    habitat: '侏罗纪蕨类森林与冲积平原',
    parts: [
      { id: 'head', name: '小巧头部骨', emoji: '🧠', discovered: false, assembled: false, x: 25, y: 45 },
      { id: 'plates', name: '背部骨质盾板', emoji: '🛡️', discovered: false, assembled: false, x: 50, y: 25 },
      { id: 'body', name: '庞大身躯骨', emoji: '🦴', discovered: false, assembled: false, x: 60, y: 55 },
      { id: 'spikes', name: '尾端防御骨刺', emoji: '⚔️', discovered: false, assembled: false, x: 75, y: 40 },
    ],
  },
  {
    id: 'brachiosaurus',
    name: '腕龙 (Brachiosaurus)',
    type: '巨型蜥脚类',
    period: '侏罗纪晚期 (约1.5亿年前)',
    diet: '植食性 (高树嫩叶) 🌲',
    length: '体长约 26 米，高达 13 米',
    emoji: '🦒',
    roarTone: 60,
    funFact: '腕龙的前腿比后腿还要长，脑袋可以轻松伸到 4 层楼那么高吃树叶！',
    habitat: '温热多雨的高大针叶林带',
    parts: [
      { id: 'neck', name: '修长颈椎骨', emoji: '🦒', discovered: false, assembled: false, x: 30, y: 20 },
      { id: 'ribs', name: '如柱胸肋骨', emoji: '🦴', discovered: false, assembled: false, x: 55, y: 45 },
      { id: 'front-legs', name: '高耸前肢骨', emoji: '🐾', discovered: false, assembled: false, x: 70, y: 65 },
      { id: 'tail', name: '粗大尾椎骨', emoji: '🦎', discovered: false, assembled: false, x: 40, y: 70 },
    ],
  },
  {
    id: 'velociraptor',
    name: '迅猛龙 (Velociraptor)',
    type: '小型奔跑兽脚类',
    period: '白垩纪晚期 (约7500万年前)',
    diet: '肉食性 (团队狩猎) 🥩',
    length: '体长约 2 米，奔跑极快',
    emoji: '⚡',
    roarTone: 320,
    funFact: '迅猛龙奔跑时速可达 40 公里，后爪长着致命的弯镰刀爪！',
    habitat: '干旱沙漠半戈壁与砂岩灌丛',
    parts: [
      { id: 'head', name: '灵巧吻部头骨', emoji: '💀', discovered: false, assembled: false, x: 25, y: 35 },
      { id: 'body', name: '轻盈脊椎骨', emoji: '🦴', discovered: false, assembled: false, x: 50, y: 30 },
      { id: 'sickle-claw', name: '致命大镰刀爪', emoji: '🗡️', discovered: false, assembled: false, x: 65, y: 65 },
      { id: 'tail', name: '刚性平衡尾骨', emoji: '🦎', discovered: false, assembled: false, x: 40, y: 70 },
    ],
  },
];

const FALLBACK_DINO: DinoSpec = DINOS[0] ?? {
  id: 'trex',
  name: '霸王龙',
  type: '大型兽脚类',
  period: '白垩纪晚期',
  diet: '肉食性',
  length: '12 米',
  emoji: '🦖',
  roarTone: 75,
  funFact: '霸王龙的咬合力惊人',
  habitat: '古森林',
  parts: [],
};

export function DinoArchaeology() {
  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  const [selectedDinoIdx, setSelectedDinoIdx] = useState(0);
  const [parts, setParts] = useState<FossilPart[]>([]);
  const [gameState, setGameState] = useState<'excavating' | 'assembling' | 'revived'>('excavating');

  const currentDino = DINOS[selectedDinoIdx] ?? FALLBACK_DINO;

  // WebAudio 模拟恐龙咆哮低频共振
  const playRoarSfx = useCallback((baseHz: number) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(baseHz * 2, now);
      osc.frequency.exponentialRampToValueAtTime(baseHz, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(baseHz * 0.7, now + 1.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.25);
    } catch {
      // Audio context policy fallback
    }
  }, []);

  useEffect(() => {
    const rawParts = currentDino.parts.map((p) => ({
      ...p,
      discovered: false,
      assembled: false,
    }));
    setParts(rawParts);
    setGameState('excavating');
    void speak(`准备发掘${currentDino.name}的古生物化石！轻触沙层中的岩石开始考古吧！`, { lang: 'zh-CN' });
  }, [selectedDinoIdx, currentDino]);

  // 挖掘某个化石碎片
  const handleDigPart = useCallback((partId: string) => {
    sfxTap();
    sfxCorrect();
    triggerHaptic(35);
    celebrateSmall();

    const nextParts = parts.map((p) =>
      p.id === partId ? { ...p, discovered: true } : p
    );
    setParts(nextParts);

    const foundPart = parts.find((p) => p.id === partId);
    if (foundPart) {
      void speak(`发现了${foundPart.name}！`, { lang: 'zh-CN' });
    }

    // 检查是否全部挖出
    const allDiscovered = nextParts.every((p) => p.discovered);
    if (allDiscovered) {
      setTimeout(() => {
        setGameState('assembling');
        sfxWin();
        triggerHaptic([60, 40, 60, 40, 100]);
        celebrateBig();
        void speak(`太棒啦！${currentDino.name}的所有化石骨骼全部出土！现在进入骨架复原拼装台！`, { lang: 'zh-CN' });
      }, 1000);
    }
  }, [parts, currentDino]);

  // 拼装某个化石碎片
  const handleAssemblePart = useCallback((partId: string) => {
    sfxTap();
    sfxCorrect();
    triggerHaptic(45);
    celebrateSmall();

    const nextParts = parts.map((p) =>
      p.id === partId ? { ...p, assembled: true } : p
    );
    setParts(nextParts);

    const part = parts.find((p) => p.id === partId);
    if (part) {
      void speak(`${part.name}安装完成！`, { lang: 'zh-CN' });
    }

    // 检查是否全部拼装
    const allAssembled = nextParts.every((p) => p.assembled);
    if (allAssembled) {
      setTimeout(() => {
        setGameState('revived');
        sfxWin();
        triggerHaptic([60, 40, 60, 40, 100]);
        celebrateBig();
        playRoarSfx(currentDino.roarTone);
        addStars(8);
        addFish(3);
        void speak(`奇迹出现！通过骨骼基因复原，${currentDino.name}成功复活！${currentDino.funFact}`, { lang: 'zh-CN' });
      }, 1000);
    }
  }, [parts, currentDino, addStars, addFish, playRoarSfx]);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const targetPart = parts[idx];
        if (targetPart) {
          e.preventDefault();
          if (gameState === 'excavating' && !targetPart.discovered) {
            handleDigPart(targetPart.id);
          } else if (gameState === 'assembling' && !targetPart.assembled) {
            handleAssemblePart(targetPart.id);
          }
        }
      } else if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
        if (gameState === 'revived') {
          e.preventDefault();
          playRoarSfx(currentDino.roarTone);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        sfxTap();
        setSelectedDinoIdx((i) => (i + 1) % DINOS.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        sfxTap();
        setSelectedDinoIdx((i) => (i - 1 + DINOS.length) % DINOS.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parts, gameState, currentDino.roarTone, handleDigPart, handleAssemblePart, playRoarSfx]);

  return (
    <div className="space-y-6">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-amber-900 font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
          ⌨️ 键盘快捷操作：数字键 1-4 挖掘/拼装化石 · 左右方向键 切换恐龙 · 空格/R 播放咆哮
        </span>
      </div>

      {/* 顶部恐龙馆导览切换 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {DINOS.map((dino, idx) => (
          <button
            key={dino.id}
            type="button"
            onClick={() => {
              sfxTap();
              setSelectedDinoIdx(idx);
            }}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all flex items-center gap-1.5 border-2 shadow-sm ${
              selectedDinoIdx === idx
                ? 'bg-amber-600 text-candy-orange-on border-amber-700 shadow-md scale-105'
                : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <span className="text-xl">{dino.emoji}</span>
            <span>{dino.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* 阶段 1: 考古沙盘挖掘 */}
      {gameState === 'excavating' && (
        <div className="bg-white rounded-3xl border-3 border-amber-300 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span>⛏️ 恐龙化石挖掘地质层</span>
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full">
                  发现进度 {parts.filter((p) => p.discovered).length} / {parts.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                轻触沙土层中的隆起岩石，扫除尘土寻找埋藏的骨骼化石！
              </p>
            </div>
          </div>

          {/* 沙盘地质层 */}
          <div className="relative w-full h-80 bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-600 rounded-3xl border-4 border-amber-400 shadow-inner overflow-hidden p-4">
            <div className="absolute inset-0 bg-[radial-gradient(#b45309_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

            {parts.map((p) => (
              <motion.button
                key={p.id}
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => !p.discovered && handleDigPart(p.id)}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center shadow-lg ${
                  p.discovered
                    ? 'bg-amber-100/95 border-amber-400 text-amber-950 scale-105'
                    : 'bg-amber-800/90 border-amber-900 text-amber-200 hover:bg-amber-700 animate-pulse'
                }`}
              >
                <span className="text-3xl select-none">
                  {p.discovered ? p.emoji : '🪨'}
                </span>
                <span className="text-xs font-black mt-1">
                  {p.discovered ? p.name : '轻触挖掘'}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* 阶段 2: 骨骼化石拼装台 */}
      {gameState === 'assembling' && (
        <div className="bg-white rounded-3xl border-3 border-amber-300 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span>🧩 骨骼化石解剖复原拼装台</span>
                <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full">
                  复原进度 {parts.filter((p) => p.assembled).length} / {parts.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                点击待组装的化石骨骼，将它们精准嵌入解剖槽！
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {parts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => !p.assembled && handleAssemblePart(p.id)}
                className={`p-4 rounded-2xl border-2 font-black text-sm flex flex-col items-center justify-center gap-2 transition-all ${
                  p.assembled
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900 scale-105'
                    : 'bg-amber-50 border-amber-300 text-slate-800 hover:scale-105 shadow-md active:scale-95'
                }`}
              >
                <span className="text-4xl select-none">{p.assembled ? '✅' : p.emoji}</span>
                <span>{p.name}</span>
                <span className="text-xs text-slate-500">
                  {p.assembled ? '已精准复原' : '👉 点击安装'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 阶段 3: 恐龙奇迹复活与科普 */}
      {gameState === 'revived' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-amber-50 via-orange-50 to-emerald-50 rounded-3xl border-4 border-amber-400 p-6 shadow-2xl space-y-4 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-8xl select-none filter drop-shadow-lg"
          >
            {currentDino.emoji}
          </motion.div>

          <div className="space-y-1">
            <div className="inline-block px-3 py-1 bg-amber-600 text-candy-orange-on rounded-full text-xs font-black shadow-sm">
              🦖 史前恐龙奇迹复活
            </div>
            <h3 className="text-3xl font-black text-slate-800">
              {currentDino.name}
            </h3>
            <p className="text-sm text-slate-700 max-w-md mx-auto font-medium">
              {currentDino.funFact}
            </p>
            <p className="text-xs text-amber-900 font-bold">
              🏞️ 原始栖息地：{currentDino.habitat}
            </p>
          </div>

          {/* 科学属性卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg mx-auto pt-2">
            <div className="bg-white/90 p-2.5 rounded-2xl border border-amber-200 text-xs shadow-sm">
              <span className="text-slate-400 font-bold block text-xs">分类</span>
              <span className="font-black text-slate-800">{currentDino.type}</span>
            </div>
            <div className="bg-white/90 p-2.5 rounded-2xl border border-amber-200 text-xs shadow-sm">
              <span className="text-slate-400 font-bold block text-xs">食性</span>
              <span className="font-black text-slate-800">{currentDino.diet}</span>
            </div>
            <div className="bg-white/90 p-2.5 rounded-2xl border border-amber-200 text-xs shadow-sm">
              <span className="text-slate-400 font-bold block text-xs">生存年代</span>
              <span className="font-black text-slate-800">{currentDino.period.split(' ')[0]}</span>
            </div>
            <div className="bg-white/90 p-2.5 rounded-2xl border border-amber-200 text-xs shadow-sm">
              <span className="text-slate-400 font-bold block text-xs">体型</span>
              <span className="font-black text-slate-800">{currentDino.length.split('，')[0]}</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => playRoarSfx(currentDino.roarTone)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-candy-orange-on font-black text-xs rounded-2xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <span>🔊</span>
              <span>聆听恐龙咆哮声</span>
            </button>
            <span className="px-4 py-2 bg-emerald-600 text-candy-green-on font-black text-xs rounded-2xl shadow-md flex items-center gap-1">
              <span>⭐</span>
              <span>+8 探索星</span>
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
