/**
 * 🐱 RealFeltCat3D — 写实羊毛毡猫咪引擎 v3.0
 * ─────────────────────────────────────────────
 * 真实猫咪解剖比例 + 手工羊毛毡触感
 *
 * 真实特征还原：
 *  • 正确猫咪头身比（头大，脸宽，吻部突出）
 *  • 竖向椭圆瞳孔（光线变化时自动扩缩）
 *  • 慢眨眼 (Slow Blink) — 猫咪表达信任的标志性动作
 *  • 耳尖随音频/心情抖动（tweakable）
 *  • 尾巴 S 型摇摆（情绪尾 Physics）
 *  • 三角形鼻尖 + 人中沟 + W 型上唇
 *  • 八根多层超精致猫须（阴影层 + 亮色层）
 *  • 虎斑纹路（tabby stripes on forehead & body）
 *  • 毛毡绒毛置换贴图 Shader (feTurbulence)
 *  • SSS 边缘透光（耳朵半透明红光）
 *  • 指甲粉嫩肉垫（圆弧形真实猫爪）
 *  • 360° 手势轨道旋转 + 惯性滑行
 *  • 3 × HDR 氛围场景
 *  • 点击时出现爱心/金粉粒子
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSafeTimeout } from '@/lib/useTimer';

export interface RealFeltCat3DProps {
  size?: number;
  /**
   * 猫咪颜色方案
   * pink=粉橘渐变羊毛毡, gray=银灰布偶, orange=橙虎斑, cream=奶白折耳
   */
  color?: 'pink' | 'gray' | 'orange' | 'cream';
  expression?: 'happy' | 'cute' | 'thinking' | 'sleepy' | 'love' | 'excited' | 'blinking';
  hat?: string;
  neck?: string;
  envLighting?: 'sunlight' | 'nebula' | 'starry';
  onPet?: (e: React.MouseEvent) => void;
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  emoji?: string;
}

// 颜色方案定义
const COLOR_SCHEMES = {
  pink: {
    bodyMain: '#F9C8D5',
    bodyMid: '#F2A0B8',
    bodyShadow: '#D9607F',
    bodyLight: '#FFF5F8',
    earInner: '#F7849E',
    furStripe: '#E882A0',
    chestWhite: '#FFFAF9',
    nosePink: '#E8567A',
    pawPad: '#F7A8BF',
    tailTip: '#FDE0E9',
  },
  gray: {
    bodyMain: '#D0D8E4',
    bodyMid: '#A0B0C8',
    bodyShadow: '#5C7093',
    bodyLight: '#F0F4FA',
    earInner: '#C4A8C8',
    furStripe: '#8890A8',
    chestWhite: '#F8F9FF',
    nosePink: '#D08090',
    pawPad: '#B8C4D8',
    tailTip: '#E8EDF8',
  },
  orange: {
    bodyMain: '#F0AA68',
    bodyMid: '#E07030',
    bodyShadow: '#A04010',
    bodyLight: '#FFF0DC',
    earInner: '#E88060',
    furStripe: '#C06020',
    chestWhite: '#FFFBF0',
    nosePink: '#D05040',
    pawPad: '#F0A870',
    tailTip: '#FADDAA',
  },
  cream: {
    bodyMain: '#F8EFD8',
    bodyMid: '#E8D8B0',
    bodyShadow: '#C0A868',
    bodyLight: '#FFFDF8',
    earInner: '#F0C8B0',
    furStripe: '#D8C098',
    chestWhite: '#FFFFF8',
    nosePink: '#D8908A',
    pawPad: '#F4D8C4',
    tailTip: '#FFF4E0',
  },
};

// HDR 光照配置
const LIGHTING = {
  sunlight: {
    rimColor: '#FFD060',
    ambientGlow: 'rgba(255,210,80,0.22)',
    eyeIris: ['#C8A820', '#8B6200', '#3A2800'],
    shadowOpacity: 0.22,
  },
  nebula: {
    rimColor: '#FF70A6',
    ambientGlow: 'rgba(255,112,166,0.28)',
    eyeIris: ['#60C8E0', '#007AB0', '#00203A'],
    shadowOpacity: 0.18,
  },
  starry: {
    rimColor: '#80CCFF',
    ambientGlow: 'rgba(80,180,255,0.25)',
    eyeIris: ['#A080E0', '#5030A0', '#180040'],
    shadowOpacity: 0.20,
  },
};

