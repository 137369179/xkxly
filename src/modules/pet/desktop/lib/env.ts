/**
 * 环境感知（纯逻辑，可单测）：时间相位 / 物理 / 天气映射
 */
import { WEATHER_PRESETS, type WeatherCode } from '../data';

/* ---------------- 时间感知 ---------------- */
export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

export function dayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 7) return 'dawn'; // 日出过渡
  if (hour >= 19 && hour < 21) return 'dusk'; // 日落过渡
  if (hour >= 7 && hour < 19) return 'day';
  return 'night';
}

/** 亮度倍率：夜晚降低、清晨恢复；用于整体画面透明/遮罩调节 */
export function brightnessFactor(phase: DayPhase): number {
  switch (phase) {
    case 'day':
      return 1;
    case 'dawn':
      return 0.75;
    case 'dusk':
      return 0.6;
    case 'night':
      return 0.45;
  }
}

/** 活动频率倍率：夜晚变慢，清晨恢复活跃 */
export function activityFactor(phase: DayPhase): number {
  switch (phase) {
    case 'day':
      return 1;
    case 'dawn':
      return 0.85;
    case 'dusk':
      return 0.65;
    case 'night':
      return 0.3;
  }
}

/** 日出/日落过渡用到的背景渐变色 */
export function skyGradient(phase: DayPhase): [string, string] {
  switch (phase) {
    case 'dawn':
      return ['#2b4a7a', '#ffcf87'];
    case 'dusk':
      return ['#6a3ab2', '#ff9e6d'];
    case 'night':
      return ['#0f1030', '#2b2d6a'];
    default:
      return ['#7ed6ff', '#bff0ff'];
  }
}

/* ---------------- 简单 2D 物理 ---------------- */
export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  /** 落地缓冲挤压（0..1 复原） */
  squash: number;
}

/** 一个重力步进；floorY 为可站立的 y 坐标（含边缘反弹） */
export function stepPhysics(
  b: Body,
  dt: number,
  opts: { gravity?: number; restitution?: number; worldW?: number; floorY?: number },
): Body {
  const g = opts.gravity ?? 1800; // px/s^2
  const rest = opts.restitution ?? 0.28;
  const floorY = opts.floorY ?? 400;
  const worldW = opts.worldW ?? 480;

  let { x, y, vx, vy, grounded, squash } = b;
  vy += g * dt;
  x += vx * dt;
  y += vy * dt;

  // 落地缓冲：触地反弹衰减 + squash 效果启动
  if (y >= floorY) {
    y = floorY;
    if (!grounded || vy > 60) {
      squash = Math.min(1, Math.max(0, Math.min(0.6, vy / 2400)));
    }
    if (Math.abs(vy) > 40) vy = -Math.abs(vy) * rest;
    else vy = 0;
    grounded = true;
  } else {
    grounded = false;
  }

  // 屏幕边缘碰撞：反转水平速度并夹回
  if (x < 0) {
    x = 0;
    vx = Math.abs(vx) * (0.7);
  } else if (x > worldW) {
    x = worldW;
    vx = -Math.abs(vx) * 0.7;
  }
  // squash 缓慢复原
  squash = Math.max(0, squash - dt * 1.6);

  return { x, y, vx, vy, grounded, squash };
}

/** 空闲时轻微漂浮/呼吸的位移（用于 60fps 待机微动） */
export function idleBob(t: number, amp = 4, speed = 2.2): number {
  return Math.sin(t * speed) * amp;
}

/* ---------------- 天气映射 ---------------- */
export function weatherPreset(code: WeatherCode) {
  return WEATHER_PRESETS.find((p) => p.code === code) ?? WEATHER_PRESETS[0]!;
}

/** 某天气是否应自动佩戴某配件 */
export function shouldAutoEquip(code: WeatherCode): string | null {
  const p = weatherPreset(code);
  return p.autoAccessory ?? null;
}