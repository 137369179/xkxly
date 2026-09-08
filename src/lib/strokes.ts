/**
 * 汉字真实笔顺数据层
 * ------------------------------------------------------------------
 * 数据源：hanzi-writer-data（Make Me a Hanzi 项目）。
 * 优化：支持内存 + IndexedDB 本地二级缓存，首次拉取后永久离线秒开，
 * 避免频繁下载/重复反序列化 ~3MB JSON。
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

const IDB_KEY = "hanzi_strokes_table_v1";
let tablePromise: Promise<StrokeTable> | null = null;
let cachedTable: StrokeTable | null = null;

/** 从 IndexedDB 读取笔顺缓存 */
async function loadFromIdb(): Promise<StrokeTable | null> {
  if (typeof indexedDB === "undefined") return null;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("baby-learning-park-strokes", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("strokes")) {
          db.createObjectStore("strokes");
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("strokes", "readonly");
        const store = tx.objectStore("strokes");
        const getReq = store.get(IDB_KEY);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** 异步写入 IndexedDB 缓存（后台静默进行，不阻塞主流程） */
async function saveToIdb(data: StrokeTable): Promise<void> {
  if (typeof indexedDB === "undefined" || !data || Object.keys(data).length === 0) return;
  try {
    const req = indexedDB.open("baby-learning-park-strokes", 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("strokes", "readwrite");
      const store = tx.objectStore("strokes");
      store.put(data, IDB_KEY);
    };
  } catch {
    /* noop */
  }
}

/** 懒加载完整笔顺表（支持 IDB 二级缓存 + 模块级 Promise 缓存） */
export function loadStrokeTable(): Promise<StrokeTable> {
  if (cachedTable) return Promise.resolve(cachedTable);
  if (!tablePromise) {
    tablePromise = (async () => {
      // 1. 尝试从本地 IndexedDB 恢复
      const idbData = await loadFromIdb();
      if (idbData && Object.keys(idbData).length > 0) {
        cachedTable = idbData;
        return idbData;
      }
      // 2. 远端拉取
      try {
        const r = await fetch(`${import.meta.env.BASE_URL}data/hanzi-strokes.json`);
        if (r.ok) {
          const json = await r.json();
          cachedTable = json;
          saveToIdb(json);
          return json;
        }
      } catch {
        /* fetch error */
      }
      return {};
    })();
  }
  return tablePromise;
}

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
  const first = median[0];
  if (first === undefined) return median;
  const out: [number, number][] = [first];
  for (let i = 1; i < median.length; i++) {
    const prev = median[i - 1];
    const cur = median[i];
    if (prev === undefined || cur === undefined) continue;
    const [x0, y0] = prev;
    const [x1, y1] = cur;
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
    const a = median[i];
    const b = median[i - 1];
    if (a === undefined || b === undefined) continue;
    len += Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  return len;
}
