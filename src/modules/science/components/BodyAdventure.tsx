/**
 * 🫀 商业级/Visible Body 风格「人体奥秘 3D 全息解剖探险馆」 (Human Body 3D Holographic Explorer)
 * --------------------------------------------------------------------------------------------------
 * 🎨 视觉风格：模仿 Visible Body 全息深海医学科技风 (Medical Hologram Dark & Neon Cyan/Crimson/Gold)
 * 1. 🗺️ 全息分层透视台 (Multi-Layer Holographic Explorer)：
 *    - 🩻 骨骼系统层 (Skeletal Layer)：头颅、肋骨笼、脊柱、骨盆高光骨架
 *    - 🫁 脏器内脏层 (Visceral Organs Layer)：大脑、双肺、心脏、胃囊、肝脏、曲折肠道
 *    - 🩸 心血管流光层 (Cardiovascular Vessels Layer)：主动脉鲜红血流与静脉深蓝循环
 *    - ⚡ 神经突触网络层 (Nervous Synapses Layer)：脑神经与脊髓金黄电火花脉冲
 * 2. 🔍 HUD 3D 全息器官观察台 (Medical Hologram HUD Organ Detail)：
 *    - 呼吸起伏的解剖剖面、中英双语、音标、儿童趣味比喻、生理数据指标、真人童声讲解
 * 3. 🧪 4 大 Visible Body 级微观生理仿真舱：
 *    - 🍎 食物消化流光隧道 (Digestive Subway 4 种食材 + 5 阶段流动)
 *    - 🫁 肺泡 3D 气体交换舱 (Alveoli Micro-Chamber 蓝氧红细胞结合)
 *    - 🫀 心脏四腔泵血与实时心电图 (4-Chamber Heart & Real-time ECG)
 *    - 🧠 神经元突触放电全息台 (Synapse Action Potential & Reflex Speed)
 * 4. 🎯 人体健康小卫士挑战赛 (8 关趣味问答 + 连胜激励)
 * 5. 🎵 WebAudio 真实生理声音引擎 (Lub-Dub 心音 / 呼吸气流 / 消化水泡 / 神经突触放电 / 骨骼敲击)
 */

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';
import { BODY_SYSTEMS, type BodySystemItem, type OrganItem } from '@/data/humanBody';
import { ScienceAiPanel } from './ScienceAiPanel';
import { getAudioContext } from '@/lib/audioContext';

export type AdventureMode = 'explore' | 'lab' | 'quiz';
export type LabType = 'digest' | 'lungs' | 'heart' | 'nerves';
export type VisualLayer = 'all' | 'organs' | 'skeleton' | 'vessels' | 'nerves';

// ── 8 关人体趣味小问答 ──
interface BodyQuizItem {
  id: string;
  system: string;
  emoji: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const BODY_QUIZ_LIST: BodyQuizItem[] = [
  {
    id: 'q1',
    system: '消化',
    emoji: '🍎',
    question: '食物被牙齿嚼碎后，经过长长的管道滑到哪里进行搅拌？',
    options: ['胃', '大脑', '肺', '心脏'],
    answer: '胃',
    explanation: '胃像一个神奇的强力搅拌榨汁机，分泌胃酸把食物搅成糊糊！',
  },
  {
    id: 'q2',
    system: '循环',
    emoji: '🫀',
    question: '人体里像强力加压水泵一样昼夜不停跳动泵血的器官是？',
    options: ['心脏', '小肠', '皮肤', '骨头'],
    answer: '心脏',
    explanation: '心脏每天跳动约 10 万次，把新鲜营养的血液输送到全身！',
  },
  {
    id: 'q3',
    system: '呼吸',
    emoji: '🫁',
    question: '当我们深吸一口气时，吸进身体里最宝贵的气体是？',
    options: ['氧气', '二氧化碳', '灰尘', '水汽'],
    answer: '氧气',
    explanation: '肺部吸入新鲜的蓝色氧气，通过红细胞运送给全身每一个细胞！',
  },
  {
    id: 'q4',
    system: '骨骼',
    emoji: '🦴',
    question: '保护我们聪明的大脑不受磕碰的坚硬骨头叫做？',
    options: ['头骨', '肋骨', '腿骨', '脊柱'],
    answer: '头骨',
    explanation: '头骨就像一顶坚硬的天然安全头盔，时刻保护着脆弱的大脑！',
  },
  {
    id: 'q5',
    system: '神经',
    emoji: '🧠',
    question: '如果不小心碰到滚烫的水，身体会在 0.1 秒内迅速缩手，是谁在指挥？',
    options: ['大脑和神经系统', '胃', '头发', '牙齿'],
    answer: '大脑和神经系统',
    explanation: '神经信号以 120 米/秒的超快速度传递，大脑下达缩手命令避险！',
  },
  {
    id: 'q6',
    system: '感觉',
    emoji: '👅',
    question: '舌头上有很多微小的味蕾，主要用来感受什么？',
    options: ['酸甜苦咸鲜的味道', '冷空气', '声音', '光线'],
    answer: '酸甜苦咸鲜的味道',
    explanation: '舌头上有上万个味蕾，每两周就会更新一次，让我们尝遍美食！',
  },
  {
    id: 'q7',
    system: '消化',
    emoji: '🌀',
    question: '人体里吸收食物营养最主要、展开有几米长的地方是？',
    options: ['小肠', '食道', '鼻子', '耳朵'],
    answer: '小肠',
    explanation: '小肠长达 6~7 米，内壁有无数微小绒毛，负责吸收全部养分！',
  },
  {
    id: 'q8',
    system: '感觉',
    emoji: '✋',
    question: '人体表面积最大、能感受冷热软硬的器官是？',
    options: ['皮肤', '眼睛', '舌头', '脚趾甲'],
    answer: '皮肤',
    explanation: '皮肤覆盖全身，是阻挡细菌、感知外界的第一道保护屏障！',
  },
];

// ── WebAudio 生理音效合成器 ──

// 1. 消化系统音效
function playChewSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [0, 0.08].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now + offset);
      osc.frequency.exponentialRampToValueAtTime(180, now + offset + 0.05);
      gain.gain.setValueAtTime(0.25, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.06);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

function playSwallowSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch { /* audio context may fail silently on some devices */ }
}

function playStomachGurgleSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [160, 240, 190, 280].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.6, now + offset + 0.08);
      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

function playDigestSfx() {
  playStomachGurgleSfx();
}

function playLiverDetoxSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(165, now + 0.3);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  } catch { /* audio context may fail silently on some devices */ }
}

function playIntestineAbsorbSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // C5 - E5 - G5 - C6 上行吸收晶体音
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = idx * 0.05;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

function playColonRumbleSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.28);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch { /* audio context may fail silently on some devices */ }
}

function playPeristalsisEndSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch { /* audio context may fail silently on some devices */ }
}

// 2. 呼吸系统音效
function playSniffSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch { /* audio context may fail silently on some devices */ }
}

function playWindpipeSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.linearRampToValueAtTime(560, now + 0.15);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch { /* audio context may fail silently on some devices */ }
}

function playLeftLungSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.25);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch { /* audio context may fail silently on some devices */ }
}

function playRightLungSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.3);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch { /* audio context may fail silently on some devices */ }
}

function playAlveoliDiffusionSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [1200, 1800, 2400, 3100].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = idx * 0.04;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.08);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

function playBreathSfx(type: 'inhale' | 'exhale') {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';

    if (type === 'inhale') {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    } else {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.4);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch { /* audio context may fail silently on some devices */ }
}

// 3. 循环系统音效
function playHeartbeatSfx(bpm: number = 75) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 第 1 阶段心音 "Lub" (80Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.1);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // 第 2 阶段心音 "Dub" (65Hz)
    const interval = Math.min(0.2, (60 / bpm) * 0.35);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(65, now + interval);
    osc2.frequency.exponentialRampToValueAtTime(40, now + interval + 0.09);
    gain2.gain.setValueAtTime(0.25, now + interval);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + interval + 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + interval);
    osc2.stop(now + interval + 0.1);
  } catch { /* audio context may fail silently on some devices */ }
}

function playArteryPulseSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.18);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch { /* audio context may fail silently on some devices */ }
}

function playVeinFlowSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.25);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  } catch { /* audio context may fail silently on some devices */ }
}

function playCapillaryTwinkleSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [880, 1320, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = idx * 0.04;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.07);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

// 4. 神经系统音效
function playBrainComputeSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [880, 1760, 2640, 3520].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = idx * 0.035;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.15, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

function playBalancePulseSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(660, now + 0.12);
    osc.frequency.linearRampToValueAtTime(440, now + 0.24);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  } catch { /* audio context may fail silently on some devices */ }
}

function playSpinalZipSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch { /* audio context may fail silently on some devices */ }
}

function playNeuralZapSfx() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch { /* audio context may fail silently on some devices */ }
}

// 5. 骨骼系统音效
function playSkullKnockSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch { /* audio context may fail silently on some devices */ }
}

function playSpineClickSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [220, 280, 340].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = idx * 0.04;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + offset);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + offset + 0.05);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.06);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

function playRibsTapSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [330, 392].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.22, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

function playArmBoneSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.06);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  } catch { /* audio context may fail silently on some devices */ }
}

function playLegBoneSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch { /* audio context may fail silently on some devices */ }
}

function playBoneClickSfx() {
  playArmBoneSfx();
}

