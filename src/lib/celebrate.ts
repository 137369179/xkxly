// canvas-confetti 仅在首次庆祝时才需要，改为函数内动态 import，
// 避免它被打进首屏 vendor chunk（BadgeUnlock 常驻入口会静态引入 celebrate）。
type ConfettiFn = (opts?: Record<string, unknown>) => void;

let confettiPromise: Promise<ConfettiFn> | null = null;
function loadConfetti(): Promise<ConfettiFn> {
  if (!confettiPromise) {
    // import 失败时重置单例，避免后续所有庆祝永久失效
    confettiPromise = import('canvas-confetti').then((m) => m.default as ConfettiFn).catch((e) => {
      confettiPromise = null;
      throw e;
    });
  }
  return confettiPromise;
}

/** 安全调用 confetti，失败时静默降级 */
async function safeConfetti(fn: () => void): Promise<void> {
  try {
    const confetti = await loadConfetti();
    fn.call(null);
    void confetti;
  } catch {
    /* confetti 加载失败时静默降级，不影响学习流程 */
  }
}

const CANDY_COLORS = ['#ff5c8a', '#3d9bff', '#FFC53D', '#62CC8A', '#8f5bff', '#FF9F2E'];

/**
 * P2-1: 答对庆祝效果变化池
 * ------------------------------------------------------------
 * 孩子每次答对都用同一个 confetti 参数会审美疲劳。
 * 这里维护一组变体，每次随机抽一个，让"答对"这件高频事件保持新鲜感。
 * 所有变体都使用 canvas-confetti 原生支持的 shapes（square/circle/star）。
 */
type CelebrateVariant = {
  particleCount: number;
  spread: number;
  startVelocity: number;
  scalar: number;
  ticks: number;
  gravity: number;
  colors: string[];
  shapes?: ('square' | 'circle' | 'star')[];
};

const CELEBRATE_VARIANTS: CelebrateVariant[] = [
  // 变体 A：标准糖果色（原版，最经典）
  {
    particleCount: 46,
    spread: 62,
    startVelocity: 32,
    scalar: 0.9,
    ticks: 140,
    gravity: 0.9,
    colors: CANDY_COLORS,
  },
  // 变体 B：星星形状 + 金黄系（成就感强）
  {
    particleCount: 38,
    spread: 70,
    startVelocity: 36,
    scalar: 1.1,
    ticks: 160,
    gravity: 0.85,
    colors: ['#FFC53D', '#FFD86B', '#FF9F2E', '#FFF0C8'],
    shapes: ['star'],
  },
  // 变体 C：圆形 + 粉紫系（柔和可爱）
  {
    particleCount: 42,
    spread: 58,
    startVelocity: 30,
    scalar: 1.0,
    ticks: 150,
    gravity: 0.92,
    colors: ['#ff5c8a', '#8f5bff', '#FFB3D1', '#c2a8ef'],
    shapes: ['circle'],
  },
  // 变体 D：高扩散 + 多彩（热闹感）
  {
    particleCount: 52,
    spread: 88,
    startVelocity: 40,
    scalar: 0.85,
    ticks: 130,
    gravity: 0.9,
    colors: CANDY_COLORS,
    shapes: ['square', 'circle'],
  },
  // 变体 E：少量大颗粒 + 星星（精致感）
  {
    particleCount: 28,
    spread: 75,
    startVelocity: 34,
    scalar: 1.3,
    ticks: 180,
    gravity: 0.88,
    colors: ['#62CC8A', '#3d9bff', '#FFC53D', '#ff5c8a'],
    shapes: ['star'],
  },
];

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 小庆祝：答对一题。P2-1: 从变化池随机抽一个变体，保持新鲜感 */
export async function celebrateSmall(origin?: { x: number; y: number }): Promise<void> {
  if (reduceMotion()) return;
  const variant = CELEBRATE_VARIANTS[Math.floor(Math.random() * CELEBRATE_VARIANTS.length)]!
  await safeConfetti(() => {
    loadConfetti().then((confetti) => confetti({
      ...variant,
      origin: origin ?? { x: 0.5, y: 0.55 },
      disableForReducedMotion: true,
    }));
  });
}

/** 大庆祝：通关 / 解锁徽章 */
export async function celebrateBig(): Promise<void> {
  if (reduceMotion()) return;
  try {
    const confetti = await loadConfetti();
    const end = Date.now() + 1400;

    confetti({
      particleCount: 130,
      spread: 100,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.6 },
      colors: CANDY_COLORS,
      disableForReducedMotion: true,
    });

    let rafId: number;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 62,
        origin: { x: 0, y: 0.68 },
        colors: CANDY_COLORS,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 62,
        origin: { x: 1, y: 0.68 },
        colors: CANDY_COLORS,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) rafId = requestAnimationFrame(frame);
    };
    frame();
    // 1.5s 后确保 rAF 停止（防止 end 判断失效时无限循环）
    setTimeout(() => cancelAnimationFrame(rafId), 1600);
  } catch {
    /* confetti 加载失败时静默降级 */
  }
}

/**
 * 兼容别名：celebrateLarge 曾为「大庆祝」独立入口，现已统一收敛为 celebrateBig。
 * 汉zi 核心模块（HanziSpeechReview / HanziCourseRunner）仍引用 celebrateLarge，
 * 此处以别名保形，避免已提交代码悬空导入导致生产构建断裂。后续核心模块迁移到
 * celebrateBig 后可安全移除本别名。
 */
export const celebrateLarge = celebrateBig;

/** 星星雨：获得星星时 */
export async function celebrateStars(count = 3): Promise<void> {
  if (reduceMotion()) return;
  await safeConfetti(() => {
    loadConfetti().then((confetti) => confetti({
      particleCount: 14 * count,
      spread: 84,
      startVelocity: 38,
      scalar: 1.25,
      ticks: 190,
      shapes: ['star'],
      colors: ['#FFC53D', '#FFD86B', '#FF9F2E', '#FFF0C8'],
      origin: { x: 0.5, y: 0.42 },
      disableForReducedMotion: true,
    }));
  });
}
