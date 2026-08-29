/**
 * 自动备份机制 - 防止localStorage损坏导致进度丢失
 * ------------------------------------------------------------
 * 功能：
 *   1. 定时自动备份（每30分钟）
 *   2. 手动导出备份文件
 *   3. 启动时检测数据损坏并提示恢复
 *   4. 保留最近5个历史备份
 */

import { useState, useEffect } from 'react';
import type { Progress } from '@/types';
import { safeGetJSON, safeSetJSON, safeStorage } from './safeStorage';
import { reportError } from './monitor';

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

  // 先把旧备份后移（从末位向前逐槽覆盖，避免先写槽1导致后移时读到新数据）
  for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
    const current = safeGetJSON<BackupRecord | null>(`${BACKUP_KEY_PREFIX}${i}`, null);
    if (current) {
      safeSetJSON(`${BACKUP_KEY_PREFIX}${i + 1}`, current);
    }
  }

  // 再把新备份写入槽1
  safeSetJSON(`${BACKUP_KEY_PREFIX}${1}`, backup);

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
      reportError('backup', `检测到进度数据缺失字段: ${field}`);
      return true;
    }
  }

  // 检查mastery格式
  if (typeof progress.mastery !== 'object' || progress.mastery === null) {
    reportError('backup', 'mastery字段格式错误');
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
    reportError('backup', `检测存储损坏失败: ${(e as Error)?.message || e}`);
    return { corrupted: true };
  }

  return { corrupted: false };
}

/**
 * 启动自动备份定时器。
 *
 * @param onTick 定时触发时调用的回调。回调应通过自身闭包（如 zustand getState）
 *   获取最新进度并调用 createBackup()。注意：不要依赖本函数传给回调的参数——
 *   该参数仅为触发通知，不携带实际进度数据（进度由调用方按需读取，保证数据新鲜）。
 * @returns 清理函数，调用后停止定时器。
 */
export function startAutoBackup(onTick: () => void): () => void {
  // 使用局部变量而非模块级单例：每次调用拥有独立的 timer 引用，
  // React StrictMode 双调用时两份 cleanup 各自清理自己的 timer，不会竞争。
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = true;

  const scheduleBackup = () => {
    timer = setTimeout(() => {
      if (!active) return;
      try {
        onTick();
      } catch (e) {
        reportError('backup', `定时备份失败: ${(e as Error)?.message || e}`);
      } finally {
        if (active) scheduleBackup();
      }
    }, AUTO_BACKUP_INTERVAL_MS);
  };

  scheduleBackup();

  return () => {
    active = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

/**
 * 立即创建一次备份（供手动触发使用）
 */
export function createManualBackup(progress: Progress, settings?: Record<string, unknown>): BackupRecord | null {
  try {
    const backup = createBackup(progress, settings);
    return backup;
  } catch (e) {
    reportError('backup', `手动备份失败: ${(e as Error)?.message || e}`);
    return null;
  }
}

/** 清理过期备份（测试用） */
export function clearAllBackups(): void {
  for (let i = 1; i <= MAX_BACKUPS; i++) {
    safeStorage.removeItem(`${BACKUP_KEY_PREFIX}${i}`);
  }
}

/**
 * 集成到主应用的入口 Hook
 */
export function useBackupDetection() {
  const [showRestorePanel, setShowRestorePanel] = useState(false);

  useEffect(() => {
    const { corrupted, lastBackup } = detectStorageCorruption();
    if (corrupted && lastBackup) {
      setShowRestorePanel(true);
    }
  }, []);

  return { showRestorePanel, handleRestoreComplete: () => setShowRestorePanel(false) };
}
