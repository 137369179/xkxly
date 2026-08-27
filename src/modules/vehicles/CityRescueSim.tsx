/**
 * 🚒 宝宝巴士/叫叫少儿级「城市应急交通救援与职业大冒险」 (City Rescue Sim Pro - Commercial Grade)
 * -------------------------------------------------------------------------------------------------
 * 1. 🚒 消防灭火：警笛出警 ➔ 伸缩云梯高空抱猫 ➔ 物理水枪对准 3 处窗口火源喷水扑灭
 * 2. 🚑 急救出诊：心电监护 ➔ 听诊器心跳 ➔ 额头冰敷退热贴与清创爱心创口贴
 * 3. 🚓 特警探案：警车警灯 ➔ 超级放大镜现场搜寻 3 处微观脚印线索 ➔ 物归原主金牌小卫士
 * 4. 🚜 救援工程车：液压机械臂粉碎清理 3 处巨型落石 ➔ 压路机压平沥青 ➔ 绘制斑马线畅通救援
 * 5. 🚁 搜救直升机：双旋翼起飞加速 ➔ 强光探照灯穿透浓雾 ➔ 绞盘放下救生吊篮营救探险家
 * 6. WebAudio 拟真警笛扫频合成、双语特种载具百科、连击 Streak 体系与金牌勋章成就
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWin } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';
import { getAudioContext } from '@/lib/audioContext';

export type RescueMissionType = 'fire' | 'ambulance' | 'police' | 'builder' | 'helicopter';

interface InteractiveTarget {
  id: string;
  name: string;
  emoji: string;
  solvedEmoji: string;
  hint: string;
  x: number; // percentage
  y: number; // percentage
}

interface RescueStep {
  stepIndex: number;
  stepName: string;
  emoji: string;
  instruction: string;
  actionButtonText: string;
  feedbackText: string;
  targets: InteractiveTarget[];
}

interface RescueMission {
  id: RescueMissionType;
  titleZh: string;
  titleEn: string;
  vehicleEmoji: string;
  vehicleName: string;
  sirenFreqs: [number, number]; // [minHz, maxHz]
  sirenType: OscillatorType;
  heroJob: string;
  heroEmoji: string;
  themeColor: string;
  bgGradient: string;
  steps: RescueStep[];
  successStory: string;
}

const MISSIONS: RescueMission[] = [
  {
    id: 'fire',
    titleZh: '消防灭火与高空救援',
    titleEn: 'Fire Rescue Squad',
    vehicleEmoji: '🚒',
    vehicleName: '重型水罐云梯消防车 (Fire Engine)',
    sirenFreqs: [600, 950],
    sirenType: 'sawtooth',
    heroJob: '英勇消防员 (Firefighter)',
    heroEmoji: '👨‍🚒',
    themeColor: 'border-red-400 bg-red-50 text-red-900',
    bgGradient: 'from-red-100 via-orange-50 to-amber-50',
    steps: [
      {
        stepIndex: 1,
        stepName: '火速出警',
        emoji: '🚨',
        instruction: '居民楼二楼阳台冒起浓烟！点击路障车辆疏导交通，全速开往火场！',
        actionButtonText: '🚨 拉响警笛出发',
        feedbackText: '警笛呼啸！所有车辆主动靠边让行，消防车飞速赶往火灾现场！',
        targets: [
          { id: 'car-1', name: '黄色小轿车', emoji: '🚗', solvedEmoji: '🟢', hint: '点击让行', x: 25, y: 50 },
          { id: 'car-2', name: '蓝色大卡车', emoji: '🚙', solvedEmoji: '🟢', hint: '点击让行', x: 50, y: 50 },
          { id: 'car-3', name: '公共汽车', emoji: '🚌', solvedEmoji: '🟢', hint: '点击让行', x: 75, y: 50 },
        ],
      },
      {
        stepIndex: 2,
        stepName: '高空营救',
        emoji: '🪜',
        instruction: '小猫咪被困在三楼窗台吓得喵喵叫！点击升起高空伸缩云梯将小猫抱下！',
        actionButtonText: '🪜 升起伸缩云梯',
        feedbackText: '云梯平稳升起，消防员叔叔一把抱住了小猫咪！',
        targets: [
          { id: 'ladder-base', name: '云梯液压基座', emoji: '🏗️', solvedEmoji: '✨', hint: '锁定支撑架', x: 30, y: 65 },
          { id: 'ladder-ext', name: '伸缩梯节', emoji: '🪜', solvedEmoji: '🆙', hint: '升起云梯', x: 50, y: 40 },
          { id: 'cat', name: '被困小猫', emoji: '🐱', solvedEmoji: '💖', hint: '抱入怀中', x: 70, y: 20 },
        ],
      },
      {
        stepIndex: 3,
        stepName: '精准灭火',
        emoji: '💦',
        instruction: '点击阳台 3 处熊熊燃烧的火源窗口，启动高压水炮彻底扑灭大火！',
        actionButtonText: '💦 喷射高压水柱',
        feedbackText: '水花漫天！大火被彻底扑灭，现场安全啦！',
        targets: [
          { id: 'fire-1', name: '左侧窗户火源', emoji: '🔥', solvedEmoji: '💨', hint: '对准喷水', x: 25, y: 35 },
          { id: 'fire-2', name: '阳台中央火苗', emoji: '🔥', solvedEmoji: '💨', hint: '对准喷水', x: 50, y: 25 },
          { id: 'fire-3', name: '右侧屋檐火舌', emoji: '🔥', solvedEmoji: '💨', hint: '对准喷水', x: 75, y: 35 },
        ],
      },
    ],
    successStory: '太棒啦！大火被英勇扑灭，小猫咪也毫发无损地回到了小主人怀抱！获得消防特级英雄勋章！',
  },
  {
    id: 'ambulance',
    titleZh: '急救中心出诊医疗',
    titleEn: 'Ambulance Emergency',
    vehicleEmoji: '🚑',
    vehicleName: '重症监护救护车 (Ambulance)',
    sirenFreqs: [500, 800],
    sirenType: 'sine',
    heroJob: '仁心急救医生 (Doctor & Paramedic)',
    heroEmoji: '👩‍⚕️',
    themeColor: 'border-rose-400 bg-rose-50 text-rose-900',
    bgGradient: 'from-rose-100 via-pink-50 to-emerald-50',
    steps: [
      {
        stepIndex: 1,
        stepName: '紧急出诊',
        emoji: '🏥',
        instruction: '小兔幼儿园有小朋友发高烧肚子疼，点击开启急救通道护送医生到达！',
        actionButtonText: '🚑 救护车紧急出发',
        feedbackText: '救护车平稳快速到达幼儿园，急救箱准备就绪！',
        targets: [
          { id: 'siren', name: '急救警灯', emoji: '🚨', solvedEmoji: '⚡', hint: '开启警灯', x: 30, y: 40 },
          { id: 'door', name: '急救舱门', emoji: '🚪', solvedEmoji: '🔓', hint: '打开舱门', x: 50, y: 40 },
          { id: 'kit', name: '急救医疗箱', emoji: '🧰', solvedEmoji: '💊', hint: '取出药箱', x: 70, y: 40 },
        ],
      },
      {
        stepIndex: 2,
        stepName: '体温诊断',
        emoji: '🌡️',
        instruction: '拿出电子体温计和听诊器，点击检查额头体温、听取心跳与脉搏！',
        actionButtonText: '🌡️ 测量体温与心率',
        feedbackText: '体温 38.8 度，心跳平稳有力，需要立即贴退热贴降温！',
        targets: [
          { id: 'forehead', name: '额头测温', emoji: '🌡️', solvedEmoji: '📉', hint: '测体温', x: 50, y: 25 },
          { id: 'chest', name: '听诊器听心跳', emoji: '🩺', solvedEmoji: '💓', hint: '听心音', x: 50, y: 50 },
          { id: 'pulse', name: '手腕测脉搏', emoji: '⏱️', solvedEmoji: '✅', hint: '测脉搏', x: 70, y: 65 },
        ],
      },
      {
        stepIndex: 3,
        stepName: '清创贴敷',
        emoji: '🩹',
        instruction: '点击贴上额头清凉退热贴，涂抹止痛药膏并贴上萌萌爱心创口贴！',
        actionButtonText: '🩹 贴退热贴与包扎',
        feedbackText: '降温成功！小兔子的烧退啦，正开心地吃苹果呢！',
        targets: [
          { id: 'cool-pad', name: '清凉退热贴', emoji: '🧊', solvedEmoji: '❄️', hint: '额头冰敷', x: 50, y: 25 },
          { id: 'cream', name: '舒缓药膏', emoji: '🧴', solvedEmoji: '✨', hint: '涂抹药膏', x: 35, y: 55 },
          { id: 'band-aid', name: '爱心创口贴', emoji: '🩹', solvedEmoji: '💖', hint: '贴创口贴', x: 65, y: 55 },
        ],
      },
    ],
    successStory: '急救大成功！经过医生的细心呵护，小兔子恢复了健康与活力，获得仁心小医生勋章！',
  },
  {
    id: 'police',
    titleZh: '特警巡逻侦探破案',
    titleEn: 'Police Patrol & Detective',
    vehicleEmoji: '🚓',
    vehicleName: '特警装甲巡逻车 (Police Patrol Car)',
    sirenFreqs: [700, 1100],
    sirenType: 'triangle',
    heroJob: '正义人民警察 (Police Officer)',
    heroEmoji: '👮',
    themeColor: 'border-blue-400 bg-blue-50 text-blue-900',
    bgGradient: 'from-blue-100 via-indigo-50 to-sky-50',
    steps: [
      {
        stepIndex: 1,
        stepName: '街区巡逻',
        emoji: '🚔',
        instruction: '小熊最喜欢的金色蜂蜜罐在中央公园不见了！点击设立现场警戒线！',
        actionButtonText: '🚔 开启警车巡逻',
        feedbackText: '警车到达公园，设立好安全保护警戒线，准备勘察现场！',
        targets: [
          { id: 'cone-1', name: '警示路锥', emoji: '🚧', solvedEmoji: '🛡️', hint: '设立警戒', x: 25, y: 50 },
          { id: 'tape', name: '安全警戒带', emoji: '🚸', solvedEmoji: '🔒', hint: '封锁现场', x: 50, y: 50 },
          { id: 'badge', name: '特警胸章', emoji: '⭐', solvedEmoji: '🎖️', hint: '出示证件', x: 75, y: 50 },
        ],
      },
      {
        stepIndex: 2,
        stepName: '搜寻线索',
        emoji: '🔍',
        instruction: '拿出超级放大镜，在花丛和长椅旁点击发现调皮小松鼠留下的 3 处微观线索！',
        actionButtonText: '🔍 放大镜搜寻脚印',
        feedbackText: '发现线索！小松鼠的梅花脚印一路延伸到了大橡树上！',
        targets: [
          { id: 'footprint', name: '草地小脚印', emoji: '🐾', solvedEmoji: '👣', hint: '提取脚印', x: 30, y: 65 },
          { id: 'honey-drop', name: '甜甜蜂蜜滴', emoji: '🍯', solvedEmoji: '✨', hint: '收集气味', x: 55, y: 40 },
          { id: 'pinecone', name: '遗落的松果', emoji: '🌰', solvedEmoji: '🐿️', hint: '比对物证', x: 75, y: 55 },
        ],
      },
      {
        stepIndex: 3,
        stepName: '物归原主',
        emoji: '🧸',
        instruction: '小松鼠认识到了错误并归还了蜂蜜罐！点击将蜂蜜罐交还给小熊！',
        actionButtonText: '🧸 蜂蜜罐物归原主',
        feedbackText: '物归原主！小熊和小松鼠握手成为了好朋友，城市恢复了和平与欢笑！',
        targets: [
          { id: 'honey-jar', name: '金色蜂蜜罐', emoji: '🍯', solvedEmoji: '👑', hint: '擦拭干净', x: 30, y: 40 },
          { id: 'handshake', name: '友好握手', emoji: '🤝', solvedEmoji: '🌈', hint: '握手言和', x: 50, y: 40 },
          { id: 'medal', name: '金牌小卫士', emoji: '🏅', solvedEmoji: '🌟', hint: '颁发荣誉', x: 70, y: 40 },
        ],
      },
    ],
    successStory: '侦探破案大功告成！正义特警小分队成功化解矛盾找回失物，获得神勇小侦探勋章！',
  },
  {
    id: 'builder',
    titleZh: '工程机械抢险抢通',
    titleEn: 'Engineering Heavy Squad',
    vehicleEmoji: '🚜',
    vehicleName: '履带式多功能工程挖掘机 (Excavator)',
    sirenFreqs: [300, 500],
    sirenType: 'sawtooth',
    heroJob: '金牌工程机械师 (Engineer & Operator)',
    heroEmoji: '👷',
    themeColor: 'border-amber-400 bg-amber-50 text-amber-900',
    bgGradient: 'from-amber-100 via-yellow-50 to-orange-50',
    steps: [
      {
        stepIndex: 1,
        stepName: '清理落石',
        emoji: '🪨',
        instruction: '大雨导致山体滑坡落石阻断了公路！点击操控挖掘机巨爪粉碎 3 处挡路巨石！',
        actionButtonText: '🚜 挖掘机清理巨石',
        feedbackText: '巨爪挥舞，碎石全部装入自卸翻斗车运走！',
        targets: [
          { id: 'rock-1', name: '左侧花岗岩', emoji: '🪨', solvedEmoji: '💥', hint: '粉碎落石', x: 25, y: 50 },
          { id: 'rock-2', name: '中央大巨石', emoji: '🪨', solvedEmoji: '💥', hint: '粉碎落石', x: 50, y: 35 },
          { id: 'rock-3', name: '右侧塌方土', emoji: '⛰️', solvedEmoji: '💥', hint: '清理泥土', x: 75, y: 50 },
        ],
      },
      {
        stepIndex: 2,
        stepName: '压平路面',
        emoji: '🛣️',
        instruction: '碎石清理完毕，点击启动重型压路机，将高温沥青路面压得平整光滑！',
        actionButtonText: '🚜 压路机压实沥青',
        feedbackText: '压路机轰鸣！路面变得像镜子一样平整坚固！',
        targets: [
          { id: 'asphalt-1', name: '左侧沥青层', emoji: '⬛', solvedEmoji: '✨', hint: '压平路面', x: 30, y: 50 },
          { id: 'asphalt-2', name: '中央沥青层', emoji: '⬛', solvedEmoji: '✨', hint: '压平路面', x: 50, y: 50 },
          { id: 'asphalt-3', name: '右侧沥青层', emoji: '⬛', solvedEmoji: '✨', hint: '压平路面', x: 70, y: 50 },
        ],
      },
      {
        stepIndex: 3,
        stepName: '绘制斑马线',
        emoji: '🏁',
        instruction: '点击启动划线车，为行人绘制安全醒目的白色斑马线！',
        actionButtonText: '🏁 划设斑马线与通车',
        feedbackText: '抢险生命通道全面贯通！救援车队顺利通过！',
        targets: [
          { id: 'stripe-1', name: '第一道白线', emoji: '➖', solvedEmoji: '🤍', hint: '喷涂标线', x: 30, y: 50 },
          { id: 'stripe-2', name: '第二道白线', emoji: '➖', solvedEmoji: '🤍', hint: '喷涂标线', x: 50, y: 50 },
          { id: 'stripe-3', name: '第三道白线', emoji: '➖', solvedEmoji: '🤍', hint: '喷涂标线', x: 70, y: 50 },
        ],
      },
    ],
    successStory: '太神勇啦！工程抢险小队迅速打通生命通道，获得鲁班工程小先锋勋章！',
  },
  {
    id: 'helicopter',
    titleZh: '海空立体搜救巡航',
    titleEn: 'Air-Sea Rescue Helicopter',
    vehicleEmoji: '🚁',
    vehicleName: '双发海空搜救直升机 (Search & Rescue Helicopter)',
    sirenFreqs: [400, 750],
    sirenType: 'square',
    heroJob: '特级搜救飞行员 (Search & Rescue Pilot)',
    heroEmoji: '👨‍✈️',
    themeColor: 'border-cyan-400 bg-cyan-50 text-cyan-900',
    bgGradient: 'from-cyan-100 via-sky-50 to-blue-50',
    steps: [
      {
        stepIndex: 1,
        stepName: '旋翼起飞',
        emoji: '🛫',
        instruction: '狂风暴雨中探险队在迷雾深谷迷路！点击启动涡轮引擎，旋转螺旋桨升空！',
        actionButtonText: '🚁 启动旋翼全速升空',
        feedbackText: '双旋翼高速飞旋！直升机逆风冲上蓝天，开启空中搜救雷达！',
        targets: [
          { id: 'rotor-main', name: '主旋翼桨叶', emoji: '🌀', solvedEmoji: '🌪️', hint: '加速旋转', x: 50, y: 20 },
          { id: 'engine', name: '涡轮喷气引擎', emoji: '⚙️', solvedEmoji: '🔥', hint: '点火启动', x: 30, y: 50 },
          { id: 'radar', name: '搜救雷达天线', emoji: '📡', solvedEmoji: '🌐', hint: '开启雷达', x: 70, y: 50 },
        ],
      },
      {
        stepIndex: 2,
        stepName: '探照搜寻',
        emoji: '🔦',
        instruction: '深谷大雾弥漫！点击移动大功率强光探照灯，发现山谷里的遇险信号！',
        actionButtonText: '🔦 探照灯穿透浓雾',
        feedbackText: '发现目标！探险队员正在岩石上挥舞橙色求救旗帜！',
        targets: [
          { id: 'fog-1', name: '左侧迷雾', emoji: '🌫️', solvedEmoji: '💡', hint: '强光照亮', x: 25, y: 40 },
          { id: 'signal', name: '求救信号弹', emoji: '🚨', solvedEmoji: '🎯', hint: '锁定坐标', x: 50, y: 60 },
          { id: 'fog-2', name: '右侧迷雾', emoji: '🌫️', solvedEmoji: '💡', hint: '强光照亮', x: 75, y: 40 },
        ],
      },
      {
        stepIndex: 3,
        stepName: '吊索营救',
        emoji: '🧺',
        instruction: '悬停在悬崖上方！点击放下高强度电动救援吊篮，将探险队员安全救入机舱！',
        actionButtonText: '🧺 降下救生吊索营救',
        feedbackText: '救援吊篮平稳上升，探险队员全部安全获救！',
        targets: [
          { id: 'winch', name: '电动绞盘', emoji: '🧵', solvedEmoji: '⚡', hint: '释放绳索', x: 50, y: 25 },
          { id: 'basket', name: '救生吊篮', emoji: '🧺', solvedEmoji: '🛡️', hint: '降下吊篮', x: 50, y: 55 },
          { id: 'hiker', name: '遇险探险家', emoji: '🧗', solvedEmoji: '🦸', hint: '登机脱险', x: 50, y: 75 },
        ],
      },
    ],
    successStory: '天降神兵！搜救直升机在狂风中完成高难度救援，探险队员全部安全归队！获得鹰击长空小飞侠勋章！',
  },
];

const FALLBACK_MISSION = MISSIONS[0] ?? {
  id: 'fire' as RescueMissionType,
  titleZh: '消防灭火与高空救援',
  titleEn: 'Fire Rescue Squad',
  vehicleEmoji: '🚒',
  vehicleName: '重型水罐云梯消防车',
  sirenFreqs: [600, 950] as [number, number],
  sirenType: 'sawtooth' as OscillatorType,
  heroJob: '英勇消防员',
  heroEmoji: '👨‍🚒',
  themeColor: 'border-red-400 bg-red-50 text-red-900',
  bgGradient: 'from-red-100 via-orange-50 to-amber-50',
  steps: [],
  successStory: '完成！',
};

export function CityRescueSim() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(1);
  const [solvedTargetIds, setSolvedTargetIds] = useState<string[]>([]);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [isSirenActive, setIsSirenActive] = useState(false);

  const sirenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mission = useMemo(() => {
    return MISSIONS[currentIdx % MISSIONS.length] ?? FALLBACK_MISSION;
  }, [currentIdx]);

  const currentStep = useMemo(() => {
    return mission.steps.find((s) => s.stepIndex === currentStepIdx) ?? mission.steps[0] ?? {
      stepIndex: 1,
      stepName: '开始任务',
      emoji: '⭐',
      instruction: '准备开始救援任务！',
      actionButtonText: '出发',
      feedbackText: '出发！',
      targets: [],
    };
  }, [mission, currentStepIdx]);

  // WebAudio 物理警笛拟真音浪合成
  const playSirenSfx = (freqs: [number, number], type: OscillatorType) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(freqs[0], now);
      osc.frequency.linearRampToValueAtTime(freqs[1], now + 0.35);
      osc.frequency.linearRampToValueAtTime(freqs[0], now + 0.7);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.75);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const handleToggleSiren = () => {
    sfxTap();
    if (isSirenActive) {
      if (sirenTimerRef.current) clearInterval(sirenTimerRef.current);
      setIsSirenActive(false);
    } else {
      setIsSirenActive(true);
      playSirenSfx(mission.sirenFreqs, mission.sirenType);
      void speak(`拉响警笛！特种载具${mission.vehicleName}出动！`, { lang: 'zh-CN' });
      sirenTimerRef.current = setInterval(() => {
        playSirenSfx(mission.sirenFreqs, mission.sirenType);
      }, 750);
    }
  };

  useEffect(() => {
    return () => {
      if (sirenTimerRef.current) clearInterval(sirenTimerRef.current);
    };
  }, []);

  // 切换任务
  const handleSwitchMission = (idx: number) => {
    sfxTap();
    if (sirenTimerRef.current) clearInterval(sirenTimerRef.current);
    setIsSirenActive(false);
    setCurrentIdx(idx);
    setCurrentStepIdx(1);
    setSolvedTargetIds([]);
    const target = MISSIONS[idx] ?? FALLBACK_MISSION;
    void speak(`开启任务：${target.titleZh}，${target.titleEn}！`, { lang: 'zh-CN' });
  };

  // 点击交互沙盘目标
  const handleSolveTarget = (targetId: string) => {
    if (solvedTargetIds.includes(targetId)) return;
    sfxCorrect();
    celebrateSmall();

    const updated = [...solvedTargetIds, targetId];
    setSolvedTargetIds(updated);

    // 检查当前步骤的所有交互目标是否都已完成
    if (updated.length === currentStep.targets.length) {
      // 步骤完成
      void speak(currentStep.feedbackText, { lang: 'zh-CN' });

      setTimeout(() => {
        if (currentStepIdx < mission.steps.length) {
          setCurrentStepIdx((prev) => prev + 1);
          setSolvedTargetIds([]);
        } else {
          // 整个任务完成
          const nextDone = Array.from(new Set([...completedMissions, mission.id]));
          setCompletedMissions(nextDone);
          addStars(5);
          practice(`vehicle:${mission.id}`, true, 3, 1);
          setStreak((s) => s + 1);
          sfxWin();
          celebrateBig();
          void speak(mission.successStory, { lang: 'zh-CN' });
        }
      }, 1000);
    }
  };

  // 一键快捷执行
  const handleQuickAction = () => {
    const remaining = currentStep.targets.filter((t) => !solvedTargetIds.includes(t.id));
    if (remaining.length > 0) {
      const nextTarget = remaining[0];
      if (nextTarget) {
        handleSolveTarget(nextTarget.id);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部 5 大车队特种任务快捷切换栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {MISSIONS.map((m, idx) => {
            const isSel = currentIdx === idx;
            const isDone = completedMissions.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSwitchMission(idx)}
                className={`py-2 px-3.5 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1.5 shadow-sm ${
                  isSel
                    ? 'bg-orange-600 text-white border-orange-700 shadow-md scale-105'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                }`}
              >
                <span className="text-base">{m.vehicleEmoji}</span>
                <span>{m.titleZh.slice(0, 4)}</span>
                {isDone && <span className="text-xs">🎖️</span>}
              </button>
            );
          })}
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {/* 主救援情境交互沙盘 */}
      <div className={`bg-gradient-to-br ${mission.bgGradient} rounded-3xl border-3 border-orange-300 p-5 shadow-md space-y-4`}>
        {/* 载具与职业档案卡片 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur rounded-2xl p-4 border border-orange-100 shadow-sm">
          <div className="flex items-center gap-3">
            <motion.div
              animate={isSirenActive ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="h-16 w-16 rounded-2xl bg-orange-100 flex items-center justify-center text-4xl shadow-inner border border-orange-200"
            >
              {mission.vehicleEmoji}
            </motion.div>
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>{mission.titleZh}</span>
                <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full">
                  {mission.titleEn}
                </span>
              </h3>
              <p className="text-xs font-bold text-slate-600 mt-1">
                🚗 特种车辆：{mission.vehicleName}
              </p>
              <p className="text-xs font-semibold text-orange-800 mt-0.5">
                {mission.heroEmoji} 城市英雄：{mission.heroJob}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSiren}
            className={`px-4 py-2 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm border ${
              isSirenActive
                ? 'bg-red-600 text-white border-red-700 animate-pulse'
                : 'bg-white text-orange-900 border-orange-200 hover:bg-orange-50'
            }`}
          >
            <span>🚨</span>
            <span>{isSirenActive ? '警笛呼啸中...' : '试响拟真警笛'}</span>
          </button>
        </div>

        {/* 三阶救援互动执行沙盘 */}
        <div className="bg-white/95 rounded-2xl p-5 border border-orange-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentStep.emoji}</span>
              <span className="text-sm font-black text-slate-800">
                步骤 {currentStepIdx} / {mission.steps.length}：{currentStep.stepName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-orange-800 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              <span>🎯 目标完成度：</span>
              <span className="text-orange-900 font-black">{solvedTargetIds.length} / {currentStep.targets.length}</span>
            </div>
          </div>

          <p className="text-xs font-bold text-slate-700 leading-relaxed bg-amber-50/80 p-3 rounded-xl border border-amber-200">
            📢 <span className="text-amber-900 font-black">调度指挥部：</span>{currentStep.instruction}
          </p>

          {/* 交互式场景目标网格 */}
          <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 min-h-[220px] flex items-center justify-center border-2 border-slate-700 overflow-hidden shadow-inner">
            {/* 背景动态雷达扫描线 */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(34,197,94,0.1)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />

            <div className="grid grid-cols-3 gap-4 w-full max-w-lg z-10">
              {currentStep.targets.map((target) => {
                const isSolved = solvedTargetIds.includes(target.id);
                return (
                  <motion.button
                    key={target.id}
                    type="button"
                    disabled={isSolved}
                    whileHover={!isSolved ? { scale: 1.08 } : {}}
                    whileTap={!isSolved ? { scale: 0.92 } : {}}
                    onClick={() => handleSolveTarget(target.id)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 shadow-lg transition-all ${
                      isSolved
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 scale-105'
                        : 'bg-slate-800/90 border-amber-400/60 text-amber-200 hover:border-amber-400 hover:bg-slate-700 cursor-pointer animate-pulse'
                    }`}
                  >
                    <span className="text-4xl select-none filter drop-shadow">
                      {isSolved ? target.solvedEmoji : target.emoji}
                    </span>
                    <span className="text-xs font-black tracking-wide text-center">
                      {target.name}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSolved ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {isSolved ? '✅ 已处置' : `👉 ${target.hint}`}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleQuickAction}
              className="px-5 py-3 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md active:scale-95 transition-transform flex items-center gap-2"
            >
              <span>{currentStep.emoji}</span>
              <span>{currentStep.actionButtonText}</span>
            </button>

            {solvedTargetIds.length === currentStep.targets.length && (
              <span className="text-xs font-black text-emerald-700 animate-bounce">
                ✨ 本阶段处置完毕，正在进入下一步...
              </span>
            )}
          </div>
        </div>

        {/* 任务完成荣誉弹窗 / 提示 */}
        <AnimatePresence>
          {completedMissions.includes(mission.id) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎖️</span>
                <div>
                  <h4 className="text-xs font-black text-emerald-900">
                    恭喜获得「城市特级应急救援英雄勋章」！
                  </h4>
                  <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                    {mission.successStory}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-600 bg-white px-3 py-1.5 rounded-full border border-amber-200 shadow-sm whitespace-nowrap">
                ⭐ +5 探索星
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