// 6. 感觉系统音效
function playEyeFocusSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(900, now);
    osc1.frequency.exponentialRampToValueAtTime(450, now + 0.04);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.05);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.05);
    gain2.gain.setValueAtTime(0.12, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.18);
  } catch { /* audio context may fail silently on some devices */ }
}

function playEarChimeSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch { /* audio context may fail silently on some devices */ }
}

function playTastePopSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1300, now + 0.08);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch { /* audio context may fail silently on some devices */ }
}

function playTouchShimmerSfx() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [300, 450, 600].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const offset = idx * 0.03;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  } catch { /* audio context may fail silently on some devices */ }
}

// ── 专属器官音效调度器 ──
export function playOrganSpecificSfx(organ: OrganItem, system?: BodySystemItem) {
  try {
    switch (organ.id) {
      // 消化系统
      case 'mouth':
        playChewSfx();
        break;
      case 'esophagus':
        playSwallowSfx();
        break;
      case 'stomach':
        playStomachGurgleSfx();
        break;
      case 'liver':
        playLiverDetoxSfx();
        break;
      case 'small-intestine':
        playIntestineAbsorbSfx();
        break;
      case 'large-intestine':
        playColonRumbleSfx();
        break;
      case 'anus':
        playPeristalsisEndSfx();
        break;

      // 呼吸系统
      case 'nose':
        playSniffSfx();
        break;
      case 'trachea':
        playWindpipeSfx();
        break;
      case 'lung-left':
        playLeftLungSfx();
        break;
      case 'lung-right':
        playRightLungSfx();
        break;
      case 'alveoli':
        playAlveoliDiffusionSfx();
        break;

      // 循环系统
      case 'heart':
        playHeartbeatSfx(78);
        break;
      case 'artery':
        playArteryPulseSfx();
        break;
      case 'vein':
        playVeinFlowSfx();
        break;
      case 'capillary':
        playCapillaryTwinkleSfx();
        break;

      // 神经系统
      case 'brain':
        playBrainComputeSfx();
        break;
      case 'cerebellum':
        playBalancePulseSfx();
        break;
      case 'spinal-cord':
        playSpinalZipSfx();
        break;
      case 'nerves':
        playNeuralZapSfx();
        break;

      // 骨骼系统
      case 'skull':
        playSkullKnockSfx();
        break;
      case 'spine':
        playSpineClickSfx();
        break;
      case 'ribs':
        playRibsTapSfx();
        break;
      case 'arm-bone':
        playArmBoneSfx();
        break;
      case 'leg-bone':
        playLegBoneSfx();
        break;

      // 感觉系统
      case 'eyes':
        playEyeFocusSfx();
        break;
      case 'ears':
        playEarChimeSfx();
        break;
      case 'tongue':
        playTastePopSfx();
        break;
      case 'skin':
        playTouchShimmerSfx();
        break;

      default:
        if (system?.system === '骨骼') playBoneClickSfx();
        else if (system?.system === '循环') playHeartbeatSfx(75);
        else if (system?.system === '呼吸') playBreathSfx('inhale');
        else if (system?.system === '神经') playNeuralZapSfx();
        else playStomachGurgleSfx();
    }
  } catch {
    // fallback
  }
}

/** 
 * 🌟 Visible Body 风格专业级全息 3D 人体解剖透视图 (Gross Anatomy Hologram)
 * 具备：医学级人体外形比例、12对真实肋弓骨骼、纵隔心脏与分支血管树、真实肺叶与支气管、
 * J形胃囊、大楔形肝脏、结肠小肠框架、脑沟回与神经丛、精准全息瞄准准星。
 */
