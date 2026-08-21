/**
 * 🐱 FlatCat2D — 3D 毛绒质感拟真多部位互动猫咪「小茜」
 * ─────────────────────────────────────────────────────────────
 * 特性：
 *  • 3D 毛绒光影：多重线性与径向渐变，高光柔化、晶莹琉璃动漫大眼（带星光反射）
 *  • 7 大身体部位独立触控热区（耳朵/额头/腮红脸颊/鼻尖/肚皮/肉垫小爪/尾巴）
 *  • 触碰不同位置触发专属微动动画、粒子特效与 Web Audio 真实音效（呼噜/喵叫/弹簧/水泡/魔杖/击掌）
 *  • 10 种生动表情：happy / cute / excited / thinking / sleepy / love / blinking / tickled / singing / proud
 *  • 动态生命体征：自然呼吸起伏、自动眨眼（3~5s）、耳朵灵动微抖、尾巴摇摆联动情绪
 *  • 丰富换装配饰：皇冠 👑、魔法帽 🧙、蝴蝶结 🎀、暖围巾 🧣、酷墨镜 🕶️
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  sfxPurr, sfxBoing, sfxBubble, sfxMagic, sfxMeow, sfxPraise,
} from '@/lib/sfx';

// ── 身体互动部位 ───────────────────────────────────────────
export type PetTouchZone =
  | 'ears'
  | 'forehead'
  | 'cheeks'
  | 'nose'
  | 'belly'
  | 'paws'
  | 'tail';

// ── 颜色方案 ──────────────────────────────────────────────
export type FlatCatColor = 'candy-pink' | 'creamy-white' | 'lavender' | 'sunny-orange';

const COLORS: Record<FlatCatColor, {
  bodyLight: string;
  bodyMid: string;
  bodyDark: string;
  earInnerLight: string;
  earInnerDark: string;
  chestWhite: string;
  nosePink: string;
  tailTip: string;
  blush: string;
  eyeBase: string;
  eyeHighlight: string;
  pawPad: string;
}> = {
  'candy-pink': {
    bodyLight: '#FFF0F6',
    bodyMid: '#FFD1E3',
    bodyDark: '#FFA0C2',
    earInnerLight: '#FFAEC9',
    earInnerDark: '#FF6B96',
    chestWhite: '#FFFFFF',
    nosePink: '#FF4D80',
    tailTip: '#FFF5FA',
    blush: '#FF70A2',
    eyeBase: '#2C0D22',
    eyeHighlight: '#7A1C5A',
    pawPad: '#FF5489',
  },
  'creamy-white': {
    bodyLight: '#FFFDF9',
    bodyMid: '#FCEFD8',
    bodyDark: '#E6CFAB',
    earInnerLight: '#F7C6B0',
    earInnerDark: '#E0987A',
    chestWhite: '#FFFFFF',
    nosePink: '#E07860',
    tailTip: '#FFFFFF',
    blush: '#F09888',
    eyeBase: '#1F1710',
    eyeHighlight: '#5E4129',
    pawPad: '#E87D65',
  },
  'lavender': {
    bodyLight: '#FAF5FF',
    bodyMid: '#E6D4FF',
    bodyDark: '#BF9EFF',
    earInnerLight: '#E3B8FF',
    earInnerDark: '#B875FF',
    chestWhite: '#FFFFFF',
    nosePink: '#B554E6',
    tailTip: '#F7EFFF',
    blush: '#C77DFF',
    eyeBase: '#1D0F2E',
    eyeHighlight: '#5A2694',
    pawPad: '#B34FE6',
  },
  'sunny-orange': {
    bodyLight: '#FFF9F0',
    bodyMid: '#FFE2B8',
    bodyDark: '#FFB86B',
    earInnerLight: '#FFC896',
    earInnerDark: '#FF8A3D',
    chestWhite: '#FFFFFF',
    nosePink: '#F25822',
    tailTip: '#FFF8EB',
    blush: '#FF844B',
    eyeBase: '#2B1408',
    eyeHighlight: '#753811',
    pawPad: '#F05824',
  },
};

export type CatExpressionType =
  | 'happy'
  | 'cute'
  | 'thinking'
  | 'sleepy'
  | 'love'
  | 'excited'
  | 'blinking'
  | 'tickled'
  | 'singing'
  | 'proud';

// ── Props ─────────────────────────────────────────────────
export interface FlatCat2DProps {
  size?: number;
  color?: FlatCatColor;
  expression?: CatExpressionType;
  hat?: string;
  neck?: string;
  onPet?: (e: React.MouseEvent) => void;
  onInteractZone?: (zone: PetTouchZone, e: React.MouseEvent) => void;
  interactive?: boolean;
  className?: string;
}

// ── 粒子 ──────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  symbol: string;
  dx: number;
  dy: number;
}

// ── 主组件 ────────────────────────────────────────────────
export function FlatCat2D({
  size = 200,
  color = 'candy-pink',
  expression = 'happy',
  hat,
  neck,
  onPet,
  onInteractZone,
  interactive = true,
  className = '',
}: FlatCat2DProps) {
  const c = COLORS[color];
  const containerRef = useRef<HTMLDivElement>(null);

  // 临时表情与局部动画
  const [tempExpression, setTempExpression] = useState<CatExpressionType | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [earTwitch, setEarTwitch] = useState<'left' | 'right' | 'both' | null>(null);
  const [activeZone, setActiveZone] = useState<PetTouchZone | null>(null);
  const [pawWave, setPawWave] = useState(false);
  const [noseSneeze, setNoseSneeze] = useState(false);
  const [tailFlick, setTailFlick] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const currentExp = tempExpression ?? (isBlinking ? 'blinking' : expression);

  // ── 生命周期：自主生命节律（自动眨眼 + 偶尔动耳）──
  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    let earTimer: ReturnType<typeof setTimeout>;

    const schedBlink = () => {
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 240);
        schedBlink();
      }, 3000 + Math.random() * 3500);
    };

    const schedEar = () => {
      earTimer = setTimeout(() => {
        const side = Math.random() > 0.6 ? 'both' : Math.random() > 0.5 ? 'left' : 'right';
        setEarTwitch(side);
        setTimeout(() => setEarTwitch(null), 400);
        schedEar();
      }, 3500 + Math.random() * 4500);
    };

    schedBlink();
    schedEar();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(earTimer);
    };
  }, []);

  // ── 产生喷发粒子 ──
  const spawnParticles = useCallback((e: React.MouseEvent, symbols: string[]) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const newP: Particle[] = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      x: px + (Math.random() - 0.5) * 30,
      y: py,
      symbol: symbols[i % symbols.length] ?? '✨',
      dx: (Math.random() - 0.5) * 60,
      dy: -40 - Math.random() * 40,
    }));
    setParticles((prev) => [...prev, ...newP]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newP.includes(p)));
    }, 1000);
  }, []);

  // ── 多部位交互派发器 ──
  const handleZoneTouch = (zone: PetTouchZone, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactive) return;

    setActiveZone(zone);
    setTimeout(() => setActiveZone(null), 600);

    // 默认内置行为与音效
    switch (zone) {
      case 'ears':
        sfxBoing();
        sfxMeow();
        setEarTwitch('both');
        setTempExpression('cute');
        spawnParticles(e, ['🎵', '✨', '🐾']);
        break;
      case 'forehead':
        sfxPurr();
        setTempExpression('love');
        spawnParticles(e, ['💖', '💕', '🌸']);
        break;
      case 'cheeks':
        sfxBubble();
        setTempExpression('happy');
        spawnParticles(e, ['🍓', '🌸', '✨']);
        break;
      case 'nose':
        sfxMagic();
        setNoseSneeze(true);
        setTempExpression('thinking');
        spawnParticles(e, ['✨', '⭐', '💫']);
        setTimeout(() => setNoseSneeze(false), 500);
        break;
      case 'belly':
        sfxBoing();
        sfxPurr();
        setTempExpression('tickled');
        spawnParticles(e, ['🫧', '🎈', '💖']);
        break;
      case 'paws':
        sfxPraise();
        setPawWave(true);
        setTempExpression('excited');
        spawnParticles(e, ['🐾', '🌟', '👏']);
        setTimeout(() => setPawWave(false), 650);
        break;
      case 'tail':
        sfxMeow();
        setTailFlick(true);
        setTempExpression('happy');
        spawnParticles(e, ['💫', '🌈', '✨']);
        setTimeout(() => setTailFlick(false), 700);
        break;
    }

    // 1.4秒后恢复原始表情
    setTimeout(() => {
      setTempExpression(null);
      setEarTwitch(null);
    }, 1400);

    onInteractZone?.(zone, e);
    onPet?.(e);
  };

  // ── 眼睛绘制（10 种高精细表情）──
  const renderEyes = () => {
    switch (currentExp) {
      case 'love':
        return (
          <g>
            <text x="52" y="85" fontSize="22" textAnchor="middle" fill="#FF4D80">💖</text>
            <text x="108" y="85" fontSize="22" textAnchor="middle" fill="#FF4D80">💖</text>
          </g>
        );
      case 'sleepy':
        return (
          <g stroke="#3D1A2A" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M 40 78 Q 52 74 64 78" />
            <path d="M 96 78 Q 108 74 120 78" />
            {/* Zzz 气泡 */}
            <motion.text
              x="122"
              y="60"
              fontSize="12"
              fill="#C080E0"
              fontWeight="bold"
              animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            >
              zZz
            </motion.text>
          </g>
        );
      case 'blinking':
        return (
          <g stroke="#3D1A2A" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M 40 78 Q 52 87 64 78" />
            <path d="M 96 78 Q 108 87 120 78" />
          </g>
        );
      case 'tickled':
        return (
          <g stroke="#3D1A2A" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M 42 78 L 52 73 L 62 78" />
            <path d="M 98 78 L 108 73 L 118 78" />
          </g>
        );
      case 'excited':
        return (
          <g>
            {/* 左眼星光 */}
            <circle cx="52" cy="78" r="13" fill={c.eyeBase} />
            <circle cx="52" cy="78" r="11" fill={c.eyeHighlight} />
            <text x="52" y="85" fontSize="15" textAnchor="middle" fill="#FFE58F">✦</text>
            {/* 右眼星光 */}
            <circle cx="108" cy="78" r="13" fill={c.eyeBase} />
            <circle cx="108" cy="78" r="11" fill={c.eyeHighlight} />
            <text x="108" y="85" fontSize="15" textAnchor="middle" fill="#FFE58F">✦</text>
          </g>
        );
      case 'thinking':
        return (
          <g>
            {/* 左眼向上看 */}
            <circle cx="52" cy="78" r="12" fill={c.eyeBase} />
            <circle cx="52" cy="78" r="10" fill={c.eyeHighlight} />
            <ellipse cx="50" cy="74" rx="5" ry="6" fill="#0A0008" />
            <circle cx="48" cy="71" r="3.2" fill="white" />
            <circle cx="53" cy="77" r="1.4" fill="white" opacity="0.8" />
            {/* 右眼好奇眯起 */}
            <path d="M 98 78 Q 108 72 118 78" stroke="#3D1A2A" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          </g>
        );
      case 'singing':
        return (
          <g>
            <path d="M 40 78 Q 52 86 64 78" stroke="#3D1A2A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 96 78 Q 108 86 120 78" stroke="#3D1A2A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <motion.text
              x="126"
              y="62"
              fontSize="14"
              fill="#FF6090"
              animate={{ y: [0, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              🎵
            </motion.text>
          </g>
        );
      default:
        // happy / cute 晶莹琉璃星光大眼
        return (
          <g>
            {/* 左眼 */}
            <circle cx="52" cy="78" r="13.5" fill={c.eyeBase} />
            <circle cx="52" cy="78" r="11.5" fill="url(#catEyeGrad)" />
            <ellipse cx="52" cy="78" rx="5.5" ry="8.5" fill="#0A0008" />
            {/* 双高光 */}
            <circle cx="47" cy="72" r="4.2" fill="white" />
            <circle cx="57" cy="82" r="2" fill="white" opacity="0.85" />
            <circle cx="45" cy="81" r="1" fill="#70D8FF" opacity="0.7" />

            {/* 右眼 */}
            <circle cx="108" cy="78" r="13.5" fill={c.eyeBase} />
            <circle cx="108" cy="78" r="11.5" fill="url(#catEyeGrad)" />
            <ellipse cx="108" cy="78" rx="5.5" ry="8.5" fill="#0A0008" />
            {/* 双高光 */}
            <circle cx="103" cy="72" r="4.2" fill="white" />
            <circle cx="113" cy="82" r="2" fill="white" opacity="0.85" />
            <circle cx="101" cy="81" r="1" fill="#70D8FF" opacity="0.7" />
          </g>
        );
    }
  };

  // ── 嘴巴绘制 ──
  const renderMouth = () => {
    if (currentExp === 'singing') {
      return <ellipse cx="80" cy="104" rx="4.5" ry="6" fill="#FF4D80" stroke="#3D1A2A" strokeWidth="1.5" />;
    }
    if (currentExp === 'tickled' || currentExp === 'excited') {
      return (
        <g>
          <path
            d="M 72 101 Q 80 112 88 101 Z"
            fill="#FF4D80"
            stroke="#3D1A2A"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* 小舌头 */}
          <path d="M 76 106 Q 80 110 84 106" fill="#FFAAC9" />
        </g>
      );
    }
    return (
      <path
        d="M 71 103 Q 76 108 80 104 Q 84 108 89 103"
        stroke="#3D1A2A"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
    );
  };

  const tailSpeed = tailFlick ? 0.35 : currentExp === 'excited' ? 0.6 : currentExp === 'happy' ? 1.3 : 2.0;

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${interactive ? 'cursor-pointer' : ''} ${className}`}
      onClick={(e) => handleZoneTouch('forehead', e)}
    >
      {/* 待机柔和漂浮容器 */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: '100%', height: '100%' }}
        className="flex items-center justify-center"
      >
        {/* 挤压/弹跳容器 */}
        <motion.div
          animate={
            activeZone === 'belly'
              ? { scale: [1, 1.15, 0.92, 1.05, 1], rotate: [0, -6, 6, -3, 0] }
              : activeZone === 'forehead'
                ? { scaleY: 0.88, scaleX: 1.08 }
                : noseSneeze
                  ? { scale: [1, 1.25, 0.95, 1], rotate: [0, -4, 4, 0] }
                  : { scaleY: 1, scaleX: 1, rotate: 0 }
          }
          transition={{ type: 'spring', stiffness: 450, damping: 15 }}
          style={{ width: '100%', height: '100%' }}
          className="flex items-center justify-center"
        >
          <svg
            viewBox="0 0 160 170"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 身体主渐变 */}
              <radialGradient id="catBodyGrad" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor={c.bodyLight} />
                <stop offset="60%" stopColor={c.bodyMid} />
                <stop offset="100%" stopColor={c.bodyDark} />
              </radialGradient>

              {/* 头部渐变 */}
              <radialGradient id="catHeadGrad" cx="42%" cy="38%" r="60%">
                <stop offset="0%" stopColor={c.bodyLight} />
                <stop offset="65%" stopColor={c.bodyMid} />
                <stop offset="100%" stopColor={c.bodyDark} />
              </radialGradient>

              {/* 耳内粉嫩渐变 */}
              <linearGradient id="catInnerEarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c.earInnerLight} />
                <stop offset="100%" stopColor={c.earInnerDark} />
              </linearGradient>

              {/* 琉璃眼睛渐变 */}
              <linearGradient id="catEyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={c.eyeHighlight} />
                <stop offset="100%" stopColor={c.eyeBase} />
              </linearGradient>

              {/* 腮红径向柔光 */}
              <radialGradient id="catBlushGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={c.blush} stopOpacity="0.6" />
                <stop offset="100%" stopColor={c.blush} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ── 阴影 ── */}
            <ellipse cx="80" cy="162" rx="54" ry="9" fill="#B04080" opacity="0.14" />

            {/* ── 尾巴（点击热区：tail）── */}
            <motion.g
              animate={tailFlick ? { rotate: [-30, 30, -20, 20, 0] } : { rotate: [14, -14, 14] }}
              transition={{ duration: tailSpeed, repeat: tailFlick ? 1 : Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '118px 130px' }}
              onClick={(e) => handleZoneTouch('tail', e)}
              className="cursor-pointer"
            >
              <path
                d="M 118 130 Q 152 108 144 76 Q 138 58 126 68"
                stroke={c.bodyMid}
                strokeWidth="13"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 118 130 Q 152 108 144 76 Q 138 58 126 68"
                stroke={c.bodyLight}
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
                opacity="0.6"
              />
              {/* 尾尖白毛球 */}
              <circle cx="126" cy="68" r="7" fill={c.tailTip} />
              <circle cx="125" cy="66" r="4.5" fill="white" opacity="0.7" />
            </motion.g>

            {/* ── 身体（点击热区：belly）── */}
            <g onClick={(e) => handleZoneTouch('belly', e)} className="cursor-pointer">
              <ellipse cx="80" cy="128" rx="48" ry="40" fill="url(#catBodyGrad)" stroke={c.bodyDark} strokeWidth="1.5" />
              {/* 胸前白色软绒毛 */}
              <ellipse cx="80" cy="132" rx="30" ry="24" fill={c.chestWhite} opacity="0.95" />
              <path d="M 74 122 Q 80 128 86 122 Q 80 134 74 122 Z" fill={c.bodyLight} opacity="0.7" />
            </g>

            {/* ── 前爪（点击热区：paws）── */}
            <motion.g
              animate={pawWave ? { y: [0, -12, 0, -8, 0], scale: [1, 1.2, 1] } : { y: 0 }}
              transition={{ duration: 0.6 }}
              onClick={(e) => handleZoneTouch('paws', e)}
              className="cursor-pointer"
            >
              {/* 左前爪 */}
              <g transform="translate(50, 156)">
                <ellipse cx="0" cy="0" rx="14" ry="9" fill={c.bodyLight} stroke={c.bodyDark} strokeWidth="1.2" />
                {/* 三颗小肉垫 */}
                <circle cx="-5" cy="-2" r="2.2" fill={c.pawPad} opacity="0.7" />
                <circle cx="0" cy="-3.5" r="2.5" fill={c.pawPad} opacity="0.8" />
                <circle cx="5" cy="-2" r="2.2" fill={c.pawPad} opacity="0.7" />
                <ellipse cx="0" cy="2" rx="4" ry="2.8" fill={c.pawPad} opacity="0.85" />
              </g>

              {/* 右前爪 */}
              <g transform="translate(110, 156)">
                <ellipse cx="0" cy="0" rx="14" ry="9" fill={c.bodyLight} stroke={c.bodyDark} strokeWidth="1.2" />
                <circle cx="-5" cy="-2" r="2.2" fill={c.pawPad} opacity="0.7" />
                <circle cx="0" cy="-3.5" r="2.5" fill={c.pawPad} opacity="0.8" />
                <circle cx="5" cy="-2" r="2.2" fill={c.pawPad} opacity="0.7" />
                <ellipse cx="0" cy="2" rx="4" ry="2.8" fill={c.pawPad} opacity="0.85" />
              </g>
            </motion.g>

            {/* ── 左耳（点击热区：ears）── */}
            <motion.g
              animate={
                earTwitch === 'left' || earTwitch === 'both'
                  ? { rotate: [-16, 16, -10, 10, 0] }
                  : { rotate: 0 }
              }
              transition={{ duration: 0.35 }}
              style={{ transformOrigin: '38px 54px' }}
              onClick={(e) => handleZoneTouch('ears', e)}
              className="cursor-pointer"
            >
              <path
                d="M 38 54 L 12 14 C 28 14 46 24 60 38 Z"
                fill="url(#catBodyGrad)"
                stroke={c.bodyDark}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M 36 50 L 18 20 C 30 20 44 28 54 40 Z"
                fill="url(#catInnerEarGrad)"
                opacity="0.9"
              />
            </motion.g>

            {/* ── 右耳（点击热区：ears）── */}
            <motion.g
              animate={
                earTwitch === 'right' || earTwitch === 'both'
                  ? { rotate: [16, -16, 10, -10, 0] }
                  : { rotate: 0 }
              }
              transition={{ duration: 0.35 }}
              style={{ transformOrigin: '122px 54px' }}
              onClick={(e) => handleZoneTouch('ears', e)}
              className="cursor-pointer"
            >
              <path
                d="M 122 54 L 148 14 C 132 14 114 24 100 38 Z"
                fill="url(#catBodyGrad)"
                stroke={c.bodyDark}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M 124 50 L 142 20 C 130 20 116 28 106 40 Z"
                fill="url(#catInnerEarGrad)"
                opacity="0.9"
              />
            </motion.g>

            {/* ── 头部（点击热区：forehead）── */}
            <g onClick={(e) => handleZoneTouch('forehead', e)} className="cursor-pointer">
              <ellipse cx="80" cy="72" rx="50" ry="44" fill="url(#catHeadGrad)" stroke={c.bodyDark} strokeWidth="1.6" />
              {/* 额头柔和高光 */}
              <ellipse cx="64" cy="52" rx="26" ry="16" fill="white" opacity="0.32" />
            </g>

            {/* ── 腮红（点击热区：cheeks）── */}
            <g onClick={(e) => handleZoneTouch('cheeks', e)} className="cursor-pointer">
              <ellipse cx="30" cy="90" rx="14" ry="8" fill="url(#catBlushGrad)" />
              <ellipse cx="130" cy="90" rx="14" ry="8" fill="url(#catBlushGrad)" />
              {/* 腮红点点 */}
              <circle cx="28" cy="89" r="1.5" fill="white" opacity="0.6" />
              <circle cx="132" cy="89" r="1.5" fill="white" opacity="0.6" />
            </g>

            {/* ── 眼睛 ── */}
            {renderEyes()}

            {/* ── 鼻尖（点击热区：nose）── */}
            <g onClick={(e) => handleZoneTouch('nose', e)} className="cursor-pointer">
              <polygon points="80,95 75,89 85,89" fill={c.nosePink} />
              <circle cx="80" cy="90" r="1.2" fill="white" opacity="0.7" />
              {/* 人中 */}
              <line x1="80" y1="95" x2="80" y2="100" stroke="#3D1A2A" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
            </g>

            {/* ── 嘴巴 ── */}
            {renderMouth()}

            {/* ── 猫须（6 根带有微弹弧度）── */}
            <g opacity="0.8" strokeLinecap="round">
              <line x1="28" y1="87" x2="4" y2="82" stroke="white" strokeWidth="1.8" />
              <line x1="26" y1="93" x2="2" y2="94" stroke="white" strokeWidth="1.8" />
              <line x1="28" y1="99" x2="6" y2="106" stroke="white" strokeWidth="1.8" />

              <line x1="132" y1="87" x2="156" y2="82" stroke="white" strokeWidth="1.8" />
              <line x1="134" y1="93" x2="158" y2="94" stroke="white" strokeWidth="1.8" />
              <line x1="132" y1="99" x2="154" y2="106" stroke="white" strokeWidth="1.8" />
            </g>

            {/* ── 饰品：帽子 ── */}
            {hat === 'crown' && (
              <g transform="translate(80, 26)">
                <rect x="-24" y="0" width="48" height="10" rx="4" fill="#FFD700" stroke="#E8A000" strokeWidth="1.5" />
                <polygon points="-24,0 -16,-20 -8,0" fill="#FFD700" stroke="#E8A000" strokeWidth="1.5" />
                <polygon points="-6,0 4,-26 14,0" fill="#FFE040" stroke="#E8A000" strokeWidth="1.5" />
                <polygon points="8,0 16,-20 24,0" fill="#FFD700" stroke="#E8A000" strokeWidth="1.5" />
                <circle cx="4" cy="-14" r="4.5" fill="#FF4488" stroke="white" strokeWidth="1.2" />
                <circle cx="-16" cy="-8" r="3.2" fill="#FF88CC" stroke="white" strokeWidth="1" />
                <circle cx="16" cy="-8" r="3.2" fill="#FF88CC" stroke="white" strokeWidth="1" />
              </g>
            )}
            {hat === 'magic' && (
              <g transform="translate(80, 28)">
                <ellipse cx="0" cy="2" rx="36" ry="7" fill="#6B3FA0" stroke="#482575" strokeWidth="1.5" />
                <path d="M -22 2 Q 0 -36 22 -32 L 20 2 Z" fill="#804CC4" stroke="#482575" strokeWidth="1.5" />
                <rect x="-22" y="-4" width="42" height="6" fill="#FFAA00" />
                <text x="0" y="-12" fontSize="12" fill="#FFEA88" textAnchor="middle">★</text>
              </g>
            )}
            {hat === 'glasses' && (
              <g transform="translate(80, 74)" opacity="0.95">
                <circle cx="-28" cy="0" r="14" stroke="#7E57C2" strokeWidth="2.8" fill="#EDE7F6" fillOpacity="0.25" />
                <circle cx="28" cy="0" r="14" stroke="#7E57C2" strokeWidth="2.8" fill="#EDE7F6" fillOpacity="0.25" />
                <line x1="-14" y1="0" x2="14" y2="0" stroke="#7E57C2" strokeWidth="2.5" />
                <line x1="-42" y1="-4" x2="-41" y2="-4" stroke="#7E57C2" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="41" y1="-4" x2="42" y2="-4" stroke="#7E57C2" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {/* ── 饰品：领部 ── */}
            {neck === 'bow' && (
              <g transform="translate(80, 115)">
                <path d="M -20 0 Q -30 -12 -18 -16 Q -8 -10 0 0" fill="#FF6B96" stroke="#E04070" strokeWidth="1.4" />
                <path d="M 20 0 Q 30 -12 18 -16 Q 8 -10 0 0" fill="#FF6B96" stroke="#E04070" strokeWidth="1.4" />
                <circle cx="0" cy="-8" r="6" fill="#FF4078" />
                <circle cx="0" cy="-8" r="3" fill="#FFAAC9" />
              </g>
            )}
            {neck === 'scarf' && (
              <g transform="translate(80, 114)">
                <path d="M -30 -4 Q 0 10 30 -4 Q 0 16 -30 -4" fill="#FF5722" stroke="#D84315" strokeWidth="1.5" />
                <rect x="8" y="2" width="12" height="22" rx="3" fill="#FF7043" stroke="#D84315" strokeWidth="1.2" />
              </g>
            )}
            {neck === 'tie' && (
              <g transform="translate(80, 112)">
                <polygon points="0,-4 -11,9 0,24 11,9" fill="#5C6BC0" stroke="#3949AB" strokeWidth="1.2" />
                <polygon points="-7,-10 7,-10 9,-4 -9,-4" fill="#7986CB" stroke="#3949AB" strokeWidth="1.2" />
              </g>
            )}
          </svg>
        </motion.div>
      </motion.div>

      {/* ── 触摸喷发粒子系统 ── */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 0.6, x: p.x, y: p.y }}
            animate={{ opacity: 0, scale: 1.5, x: p.x + p.dx, y: p.y + p.dy }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="pointer-events-none absolute z-50 text-lg font-bold"
          >
            {p.symbol}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
