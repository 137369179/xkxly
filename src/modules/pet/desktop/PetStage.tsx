/**
 * 桌面宠物 · 渲染舞台（rAF 驱动，60fps）
 * 物理下落/落地缓冲、待机微动、粒子特效、配件佩戴融合、时间/天气状态、
 * 家园与"拖到门口回家"。
 */
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { PetState } from './petReducer';
import { stepPhysics, idleBob, dayPhase, brightnessFactor, activityFactor, skyGradient } from './lib/env';
import { ACCESSORIES, type AccessoryId, type WeatherCode } from './data';
import { parse, paletteAt, hasContent } from './lib/pixel';

interface Props {
  state: PetState;
  weather: WeatherCode;
  onPetInteract: () => void;
  onGoHome: (home: boolean) => void;
}

interface BodyRef {
  x: number; y: number; vx: number; vy: number;
  grounded: boolean; squash: number; time: number;
}
interface Particle { x: number; y: number; vy: number; type: string }

const particles: Particle[] = [];
const FLOOR_GAP = 14;

export function PetStage({ state, weather, onPetInteract, onGoHome }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<HTMLDivElement>(null);
  const body = useRef<BodyRef>({ x: 120, y: 200, vx: 0, vy: 0, grounded: false, squash: 0, time: 0 });
  const drag = useRef<{ on: boolean; x: number; y: number }>({ on: false, x: 0, y: 0 });
  const opaRef = useRef(state.opaqueness);
  opaRef.current = state.opaqueness;

  const phase = dayPhase(new Date().getHours());
  const brightness = brightnessFactor(phase);
  const activity = activityFactor(phase);
  const [c1, c2] = skyGradient(phase);

  const autoAcc: AccessoryId | null = weather === 'rain' ? 'umbrella' : weather === 'hot' ? 'hat' : null;
  const accessories: AccessoryId[] = autoAcc && !state.accessories.includes(autoAcc)
    ? [...state.accessories, autoAcc]
    : state.accessories;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let w = 520;
    let h = 420;

    const measure = () => {
      const el = stageRef.current;
      if (el) { w = el.clientWidth || 520; h = el.clientHeight || 420; }
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && stageRef.current) ro.observe(stageRef.current);

    body.current.x = w / 2;
    body.current.y = h * 0.35;
    const floorY = () => h - FLOOR_GAP * 2;

    const iconOf = (type: string): string =>
      type === 'snow' ? '❄️' : type === 'rain' ? '💧' : type === 'heart' ? '💛' : type === 'star' ? '⭐' : type === 'note' ? '🎵' : '✨';
    const pickParticle = (): string => {
      const opts = dayPhase(new Date().getHours()) === 'night' ? ['star'] : ['heart', 'star', 'note'];
      return opts[Math.floor(Math.random() * opts.length)]!;
    };

    const drawParticles = (W: number, H: number, wea: WeatherCode) => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      cvs.width = W; cvs.height = H;
      ctx.clearRect(0, 0, W, H);
      const rate = wea === 'snow' ? 0.6 : wea === 'rain' ? 0.9 : 0.22;
      if (Math.random() < rate) {
        particles.push({ x: Math.random() * W, y: -4, vy: wea === 'rain' ? 330 : 60, type: wea === 'snow' ? 'snow' : wea === 'rain' ? 'rain' : pickParticle() });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.y += p.vy * (1 / 60);
        if (p.y > H + 20) { particles.splice(i, 1); continue; }
        ctx.fillStyle = p.type === 'snow' ? '#fff' : p.type === 'rain' ? '#9bd8ff' : p.type === 'heart' ? '#ff6b8a' : p.type === 'star' ? '#ffd166' : '#4ecdc4';
        ctx.font = p.type === 'rain' ? '10px sans-serif' : '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = opaRef.current;
        ctx.fillText(iconOf(p.type), p.x, p.y);
      }
      ctx.globalAlpha = 1;
    };

    const step = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60);
      last = now;
      const b = body.current;
      b.time += dt;

      if (drag.current.on) {
        b.x = drag.current.x; b.y = drag.current.y;
        b.vx = 0; b.vy = 0; b.grounded = false;
      } else {
        const wander = Math.sin(b.time) * 20 * activity;
        const next = stepPhysics(
          { x: b.x, y: b.y, vx: b.vx * 0.98 + wander * 6 * dt, vy: b.vy, grounded: b.grounded, squash: b.squash },
          dt,
          { gravity: 1400 * activity + 300, restitution: 0.26, worldW: w, floorY: floorY() },
        );
        b.x = next.x; b.y = next.y; b.vx = next.vx; b.vy = next.vy;
        b.grounded = next.grounded; b.squash = next.squash;
      }

      const el = petRef.current;
      if (el) {
        const bob = drag.current.on ? 0 : idleBob(b.time, 3, 2.4);
        el.style.transform = `translate(${b.x}px, ${b.y + bob}px) scale(${1 + b.squash * 0.25}, ${1 - b.squash * 0.22})`;
      }

      drawParticles(w, h, weather);

      const door = doorRef.current;
      if (door && !drag.current.on) {
        const dr = door.getBoundingClientRect();
        const prog = el?.getBoundingClientRect();
        if (prog && dr.left < prog.right && dr.right > prog.left && dr.top < prog.bottom && dr.bottom > prog.top) {
          onGoHome(true);
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pixel = state.pixel ? parse(state.pixel) : null;
  const usePixel = pixel ? hasContent(pixel.grid) : false;

  return (
    <div
      ref={stageRef}
      className="relative w-full touch-none select-none overflow-hidden rounded-3xl border-2 border-white/60"
      style={{ height: 420, background: `linear-gradient(180deg, ${c1}, ${c2})` }}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{ background: '#0a0c2b', opacity: (1 - brightness) * 0.6 }}
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />

      <div ref={doorRef} className="absolute right-5 bottom-2 flex flex-col items-center opacity-90">
        <span className="text-5xl drop-shadow">🏠</span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-ink">拖回家</span>
      </div>

      <div
        ref={petRef}
        className="absolute left-0 top-0 origin-bottom cursor-grab"
        style={{ willChange: 'transform', opacity: state.opaqueness }}
        onPointerDown={(e) => {
          const b = body.current;
          drag.current = { on: true, x: b.x, y: b.y };
          petRef.current?.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current.on) return;
          const rect = stageRef.current?.getBoundingClientRect();
          if (!rect) return;
          drag.current.x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          drag.current.y = Math.max(0, Math.min(rect.height - 40, e.clientY - rect.top));
        }}
        onPointerUp={() => {
          if (!drag.current.on) return;
          drag.current.on = false;
          if (body.current.y < 60) body.current.vy = -60;
          onPetInteract();
        }}
        onPointerCancel={() => { drag.current.on = false; }}
      >
        {accessories.map((aid) => {
          const acc = ACCESSORIES.find((a) => a.id === aid);
          if (!acc) return null;
          const st: CSSProperties =
            acc.anchor === 'head' ? { top: -8, left: 6 } : acc.anchor === 'face' ? { top: 18, right: -6 } : { bottom: -4, left: 12 };
          return (
            <span key={aid} className="absolute z-10 text-3xl drop-shadow" style={st}>{acc.emoji}</span>
          );
        })}

        {usePixel && pixel ? (
          <PixelBody grid={pixel.grid} w={pixel.w} h={pixel.h} />
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-6xl drop-shadow-lg" style={{ fontSize: 56 }}>🐱</span>
            <span className="mt-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink">
              {state.home ? '在家休息 💤' : weather === 'rain' ? '下雨啦，撑伞☂️' : weather === 'hot' ? '来根冰棍❄️' : state.personality === 'jokester' ? '哈哈😆' : '小智'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function PixelBody({ grid, w, h }: { grid: number[]; w: number; h: number }) {
  const cell = 6;
  return (
    <canvas
      className="rounded-xl bg-white/70 shadow"
      width={w * cell}
      height={h * cell}
      style={{ width: w * cell, height: h * cell, imageRendering: 'pixelated' }}
      ref={(c) => {
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        for (let i = 0; i < grid.length; i++) {
          const v = grid[i]!;
          if (v < 0) continue;
          ctx.fillStyle = paletteAt(v);
          ctx.fillRect((i % w) * cell, Math.floor(i / w) * cell, cell, cell);
        }
      }}
    />
  );
}