function VisibleBodyHologram({
  activeSystem,
  layer,
  selectedOrgan,
  healthMode,
  onOrganClick,
}: {
  activeSystem: BodySystemItem | null;
  layer: VisualLayer;
  selectedOrgan: OrganItem | null;
  healthMode: 'healthy' | 'unhealthy';
  onOrganClick: (organ: OrganItem) => void;
}) {
  const showSkeleton = layer === 'all' || layer === 'skeleton' || activeSystem?.system === '骨骼';
  const showVessels = layer === 'all' || layer === 'vessels' || activeSystem?.system === '循环';
  const showNerves = layer === 'all' || layer === 'nerves' || activeSystem?.system === '神经';
  const showOrgans = layer === 'all' || layer === 'organs' || (activeSystem && ['消化', '呼吸', '感觉'].includes(activeSystem.system));

  // Cartoony pathology styles
  const isBad = healthMode === 'unhealthy';
  const lungColor = isBad ? '#78716c' : '#38bdf8'; // grey for tar/smoke
  const heartColor = isBad ? '#9f1239' : '#f43f5e'; // dark red
  const stomachColor = isBad ? '#3b82f6' : '#fb7185'; // cold blue for too much cold drinks

  return (
    <div className="relative mx-auto w-full max-w-sm select-none p-2 flex flex-col items-center">
      {/* 科技扫描光栅与星空背景 */}
      <div className={`relative w-full aspect-[3/4] max-h-[480px] rounded-3xl bg-gradient-to-b ${isBad ? 'from-rose-950 via-[#1a0a0f] to-[#0a0405] border-rose-500/40 shadow-[0_0_35px_rgba(244,63,94,0.2)]' : 'from-slate-950 via-[#06112c] to-[#020617] border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.2)]'} border-2 p-2 overflow-hidden flex items-center justify-center transition-colors duration-1000`}>
        
        {/* 背景全息网格与发光环 */}
        <div className={`absolute inset-0 bg-[linear-gradient(to_right,${isBad?'#f43f5e0c':'#06b6d40c'}_1px,transparent_1px),linear-gradient(to_bottom,${isBad?'#f43f5e0c':'#06b6d40c'}_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none transition-colors duration-1000`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full ${isBad?'bg-rose-500/15':'bg-cyan-500/15'} blur-3xl pointer-events-none transition-colors duration-1000`} />

        {/* 顶部病理警告条 */}
        {isBad && (
          <div className="absolute top-2 left-3 right-3 flex items-center justify-between px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-xs font-black text-rose-300 z-20 shadow-sm animate-pulse">
            <span className="flex items-center gap-1">
              <span>⚠️</span>
              <span>坏习惯病理透视模式已激活</span>
            </span>
            <span className="font-mono text-xs bg-rose-500/30 px-1.5 py-0.5 rounded text-rose-200">PATHOLOGY SCAN</span>
          </div>
        )}

        <svg viewBox="0 0 100 120" className={`w-full h-full drop-shadow-[0_0_12px_${isBad?'rgba(244,63,94,0.35)':'rgba(6,182,212,0.55)'}]`}>
          <defs>
            {/* 躯干蓝光渐变 */}
            <linearGradient id="vbBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isBad?"#f43f5e":"#38bdf8"} stopOpacity="0.22" />
              <stop offset="50%" stopColor={isBad?"#9f1239":"#0284c7"} stopOpacity="0.10" />
              <stop offset="100%" stopColor={isBad?"#4c0519":"#0369a1"} stopOpacity="0.25" />
            </linearGradient>

            {/* 骨骼发光白玉渐变 */}
            <linearGradient id="boneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isBad?"#fcd34d":"#ffffff"} stopOpacity="0.95" />
              <stop offset="100%" stopColor={isBad?"#b45309":"#cbd5e1"} stopOpacity="0.65" />
            </linearGradient>

            {/* 肝脏渐变 */}
            <linearGradient id="liverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isBad ? '#78350f' : '#b45309'} stopOpacity="0.85" />
              <stop offset="100%" stopColor={isBad ? '#451a03' : '#9a3412'} stopOpacity="0.7" />
            </linearGradient>

            {/* 胃囊渐变 */}
            <linearGradient id="stomachGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stomachColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={isBad ? '#1e3a8a' : '#e11d48'} stopOpacity="0.65" />
            </linearGradient>

            {/* 激光全息扫描光束渐变 */}
            <linearGradient id="laserBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isBad ? '#f43f5e' : '#00f0ff'} stopOpacity="0" />
              <stop offset="50%" stopColor={isBad ? '#f43f5e' : '#00f0ff'} stopOpacity="0.25" />
              <stop offset="100%" stopColor={isBad ? '#f43f5e' : '#00f0ff'} stopOpacity="0.8" />
            </linearGradient>

            {/* 全息滤镜发光 */}
            <filter id="neonBloom" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 0. 3D 全息投影台同心发光底座 (Hologram Projection Base) */}
          <g className="pointer-events-none" opacity="0.6">
            <ellipse cx="50" cy="116" rx="28" ry="3.5" fill="none" stroke={isBad ? '#f43f5e' : '#0ea5e9'} strokeWidth="0.7" strokeDasharray="3 1.5" />
            <ellipse cx="50" cy="116" rx="18" ry="2.2" fill="none" stroke={isBad ? '#f43f5e' : '#38bdf8'} strokeWidth="0.5" />
            <ellipse cx="50" cy="116" rx="8" ry="1.2" fill={isBad ? '#f43f5e22' : '#00f0ff22'} />
            <line x1="22" y1="116" x2="22" y2="114" stroke="#0ea5e9" strokeWidth="0.5" />
            <line x1="50" y1="116" x2="50" y2="113" stroke="#0ea5e9" strokeWidth="0.5" />
            <line x1="78" y1="116" x2="78" y2="114" stroke="#0ea5e9" strokeWidth="0.5" />
          </g>

          {/* 1. 真实解剖人体半透明发光生物体轮廓 (Anatomical Human Contour) */}
          <path
            d="M 50 4.5
               C 44 4.5 41.5 7.5 41.5 12
               C 41.5 16 43.5 18.5 45 20
               C 42 22 36 24 33 27
               C 30 30 28 35 28 42
               L 25 56
               C 24 59 25 61 28 61
               L 29 57
               L 31 61
               L 30 70
               C 29 76 32 82 33 88
               L 33 112
               C 33 115 36 116 39 116
               C 42 116 44 115 44 112
               L 46 95
               L 50 78
               L 54 95
               L 56 112
               C 56 115 58 116 61 116
               C 64 116 67 115 67 112
               L 67 88
               C 68 82 71 76 70 70
               L 69 61
               L 71 57
               L 72 61
               C 75 61 76 59 75 56
               L 72 42
               C 72 35 70 30 67 27
               C 64 24 58 22 55 20
               C 56.5 18.5 58.5 16 58.5 12
               C 58.5 7.5 56 4.5 50 4.5 Z"
            fill="url(#vbBodyGrad)"
            stroke={isBad ? '#f43f5e' : '#38bdf8'}
            strokeWidth="0.8"
            strokeLinejoin="round"
            className="transition-all duration-1000"
          />

          {/* 2. 🩻 真实骨骼系统发光图层 (Gross Anatomy Skeleton) */}
          {showSkeleton && (
            <g
              className="transition-all duration-300"
              stroke={isBad ? '#fcd34d' : '#e2e8f0'}
              opacity={selectedOrgan && !['skull', 'spine', 'ribs', 'arm-bone', 'leg-bone'].includes(selectedOrgan.id) ? 0.35 : 1}
            >
              {/* 颅骨 (脑颅 + 面颅眼眶与下颌) */}
              <path d="M 43 12 C 43 6 57 6 57 12 C 57 16 55 18 50 19.2 C 45 18 43 16 43 12 Z" fill="none" strokeWidth="0.9" strokeDasharray="1.5 0.5" />
              {/* 眼眶 */}
              <ellipse cx="46.5" cy="11.5" rx="2" ry="1.6" fill="none" strokeWidth="0.8" opacity="0.8" />
              <ellipse cx="53.5" cy="11.5" rx="2" ry="1.6" fill="none" strokeWidth="0.8" opacity="0.8" />
              {/* 鼻梨状孔 */}
              <polygon points="50,13 48.8,15.5 51.2,15.5" fill="none" strokeWidth="0.6" opacity="0.7" />
              {/* 下颌骨 */}
              <path d="M 45.5 16.5 L 46.5 19 L 50 19.5 L 53.5 19 L 54.5 16.5" fill="none" strokeWidth="0.8" />
              {isBad && <circle cx="50" cy="18" r="1.2" fill="#451a03" stroke="none" opacity="0.8" />}

              {/* 颈椎 (C1-C7) */}
              <line x1="50" y1="20" x2="50" y2="26" strokeWidth="1.8" strokeDasharray="0.8 0.4" />

              {/* 锁骨 (Clavicle, S形真实双曲弯) */}
              <path d="M 50 26 Q 42 24.5 33 27 M 50 26 Q 58 24.5 67 27" fill="none" strokeWidth="1.3" strokeLinecap="round" />

              {/* 胸骨 (胸骨柄 + 胸骨体 + 剑突) */}
              <path d="M 48.8 26.5 L 51.2 26.5 L 51 42.5 L 50 44 L 49 42.5 Z" fill="url(#boneGrad)" opacity="0.8" strokeWidth="0.4" />

              {/* 12 对真实解剖弧度胸廓肋弓 */}
              {/* 左侧肋骨 */}
              <path d="M 48.5 28 Q 43 27 38 29 Q 36 31 48.5 31" fill="none" strokeWidth="1" opacity="0.85" />
              <path d="M 48.5 31 C 41 30 35 33 48.5 34.5" fill="none" strokeWidth="1.1" opacity="0.85" />
              <path d="M 48.5 34.5 C 39 33 34 37 48.5 38" fill="none" strokeWidth="1.1" opacity="0.85" />
              <path d="M 48.5 38 C 38 36.5 33 41 48.5 41.5" fill="none" strokeWidth="1.1" opacity="0.85" />
              <path d="M 48.5 41.5 C 37 40 33 44 48.5 45" fill="none" strokeWidth="1.1" opacity="0.85" />
              <path d="M 49 45 Q 40 48 35 48" fill="none" strokeWidth="1.2" opacity="0.85" />

              {/* 右侧肋骨 */}
              <path d="M 51.5 28 Q 57 27 62 29 Q 64 31 51.5 31" fill="none" strokeWidth="1" opacity="0.85" />
              <path d="M 51.5 31 C 59 30 65 33 51.5 34.5" fill="none" strokeWidth="1.1" opacity="0.85" />
              <path d="M 51.5 34.5 C 61 33 66 37 51.5 38" fill="none" strokeWidth="1.1" opacity="0.85" />
              <path d="M 51.5 38 C 62 36.5 67 41 51.5 41.5" fill="none" strokeWidth="1.1" opacity="0.85" />
              <path d="M 51.5 41.5 C 63 40 67 44 51.5 45" fill="none" strokeWidth="1.1" opacity="0.85" />
              <path d="M 51 45 Q 60 48 65 48" fill="none" strokeWidth="1.2" opacity="0.85" />

              {/* 脊柱 (胸椎 T1-T12 + 腰椎 L1-L5 分节) */}
              <line x1="50" y1="26" x2="50" y2="68" strokeWidth="2.2" strokeDasharray="1.4 0.6" opacity="0.9" />

              {/* 骨盆 (Pelvis) */}
              <path d="M 50 67 Q 42 65 35 68 C 33 72 35 76 43 76 L 47 75 L 50 76.5 L 53 75 L 57 76 C 65 76 67 72 65 68 Q 58 65 50 67 Z" fill="url(#boneGrad)" opacity="0.45" strokeWidth="0.8" />
              <ellipse cx="44.5" cy="73.5" rx="1.8" ry="1.4" fill="none" strokeWidth="0.7" opacity="0.7" />
              <ellipse cx="55.5" cy="73.5" rx="1.8" ry="1.4" fill="none" strokeWidth="0.7" opacity="0.7" />

              {/* 四肢骨骼 */}
              <line x1="33" y1="28" x2="28" y2="44" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
              <line x1="28" y1="45" x2="25" y2="58" strokeWidth="1.2" opacity="0.75" />
              <line x1="27" y1="45" x2="24" y2="58" strokeWidth="1" opacity="0.6" />
              <line x1="67" y1="28" x2="72" y2="44" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
              <line x1="72" y1="45" x2="75" y2="58" strokeWidth="1.2" opacity="0.75" />
              <line x1="73" y1="45" x2="76" y2="58" strokeWidth="1" opacity="0.6" />

              {/* 下肢骨骼 */}
              <line x1="42" y1="76" x2="41" y2="94" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
              <line x1="58" y1="76" x2="59" y2="94" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
              <circle cx="41" cy="95" r="1.3" fill="none" strokeWidth="1" />
              <circle cx="59" cy="95" r="1.3" fill="none" strokeWidth="1" />
              <line x1="41" y1="96" x2="40" y2="114" strokeWidth="1.8" opacity="0.8" />
              <line x1="38.5" y1="97" x2="38" y2="113" strokeWidth="1" opacity="0.6" />
              <line x1="59" y1="96" x2="60" y2="114" strokeWidth="1.8" opacity="0.8" />
              <line x1="61.5" y1="97" x2="62" y2="113" strokeWidth="1" opacity="0.6" />
            </g>
          )}

          {/* 3. 🩸 真实心血管系统发光树 (Circulatory Vascular Tree) */}
          {showVessels && (
            <g
              className="transition-all duration-300"
              opacity={selectedOrgan && !['heart', 'artery', 'vein', 'capillary'].includes(selectedOrgan.id) ? 0.35 : 1}
            >
              {/* 主动脉系统 */}
              <path d="M 48 32 Q 48 26 46 22 M 49.5 31 L 49.5 21 M 51.5 32 Q 54 26 56 22" fill="none" stroke={isBad ? '#be123c' : '#f43f5e'} strokeWidth="0.8" strokeLinecap="round" />
              <path d="M 49 34 L 49 64 L 46 72 L 42 92 L 41 112 M 49 64 L 52 72 L 57 92 L 58 112" fill="none" stroke={isBad ? '#be123c' : '#f43f5e'} strokeWidth="1.3" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" values="1,4; 4,1; 1,4" dur={isBad ? '4s' : '2s'} repeatCount="indefinite" />
              </path>
              <path d="M 46 24 Q 36 28 28 42 L 25 58 M 54 24 Q 64 28 72 42 L 75 58" fill="none" stroke={isBad ? '#be123c' : '#f43f5e'} strokeWidth="1" strokeLinecap="round" />

              {/* 静脉系统 */}
              <path d="M 52 20 L 52 35 M 52 42 L 52 64 L 54 72 L 59 92 L 60 112 M 52 64 L 48 72 L 43 92 L 42 112" fill="none" stroke={isBad ? '#0369a1' : '#0ea5e9'} strokeWidth="1.3" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" values="4,1; 1,4; 4,1" dur={isBad ? '4s' : '2s'} repeatCount="indefinite" />
              </path>
              <path d="M 52 24 Q 38 29 29 42 L 26 58 M 52 24 Q 62 29 71 42 L 74 58" fill="none" stroke={isBad ? '#0369a1' : '#0ea5e9'} strokeWidth="0.9" strokeLinecap="round" />

              {/* 坏习惯模式: 黄色脂肪颗粒 */}
              {isBad && (
                <g fill="#fef08a" opacity="0.9">
                  <circle cx="49" cy="30" r="1.1"><animate attributeName="cy" values="22;48;68" dur="3s" repeatCount="indefinite"/></circle>
                  <circle cx="52" cy="50" r="0.9"><animate attributeName="cy" values="70;50;35" dur="3.5s" repeatCount="indefinite"/></circle>
                  <circle cx="43" cy="85" r="1.1"><animate attributeName="cy" values="72;95;110" dur="2.8s" repeatCount="indefinite"/></circle>
                </g>
              )}
            </g>
          )}

          {/* 4. ⚡ 真实周围神经系统金黄电脉冲 (Nervous System) */}
          {showNerves && (
            <g
              className="transition-all duration-300"
              opacity={selectedOrgan && !['brain', 'cerebellum', 'spinal-cord', 'nerves'].includes(selectedOrgan.id) ? 0.35 : 1}
            >
              {/* 大脑半球皮层沟回 */}
              <path d="M 46 8 Q 50 9 46 12 M 54 8 Q 50 9 54 12 M 50 5 L 50 17" fill="none" stroke={isBad ? '#92400e' : '#fbbf24'} strokeWidth="0.8" opacity="0.85" />
              
              {/* 脊髓中枢主干 */}
              <line x1="50" y1="18" x2="50" y2="70" stroke={isBad ? '#92400e' : '#fbbf24'} strokeWidth="1.2" strokeDasharray="2 1">
                <animate attributeName="stroke-opacity" values="0.4;1;0.4" dur={isBad ? '2s' : '1s'} repeatCount="indefinite" />
              </line>

              {/* 臂丛神经束 */}
              <path d="M 50 24 Q 38 27 28 42 L 25 58 M 50 24 Q 62 27 72 42 L 75 58" fill="none" stroke={isBad ? '#92400e' : '#fbbf24'} strokeWidth="0.8" strokeDasharray="2 2" />

              {/* 肋间神经分支 */}
              <path d="M 50 32 L 40 34 M 50 32 L 60 34 M 50 37 L 38 39 M 50 37 L 62 39 M 50 42 L 37 44 M 50 42 L 63 44" fill="none" stroke={isBad ? '#92400e' : '#fbbf24'} strokeWidth="0.6" strokeDasharray="1.5 1.5" opacity="0.75" />

              {/* 腰骶丛与坐骨神经 */}
              <path d="M 50 66 Q 44 72 41 90 L 40 112 M 50 66 Q 56 72 59 90 L 60 112" fill="none" stroke={isBad ? '#92400e' : '#fbbf24'} strokeWidth="0.9" strokeDasharray="2 2">
                <animate attributeName="stroke-opacity" values="0.3;1;0.3" dur={isBad ? '2.5s' : '1.2s'} repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* 5. 🫁 真实内脏解剖图层 (Gross Visceral Anatomy) */}
          {showOrgans && (
            <g
              className="transition-all duration-300"
              opacity={selectedOrgan && !['mouth', 'esophagus', 'liver', 'stomach', 'small-intestine', 'large-intestine', 'anus', 'nose', 'trachea', 'lung-left', 'lung-right', 'alveoli'].includes(selectedOrgan.id) ? 0.35 : 1}
            >
              {/* 气管与左右主支气管 */}
              <rect x="48.8" y="21" width="2.4" height="7" rx="0.5" fill="none" stroke="#7dd3fc" strokeWidth="0.8" />
              <path d="M 50 28 Q 46 30 43 33 M 50 28 Q 54 31 57 34" fill="none" stroke="#7dd3fc" strokeWidth="1" strokeLinecap="round" />

              {/* 右肺 (画面左侧, 3个肺叶) */}
              <path
                d="M 48.5 28
                   C 44 26.5 35 29 35 37
                   C 35 44 34.5 48 48 48
                   C 48.5 48 48.5 35 48.5 28 Z"
                fill={lungColor}
                opacity={selectedOrgan?.id === 'lung-right' ? 0.85 : isBad ? 0.7 : 0.45}
                stroke={isBad ? '#57534e' : selectedOrgan?.id === 'lung-right' ? '#00f0ff' : '#0284c7'}
                strokeWidth={selectedOrgan?.id === 'lung-right' ? '1.4' : '0.7'}
                className="transition-colors duration-1000"
              />
              <line x1="35.5" y1="36" x2="47" y2="38" stroke={isBad ? '#292524' : '#0284c7'} strokeWidth="0.6" opacity="0.6" />
              <line x1="36" y1="41" x2="45" y2="44" stroke={isBad ? '#292524' : '#0284c7'} strokeWidth="0.6" opacity="0.6" />

              {/* 左肺 (画面右侧, 2个肺叶, 具心切迹) */}
              <path
                d="M 51.5 28
                   C 56 26.5 65 29 65 37
                   C 65 44 65.5 48 53 48
                   C 50.5 44.5 50.5 39 51.5 35
                   C 51.5 32 51.5 30 51.5 28 Z"
                fill={lungColor}
                opacity={selectedOrgan?.id === 'lung-left' ? 0.85 : isBad ? 0.7 : 0.45}
                stroke={isBad ? '#57534e' : selectedOrgan?.id === 'lung-left' ? '#00f0ff' : '#0284c7'}
                strokeWidth={selectedOrgan?.id === 'lung-left' ? '1.4' : '0.7'}
                className="transition-colors duration-1000"
              />
              <line x1="53" y1="34" x2="63" y2="42" stroke={isBad ? '#292524' : '#0284c7'} strokeWidth="0.6" opacity="0.6" />

              {/* 坏习惯模式: 肺部焦油斑块 */}
              {isBad && (
                <g fill="#1c1917" opacity="0.9">
                  <circle cx="39" cy="34" r="1.5" />
                  <circle cx="42" cy="43" r="1.8" />
                  <circle cx="58" cy="35" r="1.6" />
                  <circle cx="61" cy="44" r="1.4" />
                </g>
              )}

              {/* 心脏 (纵隔真实解剖心形) */}
              <path
                d="M 49 34
                   C 46 34 45 37 46 40
                   C 47 43 51 45.5 54 44
                   C 56 42 56 38 54 36
                   C 52 34 50 34 49 34 Z"
                fill={heartColor}
                opacity={selectedOrgan?.id === 'heart' ? 1 : 0.85}
                stroke={selectedOrgan?.id === 'heart' ? '#00f0ff' : isBad ? '#881337' : '#fda4af'}
                strokeWidth={selectedOrgan?.id === 'heart' ? '1.4' : '0.8'}
                className="transition-colors duration-1000 origin-[52px_39px]"
              >
                <animateTransform attributeName="transform" type="scale" values={isBad ? '1; 1.03; 1' : '1; 1.1; 1'} dur={isBad ? '1.5s' : '0.8s'} repeatCount="indefinite" />
              </path>

              {/* 肝脏 (Liver) */}
              <path
                d="M 36 46
                   C 35 49 36 54 48 54
                   C 52 54 52 49 51 46
                   C 45 45 38 45 36 46 Z"
                fill="url(#liverGrad)"
                stroke={selectedOrgan?.id === 'liver' ? '#00f0ff' : isBad ? '#451a03' : '#d97706'}
                strokeWidth={selectedOrgan?.id === 'liver' ? '1.4' : '0.8'}
                opacity={selectedOrgan?.id === 'liver' ? 1 : 0.85}
              />
              <line x1="45" y1="46" x2="45" y2="53" stroke="#fef3c7" strokeWidth="0.6" strokeDasharray="0.6 0.6" opacity="0.7" />
              <ellipse cx="42.5" cy="53" rx="1.2" ry="1.8" fill={isBad ? '#4d7c0f' : '#10b981'} opacity="0.9" />

              {/* 胃 (Stomach) */}
              <path
                d="M 50.5 45
                   C 56 44 58.5 48 58.5 52
                   C 58.5 56.5 53 57.5 49.5 54.5
                   C 52 52 53 49 50.5 45 Z"
                fill="url(#stomachGrad)"
                stroke={selectedOrgan?.id === 'stomach' ? '#00f0ff' : isBad ? '#1d4ed8' : '#fb7185'}
                strokeWidth={selectedOrgan?.id === 'stomach' ? '1.4' : '0.8'}
                opacity={selectedOrgan?.id === 'stomach' ? 1 : 0.85}
              />
              {isBad && (
                <g stroke="#bfdbfe" strokeWidth="0.5" fill="none">
                  <path d="M 52 48 L 53 49 L 52 50" />
                  <path d="M 55 52 L 56 53 L 55 54" />
                </g>
              )}

              {/* 大肠/结肠框架 */}
              <path
                d="M 40 68
                   L 40 55
                   Q 50 54 60 55
                   L 60 68
                   Q 56 72 50 73
                   L 50 76"
                fill="none"
                stroke={selectedOrgan?.id === 'large-intestine' ? '#00f0ff' : isBad ? '#831843' : '#f472b6'}
                strokeWidth={selectedOrgan?.id === 'large-intestine' ? '3.4' : '2.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="2 0.8"
                opacity={selectedOrgan?.id === 'large-intestine' ? 1 : 0.75}
              />

              {/* 小肠回环 */}
              <path
                d="M 49 55 Q 46 58 53 58 Q 45 61 54 62 Q 46 65 54 66 Q 47 69 50 71"
                fill="none"
                stroke={selectedOrgan?.id === 'small-intestine' ? '#00f0ff' : isBad ? '#9d174d' : '#fb7185'}
                strokeWidth={selectedOrgan?.id === 'small-intestine' ? '3' : '2.2'}
                strokeLinecap="round"
                opacity={selectedOrgan?.id === 'small-intestine' ? 1 : 0.85}
              />
            </g>
          )}

          {/* 5.5. 🔗 全息联动彩蛋: 氧气与营养输送 */}
          {showOrgans && showVessels && !isBad && (
            <g opacity="0.85">
              <circle r="0.9" fill="#38bdf8" filter="drop-shadow(0 0 3px #38bdf8)"><animateMotion path="M 42 38 Q 47 38 50 39" dur="1.2s" repeatCount="indefinite" /></circle>
              <circle r="0.9" fill="#38bdf8" filter="drop-shadow(0 0 3px #38bdf8)"><animateMotion path="M 58 38 Q 55 38 53 39" dur="1.2s" begin="0.4s" repeatCount="indefinite" /></circle>
              <circle r="0.9" fill="#4ade80" filter="drop-shadow(0 0 3px #4ade80)"><animateMotion path="M 50 64 Q 52 52 52 42" dur="1.8s" repeatCount="indefinite" /></circle>
            </g>
          )}

          {/* 5.8. 动态全息激光扫描光束 (Dynamic Laser Scanline) */}
          <g className="pointer-events-none">
            <rect x="10" y="0" width="80" height="2.5" fill="url(#laserBeamGrad)" opacity="0.6">
              <animate attributeName="y" values="2;114;2" dur="4.5s" repeatCount="indefinite" />
            </rect>
            <line x1="8" y1="0" x2="92" y2="0" stroke={isBad ? '#f43f5e' : '#00f0ff'} strokeWidth="0.7" opacity="0.85" filter="url(#neonBloom)">
              <animate attributeName="y1" values="2;114;2" dur="4.5s" repeatCount="indefinite" />
              <animate attributeName="y2" values="2;114;2" dur="4.5s" repeatCount="indefinite" />
            </line>
          </g>

          {/* 6. 🎯 选中器官全息瞄准准星与引导线 HUD */}
          {selectedOrgan && (
            <g className="pointer-events-none">
              {/* 旋转外十字瞄准圈 */}
              <circle
                cx={selectedOrgan.position.x}
                cy={selectedOrgan.position.y}
                r="6.5"
                fill="none"
                stroke="#00f0ff"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              >
                <animateTransform attributeName="transform" type="rotate" from={`0 ${selectedOrgan.position.x} ${selectedOrgan.position.y}`} to={`360 ${selectedOrgan.position.x} ${selectedOrgan.position.y}`} dur="6s" repeatCount="indefinite" />
              </circle>

              {/* 瞄准四向刻度线 */}
              <line x1={selectedOrgan.position.x - 7.5} y1={selectedOrgan.position.y} x2={selectedOrgan.position.x - 5} y2={selectedOrgan.position.y} stroke="#00f0ff" strokeWidth="0.9" />
              <line x1={selectedOrgan.position.x + 5} y1={selectedOrgan.position.y} x2={selectedOrgan.position.x + 7.5} y2={selectedOrgan.position.y} stroke="#00f0ff" strokeWidth="0.9" />
              <line x1={selectedOrgan.position.x} y1={selectedOrgan.position.y - 7.5} x2={selectedOrgan.position.x} y2={selectedOrgan.position.y - 5} stroke="#00f0ff" strokeWidth="0.9" />
              <line x1={selectedOrgan.position.x} y1={selectedOrgan.position.y + 5} x2={selectedOrgan.position.x} y2={selectedOrgan.position.y + 7.5} stroke="#00f0ff" strokeWidth="0.9" />

              {/* 扩散光波圈 */}
              <circle
                cx={selectedOrgan.position.x}
                cy={selectedOrgan.position.y}
                r="4"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.2"
                opacity="0.8"
              >
                <animate attributeName="r" values="3;9;3" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.8s" repeatCount="indefinite" />
              </circle>

              {/* HUD 科技引导折线与坐标徽标 */}
              <path
                d={`M ${selectedOrgan.position.x} ${selectedOrgan.position.y} L ${selectedOrgan.position.x > 50 ? selectedOrgan.position.x + 10 : selectedOrgan.position.x - 10} ${selectedOrgan.position.y - 5} L ${selectedOrgan.position.x > 50 ? 94 : 6} ${selectedOrgan.position.y - 5}`}
                fill="none"
                stroke="#00f0ff"
                strokeWidth="0.5"
                strokeDasharray="2 1"
                opacity="0.75"
              />
              <rect
                x={selectedOrgan.position.x > 50 ? 68 : 6}
                y={selectedOrgan.position.y - 9.5}
                width="26"
                height="4.2"
                rx="1"
                fill="#030712f0"
                stroke="#00f0ff"
                strokeWidth="0.4"
              />
              <text
                x={selectedOrgan.position.x > 50 ? 81 : 19}
                y={selectedOrgan.position.y - 6.6}
                fill="#00f0ff"
                fontSize="2.1"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {`LOC[${selectedOrgan.position.x},${selectedOrgan.position.y}]`}
              </text>
            </g>
          )}

          {/* 7. 交互式器官全息热点标记 (Hologram Hotspots) */}
          {(activeSystem?.organs ?? BODY_SYSTEMS.flatMap(s => s.organs)).map((organ) => {
            const isSelected = selectedOrgan?.id === organ.id;
            return (
              <g key={organ.id} className="cursor-pointer group" onClick={() => onOrganClick(organ)}>
                {/* 发光外光圈 */}
                <circle
                  cx={organ.position.x}
                  cy={organ.position.y}
                  r={isSelected ? "5.5" : "4"}
                  fill={isSelected ? '#38bdf8' : '#0ea5e9'}
                  opacity={isSelected ? "0.6" : "0.25"}
                  className="transition-all"
                >
                  <animate attributeName="r" values="3.5;5.5;3.5" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.8s" repeatCount="indefinite" />
                </circle>

                {/* 实心全息按钮 */}
                <circle
                  cx={organ.position.x}
                  cy={organ.position.y}
                  r="3.6"
                  fill="#0b132b"
                  stroke={isSelected ? '#00f0ff' : '#0284c7'}
                  strokeWidth={isSelected ? '1.4' : '0.8'}
                  className="transition-transform group-hover:scale-125"
                />

                {/* Emoji 图标 */}
                <text
                  x={organ.position.x}
                  y={organ.position.y + 1.2}
                  textAnchor="middle"
                  fontSize="3.4"
                  className="pointer-events-none font-bold"
                >
                  {organ.emoji}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 底部全息雷达扫描线 */}
        <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-xs font-mono text-cyan-400/80 bg-slate-950/85 backdrop-blur px-3 py-1 rounded-full border border-cyan-500/30 shadow-md">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono tracking-wider font-bold text-xs">3D ANATOMICAL HOLO-SCAN</span>
          </span>
          <span className="text-slate-300 font-sans font-black text-xs">点击器官透视探险 ✨</span>
        </div>
      </div>
    </div>
  );
}

/** 
 * 🔍 Visible Body 级 HUD 全息 3D 器官观察台档案卡
 */
function HologramOrganDetailHUD({
  organ,
  system,
  onClose,
}: {
  organ: OrganItem;
  system: BodySystemItem;
  onClose: () => void;
}) {
  const [showScale, setShowScale] = useState(false);

  const handleVoiceExplain = () => {
    sfxTap();
    void speak(`${organ.nameZh}。英文叫 ${organ.nameEn}。${organ.function}。趣味冷知识：${organ.funFact}`, {
      lang: 'zh-CN',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="rounded-3xl bg-slate-900/95 backdrop-blur-xl border-2 border-cyan-500/40 p-4 shadow-[0_0_25px_rgba(6,182,212,0.25)] text-left text-white space-y-3 relative overflow-hidden"
    >
      {/* 科技四角卡扣装饰 */}
      <span className="absolute top-1.5 left-2 font-mono text-xs text-cyan-500/40 pointer-events-none select-none">┌</span>
      <span className="absolute top-1.5 right-2 font-mono text-xs text-cyan-500/40 pointer-events-none select-none">┐</span>
      <span className="absolute bottom-1.5 left-2 font-mono text-xs text-cyan-500/40 pointer-events-none select-none">└</span>
      <span className="absolute bottom-1.5 right-2 font-mono text-xs text-cyan-500/40 pointer-events-none select-none">┘</span>

      {/* 科技背景角标与全息光晕 */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* 头部标题与朗读 */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-4xl p-2 rounded-2xl bg-slate-800/90 border border-cyan-500/40 shadow-inner flex items-center justify-center">
              {organ.emoji}
            </span>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-black text-cyan-300 tracking-wide">{organ.nameZh}</h4>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-cyan-950 text-cyan-400 border border-cyan-500/40 shadow-sm">
                {system.nameZh}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">{organ.nameEn}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleVoiceExplain}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
          >
            <span>🔊</span>
            <span>语音导览</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sfxTap();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-black transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 生理机能能量仪表盘 (Vital Sign Indicator) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-2xl border border-cyan-500/20 text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-slate-400">
            <span>机能活跃度</span>
            <span className="text-cyan-400 font-mono font-bold">98.5%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full w-[98.5%] shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-slate-400">
            <span>代谢效率</span>
            <span className="text-emerald-400 font-mono font-bold">OPTIMAL</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full w-[100%] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
        </div>
      </div>

      {/* 核心解剖生理参数面板 */}
      <div className="space-y-2 text-xs">
        {/* 生理功能 */}
        <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 font-bold flex items-start gap-2.5">
          <span className="text-base">⚙️</span>
          <div>
            <span className="text-cyan-400 font-black">【解剖生理功能】</span>
            <div className="text-slate-200 mt-0.5 leading-relaxed">{organ.function}</div>
          </div>
        </div>

        {/* 趣味儿童化比喻 */}
        <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-100 font-bold flex items-start gap-2.5">
          <span className="text-base">💡</span>
          <div>
            <span className="text-amber-400 font-black">【童趣趣味比喻】</span>
            <div className="text-amber-200/90 mt-0.5 leading-relaxed">{organ.funFact}</div>
          </div>
        </div>

        {/* 尺寸大小比喻 - 互动比例尺 */}
        <div 
          onClick={() => { sfxTap(); setShowScale(!showScale); }}
          className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-100 font-bold flex flex-col gap-2 cursor-pointer hover:bg-purple-900/50 transition-colors"
        >
          <div className="flex items-start gap-2.5">
            <span className="text-base">📏</span>
            <div>
              <span className="text-purple-400 font-black flex items-center gap-2">
                【人体尺寸对照】<span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full text-purple-300">点击查看实物比例 ✨</span>
              </span>
              <div className="text-purple-200/90 mt-0.5 leading-relaxed">{organ.sizeComparison}</div>
            </div>
          </div>
          <AnimatePresence>
            {showScale && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="flex justify-center items-center py-3 gap-6 bg-purple-950/60 rounded-xl overflow-hidden mt-1 border border-purple-500/20"
              >
                <div className="text-5xl drop-shadow-lg relative">
                  {organ.emoji}
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap text-purple-300">{organ.nameZh}</span>
                </div>
                <div className="text-purple-400 font-black text-2xl animate-pulse">≈</div>
                <div className="text-5xl drop-shadow-lg relative">
                  {organ.id === 'heart' ? '✊' : organ.id === 'brain' ? '🍈' : organ.id === 'stomach' ? '🎒' : (organ.id === 'small-intestine' || organ.id === 'large-intestine') ? '🎾' : organ.id === 'lung-left' || organ.id === 'lung-right' ? '🧽' : organ.id === 'liver' ? '🏈' : organ.id === 'mouth' ? '👄' : organ.id === 'eye' ? '🍇' : organ.id === 'ear' ? '🥟' : organ.id === 'bone' || organ.id === 'ribs' ? '🦴' : '📐'}
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap text-purple-300">实物尺寸</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/** 🧪 微观生理实验 1：Visible Body 级食物消化全景流光隧道 */
function DigestiveLab() {
  const [stage, setStage] = useState(0);
  const [selectedFood, setSelectedFood] = useState({ name: '脆甜苹果', emoji: '🍎', nutrient: '丰富的维生素C与水溶性膳食纤维' });

  const FOODS = [
    { name: '脆甜苹果', emoji: '🍎', nutrient: '丰富的维生素C与水溶性膳食纤维' },
    { name: '高钙牛奶', emoji: '🥛', nutrient: '强健骨骼的钙质与优质乳蛋白' },
    { name: '全麦面包', emoji: '🍞', nutrient: '充沛大脑思考的碳水化合物能量' },
    { name: '翠绿西蓝花', emoji: '🥦', nutrient: '抵抗细菌侵害的多重天然维生素' },
  ];

  const steps = [
    { title: '① 口腔研磨粉碎', emoji: `🦷 ${selectedFood.emoji}`, desc: `门牙切断、臼齿磨碎${selectedFood.name}，唾液中的淀粉酶快速介入预消化！`, btn: `牙齿咀嚼研磨 ➔` },
    { title: '② 食道蠕动波滑梯', emoji: '🍝 ⬇️', desc: '长约25厘米的食道肌肉进行规律波浪式收缩蠕动，把食物平稳推入胃中。', btn: '平稳滑入胃腔 ➔' },
    { title: '③ 胃酸强力搅拌机', emoji: '🫧 🫕', desc: '胃壁强力肌肉搅拌收缩，强酸性胃液杀死细菌并将蛋白质分解为食糜！', btn: '开启胃酸搅拌 ➔' },
    { title: '④ 小肠毛细绒毛吸收', emoji: '🌀 ✨', desc: `6米长的小肠展开有网球场大，数亿根微小绒毛定向吸收【${selectedFood.nutrient}】注入毛细血管！`, btn: '吸取黄金养分 ➔' },
    { title: '⑤ 大肠水分回收排出', emoji: '🔄 💩', desc: '大肠回收多余水分并形成健康的便便顺利排泄，完成身体能量循环！', btn: '消化大探险通关！🎉' },
  ];

  const currentStep = steps[stage] ?? steps[0]!;

  const handleNextStep = () => {
    sfxTap();
    playDigestSfx();
    if (stage < steps.length - 1) {
      setStage(stage + 1);
      sfxCorrect();
      void speak(steps[stage + 1]?.desc ?? '', { lang: 'zh-CN' });
    } else {
      setStage(0);
      sfxWin();
      celebrateBig();
      void speak(`恭喜通关！${selectedFood.name}的营养已被身体细胞完美吸收！`, { lang: 'zh-CN' });
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-slate-900 border-2 border-red-500/40 text-center space-y-4 shadow-[0_0_25px_rgba(239,68,68,0.2)] text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-500/20 pb-3">
        <h4 className="text-sm font-black text-red-400 flex items-center gap-1.5">
          <span>🍎</span>
          <span>食物消化全景流光隧道 (阶段 {stage + 1}/5)</span>
        </h4>
        <div className="flex gap-1">
          {FOODS.map((fd) => (
            <button
              key={fd.name}
              type="button"
              onClick={() => {
                sfxTap();
                setSelectedFood(fd);
                setStage(0);
                void speak(`准备消化${fd.name}！`, { lang: 'zh-CN' });
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all border ${
                selectedFood.name === fd.name
                  ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {fd.emoji} {fd.name}
            </button>
          ))}
        </div>
      </div>

      <div className="py-6 bg-slate-950/80 rounded-2xl border border-red-500/30 shadow-inner space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        <motion.div
          key={`${selectedFood.name}-${stage}`}
          initial={{ scale: 0.8, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className="text-6xl drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          {currentStep.emoji}
        </motion.div>
        <h5 className="text-base font-black text-red-300">{currentStep.title}</h5>
        <p className="text-xs font-bold text-slate-300 max-w-md mx-auto px-4 leading-relaxed">
          {currentStep.desc}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {steps.map((st, idx) => (
          <div
            key={st.title}
            className={`h-2 rounded-full transition-all ${
              stage >= idx ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleNextStep}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:brightness-110 active:scale-98 transition-all"
      >
        {currentStep.btn}
      </button>
    </div>
  );
}

/** 🧪 微观生理实验 2：Visible Body 级 3D 肺泡微观气体交换舱 */
function LungsLab() {
  const [isBreathingIn, setIsBreathingIn] = useState(false);
  const [breathCount, setBreathCount] = useState(0);

  const handlePointerDown = () => {
    sfxTap();
    playBreathSfx('inhale');
    setIsBreathingIn(true);
    void speak('深吸气——胸腔膨胀，蓝色氧气冲入肺泡！', { lang: 'zh-CN' });
  };

  const handlePointerUp = () => {
    if (!isBreathingIn) return;
    sfxTap();
    playBreathSfx('exhale');
    setIsBreathingIn(false);
    setBreathCount((c) => c + 1);
    sfxCorrect();
    void speak('呼气——胸腔收缩，废气排出！', { lang: 'zh-CN' });
  };

  return (
    <div className="p-5 rounded-3xl bg-slate-900 border-2 border-sky-500/40 text-center space-y-4 shadow-[0_0_25px_rgba(14,165,233,0.2)] text-white">
      <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
        <h4 className="text-sm font-black text-sky-400 flex items-center gap-1.5">
          <span>🫁</span>
          <span>肺泡 3D 气体交换模拟舱 (物理长按)</span>
        </h4>
        <span className="px-3 py-1 bg-sky-500 text-slate-950 font-mono font-black text-xs rounded-full shadow-sm">
          深呼吸: {breathCount}次
        </span>
      </div>

      <div className="py-6 bg-slate-950/80 rounded-2xl border border-sky-500/30 flex flex-col items-center justify-center min-h-[190px] space-y-3 relative overflow-hidden">
        {/* 全息呼吸流光光环 */}
        <motion.div
          animate={{ scale: isBreathingIn ? 1.6 : 1, opacity: isBreathingIn ? 0.4 : 0.1 }}
          transition={{ duration: 1.2 }}
          className="absolute w-44 h-44 rounded-full bg-sky-400 blur-2xl pointer-events-none"
        />

        <motion.div
          animate={{ scale: isBreathingIn ? 1.35 : 0.95 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          className="text-7xl select-none z-10 drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]"
        >
          {isBreathingIn ? '🫁 🔵✨' : '🫁 💨'}
        </motion.div>
        <span className="text-xs font-black text-sky-300 z-10">
          {isBreathingIn
            ? '🔵 正在吸气：胸廓扩大，红细胞结合氧气变鲜红！'
            : '💨 正在呼气：胸廓缩小，二氧化碳废气排出体外！'}
        </span>
      </div>

      <div className="flex justify-center mt-4">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all border-2 select-none touch-none ${
            isBreathingIn
              ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.8)] scale-95'
              : 'bg-slate-800 text-sky-300 border-sky-600/40 shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:bg-slate-750'
          }`}
        >
          {isBreathingIn ? '😌 松开呼出废气...' : '🌬️ 长按大口吸气!'}
        </button>
      </div>
    </div>
  );
}

function HeartLab() {
  const [bpm, setBpm] = useState(70);
  const [clicks, setClicks] = useState<number[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const intervalMs = (60 / bpm) * 1000;
    timerRef.current = window.setInterval(() => {
      playHeartbeatSfx(bpm);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bpm]);

  // Clean old clicks (3 seconds sliding window)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClicks((prev) => prev.filter((t) => now - t < 3000));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  // Calculate BPM based on click density
  useEffect(() => {
    const nextBpm = Math.min(180, Math.max(70, 70 + clicks.length * 6));
    setBpm(nextBpm);
  }, [clicks]);

  const handlePump = () => {
    setClicks((prev) => [...prev, Date.now()]);
    sfxTap();
  };

  return (
    <div className="p-5 rounded-3xl bg-slate-900 border-2 border-rose-500/40 text-center space-y-4 shadow-[0_0_25px_rgba(244,63,94,0.2)] text-white">
      <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
        <h4 className="text-sm font-black text-rose-400 flex items-center gap-1.5">
          <span>🫀</span>
          <span>心脏四腔加压泵 (物理连击)</span>
        </h4>
        <span className="px-3 py-1 bg-rose-500 text-white font-mono font-black text-xs rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)] transition-all">
          {bpm} BPM
        </span>
      </div>

      <div className="py-6 bg-slate-950/80 rounded-2xl border border-rose-500/30 flex flex-col items-center justify-center min-h-[180px] space-y-3 relative overflow-hidden">
        {/* 科技心电图绿色流光 */}
        <svg className="absolute w-full h-16 opacity-35 text-emerald-400 pointer-events-none" viewBox="0 0 200 40">
          <path d="M 0 20 L 40 20 L 50 5 L 60 35 L 70 15 L 80 20 L 120 20 L 130 5 L 140 35 L 150 15 L 160 20 L 200 20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="2s" repeatCount="indefinite" />
          </path>
        </svg>

        <motion.div
          animate={{ scale: [1, 1.25, 1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 60 / bpm, ease: 'easeInOut' }}
          className="text-7xl select-none z-10 drop-shadow-[0_0_25px_rgba(244,63,94,0.7)]"
        >
          🫀
        </motion.div>
        <p className="text-xs font-bold text-slate-300 max-w-sm z-10">
          {bpm <= 80
            ? '🛋️ 安静状态：心肌舒缓搏动，维持全身平稳代谢。'
            : bpm <= 130
              ? '🏃 运动状态：心跳加速，向肌肉输送 3 倍氧气能量！'
              : '⚡ 极限冲刺：心脏马力全开，泵出 5 倍强劲血流！'}
        </p>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onPointerDown={handlePump}
          className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-lg shadow-[0_0_20px_rgba(244,63,94,0.6)] active:scale-95 transition-all select-none touch-none border-b-4 border-rose-700 active:border-b-0 active:translate-y-1"
        >
          🖐️ 快速连击泵血！
        </button>
      </div>
    </div>
  );
}

/** 🧪 微观生理实验 4：Visible Body 级神经突触放电全息台 */
function NervesLab() {
  const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'success'>('idle');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  const startTest = () => {
    sfxTap();
    setState('waiting');
    setReactionTime(null);
    void speak('请全神贯注！一旦看到红色警报出现，立刻点击缩手！', { lang: 'zh-CN' });

    const delay = 1500 + Math.random() * 2000;
    timeoutRef.current = window.setTimeout(() => {
      playNeuralZapSfx();
      startTimeRef.current = performance.now();
      setState('ready');
    }, delay);
  };

  const handleReact = () => {
    if (state === 'ready') {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      setReactionTime(elapsed);
      setState('success');
      sfxWin();
      celebrateSmall();
      const grade = elapsed < 250 ? '⚡ 闪电反应王' : elapsed < 400 ? '🐆 猎豹反应手' : '🐢 慢悠悠小树懒';
      void speak(`反应极快！耗时 ${elapsed} 毫秒！获得评级：【${grade}】！`, { lang: 'zh-CN' });
    } else if (state === 'waiting') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState('idle');
      sfxWrong();
      void speak('点太早啦！还没出现警报呢，请等红灯亮起再点击哦！', { lang: 'zh-CN' });
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-slate-900 border-2 border-purple-500/40 text-center space-y-4 shadow-[0_0_25px_rgba(168,85,247,0.2)] text-white">
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
        <h4 className="text-sm font-black text-purple-400 flex items-center gap-1.5">
          <span>🧠</span>
          <span>神经突触放电与毫秒反应测速 (信号速度: 120m/s)</span>
        </h4>
      </div>

      <div
        onClick={state === 'ready' ? handleReact : state === 'waiting' ? handleReact : undefined}
        className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center min-h-[180px] space-y-3 cursor-pointer transition-all ${
          state === 'ready'
            ? 'bg-rose-600 border-rose-400 text-white animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.8)]'
            : state === 'waiting'
              ? 'bg-amber-500 border-amber-400 text-slate-950'
              : state === 'success'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                : 'bg-slate-950/80 border-purple-500/30 text-white'
        }`}
      >
        <span className="text-6xl drop-shadow-md">
          {state === 'ready'
            ? '🔥 ⚡ 🚨'
            : state === 'waiting'
              ? '⏳ 🟡'
              : state === 'success'
                ? '⚡ 🏆'
                : '🧠 🖐️'}
        </span>
        <div className="font-black text-base">
          {state === 'idle' && '点击下方按钮开始测试神经反射速度'}
          {state === 'waiting' && '保持专注... 等待突发危险警报...'}
          {state === 'ready' && '⚡ 危险警报！立刻点击屏幕缩手！！'}
          {state === 'success' && `🎉 耗时：${reactionTime} 毫秒！${(reactionTime ?? 0) < 250 ? '⚡ 闪电反应王' : '🐆 猎豹反应手'}`}
        </div>
      </div>

      {state === 'idle' || state === 'success' ? (
        <button
          type="button"
          onClick={startTest}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-sm shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:brightness-110 active:scale-98 transition-all"
        >
          🚀 开启神经反应测速
        </button>
      ) : null}
    </div>
  );
}