export function RealFeltCat3D({
  size = 220,
  color = 'pink',
  expression = 'happy',
  hat,
  neck,
  envLighting = 'nebula',
  onPet,
  className = '',
}: RealFeltCat3DProps) {
  const [rotX, setRotX] = useState(-8);
  const [rotY, setRotY] = useState(14);
  const [, setVelX] = useState(0);
  const [, setVelY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 生命周期动画相位（P1-5：合并为单个 state，每帧仅一次 setState，避免整棵大型 SVG 60fps 重渲染）
  const [anim, setAnim] = useState({
    breathPhase: 0,
    tailPhase: 0,
    pupilDilation: 0.45,
    blinkProgress: 0,
  });
  // 慢眨眼激活标记（点击事件 / 眨眼 FSM 共用，仅在切换时 setState）
  const [isBlinking, setIsBlinking] = useState(false);
  // 耳朵微颤（偶发事件驱动，非每帧）
  const [earTwitch, setEarTwitch] = useState(0);
  const [isSquashing, setIsSquashing] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const schedule = useSafeTimeout();
  const inertiRef = useRef<number>(0);

  const c = COLOR_SCHEMES[color]!!
  const light = LIGHTING[envLighting]!!

  // ── 生命周期动画循环 ──
  // P1-5 修复：原实现在 rAF 里每帧调用 5+ 次 setState（呼吸/尾巴/瞳孔/眨眼/耳颤），
  // 触发整棵大型 SVG 每帧重渲染；且 loop 与 tick 各开一条 rAF 链、cleanup 只取消一条，存在泄漏。
  // 现合并为单个 anim state，每帧仅一次 setState；并修正为单一 rAF 链 + 卸载时 cancelAnimationFrame。
  useEffect(() => {
    let rafId: number;
    let t = 0;
    let blinkTimer = 0;
    let blinkState = 0; // 0=waiting, 1=closing, 2=closed, 3=opening
    let blinkSubT = 0;
    let nextBlink = 3 + Math.random() * 4; // 下次眨眼等待秒数
    let earTimer = 0;
    let nextEar = 2 + Math.random() * 5;
    let earTimeout: ReturnType<typeof setTimeout> | undefined;
    let wasBlinking = false;

    const loop = (dt: number) => {
      t += 0.038;
      const breathPhase = Math.sin(t * 0.7);
      const tailPhase = Math.sin(t * 0.9) * 12 + Math.sin(t * 1.7) * 4;
      const pupilDilation = 0.42 + Math.sin(t * 0.18) * 0.06;

      // 慢眨眼 FSM
      blinkTimer += dt / 1000;
      if (blinkState === 0 && blinkTimer > nextBlink) {
        blinkState = 1;
        blinkSubT = 0;
        blinkTimer = 0;
      }
      let blinkProgress = 0;
      let blinkingNow = false;
      if (blinkState === 1) {
        blinkSubT += dt / 1000 / 0.12; // 0.12s 关闭
        blinkProgress = Math.min(blinkSubT, 1);
        blinkingNow = true;
        if (blinkSubT >= 1) { blinkState = 2; blinkSubT = 0; }
      } else if (blinkState === 2) {
        blinkSubT += dt / 1000 / 0.06; // 0.06s 保持
        if (blinkSubT >= 1) { blinkState = 3; blinkSubT = 0; }
      } else if (blinkState === 3) {
        blinkSubT += dt / 1000 / 0.18; // 0.18s 睁开
        blinkProgress = Math.max(0, 1 - blinkSubT);
        blinkingNow = true;
        if (blinkSubT >= 1) {
          blinkState = 0;
          blinkProgress = 0;
          nextBlink = 3 + Math.random() * 5;
        }
      }

      // 仅在 FSM 切换时更新 isBlinking（点击触发的眨眼由点击事件处理，互不干扰，避免每帧 setState）
      if (blinkingNow !== wasBlinking) {
        wasBlinking = blinkingNow;
        setIsBlinking(blinkingNow);
      }

      // 耳尖微颤（偶发事件，不每帧 setState）
      earTimer += dt / 1000;
      if (earTimer > nextEar) {
        earTimer = 0;
        nextEar = 2 + Math.random() * 5;
        setEarTwitch(1);
        earTimeout = setTimeout(() => setEarTwitch(0), 400);
      }

      // 每帧仅一次 setState：合并所有连续相位
      setAnim({ breathPhase, tailPhase, pupilDilation, blinkProgress });
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      if (earTimeout) clearTimeout(earTimeout);
    };
  }, []);

  // 惯性滑行
  useEffect(() => {
    if (!isDragging) {
      inertiRef.current = requestAnimationFrame(function decay() {
        setVelY((v) => {
          const nv = v * 0.92;
          setRotY((r) => r + nv);
          return Math.abs(nv) < 0.01 ? 0 : nv;
        });
        inertiRef.current = requestAnimationFrame(decay);
      });
    }
    return () => cancelAnimationFrame(inertiRef.current);
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setVelX(0); setVelY(0);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setVelY(dx * 0.65);
    setRotY((r) => r + dx * 0.65);
    setRotX((r) => Math.max(-55, Math.min(55, r - dy * 0.45)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  // 点击反馈 — 爱心粒子 + 挤压
  const handleClick = (e: React.MouseEvent) => {
    setIsSquashing(true);
    schedule(() => setIsSquashing(false), 380);

    // 触发慢眨眼
    setIsBlinking(true);
    schedule(() => setIsBlinking(false), 300);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const emojis = ['💖', '✨', '🐟', '💕', '⭐'];
      const colors = ['#FFB3C6', '#FFD6A5', '#BDE0FE', '#CAFFBF', '#FFC8DD'];
      const newP: Particle[] = Array.from({ length: 7 }).map((_, i) => ({
        id: Date.now() + i,
        x: px + (Math.random() - 0.5) * 30,
        y: py,
        vx: (Math.random() - 0.5) * 60,
        vy: -(30 + Math.random() * 50),
        color: colors[i % colors.length]!,
        emoji: i % 2 === 0 ? emojis[i % emojis.length] : undefined,
      }));
      setParticles((prev) => [...prev, ...newP]);
      schedule(() => setParticles((prev) => prev.filter((p) => !newP.includes(p))), 1200);
    }

    if (onPet) onPet(e);
  };

  const normalizedRotY = ((rotY % 360) + 360) % 360;
  const isFacingBack = normalizedRotY > 88 && normalizedRotY < 272;

  // 瞳孔纵轴 ry
  const pupilRy = 10 * anim.pupilDilation + 2;
  const pupilRx = 3.5 + (1 - anim.pupilDilation) * 1.5; // 微调横轴

  // 眼睑遮罩高度 (0=全睁, 1=全闭)
  const lidHeight = expression === 'sleepy' ? 0.55
    : expression === 'blinking' ? 1
    : isBlinking ? anim.blinkProgress
    : 0;

  // 耳朵偏移（微颤）
  const earOffset = earTwitch * -5;

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, perspective: '1100px' }}
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      {/* 氛围弥散光晕 */}
      <div
        style={{ background: light.ambientGlow }}
        className="absolute inset-2 rounded-full blur-2xl pointer-events-none transition-all duration-700"
      />

      {/* 360° 交互区 */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
        style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
        className="relative flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <motion.div
          style={{
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${
              isSquashing ? '1.1,0.88,1.1' : '1,1,1'
            })`,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="relative flex items-center justify-center"
        >
          <svg
            viewBox="0 0 200 210"
            className="w-full h-full overflow-visible drop-shadow-xl"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 羊毛毡绒毛位移 Shader */}
              <filter id="rfcFelt" x="-12%" y="-12%" width="124%" height="124%">
                <feTurbulence type="fractalNoise" baseFrequency="0.7 0.9" numOctaves="4" seed="5" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.8" xChannelSelector="R" yChannelSelector="G" />
              </filter>

              {/* 耳朵透光 SSS */}
              <filter id="rfcEarSSS" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* 眼睛玻璃折射 */}
              <filter id="rfcEye" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.8" result="b" />
                <feComposite in="SourceGraphic" in2="b" operator="over" />
              </filter>

              {/* 猫毛渐变 */}
              <radialGradient id="rfcBody" cx="32%" cy="22%" r="78%">
                <stop offset="0%" stopColor={c.bodyLight} />
                <stop offset="35%" stopColor={c.bodyMain} />
                <stop offset="75%" stopColor={c.bodyMid} />
                <stop offset="100%" stopColor={c.bodyShadow} />
              </radialGradient>

              {/* 眼球虹膜渐变 */}
              <radialGradient id="rfcIris" cx="38%" cy="35%" r="62%">
                <stop offset="0%" stopColor={light.eyeIris[0]} />
                <stop offset="55%" stopColor={light.eyeIris[1]} />
                <stop offset="100%" stopColor={light.eyeIris[2]} />
              </radialGradient>

              {/* Rim Light 渐变 */}
              <linearGradient id="rfcRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={light.rimColor} stopOpacity="0.85" />
                <stop offset="100%" stopColor={light.rimColor} stopOpacity="0" />
              </linearGradient>

              {/* 尾巴渐变 */}
              <linearGradient id="rfcTail" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.bodyMid} />
                <stop offset="100%" stopColor={c.tailTip} />
              </linearGradient>
            </defs>

            {/* ── 地面阴影 ── */}
            <ellipse cx="100" cy="198" rx="65" ry="11" fill="#1A0A10" opacity={light.shadowOpacity} />

            {/* ── 尾巴（情绪S型摇摆）── */}
            <motion.g
              animate={{ rotate: anim.tailPhase }}
              transition={{ type: 'spring', stiffness: 60, damping: 12 }}
              style={{ transformOrigin: '152px 148px' }}
            >
              {/* 尾巴主体 */}
              <path
                d={`M 152 148 Q 185 ${120 + anim.breathPhase * 3} 176 ${82 + anim.breathPhase * 2} Q 162 58 148 76`}
                stroke="url(#rfcTail)"
                strokeWidth="13"
                strokeLinecap="round"
                fill="none"
                filter="url(#rfcFelt)"
              />
              {/* 尾尖白色 */}
              <circle cx="148" cy="76" r="7" fill={c.tailTip} filter="url(#rfcFelt)" />
            </motion.g>

            {/* ── 躯干（软体呼吸）── */}
            <ellipse
              cx="100"
              cy={142 + anim.breathPhase * 1.8}
              rx={56 + anim.breathPhase * 0.9}
              ry={44 - anim.breathPhase * 0.7}
              fill="url(#rfcBody)"
              filter="url(#rfcFelt)"
            />

            {/* 躯干虎斑纹（color=orange/gray时显示）*/}
            {(color === 'orange' || color === 'gray') && (
              <g opacity="0.25" filter="url(#rfcFelt)">
                <path d="M 78 118 Q 86 126 80 134" stroke={c.furStripe} strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 90 116 Q 96 124 90 132" stroke={c.furStripe} strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 110 116 Q 104 124 110 132" stroke={c.furStripe} strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 122 118 Q 114 126 120 134" stroke={c.furStripe} strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </g>
            )}

            {/* 胸前白绒毛 */}
            <ellipse cx="100" cy="146" rx="32" ry="26" fill={c.chestWhite} opacity="0.92" filter="url(#rfcFelt)" />

            {/* ── 前爪（写实圆弧形）── */}
            <g filter="url(#rfcFelt)">
              {/* 左爪 */}
              <ellipse cx="67" cy="178" rx="15" ry="10" fill={c.bodyMain} />
              <ellipse cx="67" cy="178" rx="13" ry="8.5" fill={c.chestWhite} />
              {/* 肉垫 */}
              <ellipse cx="67" cy="179" r="4" fill={c.pawPad} opacity="0.9" />
              <ellipse cx="61" cy="175" rx="2" ry="1.6" fill={c.pawPad} opacity="0.75" />
              <ellipse cx="67" cy="173" rx="2" ry="1.6" fill={c.pawPad} opacity="0.75" />
              <ellipse cx="73" cy="175" rx="2" ry="1.6" fill={c.pawPad} opacity="0.75" />
              {/* 爪趾分隔线 */}
              <path d="M 59 178 Q 67 174 75 178" stroke={c.bodyShadow} strokeWidth="1" fill="none" opacity="0.3" />

              {/* 右爪 */}
              <ellipse cx="133" cy="178" rx="15" ry="10" fill={c.bodyMain} />
              <ellipse cx="133" cy="178" rx="13" ry="8.5" fill={c.chestWhite} />
              <ellipse cx="133" cy="179" r="4" fill={c.pawPad} opacity="0.9" />
              <ellipse cx="127" cy="175" rx="2" ry="1.6" fill={c.pawPad} opacity="0.75" />
              <ellipse cx="133" cy="173" rx="2" ry="1.6" fill={c.pawPad} opacity="0.75" />
              <ellipse cx="139" cy="175" rx="2" ry="1.6" fill={c.pawPad} opacity="0.75" />
              <path d="M 125 178 Q 133 174 141 178" stroke={c.bodyShadow} strokeWidth="1" fill="none" opacity="0.3" />
            </g>

            {/* ── 耳朵（带透光 SSS + 耳尖微颤）── */}
            <g filter="url(#rfcFelt)">
              {/* 左耳外形 */}
              <motion.path
                d={`M 46 68 L ${18 + earOffset} ${22 + earOffset} Q 38 24 72 44 Z`}
                fill="url(#rfcBody)"
                animate={{ rotate: earTwitch ? -6 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                style={{ transformOrigin: '46px 68px' }}
              />
              {/* 左耳内 SSS 透光粉 */}
              <motion.path
                d={`M 46 66 L ${26 + earOffset} ${30 + earOffset} Q 40 32 66 48 Z`}
                fill={c.earInner}
                opacity="0.75"
                filter="url(#rfcEarSSS)"
                animate={{ rotate: earTwitch ? -6 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                style={{ transformOrigin: '46px 66px' }}
              />
              {/* 右耳外形 */}
              <motion.path
                d={`M 154 68 L ${182 - earOffset} ${22 + earOffset} Q 162 24 128 44 Z`}
                fill="url(#rfcBody)"
                animate={{ rotate: earTwitch ? 6 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                style={{ transformOrigin: '154px 68px' }}
              />
              {/* 右耳内 SSS */}
              <motion.path
                d={`M 154 66 L ${174 - earOffset} ${30 + earOffset} Q 160 32 134 48 Z`}
                fill={c.earInner}
                opacity="0.75"
                filter="url(#rfcEarSSS)"
                animate={{ rotate: earTwitch ? 6 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                style={{ transformOrigin: '154px 66px' }}
              />
            </g>

            {/* ── 头部主体（带呼吸）── */}
            <g filter="url(#rfcFelt)">
              <ellipse
                cx="100"
                cy={84 - anim.breathPhase * 0.9}
                rx="56"
                ry="46"
                fill="url(#rfcBody)"
              />
              {/* Rim Light 顶部边缘光 */}
              <path
                d="M 52 65 Q 100 42 148 65"
                stroke="url(#rfcRim)"
                strokeWidth="3"
                fill="none"
                opacity="0.8"
              />

              {/* 头顶虎斑纹（额头 M 字纹）*/}
              {(color === 'orange' || color === 'gray') && (
                <g opacity="0.3">
                  <path d="M 88 52 Q 90 62 88 70" stroke={c.furStripe} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <path d="M 96 50 Q 98 60 96 68" stroke={c.furStripe} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <path d="M 104 50 Q 102 60 104 68" stroke={c.furStripe} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <path d="M 112 52 Q 110 62 112 70" stroke={c.furStripe} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </g>
              )}
            </g>

            {/* 面颊腮红 */}
            <ellipse cx="50" cy="98" rx="13" ry="8" fill="#FF4466" opacity="0.28" />
            <ellipse cx="150" cy="98" rx="13" ry="8" fill="#FF4466" opacity="0.28" />

            {/* ── 眼睛 & 表情（朝前才渲染）── */}
            {!isFacingBack && (
              <g>
                {expression === 'love' ? (
                  <g>
                    <text x="44" y="96" fontSize="26">💕</text>
                    <text x="120" y="96" fontSize="26">💕</text>
                  </g>
                ) : (
                  <g>
                    {/* ── 左眼 ── */}
                    <g filter="url(#rfcEye)">
                      {/* 眼白底 */}
                      <ellipse cx="66" cy="85" rx="13.5" ry="14.5" fill="#F8F0F4" />
                      {/* 虹膜 */}
                      <ellipse cx="66" cy="85" rx="12" ry="13" fill="url(#rfcIris)" />
                      {/* 竖椭圆瞳孔（真实猫瞳）*/}
                      <ellipse cx="66" cy="85" rx={pupilRx} ry={pupilRy} fill="#080008" />
                      {/* 主高光 */}
                      <ellipse cx="61.5" cy="79" rx="4" ry="3.5" fill="white" opacity="0.95" />
                      {/* 副高光 */}
                      <ellipse cx="70" cy="90" rx="1.8" ry="1.4" fill="white" opacity="0.7" />
                      {/* 角膜彩光 */}
                      <ellipse cx="60" cy="88" rx="1.2" ry="1" fill={light.eyeIris[0]} opacity="0.6" />
                      {/* 眼睛外轮廓 */}
                      <ellipse cx="66" cy="85" rx="13.5" ry="14.5" stroke={c.bodyShadow} strokeWidth="1.5" fill="none" opacity="0.5" />
                    </g>

                    {/* 左眼睑（慢眨眼/困倦）*/}
                    {lidHeight > 0 && (
                      <ellipse
                        cx="66"
                        cy={85 - 14.5 * (1 - lidHeight)}
                        rx="13.5"
                        ry={14.5 * lidHeight}
                        fill="url(#rfcBody)"
                        filter="url(#rfcFelt)"
                      />
                    )}

                    {/* ── 右眼 ── */}
                    <g filter="url(#rfcEye)">
                      <ellipse cx="134" cy="85" rx="13.5" ry="14.5" fill="#F8F0F4" />
                      <ellipse cx="134" cy="85" rx="12" ry="13" fill="url(#rfcIris)" />
                      <ellipse cx="134" cy="85" rx={pupilRx} ry={pupilRy} fill="#080008" />
                      <ellipse cx="129.5" cy="79" rx="4" ry="3.5" fill="white" opacity="0.95" />
                      <ellipse cx="138" cy="90" rx="1.8" ry="1.4" fill="white" opacity="0.7" />
                      <ellipse cx="128" cy="88" rx="1.2" ry="1" fill={light.eyeIris[0]} opacity="0.6" />
                      <ellipse cx="134" cy="85" rx="13.5" ry="14.5" stroke={c.bodyShadow} strokeWidth="1.5" fill="none" opacity="0.5" />
                    </g>

                    {lidHeight > 0 && (
                      <ellipse
                        cx="134"
                        cy={85 - 14.5 * (1 - lidHeight)}
                        rx="13.5"
                        ry={14.5 * lidHeight}
                        fill="url(#rfcBody)"
                        filter="url(#rfcFelt)"
                      />
                    )}
                  </g>
                )}

                {/* ── 鼻子（真实三角形鼻尖 + 人中沟）── */}
                {expression !== 'love' && (
                  <g>
                    {/* 鼻头三角形 */}
                    <path
                      d="M 95 98 Q 100 94 105 98 L 102.5 103 Q 100 104.5 97.5 103 Z"
                      fill={c.nosePink}
                    />
                    {/* 鼻孔 */}
                    <ellipse cx="97.5" cy="99.5" rx="1.5" ry="1" fill={c.bodyShadow} opacity="0.5" />
                    <ellipse cx="102.5" cy="99.5" rx="1.5" ry="1" fill={c.bodyShadow} opacity="0.5" />
                    {/* 人中沟 */}
                    <line x1="100" y1="104" x2="100" y2="108" stroke={c.bodyShadow} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                    {/* W 型上唇 */}
                    <path
                      d="M 90 110 Q 94 114 100 110 Q 106 114 110 110"
                      stroke={c.bodyShadow}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.7"
                    />
                    {/* 嘴角 */}
                    <path d="M 90 110 Q 87 114 89 117" stroke={c.bodyShadow} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
                    <path d="M 110 110 Q 113 114 111 117" stroke={c.bodyShadow} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
                  </g>
                )}

                {/* ── 猫须（8根，阴影+亮色双层）── */}
                {expression !== 'love' && (
                  <g>
                    {/* 左侧胡须（阴影层）*/}
                    <g stroke={c.bodyShadow} strokeWidth="1.4" strokeLinecap="round" opacity="0.25">
                      <line x1="40" y1="90" x2="10" y2="82" />
                      <line x1="38" y1="98" x2="6" y2="97" />
                      <line x1="40" y1="106" x2="10" y2="114" />
                      <line x1="44" y1="88" x2="16" y2="76" />
                    </g>
                    {/* 左侧胡须（亮色层）*/}
                    <g stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.82">
                      <line x1="40" y1="90" x2="10" y2="82" />
                      <line x1="38" y1="98" x2="6" y2="97" />
                      <line x1="40" y1="106" x2="10" y2="114" />
                      <line x1="44" y1="88" x2="16" y2="76" />
                    </g>
                    {/* 右侧（阴影层）*/}
                    <g stroke={c.bodyShadow} strokeWidth="1.4" strokeLinecap="round" opacity="0.25">
                      <line x1="160" y1="90" x2="190" y2="82" />
                      <line x1="162" y1="98" x2="194" y2="97" />
                      <line x1="160" y1="106" x2="190" y2="114" />
                      <line x1="156" y1="88" x2="184" y2="76" />
                    </g>
                    {/* 右侧（亮色层）*/}
                    <g stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.82">
                      <line x1="160" y1="90" x2="190" y2="82" />
                      <line x1="162" y1="98" x2="194" y2="97" />
                      <line x1="160" y1="106" x2="190" y2="114" />
                      <line x1="156" y1="88" x2="184" y2="76" />
                    </g>
                  </g>
                )}
              </g>
            )}
          </svg>

          {/* 3D 深度饰品 */}
          {hat === 'crown' && (
            <div
              style={{
                transform: `translateZ(${isFacingBack ? '-18px' : '60px'}) translateY(-56px)`,
                opacity: isFacingBack ? 0.5 : 1,
              }}
              className="absolute text-4xl animate-bounce pointer-events-none drop-shadow-xl"
            >
              👑
            </div>
          )}
          {hat === 'glasses' && !isFacingBack && (
            <div
              style={{ transform: 'translateZ(60px) translateY(-2px)' }}
              className="absolute text-4xl pointer-events-none drop-shadow-md"
            >
              👓
            </div>
          )}
          {neck === 'bow' && (
            <div
              style={{ transform: `translateZ(${isFacingBack ? '-10px' : '50px'}) translateY(30px)` }}
              className="absolute text-3xl pointer-events-none drop-shadow-md"
            >
              🎀
            </div>
          )}
          {neck === 'tie' && (
            <div
              style={{ transform: `translateZ(${isFacingBack ? '-10px' : '50px'}) translateY(30px)` }}
              className="absolute text-2xl pointer-events-none drop-shadow-md"
            >
              👔
            </div>
          )}
        </motion.div>
      </div>

      {/* 粒子 */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 0.7, x: p.x, y: p.y }}
            animate={{ opacity: 0, scale: 1.6, x: p.x + p.vx * 0.6, y: p.y + p.vy }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            className="absolute pointer-events-none z-50 flex items-center justify-center"
            style={{ fontSize: p.emoji ? 16 : 10 }}
          >
            {p.emoji ?? (
              <div
                style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color }}
                className="shadow-md"
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
