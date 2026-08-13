/**
 * 汉字真实笔顺数据层
 * ------------------------------------------------------------------
 * 数据源：hanzi-writer-data（Make Me a Hanzi 项目）。两路合并：
 *   ① `scripts/fetch-hanzi-strokes.mjs` 从 CDN 抓取精编字（300 核心 + 500 常用）；
 *   ② `scripts/gen-hanzi-strokes-expanded.mjs` 融合 luomor-web/hanzi-study 上游
 *      dataWriter.js/dataWriter1.js（同源 Make Me a Hanzi），扩充至 1277 字全覆盖，
 *      并补齐 radStrokes（部首笔画序号，字段 r）喂给「部首魔法」。
 *   产物：public/data/hanzi-strokes.json。
 *
 * 坐标系约定（与 hanzi-writer 一致）：
 *   - 原始数据为 1024×1024 空间，y 轴向上（书法坐标）
 *   - SVG 渲染时需外套 <g transform="scale(1,-1) translate(0,-900)"> 翻转
 *
 * 加载策略：运行时才 fetch，模块级 Promise 缓存，避免重复请求；
 *           SW 对 /data/*.json 已配置 stale-while-revalidate，二次访问离线可用。
 */

export interface StrokeData {
  /** 每笔的 SVG path（原始 1024 坐标） */
  s: string[];
  /** 每笔的中线采样点 [[x,y], ...]（用于跟写判定与动画引导） */
  m: [number, number][][];
  /** 部首笔画序号（可选，仅部分字有；用于「部首魔法」高亮部首笔画） */
  r?: number[];
}

type StrokeTable = Record<string, StrokeData>;

let tablePromise: Promise<StrokeTable> | null = null;

/** 懒加载完整笔顺表（融合后约 2.9MB 原始 / ~1.2MB gzip，仅进入写字环节时才拉取一次） */
export function loadStrokeTable(): Promise<StrokeTable> {
  if (!tablePromise) {
    tablePromise = fetch(`${import.meta.env.BASE_URL}data/hanzi-strokes.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return tablePromise;
}

/** 同步取某个字的笔顺数据；未加载或缺失返回 null（调用方需先 await loadStrokeTable） */
let cachedTable: StrokeTable | null = null;

export function getStrokeData(char: string): StrokeData | null {
  return cachedTable?.[char] ?? null;
}

/** 加载并取字：组件用这一个入口即可 */
export async function ensureStrokeData(char: string): Promise<StrokeData | null> {
  if (!cachedTable) cachedTable = await loadStrokeTable();
  return cachedTable[char] ?? null;
}

/** 预加载（进入汉字学习页时调用，写环节即可秒开） */
export async function warmupStrokes(): Promise<void> {
  if (!cachedTable) cachedTable = await loadStrokeTable();
}

/** 把稀疏中线点插值为稠密采样点（间距≈step 单位），跟写判定用 */
export function densifyMedian(median: [number, number][], step = 16): [number, number][] {
  if (median.length < 2) return median;
  const out: [number, number][] = [median[0]!];
  for (let i = 1; i < median.length; i++) {
    const [x0, y0] = median[i - 1]!;
    const [x1, y1] = median[i]!;
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let k = 1; k <= n; k++) {
      out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
    }
  }
  return out;
}

/** 折线总长度 */
export function medianLength(median: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < median.length; i++) {
    const a = median[i]!;
    const b = median[i - 1]!;
    len += Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  return len;
}
