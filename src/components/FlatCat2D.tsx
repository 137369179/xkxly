/**
 * 🐱 FlatCat2D — 统一风格二维动画猫咪组件
 * ─────────────────────────────────────────
 * 与全站 Candy 粉风格完全统一的日系扁平 SVG 猫咪
 *
 * 特性：
 *  • 纯 2D SVG + motion/react 关键帧，无任何 3D 透视
 *  • 4 种颜色方案（糖果粉 / 奶白 / 薰衣草紫 / 阳光橙）
 *  • 内置 8 种表情动画（happy / cute / thinking / sleepy / love / excited / blinking）
 *  • 随机自动眨眼（3~7 秒触发一次）
 *  • 待机柔和漂浮 + 呼吸起伏
 *  • 尾巴左右摇摆（情绪联动速度）
 *  • 耳朵随机微抖（猫咪警觉感）
 *  • 点击产生爱心/星光粒子（纯二维飘升）
 *  • 帽子/领结饰品叠加（SVG 层）
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ── 颜色方案 ──────────────────────────────────────────────
export type FlatCatColor = 'candy-pink' | 'creamy-white' | 'lavender' | 'sunny-orange';

const COLORS: Record<FlatCatColor, {
  body: string;       // 身体主色
  bodyMid: string;    // 身体中间色
  bodyDark: string;   // 身体阴影色
  earInner: string;   // 耳内粉
  chestWhite: string; // 胸前白
  nosePink: string;   // 鼻子粉
  stripe: string;     // 花纹（可选）
  tailTip: string;    // 尾尖
  blush: string;      // 腮红
}> = {
  'candy-pink': {
    body: '#FFD6E8',
    bodyMid: '#FFAAC9',
    bodyDark: '#FF80B0',
    earInner: '#FF85A8',
    chestWhite: '#FFF5F9',
    nosePink: '#FF5C8A',
    stripe: '#FFB3CC',
    tailTip: '#FFEDF5',
    blush: '#FF6BA0',
  },
  'creamy-white': {
    body: '#FFF8EE',
    bodyMid: '#F5E6CC',
    bodyDark: '#E0C898',
    earInner: '#F0C0A0',
    chestWhite: '#FFFFFF',
    nosePink: '#D8907A',
    stripe: '#E8D8B8',
    tailTip: '#FFFDF5',
    blush: '#E8A090',
  },
  'lavender': {
    body: '#EDD6FF',
    bodyMid: '#D4AAFF',
    bodyDark: '#B080E0',
    earInner: '#E0A8FF',
    chestWhite: '#FAF5FF',
    nosePink: '#C070D0',
    stripe: '#DDBCFF',
    tailTip: '#F5EEFF',
    blush: '#C890E8',
  },
  'sunny-orange': {
    body: '#FFE4C0',
    bodyMid: '#FFCA88',
    bodyDark: '#FF9940',
    earInner: '#FFB870',
    chestWhite: '#FFFBF0',
    nosePink: '#E06838',
    stripe: '#FFD098',
    tailTip: '#FFF4DE',
    blush: '#F09060',
  },
};

// ── Props ─────────────────────────────────────────────────
export interface FlatCat2DProps {
  size?: number;
  color?: FlatCatColor;
  expression?: 'happy' | 'cute' | 'thinking' | 'sleepy' | 'love' | 'excited' | 'blinking';
  hat?: string;
  neck?: string;
  onPet?: (e: React.MouseEvent) => void;
  className?: string;
}

// ── 粒子 ──────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  symbol: string;
  dx: number;
}

// ── 主组件 ────────────────────────────────────────────────
export function FlatCat2D({
  size = 200,
  color = 'candy-pink',
  expression = 'happy',
  hat,
  neck,
  onPet,
  className = '',
}: FlatCat2DProps) {
  const c = COLORS[color];
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动眨眼状态
  const [isBlinking, setIsBlinking] = useState(false);
  // 耳朵微抖
  const [earTwitch, setEarTwitch] = useState<'left' | 'right' | null>(null);
  // 挤压（点击反馈）
  const [squash, setSquash] = useState(false);
  // 粒子
  const [particles, setParticles] = useState<Particle[]>([]);

  // ── 生命周期：自动眨眼 + 耳朵微抖 ──
  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    let earTimer: ReturnType<typeof setTimeout>;

    const schedBlink = () => {
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 220);
        schedBlink();
      }, 3000 + Math.random() * 4500);
    };

    const schedEar = () => {
      earTimer = setTimeout(() => {
        const side = Math.random() > 0.5 ? 'left' : 'right';
        setEarTwitch(side);
        setTimeout(() => setEarTwitch(null), 350);
        schedEar();
      }, 2500 + Math.random() * 5000);
    };

    schedBlink();
    schedEar();
    return () => { clearTimeout(blinkTimer); clearTimeout(earTimer); };
  }, []);

  // ── 点击：挤压 + 粒子 ──
  const handleClick = useCallback((e: React.MouseEvent) => {
    setSquash(true);
    setTimeout(() => setSquash(false), 380);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const symbols = ['💖', '✨', '🐟', '⭐', '💕'];
      const newP: Particle[] = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: px + (Math.random() - 0.5) * 40,
        y: py,
        symbol: symbols[i % symbols.length]!,
        dx: (Math.random() - 0.5) * 50,
      }));
      setParticles(prev => [...prev, ...newP]);
      setTimeout(() => setParticles(prev => prev.filter(p => !newP.includes(p))), 1100);
    }

    onPet?.(e);
  }, [onPet]);

  // ── 眼睛绘制（根据表情）──
  const effectiveExp = expression === 'blinking' || isBlinking ? 'blinking' : expression;

  const renderEyes = () => {
    switch (effectiveExp) {
      case 'love':
        // 爱心眼
        return (
          <g>
            <text x="52" y="82" fontSize="20" textAnchor="middle">💕</text>
            <text x="108" y="82" fontSize="20" textAnchor="middle">💕</text>
          </g>
        );
      case 'sleepy':
        // 眯眼横线
        return (
          <g stroke="#3D1A2A" strokeWidth="3.5" strokeLinecap="round">
            <line x1="40" y1="76" x2="64" y2="76" />
            <line x1="96" y1="76" x2="120" y2="76" />
          </g>
        );
      case 'blinking':
        // 弯月闭眼
        return (
          <g stroke="#3D1A2A" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M 40 78 Q 52 86 64 78" />
            <path d="M 96 78 Q 108 86 120 78" />
          </g>
        );
      case 'thinking':
        // 一眼正常一眼眯起
        return (
          <g>
            {/* 左眼（正常圆形）*/}
            <circle cx="52" cy="78" r="11" fill="#1A0A10" />
            <circle cx="52" cy="78" r="9.5" fill="#2A1520" />
            <circle cx="52" cy="78" r="5" fill="#1A0A10" />
            <circle cx="48" cy="74" r="3" fill="white" />
            <circle cx="56" cy="81" r="1.5" fill="white" opacity="0.7" />
            {/* 右眼（眯起横线）*/}
            <line x1="96" y1="76" x2="120" y2="76" stroke="#3D1A2A" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        );
      case 'excited':
        // 星形眼 (用圆形+白色星高光代替)
        return (
          <g>
            <circle cx="52" cy="78" r="13" fill="#1A0A10" />
            <circle cx="52" cy="78" r="11" fill="#3A2040" />
            <text x="52" y="84" fontSize="14" textAnchor="middle">✦</text>
            <circle cx="108" cy="78" r="13" fill="#1A0A10" />
            <circle cx="108" cy="78" r="11" fill="#3A2040" />
            <text x="108" y="84" fontSize="14" textAnchor="middle">✦</text>
          </g>
        );
      default:
        // happy / cute — 大圆眼+高光
        return (
          <g>
            {/* 左眼 */}
            <circle cx="52" cy="78" r="13" fill="#1A0A10" />
            <circle cx="52" cy="78" r="11.5" fill="#2A1020" />
            <ellipse cx="52" cy="78" rx="5" ry="8" fill="#0A0008" />
            <circle cx="47" cy="73" r="4" fill="white" />
            <circle cx="57" cy="82" r="1.8" fill="white" opacity="0.75" />
            {/* 右眼 */}
            <circle cx="108" cy="78" r="13" fill="#1A0A10" />
            <circle cx="108" cy="78" r="11.5" fill="#2A1020" />
            <ellipse cx="108" cy="78" rx="5" ry="8" fill="#0A0008" />
            <circle cx="103" cy="73" r="4" fill="white" />
            <circle cx="113" cy="82" r="1.8" fill="white" opacity="0.75" />
          </g>
        );
    }
  };

  // ── 尾巴摇摆速度 ──
  const tailSpeed = expression === 'excited' ? 0.6 : expression === 'happy' ? 1.4 : 2.2;
  // ── 漂浮幅度 ──
  const floatY = expression === 'sleepy' ? 3 : 6;

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {/* 待机漂浮容器 */}
      <motion.div
        animate={{ y: [0, -floatY, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: '100%', height: '100%' }}
        className="flex items-center justify-center"
      >
        {/* 点击挤压容器 */}
        <motion.div
          animate={squash
            ? { scaleY: 0.82, scaleX: 1.12 }
            : { scaleY: 1, scaleX: 1 }
          }
          transition={{ type: 'spring', stiffness: 420, damping: 14 }}
          style={{ width: '100%', height: '100%' }}
          className="flex items-center justify-center"
        >
          <svg
            viewBox="0 0 160 170"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ── 地面软阴影 ── */}
            <ellipse cx="80" cy="162" rx="52" ry="8" fill="#C060A0" opacity="0.12" />

            {/* ── 尾巴（摇摆）── */}
            <motion.g
              animate={{ rotate: [12, -12, 12] }}
              transition={{ duration: tailSpeed, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '118px 130px' }}
            >
              <path
                d="M 118 130 Q 148 110 142 80 Q 138 62 128 72"
                stroke={c.bodyMid}
                strokeWidth="11"
                strokeLinecap="round"
                fill="none"
              />
              {/* 尾尖白 */}
              <circle cx="128" cy="72" r="6" fill={c.tailTip} />
              <circle cx="128" cy="72" r="4" fill="white" opacity="0.5" />
            </motion.g>

            {/* ── 身体 ── */}
            <ellipse cx="80" cy="128" rx="46" ry="38" fill={c.body} />
            <ellipse cx="80" cy="128" rx="46" ry="38" fill={c.bodyMid} opacity="0.25" />
            {/* 胸前白绒毛 */}
            <ellipse cx="80" cy="132" rx="28" ry="22" fill={c.chestWhite} opacity="0.92" />

            {/* ── 前爪 ── */}
            <ellipse cx="50" cy="156" rx="14" ry="9" fill={c.bodyMid} />
            <ellipse cx="50" cy="156" rx="11" ry="7" fill={c.chestWhite} opacity="0.9" />
            {/* 爪趾线 */}
            <path d="M 42 156 Q 50 152 58 156" stroke={c.bodyDark} strokeWidth="1.2" fill="none" opacity="0.4" />
            {/* 小肉垫 */}
            <ellipse cx="50" cy="158" rx="3.5" ry="2.5" fill={c.nosePink} opacity="0.55" />

            <ellipse cx="110" cy="156" rx="14" ry="9" fill={c.bodyMid} />
            <ellipse cx="110" cy="156" rx="11" ry="7" fill={c.chestWhite} opacity="0.9" />
            <path d="M 102 156 Q 110 152 118 156" stroke={c.bodyDark} strokeWidth="1.2" fill="none" opacity="0.4" />
            <ellipse cx="110" cy="158" rx="3.5" ry="2.5" fill={c.nosePink} opacity="0.55" />

            {/* ── 左耳 ── */}
            <motion.g
              animate={earTwitch === 'left' ? { rotate: -10 } : { rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              style={{ transformOrigin: '38px 54px' }}
            >
              <path d="M 38 54 L 14 16 Q 34 18 60 38 Z" fill={c.body} stroke={c.bodyMid} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M 38 52 L 22 22 Q 36 24 56 40 Z" fill={c.earInner} opacity="0.8" />
            </motion.g>

            {/* ── 右耳 ── */}
            <motion.g
              animate={earTwitch === 'right' ? { rotate: 10 } : { rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              style={{ transformOrigin: '122px 54px' }}
            >
              <path d="M 122 54 L 146 16 Q 126 18 100 38 Z" fill={c.body} stroke={c.bodyMid} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M 122 52 L 138 22 Q 124 24 104 40 Z" fill={c.earInner} opacity="0.8" />
            </motion.g>

            {/* ── 头部 ── */}
            <ellipse cx="80" cy="72" rx="48" ry="42" fill={c.body} />
            {/* 头部高光（左上柔和）*/}
            <ellipse cx="60" cy="55" rx="24" ry="18" fill="white" opacity="0.18" />
            {/* 头部描边 */}
            <ellipse cx="80" cy="72" rx="48" ry="42" stroke={c.bodyMid} strokeWidth="1.8" fill="none" opacity="0.6" />

            {/* ── 腮红 ── */}
            <ellipse cx="32" cy="90" rx="12" ry="7" fill={c.blush} opacity="0.28" />
            <ellipse cx="128" cy="90" rx="12" ry="7" fill={c.blush} opacity="0.28" />

            {/* ── 眼睛（按表情切换）── */}
            {renderEyes()}

            {/* ── 鼻子 ── */}
            <path d="M 76 90 Q 80 86 84 90 L 82 95 Q 80 96.5 78 95 Z" fill={c.nosePink} />
            {/* 人中线 */}
            <line x1="80" y1="95" x2="80" y2="100" stroke={c.bodyDark} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
            {/* W 唇 */}
            <path
              d="M 71 103 Q 76 108 80 104 Q 84 108 89 103"
              stroke={c.bodyDark}
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.6"
            />

            {/* ── 猫须（6 根，双层增加立体感）── */}
            <g opacity="0.72" strokeLinecap="round">
              <line x1="28" y1="87" x2="4" y2="80" stroke={c.bodyDark} strokeWidth="1.2" opacity="0.25" />
              <line x1="26" y1="93" x2="2" y2="93" stroke={c.bodyDark} strokeWidth="1.2" opacity="0.25" />
              <line x1="28" y1="99" x2="4" y2="106" stroke={c.bodyDark} strokeWidth="1.2" opacity="0.25" />
              <line x1="28" y1="87" x2="4" y2="80" stroke="white" strokeWidth="1.5" />
              <line x1="26" y1="93" x2="2" y2="93" stroke="white" strokeWidth="1.5" />
              <line x1="28" y1="99" x2="4" y2="106" stroke="white" strokeWidth="1.5" />

              <line x1="132" y1="87" x2="156" y2="80" stroke={c.bodyDark} strokeWidth="1.2" opacity="0.25" />
              <line x1="134" y1="93" x2="158" y2="93" stroke={c.bodyDark} strokeWidth="1.2" opacity="0.25" />
              <line x1="132" y1="99" x2="156" y2="106" stroke={c.bodyDark} strokeWidth="1.2" opacity="0.25" />
              <line x1="132" y1="87" x2="156" y2="80" stroke="white" strokeWidth="1.5" />
              <line x1="134" y1="93" x2="158" y2="93" stroke="white" strokeWidth="1.5" />
              <line x1="132" y1="99" x2="156" y2="106" stroke="white" strokeWidth="1.5" />
            </g>

            {/* ── 饰品：帽子 ── */}
            {hat === 'crown' && (
              <g transform="translate(80, 28)">
                {/* 皇冠底座 */}
                <rect x="-22" y="0" width="44" height="10" rx="4" fill="#FFD700" stroke="#E8A000" strokeWidth="1.5" />
                {/* 三个冠尖 */}
                <polygon points="-22,0 -14,-18 -6,0" fill="#FFD700" stroke="#E8A000" strokeWidth="1.5" />
                <polygon points="-4,0 4,-24 12,0" fill="#FFE040" stroke="#E8A000" strokeWidth="1.5" />
                <polygon points="6,0 14,-18 22,0" fill="#FFD700" stroke="#E8A000" strokeWidth="1.5" />
                {/* 宝石 */}
                <circle cx="0" cy="-12" r="4" fill="#FF4488" stroke="white" strokeWidth="1" />
                <circle cx="-14" cy="-8" r="3" fill="#FF88CC" stroke="white" strokeWidth="1" />
                <circle cx="14" cy="-8" r="3" fill="#FF88CC" stroke="white" strokeWidth="1" />
              </g>
            )}
            {hat === 'glasses' && (
              <g transform="translate(80, 74)" opacity="0.9">
                <circle cx="-28" cy="0" r="13" stroke="#8060A8" strokeWidth="2.5" fill="none" />
                <circle cx="28" cy="0" r="13" stroke="#8060A8" strokeWidth="2.5" fill="none" />
                <circle cx="-28" cy="0" r="13" fill="#C0A8F0" opacity="0.25" />
                <circle cx="28" cy="0" r="13" fill="#C0A8F0" opacity="0.25" />
                <line x1="-15" y1="0" x2="15" y2="0" stroke="#8060A8" strokeWidth="2" />
                <line x1="-42" y1="-4" x2="-41" y2="-4" stroke="#8060A8" strokeWidth="2" strokeLinecap="round" />
                <line x1="41" y1="-4" x2="42" y2="-4" stroke="#8060A8" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

            {/* ── 饰品：领部 ── */}
            {neck === 'bow' && (
              <g transform="translate(80, 115)">
                {/* 蝴蝶结左翼 */}
                <path d="M -18 0 Q -26 -10 -16 -14 Q -8 -10 0 0" fill="#FF85A8" stroke="#FF5C8A" strokeWidth="1.2" />
                {/* 蝴蝶结右翼 */}
                <path d="M 18 0 Q 26 -10 16 -14 Q 8 -10 0 0" fill="#FF85A8" stroke="#FF5C8A" strokeWidth="1.2" />
                {/* 蝴蝶结中心 */}
                <circle cx="0" cy="-7" r="5" fill="#FF5C8A" />
                <circle cx="0" cy="-7" r="2.5" fill="#FFAAC9" />
              </g>
            )}
            {neck === 'tie' && (
              <g transform="translate(80, 112)">
                <polygon points="0,-4 -10,8 0,22 10,8" fill="#6040C8" stroke="#4020A0" strokeWidth="1" />
                <polygon points="-6,-10 6,-10 8,-4 -8,-4" fill="#8060E0" stroke="#4020A0" strokeWidth="1" />
                <line x1="0" y1="2" x2="0" y2="16" stroke="#8060E0" strokeWidth="1" opacity="0.5" />
              </g>
            )}
          </svg>
        </motion.div>
      </motion.div>

      {/* ── 粒子特效 ── */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 0.5, x: p.x, y: p.y }}
            animate={{ opacity: 0, scale: 1.4, x: p.x + p.dx, y: p.y - 55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            className="absolute pointer-events-none z-50 text-base"
            style={{ fontSize: 16 }}
          >
            {p.symbol}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
