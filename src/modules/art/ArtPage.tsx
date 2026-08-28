/**
 * 3D 羊毛毡艺术创意与色彩调配工坊 🎨 (Art & Color Workshop)
 * ------------------------------------------------------------
 * 1. 魔法调色盘 (Color Mixer: 10种双色调色配方)
 * 2. 自由画板 (Free Drawing Canvas)
 * 3. 羊毛毡几何形状创意拼画 (Felt Shape Collage)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { sfxTap, sfxMagic, sfxPraise, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore, useMastery } from '@/store/useStore';
import { ColorExplore } from '@/components/games/ColorExplore';
import { MagicColoringBook } from './MagicColoringBook';
import { MasterpieceGallery } from './MasterpieceGallery';

/* ---------- Type definitions ---------- */

type ColorCode = 'red' | 'yellow' | 'blue' | 'white' | 'black';
type ResultCode =
  | 'orange' | 'green' | 'purple' | 'pink'
  | 'lightyellow' | 'lightblue' | 'gray'
  | 'brown' | 'olive' | 'navy';

const COLOR_CODES: ColorCode[] = ['red', 'yellow', 'blue', 'white', 'black'];

const RES_EN: Record<ResultCode, string> = {
  orange: 'Orange',
  green: 'Green',
  purple: 'Purple',
  pink: 'Pink',
  lightyellow: 'Light Yellow',
  lightblue: 'Light Blue',
  gray: 'Gray',
  brown: 'Brown',
  olive: 'Olive',
  navy: 'Navy',
};

/* ---------- Color mix data ---------- */

interface ColorMix {
  c1: ColorCode;
  c2: ColorCode;
  res: ResultCode;
  resBg: string;
  emoji: string;
}

const COLOR_MIXES: ColorMix[] = [
  { c1: 'red',    c2: 'yellow', res: 'orange',     resBg: 'bg-orange-400',  emoji: '🍊' },
  { c1: 'yellow', c2: 'blue',   res: 'green',      resBg: 'bg-green-400',   emoji: '🍏' },
  { c1: 'red',    c2: 'blue',   res: 'purple',     resBg: 'bg-purple-400',  emoji: '🍇' },
  { c1: 'red',    c2: 'white',  res: 'pink',       resBg: 'bg-pink-300',    emoji: '🌸' },
  { c1: 'yellow', c2: 'white',  res: 'lightyellow',resBg: 'bg-yellow-200',  emoji: '🌼' },
  { c1: 'blue',   c2: 'white',  res: 'lightblue',  resBg: 'bg-blue-200',    emoji: '💧' },
  { c1: 'black',  c2: 'white',  res: 'gray',       resBg: 'bg-gray-400',    emoji: '🐘' },
  { c1: 'red',    c2: 'black',  res: 'brown',      resBg: 'bg-amber-700',   emoji: '🍫' },
  { c1: 'yellow', c2: 'black',  res: 'olive',      resBg: 'bg-lime-700',    emoji: '🫒' },
  { c1: 'blue',   c2: 'black',  res: 'navy',       resBg: 'bg-blue-900',    emoji: '🫐' },
];

/** 生成调色技能 key：art:mix-{c1}-{c2}，按字母序排列保证唯一 */
function mixSkillKey(a: ColorCode, b: ColorCode): string {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `art:mix-${x}-${y}`;
}

/* ---------- Free Canvas drawing ---------- */

/** Canvas 画板可用颜色（8 个基本色） */
const CANVAS_COLORS: { name: string; css: string }[] = [
  { name: '红',  css: '#ff5c7a' },
  { name: '橙',  css: '#ff9f5a' },
  { name: '黄',  css: '#e5ac2e' },
  { name: '绿',  css: '#33a863' },
  { name: '青',  css: '#35bcc0' },
  { name: '蓝',  css: '#2e93c9' },
  { name: '紫',  css: '#8b6ef0' },
  { name: '粉',  css: '#ff6b96' },
];

const CANVAS_SIZE = 300;
const STROKE_WIDTH = 3;

