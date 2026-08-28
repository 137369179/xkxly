/**
 * IndexedDB 数据冷热分层归档引擎
 * ------------------------------------------------------------------
 * 目标：将长期的历史打卡记录（>14天）和大数据量的离线日志从 localStorage 迁出，
 * 彻底消除 localStorage 5MB 溢出风险，同时支持家长端/学情报告透明查询历史数据。
 */

import type { DailyStat } from '@/types';

export interface ArchivedDailyLogEntry extends DailyStat {
  date: string;
}

const DB_NAME = 'baby-learning-park-archive';
const DB_VERSION = 1;
const STORE_DAILY_LOGS = 'archived_daily_logs';
const STORE_AI_LOGS = 'archived_ai_logs';
const STORE_AUDIO_BLOBS = 'audio_cache';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openArchiveDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DAILY_LOGS)) {
        const store = db.createObjectStore(STORE_DAILY_LOGS, { keyPath: 'date' });
        store.createIndex('by_date', 'date', { unique: true });
      }
      if (!db.objectStoreNames.contains(STORE_AI_LOGS)) {
        db.createObjectStore(STORE_AI_LOGS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO_BLOBS)) {
        db.createObjectStore(STORE_AUDIO_BLOBS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('open archive db failed'));
  });
  return dbPromise;
}

/** 写入或批量更新归档打卡日志 */
export async function archiveDailyLogs(logs: ArchivedDailyLogEntry[]): Promise<boolean> {
  if (!logs || logs.length === 0) return true;
  try {
    const db = await openArchiveDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_DAILY_LOGS, 'readwrite');
      const store = tx.objectStore(STORE_DAILY_LOGS);
      for (const item of logs) {
        if (item && item.date) {
          store.put(item);
        }
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/** 查询所有已归档的历史打卡日志（按日期升序） */
export async function getArchivedDailyLogs(): Promise<ArchivedDailyLogEntry[]> {
  try {
    const db = await openArchiveDb();
    return await new Promise<ArchivedDailyLogEntry[]>((resolve) => {
      const tx = db.transaction(STORE_DAILY_LOGS, 'readonly');
      const store = tx.objectStore(STORE_DAILY_LOGS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as ArchivedDailyLogEntry[];
        list.sort((a, b) => (a.date < b.date ? -1 : 1));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/** 归档判定阈值：默认 14 天前的日志迁入 IndexedDB 冷库 */
export const ARCHIVE_THRESHOLD_DAYS = 14;

/** 执行冷热日志分离归档：将老日志迁移到 IndexedDB，返回保留在 localStorage 的热数据 */
export async function performLogArchival(
  currentLogs: Record<string, DailyStat> | undefined,
  thresholdDays: number = ARCHIVE_THRESHOLD_DAYS,
): Promise<{ hotLogs: Record<string, DailyStat>; archivedCount: number }> {
  if (!currentLogs || Object.keys(currentLogs).length === 0) {
    return { hotLogs: {}, archivedCount: 0 };
  }

  const now = Date.now();
  const cutoffTime = now - thresholdDays * 24 * 60 * 60 * 1000;
  const cutoffDateStr = new Date(cutoffTime).toISOString().slice(0, 10);

  const hotLogs: Record<string, DailyStat> = {};
  const toArchive: ArchivedDailyLogEntry[] = [];

  for (const [date, stat] of Object.entries(currentLogs)) {
    if (!date || !stat) continue;
    if (date < cutoffDateStr) {
      toArchive.push({ ...stat, date });
    } else {
      hotLogs[date] = stat;
    }
  }

  if (toArchive.length > 0) {
    await archiveDailyLogs(toArchive);
  }

  return {
    hotLogs,
    archivedCount: toArchive.length,
  };
}

/** 合并查询：热日志 (当前 Zustand / localStorage) + 冷日志 (IndexedDB 归档) */
export async function getMergedDailyLogs(
  hotLogs: Record<string, DailyStat> = {},
): Promise<Record<string, DailyStat>> {
  const coldLogs = await getArchivedDailyLogs();
  const map: Record<string, DailyStat> = {};
  for (const c of coldLogs) {
    if (c.date) {
      const { date, ...stat } = c;
      map[date] = stat;
    }
  }
  for (const [date, stat] of Object.entries(hotLogs)) {
    if (date && stat) {
      map[date] = stat;
    }
  }
  return map;
}
