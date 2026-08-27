/**
 * ⚡ 低功耗与老旧设备性能自适应调度引擎 (Low-Power Device Adapter)
 * ------------------------------------------------------------------
 * 目标：
 *   1. 探测低算力移动设备 / 老旧 iPad / 节能模式；
 *   2. 针对 3D WebGL (Three.js/R3F) 自动降采样 DPR 与粒子负载；
 *   3. 为 Canvas 触控描红提供节流平滑保障，杜绝设备发热与掉帧。
 */

export interface DevicePerfProfile {
  /** 推荐 3D 渲染像素比 DPR (1.0 - 2.0) */
  recommendedDpr: number;
  /** 是否建议关闭高开销背景粒子 */
  reduceParticles: boolean;
  /** 触摸采样节流间隔 (ms) */
  touchThrottleMs: number;
  /** 是否处于极低性能环境 */
  isLowEnd: boolean;
}

/** 缓存设备算力分析结果 */
let cachedProfile: DevicePerfProfile | null = null;

export function getDevicePerfProfile(): DevicePerfProfile {
  if (cachedProfile) return cachedProfile;

  if (typeof window === 'undefined') {
    return {
      recommendedDpr: 1.5,
      reduceParticles: false,
      touchThrottleMs: 16,
      isLowEnd: false,
    };
  }

  const nav = window.navigator as { hardwareConcurrency?: number; deviceMemory?: number };
  const cpuCores = nav.hardwareConcurrency ?? 4;
  const memoryGb = nav.deviceMemory ?? 4;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  // 判定是否为低端设备 (≤2核 CPU 或 ≤2GB 内存)
  const isLowEnd = cpuCores <= 2 || memoryGb <= 2;

  // 针对移动端 / 低端设备优化 DPR
  const recommendedDpr = isLowEnd
    ? 1.0
    : isMobile
    ? Math.min(window.devicePixelRatio || 1.5, 1.5)
    : Math.min(window.devicePixelRatio || 2.0, 2.0);

  cachedProfile = {
    recommendedDpr,
    reduceParticles: isLowEnd,
    touchThrottleMs: isLowEnd ? 32 : 16,
    isLowEnd,
  };

  return cachedProfile;
}
