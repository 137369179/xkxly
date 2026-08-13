/**
 * 学习进度备份与恢复
 * ------------------------------------------------------------
 * 全部进度存在 localStorage 单键里，清浏览器/换设备/重装系统即丢失。
 * 这里提供 JSON 导出/导入能力，家长可在家长中心备份到本地文件，
 * 换设备时再导入恢复。
 *
 * 备份格式：版本化 JSON，包含 progress + settings（含 PIN 哈希），
 * 文件名带日期，便于多次备份区分。
 */
import type { Progress } from '@/types';

/** 备份文件标识 */
const BACKUP_MAGIC = 'baby-learning-park';
/** 当前备份格式版本 */
const BACKUP_VERSION = 1;

/** 备份载荷结构 */
export interface BackupPayload {
  /** 标识串，用于校验 */
  app: typeof BACKUP_MAGIC;
  /** 备份格式版本 */
  version: typeof BACKUP_VERSION;
  /** 导出时间 ISO */
  exportedAt: string;
  /** 学习进度 */
  progress: Progress;
  /** 设置（含 PIN 哈希、时长上限、护眼等） */
  settings: {
    sound: boolean;
    showPinyin: boolean;
    parentPin: string;
    pinFails?: number;
    pinLockUntil?: number;
    dailyLimitMin: number;
    eyeCareMin: number;
    aiEnabled: boolean;
  };
}

/** 构造备份载荷 */
export function buildBackup(
  progress: Progress,
  settings: BackupPayload['settings'],
): BackupPayload {
  // 导出时清空锁定状态，导入后从 0 开始
  // 安全（P2-11）：PIN 为 4 位数字，即便哈希+盐同文件存储也可离线穷举，
  // 故备份不携带任何 PIN 信息，导入后由家长重新设置。
  const { pinFails, pinLockUntil, parentPin, ...rest } = settings;
  void pinFails;
  void pinLockUntil;
  void parentPin;
  return {
    app: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
    settings: { ...rest, parentPin: '', pinFails: 0, pinLockUntil: 0 },
  };
}

/** 校验解析后的对象是否为合法备份 */
export function validateBackup(obj: unknown): obj is BackupPayload {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Partial<BackupPayload>;
  if (o.app !== BACKUP_MAGIC) return false;
  if (o.version !== BACKUP_VERSION) return false;
  if (typeof o.exportedAt !== 'string') return false;
  if (!o.progress || typeof o.progress !== 'object') return false;
  if (!o.settings || typeof o.settings !== 'object') return false;
  // progress 关键字段抽查
  const p = o.progress as Partial<Progress>;
  if (typeof p.stars !== 'number') return false;
  if (!Array.isArray(p.badges)) return false;
  if (!Array.isArray(p.lettersHeard)) return false;
  if (typeof p.mastery !== 'object' || p.mastery === null) return false;
  return true;
}

/** 备份文件最大 10MB，超过直接拒绝，防止主线程被大 JSON 冻结 */
const MAX_BACKUP_SIZE = 10 * 1024 * 1024;

/** 解析 JSON 字符串为备份载荷，不合法返回 null */
export function parseBackup(json: string): BackupPayload | null {
  if (json.length > MAX_BACKUP_SIZE) return null;
  try {
    const obj = JSON.parse(json);
    return validateBackup(obj) ? obj : null;
  } catch {
    return null;
  }
}

/** 触发浏览器下载备份文件 */
export function downloadBackup(payload: BackupPayload): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const a = document.createElement('a');
  a.href = url;
  a.download = `宝贝学习乐园-备份-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 延迟释放，避免某些浏览器下载未完成
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 读取用户选择的备份文件，返回文件文本 */
export function readBackupFile(file: File): Promise<string> {
  return file.text();
}
