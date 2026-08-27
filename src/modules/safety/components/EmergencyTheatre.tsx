/**
 * 🚨 宝宝巴士级生活安全与应急避险剧场 (Emergency & Safety Theatre Pro - Commercial Grade)
 * ---------------------------------------------------------------------------------------
 * 1. 四大情景避险演练（10 大高发生活与突发事故场景）：
 *    - 🏠 居家防意外 (湿手插座 / 滚烫热水 / 阳台防坠 / 药品干燥剂)
 *    - 🚦 出行防走失 (儿童安全座椅 / 陌生人防拐 / 荷式开门防盲区)
 *    - 🌊 户外防溺水 (野外防溺水 / 雷雨防雷击)
 *    - 🚨 灾害大逃生 (地震伏地护头 / 火灾湿毛巾低姿)
 * 2. 🎵 WebAudio 真实安全应急音浪与预警蜂鸣声合成器；
 * 3. 交互式正误决策对比与情境动效；
 * 4. 真人安全口诀朗读与安全小卫士徽章成就。
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';
import { getAudioContext } from '@/lib/audioContext';

export type SafetyCategory = 'home' | 'traffic' | 'outdoor' | 'disaster';

export interface Scenario {
  id: string;
  category: SafetyCategory;
  title: string;
  emoji: string;
  question: string;
  safeChoice: string;
  safeDetail: string;
  safeEmoji: string;
  dangerChoice: string;
  dangerDetail: string;
  dangerEmoji: string;
  rhyme: string;
}

export const SCENARIOS: Scenario[] = [
  // 1. 居家安全
  {
    id: 'home_electric',
    category: 'home',
    title: '湿手碰插座',
    emoji: '🔌',
    question: '洗完手后手上还有水，想去插电视插头，应该怎么做？',
    safeChoice: '把手擦干，请爸爸妈妈帮忙插插头',
    safeDetail: '水会导电！一定要擦干小手，最好让大人帮忙！',
    safeEmoji: '🧼',
    dangerChoice: '湿着手直接用力去插插头',
    dangerDetail: '非常危险！湿手碰电极易发生触电事故！',
    dangerEmoji: '⚡',
    rhyme: '插座电门危险大，湿手千万不要碰！',
  },
  {
    id: 'home_hot',
    category: 'home',
    title: '防烫伤小常识',
    emoji: '♨️',
    question: '餐桌上有一碗刚盛出来的滚烫热汤，应该怎么做？',
    safeChoice: '不靠近桌边，等热汤凉一凉让大人端',
    safeDetail: '滚烫的热汤极易烫伤娇嫩的皮肤，要离远一点！',
    safeEmoji: '🥣',
    dangerChoice: '自己伸手去够汤碗边玩边端',
    dangerDetail: '千万不要够！一旦打翻容易大面积烫伤！',
    dangerEmoji: '🔥',
    rhyme: '热汤开水滚滚烫，离得远远不靠近！',
  },
  {
    id: 'home_window',
    category: 'home',
    title: '阳台窗台防攀爬',
    emoji: '🪟',
    question: '在阳台或窗边看到小鸟飞过，想站到椅子上看小鸟，怎么做？',
    safeChoice: '站在窗台安全线以内，不踩板凳不探头',
    safeDetail: '窗户和阳台边沿不能攀爬，容易失去重心发生坠落！',
    safeEmoji: '🛡️',
    dangerChoice: '搬来小板凳踩上去把半个身子探出窗外',
    dangerDetail: '极度危险！高空坠落会造成严重生命危险！',
    dangerEmoji: '⚠️',
    rhyme: '窗台阳台不攀爬，远离边沿最安全！',
  },
  {
    id: 'home_medicine',
    category: 'home',
    title: '药品干燥剂不误食',
    emoji: '💊',
    question: '零食包装袋里有一包写着“不可食用”的小白包，怎么做？',
    safeChoice: '这是食品干燥剂，扔进垃圾桶绝对不吃',
    safeDetail: '干燥剂含有化学成分，千万不能放到嘴里或水瓶里！',
    safeEmoji: '🗑️',
    dangerChoice: '撕开小包装放进嘴里尝一尝味道',
    dangerDetail: '非常危险！误食干燥剂会灼伤食道和胃部！',
    dangerEmoji: '🚫',
    rhyme: '白色药片干燥剂，不是糖果不能尝！',
  },

  // 2. 出行防走失
  {
    id: 'traffic_seat',
    category: 'traffic',
    title: '乘车安全守则',
    emoji: '🚗',
    question: '爸爸开车带宝贝出门，上车后第一件事应该做什么？',
    safeChoice: '坐进儿童安全座椅，系好安全带',
    safeDetail: '安全座椅和安全带是保护宝贝的最强铠甲！',
    safeEmoji: '💺',
    dangerChoice: '在后排站着跳来跳去，把头伸出车窗',
    dangerDetail: '紧急刹车时会摔倒，伸出窗外更极度危险！',
    dangerEmoji: '⚠️',
    rhyme: '乘车坐好安全椅，安全带系牢不乱动！',
  },
  {
    id: 'traffic_stranger',
    category: 'traffic',
    title: '不跟陌生人走',
    emoji: '🚶‍♂️',
    question: '放学时有陌生人拿玩具说带你去找妈妈，应该怎么做？',
    safeChoice: '礼貌拒绝并后退，马上告诉老师或保安',
    safeDetail: '陌生人的礼物不能要，绝不跟不认识的人离开！',
    safeEmoji: '👮',
    dangerChoice: '开心地接过玩具，跟着他离开学校',
    dangerDetail: '非常危险！绝对不能跟陌生人走！',
    dangerEmoji: '❌',
    rhyme: '陌生人给糖不要，不跟陌生叔叔走！',
  },
  {
    id: 'traffic_door',
    category: 'traffic',
    title: '下车观察防开门杀',
    emoji: '🚪',
    question: '小汽车靠边停稳后，准备打开车门下车，应该怎么做？',
    safeChoice: '先看后视镜并用远端手开门，确认没有后方来车',
    safeDetail: '“荷式开门法”能强迫身体转头观察后方电动车与行人！',
    safeEmoji: '👀',
    dangerChoice: '车刚停稳就不看后面，猛地用力推开车门',
    dangerDetail: '容易撞倒后方飞驰的自行车或电动车造成伤害！',
    dangerEmoji: '🚲',
    rhyme: '推开车门先回头，后方没车再下车！',
  },

  // 3. 户外与防溺水
  {
    id: 'outdoor_water',
    category: 'outdoor',
    title: '防溺水六不准',
    emoji: '🏊‍♂️',
    question: '夏天天气炎热，小伙伴叫你去野外池塘捉鱼游泳，怎么做？',
    safeChoice: '坚决不去！要在大人陪同下去正规游泳馆',
    safeDetail: '野外水域深浅未知，水草淤泥非常危险！',
    safeEmoji: '🏊‍♀️',
    dangerChoice: '私自和小伙伴偷偷下水游泳',
    dangerDetail: '严禁野泳！私自下水极易发生溺水意外！',
    dangerEmoji: '🌊',
    rhyme: '野外水深藏危险，私自下水绝不行！',
  },
  {
    id: 'outdoor_thunder',
    category: 'outdoor',
    title: '雷雨天气防雷击',
    emoji: '⛈️',
    question: '在公园玩耍时突然电闪雷鸣下起暴雨，应该去哪里避雨？',
    safeChoice: '快步走进附近结实的建筑物或室内避雨',
    safeDetail: '高大的大树容易引来雷击，绝不能在大树下躲雨！',
    safeEmoji: '🏢',
    dangerChoice: '跑去最高最大的大树下紧贴着树干躲雨',
    dangerDetail: '极度危险！雷电最容易击中孤立突出的高大树木！',
    dangerEmoji: '⚡',
    rhyme: '雷声隆隆大雨下，远离大树进屋里！',
  },

  // 4. 灾害大逃生
  {
    id: 'disaster_earthquake',
    category: 'disaster',
    title: '地震避险三步法',
    emoji: '💥',
    question: '突然发生地震、房间晃动时，应该如何紧急避险？',
    safeChoice: '伏地、护头、钻入结实桌下抓牢桌腿',
    safeDetail: '保护头部最关键！寻找坚固遮挡物伏地避震！',
    safeEmoji: '🛡️',
    dangerChoice: '惊慌失措乘坐电梯或从阳台往下跳',
    dangerDetail: '地震时电梯随时断电受困，绝不能乘电梯！',
    dangerEmoji: '🏃‍♂️',
    rhyme: '地震来时不慌张，蹲下护头钻桌下！',
  },
  {
    id: 'disaster_fire',
    category: 'disaster',
    title: '火灾逃生小英雄',
    emoji: '🔥',
    question: '遇到火灾浓烟滚滚时，应该怎样正确逃生？',
    safeChoice: '用湿毛巾捂住口鼻，弯腰低姿走安全通道',
    safeDetail: '浓烟向上升，弯腰低姿爬行能呼吸更多新鲜空气！',
    safeEmoji: '🧣',
    dangerChoice: '站直大声呼喊，乘坐电梯下楼',
    dangerDetail: '吸入有毒浓烟会窒息，火灾切勿使用电梯！',
    dangerEmoji: '🛗',
    rhyme: '湿毛巾捂口鼻，弯腰低姿快快走！',
  },
];

export const CATEGORIES: { id: SafetyCategory; label: string; emoji: string }[] = [
  { id: 'home', label: '🏠 居家防意外', emoji: '🏠' },
  { id: 'traffic', label: '🚦 出行防走失', emoji: '🚦' },
  { id: 'outdoor', label: '🌊 户外防溺水', emoji: '🌊' },
  { id: 'disaster', label: '🚨 灾害大逃生', emoji: '🚨' },
];

const FALLBACK_SCENARIO: Scenario = SCENARIOS[0] ?? {
  id: 'home_electric',
  category: 'home',
  title: '湿手碰插座',
  emoji: '🔌',
  question: '洗完手后手上还有水，想去插电视插头，应该怎么做？',
  safeChoice: '把手擦干，请爸爸妈妈帮忙插插头',
  safeDetail: '水会导电！一定要擦干小手，最好让大人帮忙！',
  safeEmoji: '🧼',
  dangerChoice: '湿着手直接用力去插插头',
  dangerDetail: '非常危险！湿手碰电极易发生触电事故！',
  dangerEmoji: '⚡',
  rhyme: '插座电门危险大，湿手千万不要碰！',
};

export function EmergencyTheatre() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [activeCat, setActiveCat] = useState<SafetyCategory>('home');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<'safe' | 'danger' | null>(null);
  const [streak, setStreak] = useState(0);

  const filteredScenarios = useMemo(() => {
    return SCENARIOS.filter((s) => s.category === activeCat);
  }, [activeCat]);

  const currentScenario = useMemo(() => {
    return filteredScenarios[scenarioIdx % filteredScenarios.length] ?? filteredScenarios[0] ?? FALLBACK_SCENARIO;
  }, [filteredScenarios, scenarioIdx]);

  // WebAudio 应急安全蜂鸣/警报音浪合成
  const playSafetyAlarmSfx = (isSafe: boolean) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      if (isSafe) {
        // 安全通关清新双音
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // 危险警报两段式尖锐蜂鸣
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(400, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // fallback
    }
  };

  const handleChoice = useCallback((choice: 'safe' | 'danger') => {
    if (selectedChoice !== null) return;
    setSelectedChoice(choice);
    playSafetyAlarmSfx(choice === 'safe');

    if (choice === 'safe') {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      addStars(1);
      practice('safety:emergency-theater', true, 2, 1);

      if (nextStreak >= 3) {
        sfxWin();
        celebrateBig();
      } else {
        sfxCorrect();
        celebrateSmall();
      }

      void speak(`太棒啦！回答正确！${currentScenario.safeDetail} 安全口诀记心间：${currentScenario.rhyme}`, { lang: 'zh-CN' });
    } else {
      setStreak(0);
      sfxWrong();
      void speak(`这样做很危险哦！${currentScenario.dangerDetail} 正确做法是：${currentScenario.safeChoice}。`, { lang: 'zh-CN' });
    }
  }, [selectedChoice, streak, currentScenario, addStars, practice]);

  const handleNext = () => {
    sfxTap();
    setSelectedChoice(null);
    setScenarioIdx((i) => (i + 1) % filteredScenarios.length);
  };

  const handleReciteRhyme = () => {
    sfxTap();
    playSafetyAlarmSfx(true);
    void speak(`安全小口诀：${currentScenario.rhyme}`, { lang: 'zh-CN' });
  };

  return (
    <div className="space-y-4">
      {/* 顶部四大安全分类切换 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSel = activeCat === cat.id;
            const count = SCENARIOS.filter((s) => s.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  sfxTap();
                  setActiveCat(cat.id);
                  setScenarioIdx(0);
                  setSelectedChoice(null);
                }}
                className={`py-2 px-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1.5 shadow-sm ${
                  isSel
                    ? 'bg-rose-500 text-white border-rose-600 shadow-md scale-105'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label.slice(2)} ({count})</span>
              </button>
            );
          })}
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {/* 主情境剧场舞台 */}
      <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 rounded-3xl border-3 border-rose-300 p-5 shadow-sm space-y-4 text-center">
        {/* 场景标题与进度指示 */}
        <div className="flex items-center justify-between bg-white/90 backdrop-blur rounded-2xl p-3.5 border border-rose-100 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{currentScenario.emoji}</span>
            <div className="text-left">
              <h3 className="text-base font-black text-slate-800">
                {currentScenario.title}
              </h3>
              <span className="text-xs font-bold text-rose-600">
                演练关卡：第 {scenarioIdx + 1} / {filteredScenarios.length} 幕
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReciteRhyme}
            className="py-1.5 px-3 rounded-xl bg-rose-500 text-white text-xs font-black shadow hover:bg-rose-600 active:scale-95 flex items-center gap-1"
          >
            <span>📢</span>
            <span>读安全口诀</span>
          </button>
        </div>

        {/* 核心情景问题 */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm space-y-3">
          <p className="text-base font-black text-slate-800 leading-relaxed max-w-xl mx-auto">
            ❓ {currentScenario.question}
          </p>

          {/* 正误双向决策卡片对比 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* 安全选项 A */}
            <motion.button
              type="button"
              whileHover={{ scale: selectedChoice === null ? 1.02 : 1 }}
              whileTap={{ scale: selectedChoice === null ? 0.98 : 1 }}
              disabled={selectedChoice !== null}
              onClick={() => handleChoice('safe')}
              className={`p-4 rounded-2xl border-2 text-left transition-all shadow-sm flex items-start gap-3 ${
                selectedChoice === 'safe'
                  ? 'bg-emerald-500 text-white border-emerald-600 ring-4 ring-emerald-200'
                  : selectedChoice === 'danger'
                    ? 'bg-white/80 border-slate-200 opacity-60'
                    : 'bg-white border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/40'
              }`}
            >
              <span className="text-3xl">{currentScenario.safeEmoji}</span>
              <div>
                <div className={`text-sm font-black ${selectedChoice === 'safe' ? 'text-white' : 'text-slate-800'}`}>
                  ✅ {currentScenario.safeChoice}
                </div>
                {selectedChoice === 'safe' && (
                  <div className="text-xs font-bold text-emerald-100 mt-1">
                    {currentScenario.safeDetail}
                  </div>
                )}
              </div>
            </motion.button>

            {/* 危险选项 B */}
            <motion.button
              type="button"
              whileHover={{ scale: selectedChoice === null ? 1.02 : 1 }}
              whileTap={{ scale: selectedChoice === null ? 0.98 : 1 }}
              disabled={selectedChoice !== null}
              onClick={() => handleChoice('danger')}
              className={`p-4 rounded-2xl border-2 text-left transition-all shadow-sm flex items-start gap-3 ${
                selectedChoice === 'danger'
                  ? 'bg-rose-500 text-white border-rose-600 ring-4 ring-rose-200'
                  : selectedChoice === 'safe'
                    ? 'bg-white/80 border-slate-200 opacity-60'
                    : 'bg-white border-rose-200 hover:border-rose-500 hover:bg-rose-50/40'
              }`}
            >
              <span className="text-3xl">{currentScenario.dangerEmoji}</span>
              <div>
                <div className={`text-sm font-black ${selectedChoice === 'danger' ? 'text-white' : 'text-slate-800'}`}>
                  ❌ {currentScenario.dangerChoice}
                </div>
                {selectedChoice === 'danger' && (
                  <div className="text-xs font-bold text-rose-100 mt-1">
                    {currentScenario.dangerDetail}
                  </div>
                )}
              </div>
            </motion.button>
          </div>
        </div>

        {/* 决策后的安全小口诀与下一题 */}
        <AnimatePresence>
          {selectedChoice !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white/95 rounded-2xl p-4 border border-rose-200 shadow space-y-3 text-center"
            >
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 inline-block max-w-lg">
                <span className="text-sm font-black text-amber-900">
                  📜 牢记口诀：{currentScenario.rhyme}
                </span>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-black shadow hover:opacity-95 active:scale-95"
                >
                  演练下一幕场景 ➔
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
