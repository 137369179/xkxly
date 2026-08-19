/**
 * 绘本内容 IndexedDB 存储（P1-10）
 * ------------------------------------------------------------------
 * 目标：把「完整绘本内容（含全部页面文本/插画数据）」从 localStorage 迁出。
 *   - localStorage 单键约 5MB 上限，50 本绘本全文极易触顶；
 *   - 绘本是低频读写的大对象，适合 IndexedDB。
 * 设计：
 *   - 仅存完整 SavedStorybook（含 data），key = id；
 *   - progress 中只保留轻量元数据（id/title/theme/...）；
 *   - 环境不支持 IndexedDB 时静默降级（写失败不影响主流程，读取回退原数据）。
 * 实现：零依赖，原生 indexedDB API（约 50 行）。
 */
import type { SavedStorybook } from '@/modules/storybook/types';

const DB_NAME = 'baby-learning-park';
const STORE = 'storybooks';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const open = (version?: number) => {
      const req = indexedDB.open(DB_NAME, version ?? DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // 自愈：库已存在但缺 storybooks 表时，onupgradeneeded 不会触发。
        // 提升版本重新打开以建表，避免写入永久静默失败。
        if (!db.objectStoreNames.contains(STORE)) {
          db.close();
          open((db.version || 0) + 1);
          return;
        }
        resolve(db);
      };
      req.onerror = () => reject(req.error ?? new Error('open failed'));
    };
    open();
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('tx failed'));
      }),
  );
}

/** 写入（新增/覆盖）一本绘本完整内容；成功返回 true，环境不支持/失败返回 false */
export async function putStorybookContent(book: SavedStorybook): Promise<boolean> {
  try {
    await tx('readwrite', (s) => s.put(book));
    return true;
  } catch {
    return false;
  }
}

/** 读取绘本完整内容；未找到返回 undefined */
export async function getStorybookContent(id: string): Promise<SavedStorybook | undefined> {
  try {
    return await tx('readonly', (s) => s.get(id));
  } catch {
    return undefined;
  }
}

/** 删除绘本完整内容 */
export async function deleteStorybookContent(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    /* 环境不支持时静默降级 */
  }
}