/** 主组件：Visible Body 风格人体奥秘探险馆 */
function BodyAdventureImpl() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [mode, setMode] = useState<AdventureMode>('explore');
  const [activeSystemId, setActiveSystemId] = useState<string>('digestive');
  const [selectedOrgan, setSelectedOrgan] = useState<OrganItem | null>(null);
  const [visualLayer, setVisualLayer] = useState<VisualLayer>('all');
  const [labType, setLabType] = useState<LabType>('digest');
  const [healthMode, setHealthMode] = useState<'healthy' | 'unhealthy'>('healthy');

  // 闯关问答状态
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const activeSystem = useMemo(() => {
    return BODY_SYSTEMS.find((s) => s.id === activeSystemId) ?? BODY_SYSTEMS[0]!;
  }, [activeSystemId]);

  const currentQuiz = useMemo(() => {
    return BODY_QUIZ_LIST[quizIdx % BODY_QUIZ_LIST.length] ?? BODY_QUIZ_LIST[0]!;
  }, [quizIdx]);

  const handleSelectSystem = (sys: BodySystemItem) => {
    sfxTap();
    setActiveSystemId(sys.id);
    setSelectedOrgan(sys.organs[0] ?? null);
    void speak(`${sys.nameZh}。${sys.desc}`, { lang: 'zh-CN' });
  };

  const handleOrganClick = (organ: OrganItem) => {
    setSelectedOrgan(organ);
    playOrganSpecificSfx(organ, activeSystem);
    void speak(`${organ.nameZh}。${organ.function}`, { lang: 'zh-CN' });
  };

  const handleAnswerQuiz = useCallback((option: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);

    if (option === currentQuiz.answer) {
      sfxCorrect();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      addStars(1);
      practice('science:body-adventure', true, 2, 1);
      triggerHaptic(45);

      if (nextStreak >= 3) {
        sfxWin();
        triggerHaptic([60, 40, 60, 40, 100]);
        celebrateBig();
      } else {
        celebrateSmall();
      }
      void speak(`回答正确！${currentQuiz.explanation}`, { lang: 'zh-CN' });
    } else {
      sfxWrong();
      triggerHaptic(20);
      setStreak(0);
      void speak(`答错啦，正确答案是【${currentQuiz.answer}】。${currentQuiz.explanation}`, {
        lang: 'zh-CN',
      });
    }
  }, [selectedAnswer, currentQuiz, streak, addStars, practice]);

  const handleNextQuiz = useCallback(() => {
    sfxTap();
    triggerHaptic(20);
    setSelectedAnswer(null);
    setQuizIdx((i) => (i + 1) % BODY_QUIZ_LIST.length);
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (mode === 'explore') {
        if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const sys = BODY_SYSTEMS[idx];
          if (sys) {
            e.preventDefault();
            handleSelectSystem(sys);
          }
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          sfxTap();
          setHealthMode((h) => (h === 'healthy' ? 'unhealthy' : 'healthy'));
        }
      } else if (mode === 'quiz') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const opt = currentQuiz.options[idx];
          if (opt && !selectedAnswer) {
            e.preventDefault();
            handleAnswerQuiz(opt);
          }
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleNextQuiz();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedAnswer, currentQuiz, handleSelectSystem, handleAnswerQuiz, handleNextQuiz]);

  return (
    <div className="space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-cyan-900 font-bold bg-cyan-50/90 px-3 py-1 rounded-xl border border-cyan-200">
          ⌨️ 键盘快捷操作：数字键 1-6 切换六大生理系统 · H 开启/关闭坏习惯检测 · 问答模式 1-4 答题 / 空格 下一题
        </span>
      </div>

      {/* 顶部主模式导航 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setMode('explore');
            }}
            className={`py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 ${
              mode === 'explore'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-300'
            }`}
          >
            <span>🩻</span>
            <span>3D 全息系统透视</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfxTap();
              setMode('lab');
            }}
            className={`py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 ${
              mode === 'lab'
                ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
            }`}
          >
            <span>🧪</span>
            <span>微观生理实验室</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfxTap();
              setMode('quiz');
            }}
            className={`py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 ${
              mode === 'quiz'
                ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
            }`}
          >
            <span>🎯</span>
            <span>人体小考官挑战</span>
          </button>
        </div>

        {mode === 'quiz' ? (
          <StreakBar streak={streak} target={3} />
        ) : (
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setHealthMode(h => h === 'healthy' ? 'unhealthy' : 'healthy');
              if (healthMode === 'healthy') {
                void speak('坏习惯检测仪已开启！看看坏习惯对身体有什么影响吧！', { lang: 'zh-CN' });
              } else {
                void speak('切换回健康模式！', { lang: 'zh-CN' });
              }
            }}
            className={`py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 ${
              healthMode === 'unhealthy'
                ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-rose-400'
            }`}
          >
            <span>{healthMode === 'unhealthy' ? '🦠' : '🛡️'}</span>
            <span>坏习惯检测仪</span>
          </button>
        )}
      </div>

      {/* 模式 1：Visible Body 风格 3D 全息解剖透视 */}
      {mode === 'explore' && (
        <div className="bg-slate-950 rounded-3xl border-2 border-cyan-500/40 p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)] space-y-4 text-white">
          {/* 六大系统选择器 */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {BODY_SYSTEMS.map((sys) => {
                const isSel = activeSystem.id === sys.id;
                return (
                  <button
                    key={sys.id}
                    type="button"
                    onClick={() => handleSelectSystem(sys)}
                    className={`py-1.5 px-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1 border ${
                      isSel
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-105'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-600/40'
                    }`}
                  >
                    <span>{sys.emoji}</span>
                    <span>{sys.nameZh}</span>
                  </button>
                );
              })}
            </div>

            {/* 骨骼/器官/血管/神经分层切片过滤 */}
            <div className="flex gap-1 bg-slate-900 p-1 rounded-2xl border border-cyan-500/20">
              {(['all', 'skeleton', 'organs', 'vessels', 'nerves'] as const).map((lay) => (
                <button
                  key={lay}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setVisualLayer(lay);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                    visualLayer === lay
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lay === 'all' ? '🌐 全层' : lay === 'skeleton' ? '🩻 骨骼' : lay === 'organs' ? '🫁 脏器' : lay === 'vessels' ? '🩸 血管' : '⚡ 神经'}
                </button>
              ))}
            </div>
          </div>

          {/* 3D 透视主台 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* 左侧：Visible Body 3D 全息人体透视 */}
            <div className="md:col-span-5 flex justify-center">
              <VisibleBodyHologram
                activeSystem={activeSystem}
                layer={visualLayer}
                selectedOrgan={selectedOrgan}
                healthMode={healthMode}
                onOrganClick={handleOrganClick}
              />
            </div>

            {/* 右侧：HUD 解剖档案与器官列表 */}
            <div className="md:col-span-7 space-y-3">
              {/* 系统概览 */}
              <div className="bg-slate-900/80 backdrop-blur rounded-3xl p-4 border border-cyan-500/20 shadow-inner space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl p-1.5 rounded-xl bg-slate-800 border border-cyan-500/30">
                      {activeSystem.emoji}
                    </span>
                    <div>
                      <h3 className="text-base font-black text-cyan-300">
                        {activeSystem.nameZh} ({activeSystem.nameEn})
                      </h3>
                      <p className="text-xs font-mono text-slate-400">{activeSystem.phonics}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sfxTap();
                      void speak(`${activeSystem.chant}。${activeSystem.funFact}`, { lang: 'zh-CN' });
                    }}
                    className="px-3 py-1 rounded-xl bg-cyan-950 border border-cyan-500/30 text-xs font-black text-cyan-300 hover:bg-cyan-900 flex items-center gap-1"
                  >
                    <span>🎵</span>
                    <span>口诀</span>
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-300">{activeSystem.desc}</p>
                <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs font-bold text-amber-300">
                  💡 {activeSystem.funFact}
                </div>
              </div>

              {/* 器官列表快速选择 */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-black text-cyan-400">
                  // 重点器官列表 ({activeSystem.organs.length}个)：
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {activeSystem.organs.map((organ) => (
                    <button
                      key={organ.id}
                      type="button"
                      onClick={() => handleOrganClick(organ)}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                        selectedOrgan?.id === organ.id
                          ? 'bg-slate-800 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <span className="text-2xl">{organ.emoji}</span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-black text-slate-100 truncate">
                          {organ.nameZh}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{organ.nameEn}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 选中的器官 HUD 全息详情 */}
              <AnimatePresence mode="wait">
                {selectedOrgan && (
                  <HologramOrganDetailHUD
                    key={selectedOrgan.id}
                    organ={selectedOrgan}
                    system={activeSystem}
                    onClose={() => setSelectedOrgan(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* 模式 2：微观生理四大实验室 */}
      {mode === 'lab' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                sfxTap();
                setLabType('digest');
              }}
              className={`py-2 px-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1 ${
                labType === 'digest'
                  ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <span>🍎</span>
              <span>食物消化流光隧道</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfxTap();
                setLabType('lungs');
              }}
              className={`py-2 px-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1 ${
                labType === 'lungs'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.5)]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <span>🫁</span>
              <span>肺泡 3D 气体交换舱</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfxTap();
                setLabType('heart');
              }}
              className={`py-2 px-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1 ${
                labType === 'heart'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <span>🫀</span>
              <span>心脏四腔与 ECG 心电图</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfxTap();
                setLabType('nerves');
              }}
              className={`py-2 px-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1 ${
                labType === 'nerves'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <span>🧠</span>
              <span>神经突触放电全息台</span>
            </button>
          </div>

          {labType === 'digest' && <DigestiveLab />}
          {labType === 'lungs' && <LungsLab />}
          {labType === 'heart' && <HeartLab />}
          {labType === 'nerves' && <NervesLab />}
        </div>
      )}

      {/* 模式 3：人体健康小卫士挑战赛 */}
      {mode === 'quiz' && (
        <div className="bg-slate-950 rounded-3xl border-2 border-amber-500/40 p-5 shadow-[0_0_25px_rgba(245,158,11,0.2)] space-y-4 text-center text-white">
          <div className="flex items-center justify-between bg-slate-900 rounded-2xl p-3 border border-amber-500/20 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{currentQuiz.emoji}</span>
              <div className="text-left">
                <h3 className="text-sm font-black text-amber-400">{currentQuiz.system}小考官</h3>
                <span className="text-xs font-bold text-slate-400">
                  第 {quizIdx + 1} / {BODY_QUIZ_LIST.length} 关
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-amber-400">连胜目标：3连对 ⭐</span>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-5 border border-amber-500/20 shadow-inner space-y-4">
            <p className="text-base font-black text-slate-100 leading-relaxed max-w-xl mx-auto">
              ❓ {currentQuiz.question}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {currentQuiz.options.map((opt) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === currentQuiz.answer;
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    whileHover={{ scale: selectedAnswer === null ? 1.02 : 1 }}
                    whileTap={{ scale: selectedAnswer === null ? 0.98 : 1 }}
                    disabled={selectedAnswer !== null}
                    onClick={() => handleAnswerQuiz(opt)}
                    className={`py-3 px-4 rounded-2xl font-black text-sm border-2 transition-all shadow-sm ${
                      isSelected
                        ? isCorrect
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 ring-4 ring-emerald-500/30'
                          : 'bg-rose-500 text-white border-rose-400 ring-4 ring-rose-500/30'
                        : selectedAnswer !== null && isCorrect
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400/60'
                    }`}
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {selectedAnswer !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-slate-900 rounded-2xl p-4 border border-amber-500/30 shadow space-y-3 text-center"
              >
                <p className="text-xs font-bold text-slate-300 max-w-md mx-auto">
                  💡 {currentQuiz.explanation}
                </p>
                <button
                  type="button"
                  onClick={handleNextQuiz}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-sm font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95"
                >
                  挑战下一题 ➔
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* AI 人体探险故事 */}
      <ScienceAiPanel
        topic={{
          id: `sci-body-${activeSystem.id}`,
          emoji: activeSystem.emoji,
          label: `${activeSystem.nameZh}奇妙探险`,
          stars: 2,
          tags: ['科学', '健康'],
          prompt: activeSystem.storyPrompt,
          fallback: activeSystem.storyFallback,
        }}
        triggerLabel={`${activeSystem.emoji} 听小茜讲 ${activeSystem.nameZh} 探险故事`}
      />
    </div>
  );
}

export const BodyAdventure = memo(BodyAdventureImpl);