/** 获取 pointer 在 canvas 上的坐标 */
function getPos(
  canvas: HTMLCanvasElement,
  e: React.PointerEvent<HTMLCanvasElement>,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

/* ---------- Main component ---------- */

export default function ArtPage() {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const tickTime = useStore((s) => s.tickTime);
  const mastery = useMastery();
  const [selectedColors, setSelectedColors] = useState<ColorCode[]>([]);
  const [mixedResult, setMixedResult] = useState<ColorMix | null>(null);

  // ---- Free Canvas state ----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [canvasColor, setCanvasColor] = useState(CANVAS_COLORS[0]?.css ?? '#ff5c7a');

  // 全局键盘快捷键响应 (1-5 切换专区)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') {
        e.preventDefault();
        triggerHaptic(20);
        setActiveTab('coloring');
      } else if (e.key === '2') {
        e.preventDefault();
        triggerHaptic(20);
        setActiveTab('gallery');
      } else if (e.key === '3') {
        e.preventDefault();
        triggerHaptic(20);
        setActiveTab('explore');
      } else if (e.key === '4') {
        e.preventDefault();
        triggerHaptic(20);
        setActiveTab('mixer');
      } else if (e.key === '5') {
        e.preventDefault();
        triggerHaptic(20);
        setActiveTab('canvas');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 进入页面记录学习时长
  useEffect(() => {
    tickTime(5);
  }, [tickTime]);

  // 统计已掌握的调色技能数（lv>=4）
  const artSkills = COLOR_MIXES.map(m => mixSkillKey(m.c1, m.c2));
  const masteredArt = artSkills.filter(k => (mastery[k]?.lv ?? 0) >= 4).length;

  const handlePickColor = (code: ColorCode) => {
    sfxTap();
    triggerHaptic(20);
    if (selectedColors.length >= 2) {
      setSelectedColors([code]);
      setMixedResult(null);
      return;
    }
    const newPicked = [...selectedColors, code];
    setSelectedColors(newPicked);

    if (newPicked.length === 2) {
      const c0 = newPicked[0];
      const c1 = newPicked[1];
      if (!c0 || !c1) return;
      const skill = mixSkillKey(c0, c1);
      const match = COLOR_MIXES.find(
        m => (m.c1 === c0 && m.c2 === c1) ||
             (m.c1 === c1 && m.c2 === c0)
      );
      if (match) {
        sfxMagic();
        celebrateSmall();
        setMixedResult(match);
        practice(skill, true, 1, 2);
        speak(t('art.mixSuccess', {
          c1: t('art.colors.' + c0),
          c2: t('art.colors.' + c1),
          res: t('art.results.' + match.res),
          en: RES_EN[match.res],
        }), { lang: 'zh-CN' });
      } else {
        practice(skill, false, 0, 1);
        speak(t('art.mixFail'), { lang: 'zh-CN' });
      }
    }
  };

  const handleReset = () => {
    sfxTap();
    setSelectedColors([]);
    setMixedResult(null);
  };

  // ---- Canvas drawing handlers ----

  const handleCanvasDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pos = getPos(canvas, e);
    lastPosRef.current = pos;
    // Draw a dot for single tap
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = canvasColor;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [canvasColor]);

  const handleCanvasMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(canvas, e);
    const last = lastPosRef.current;
    ctx.strokeStyle = canvasColor;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (last) {
      ctx.moveTo(last.x, last.y);
    } else {
      ctx.moveTo(pos.x, pos.y);
    }
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  }, [canvasColor]);

  const handleCanvasUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    drawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  const handleClearCanvas = () => {
    sfxTap();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handlePickCanvasColor = (css: string) => {
    sfxTap();
    setCanvasColor(css);
  };

  const [activeTab, setActiveTab] = useState<'coloring' | 'explore' | 'gallery' | 'mixer' | 'canvas'>('coloring');

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title={t('art.title')}
        subtitle={t('art.subtitle')}
        tone="pink"
      />

      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-pink-900 font-bold bg-pink-50/90 px-3 py-1 rounded-xl border border-pink-200">
          ⌨️ 键盘快捷操作：数字 1-5 切换专区 (魔力填色本/世界名画馆/色彩认知/魔法调色/自由画板)
        </span>
      </div>

      {/* 顶部五合一导航 Tab */}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => { sfxTap(); setActiveTab('coloring'); }}
          className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${
            activeTab === 'coloring'
              ? 'bg-candy-pink-deep text-white shadow-candy-sm scale-105'
              : 'bg-white text-ink-soft hover:bg-pink-50'
          }`}
        >
          🖍️ 魔力填色本
        </button>
        <button
          type="button"
          onClick={() => { sfxTap(); setActiveTab('gallery'); }}
          className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${
            activeTab === 'gallery'
              ? 'bg-candy-pink-deep text-white shadow-candy-sm scale-105'
              : 'bg-white text-ink-soft hover:bg-pink-50'
          }`}
        >
          🖼️ 世界名画馆
        </button>
        <button
          type="button"
          onClick={() => { sfxTap(); setActiveTab('explore'); }}
          className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${
            activeTab === 'explore'
              ? 'bg-candy-pink-deep text-white shadow-candy-sm scale-105'
              : 'bg-white text-ink-soft hover:bg-pink-50'
          }`}
        >
          🌈 基础色彩认知
        </button>
        <button
          type="button"
          onClick={() => { sfxTap(); setActiveTab('mixer'); }}
          className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${
            activeTab === 'mixer'
              ? 'bg-candy-pink-deep text-white shadow-candy-sm scale-105'
              : 'bg-white text-ink-soft hover:bg-pink-50'
          }`}
        >
          🔮 魔法调色盘
        </button>
        <button
          type="button"
          onClick={() => { sfxTap(); setActiveTab('canvas'); }}
          className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${
            activeTab === 'canvas'
              ? 'bg-candy-pink-deep text-white shadow-candy-sm scale-105'
              : 'bg-white text-ink-soft hover:bg-pink-50'
          }`}
        >
          🎨 自由画板
        </button>
      </div>

      {activeTab === 'coloring' && <MagicColoringBook />}

      {activeTab === 'gallery' && <MasterpieceGallery />}

      {activeTab === 'explore' && <ColorExplore />}

      {activeTab === 'mixer' && (
        <div className="space-y-4">
          {/* 调色进度条 */}
          <Panel className="border-2 border-pink-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-pink-900">🎨 已掌握 {masteredArt}/{COLOR_MIXES.length} 种调色</span>
              <span className="text-xs font-bold text-pink-700">{Math.round((masteredArt / COLOR_MIXES.length) * 100)}%</span>
            </div>
            <ProgressBar value={masteredArt} max={COLOR_MIXES.length} color="pink" size="md" />
          </Panel>

          {/* 魔法调色盘 */}
          <Panel className="border-2 border-pink-300 bg-gradient-to-br from-pink-50 via-purple-50 to-amber-50 text-center space-y-4">
            <h3 className="text-lg font-black text-pink-900">{t('art.mixerTitle')}</h3>
            <p className="text-xs font-bold text-pink-600">
              {t('art.mixerHint')}
            </p>

            {/* 选中的颜色 */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-pink-300 bg-white text-sm font-black text-pink-900 shadow-sm">
                {selectedColors[0] ? t('art.colors.' + selectedColors[0]) : t('art.pickColor1')}
              </div>
              <span className="text-2xl font-black text-pink-400">+</span>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-pink-300 bg-white text-sm font-black text-pink-900 shadow-sm">
                {selectedColors[1] ? t('art.colors.' + selectedColors[1]) : t('art.pickColor2')}
              </div>
              <span className="text-2xl font-black text-pink-400">=</span>
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-pink-400 text-2xl font-black shadow-fluffy ${mixedResult ? mixedResult.resBg + ' text-white' : 'bg-white text-gray-400'}`}>
                {mixedResult ? mixedResult.emoji : '?'}
              </div>
            </div>

            {/* 混合结果展示 */}
            {mixedResult && (
              <div className="rounded-2xl bg-white p-3 shadow-sm inline-block">
                <span className="text-base font-black text-ink">{t('art.results.' + mixedResult.res)}</span>
                <span className="ml-2 text-sm font-extrabold text-pink-600">({RES_EN[mixedResult.res]})</span>
              </div>
            )}

            {/* 基础颜色备选按钮 */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {COLOR_CODES.map(c => (
                <button
                  key={c}
                  onClick={() => handlePickColor(c)}
                  className="rounded-2xl border-2 border-pink-200 bg-white px-3 py-2.5 text-sm font-black text-ink shadow-sm hover:scale-105 active:scale-95 transition-transform"
                >
                  {t('art.colors.' + c)}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <CandyButton tone="pink" variant="soft" size="sm" onClick={handleReset}>
                {t('art.resetMixer')}
              </CandyButton>
            </div>
          </Panel>
        </div>
      )}

      {activeTab === 'canvas' && (
        <Panel className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-black text-purple-900">{t('art.canvasTitle')}</h3>
            <p className="text-xs font-bold text-purple-600 mt-1">{t('art.canvasHint')}</p>
          </div>

          {/* 颜色选择器 */}
          <div className="flex flex-wrap justify-center gap-2">
            {CANVAS_COLORS.map(c => (
              <button
                key={c.css}
                onClick={() => handlePickCanvasColor(c.css)}
                className={`h-8 w-8 rounded-full border-2 shadow-sm transition-transform hover:scale-110 active:scale-95 ${
                  canvasColor === c.css ? 'border-gray-800 ring-2 ring-gray-400' : 'border-white'
                }`}
                style={{ backgroundColor: c.css }}
                aria-label={c.name}
              />
            ))}
          </div>

          {/* Canvas 画板 */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onPointerDown={handleCanvasDown}
              onPointerMove={handleCanvasMove}
              onPointerUp={handleCanvasUp}
              onPointerLeave={handleCanvasUp}
              className="touch-none rounded-2xl border-4 border-purple-300 bg-white shadow-fluffy cursor-crosshair"
            />
          </div>

          {/* 画作赏析与清除按钮 */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CandyButton
              tone="pink"
              variant="solid"
              size="sm"
              onClick={() => {
                sfxPraise();
                celebrateSmall();
                speak('哇！宝贝画得真有创意！线条像快乐跳舞的小精灵，颜色像梦幻彩虹，太棒啦！', { lang: 'zh-CN' });
              }}
            >
              ✨ 请小茜为画作讲故事
            </CandyButton>
            <CandyButton tone="purple" variant="soft" size="sm" onClick={handleClearCanvas}>
              {t('art.clearCanvas')}
            </CandyButton>
          </div>
        </Panel>
      )}
    </div>
  );
}
