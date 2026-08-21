/**
 * 自动备份机制 - 防止localStorage损坏导致进度丢失
 * ------------------------------------------------------------
 * 功能：
 *   1. 定时自动备份（每30分钟）
 *   2. 手动导出备份文件
 *   3. 启动时检测数据损坏并提示恢复
 *   4. 保留最近5个历史备份
 */

import type { Progress } from '@/types';
import { safeGetJSON, safeSetJSON, safeStorage } from './safeStorage';

const BACKUP_KEY_PREFIX = 'bb_backup_';
const MAX_BACKUPS = 5;
const AUTO_BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30分钟

/** 备份记录结构 */
export interface BackupRecord {
  id: string;
  timestamp: number;
  progress?: Progress;
  settings?: Record<string, unknown>;
}

/**
 * 备份落盘前剥离家长 PIN 相关字段，与 backup.buildBackup 的导出口径一致：
 * PIN 为 4 位数字，哈希+盐同文件亦可离线穷举，故自动备份同样不落任何 PIN 信息。
 */
function sanitizeSettings(settings?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!settings) return settings;
  const { parentPin, pinFails, pinLockUntil, ...rest } = settings;
  void parentPin;
  void pinFails;
  void pinLockUntil;
  return rest;
}

/** 获取所有历史备份 */
export function getBackupHistory(): BackupRecord[] {
  const backups: BackupRecord[] = [];
  for (let i = 1; i <= MAX_BACKUPS; i++) {
    const key = `${BACKUP_KEY_PREFIX}${i}`;
    const backup = safeGetJSON<BackupRecord | null>(key, null);
    if (backup) backups.push(backup);
  }
  return backups.sort((a, b) => b.timestamp - a.timestamp);
}

/** 创建新的备份记录 */
export function createBackup(progress: Progress, settings?: Record<string, unknown>): BackupRecord {
  const backup: BackupRecord = {
    id: `backup_${Date.now()}`,
    timestamp: Date.now(),
    progress,
    settings: sanitizeSettings(settings),
  };

  // 保存为新备份
  safeSetJSON(`${BACKUP_KEY_PREFIX}${1}`, backup);

  // 旧备份后移
  for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
    const current = safeGetJSON<BackupRecord | null>(`${BACKUP_KEY_PREFIX}${i}`, null);
    if (current) {
      safeSetJSON(`${BACKUP_KEY_PREFIX}${i + 1}`, current);
    }
  }

  return backup;
}

/** 检测进度数据是否损坏 */
export function isProgressDataCorrupted(progress: Progress): boolean {
  if (!progress || typeof progress !== 'object') return true;

  // 检查关键字段是否存在且不为 null
  const requiredFields = ['stars', 'badges', 'lettersHeard', 'mastery'];
  for (const field of requiredFields) {
    const value = ((progress as unknown) as Record<string, unknown>)[field];
    if (value === undefined || value === null) {
      console.warn('[Backup] 检测到进度数据缺失字段:', field);
      return true;
    }
  }

  // 检查mastery格式
  if (typeof progress.mastery !== 'object' || progress.mastery === null) {
    console.warn('[Backup] mastery字段格式错误');
    return true;
  }

  return false;
}

/** 创建存储损坏检测报告 */
export function detectStorageCorruption(): { corrupted: boolean; lastBackup?: BackupRecord } {
  try {
    const progress = safeGetJSON<Progress | null>('baby-learning-park-v1-progress', null);
    if (!progress) return { corrupted: false };

    const corrupted = isProgressDataCorrupted(progress);
    if (corrupted) {
      const history = getBackupHistory();
      return {
        corrupted: true,
        lastBackup: history[0],
      };
    }
  } catch (e) {
    console.error('[Backup] 检测存储损坏失败:', e);
    return { corrupted: true };
  }

  return { corrupted: false };
}

/** 设置自动备份定时器 */
let autoBackupTimer: ReturnType<typeof setTimeout> | null = null;

export function startAutoBackup(callback: (backup: BackupRecord) => void): () => void {
  const scheduleBackup = () => {
    autoBackupTimer = setTimeout(() => {
      try {
        // 触发回调，由外部（App.tsx）传入完整的进度数据
        callback({
          id: `auto_${Date.now()}`,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error('[AutoBackup] 定时备份失败:', e);
      } finally {
        // 重新调度下一次备份
        scheduleBackup();
      }
    }, AUTO_BACKUP_INTERVAL_MS);
  };

  // 启动第一个定时器
  scheduleBackup();

  // 返回清理函数
  return () => {
    if (autoBackupTimer) {
      clearTimeout(autoBackupTimer);
      autoBackupTimer = null;
    }
  };
}

/**
 * 立即创建一次备份（供手动触发使用）
 */
export function createManualBackup(progress: Progress, settings?: Record<string, unknown>): BackupRecord | null {
  try {
    const backup = createBackup(progress, settings);
    console.warn(`[AutoBackup] 手动备份已创建: ${backup.id}`);
    return backup;
  } catch (e) {
    console.error('[AutoBackup] 手动备份失败:', e);
    return null;
  }
}

/** 清理过期备份（测试用） */
export function clearAllBackups(): void {
  for (let i = 1; i <= MAX_BACKUPS; i++) {
    safeStorage.removeItem(`${BACKUP_KEY_PREFIX}${i}`);
  }
}
