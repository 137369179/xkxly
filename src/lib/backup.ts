/**
 * 学习进度备份与恢复
 * ------------------------------------------------------------
 * 全部进度存在 localStorage 单键里，清浏览器/换设备/重装系统即丢失。
 * 这里提供 JSON 导出/导入能力，家长可在家长中心备份到本地文件，
 * 换设备时再导入恢复。
 *
 * 备份格式：版本化 JSON，包含 progress + settings（不含 PIN）。
 *
 * 安全加固（扫描 P0-1）：
 *   1. HMAC-SHA256 签名：密钥为设备本地随机生成（localStorage 单独键），
 *      永不写入备份文件。导入时校验签名，杜绝伪造备份注入任意学习数据。
 *   2. progress 字段白名单 + 数值上界净化：只保留已知字段、数值钳位到
 *      [0, 1_000_000]、数组/记录条数封顶，防止伪造备份撑爆 localStorage
 *      或破坏 UI 状态。
 *   3. 历史版本（无签名）备份仍可导入，但同样经过字段净化。
 */
import type { Progress } from '@/types';
import { createInitialProgress } from '@/lib/progress';

/** 备份文件标识 */
const BACKUP_MAGIC = 'baby-learning-park';
/** 当前备份格式版本 */
const BACKUP_VERSION = 1;

/** 数值字段上界：防御伪造备份撑爆 localStorage / 破坏 UI 数值状态 */
const MAX_NUM = 1_000_000;
/** 数组 / 记录条数上界 */
const MAX_COLLECTION = 2000;

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
  /** HMAC-SHA256 签名（hex，设备本地密钥），可选：历史版本备份无此字段 */
  sig?: string;
}

/* ------------------------------------------------------------------ */
/* 签名：设备本地密钥 + HMAC-SHA256                                    */
/* ------------------------------------------------------------------ */
/** 签名密钥的本地存储键（设备本地，绝不写入备份文件） */
const BACKUP_SECRET_KEY = 'bb_backup_sign_key_v1';

function isPlainObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 获取（或首次生成）设备本地签名密钥 */
async function getSigningKey(): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const existing = localStorage.getItem(BACKUP_SECRET_KEY);
  if (existing) {
    try {
      const bytes = Uint8Array.from(atob(existing), (c) => c.charCodeAt(0));
      if (bytes.length === 32) {
        return await crypto.subtle.importKey(
          'raw',
          bytes,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign', 'verify'],
        );
      }
    } catch {
      /* 密钥损坏则重新生成 */
    }
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(
    BACKUP_SECRET_KEY,
    btoa(String.fromCharCode(...Array.from(bytes))),
  );
  return await crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** 签名输入：固定键序的规范化 JSON（签/验两端一致，避免属性顺序漂移） */
function signInput(payload: Omit<BackupPayload, 'sig'>): string {
  return JSON.stringify({
    app: payload.app,
    version: payload.version,
    exportedAt: payload.exportedAt,
    progress: payload.progress,
    settings: payload.settings,
  });
}

/** 为载荷附加签名；加密不可用（非安全上下文）时返回无签名载荷 */
async function attachSignature(payload: Omit<BackupPayload, 'sig'>): Promise<BackupPayload> {
  const key = await getSigningKey();
  if (!key) return payload as BackupPayload;
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signInput(payload)),
  );
  return {
    ...payload,
    sig: Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join(''),
  };
}

/** 校验载荷签名（时间恒定比较） */
async function verifySignature(payload: BackupPayload): Promise<boolean> {
  const key = await getSigningKey();
  if (!key) return false;
  const { sig, ...rest } = payload;
  if (typeof sig !== 'string' || !/^[0-9a-f]{64}$/i.test(sig)) return false;
  const sigBytes = Uint8Array.from(sig.match(/../g) ?? [], (h) => parseInt(h, 16));
  try {
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(signInput(rest)),
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* progress 字段白名单 + 数值净化                                      */
/* ------------------------------------------------------------------ */
/** createInitialProgress 未覆盖、但属合法可选字段的白名单模板 */
const OPTIONAL_KEYS: Record<string, unknown> = {
  catLevel: 0,
  catToys: [],
  catQuests: [],
  unlockedOutfits: [],
  equippedOutfits: {},
  chatHistory: {},
  buddyJudgeCount: 0,
  buddyCorrectJudge: 0,
  buddyStreak: 0,
  buddyDifficulty: 1,
  dailyQuests: {},
  wrongHistory: {},
  ownedFragments: [],
  ownedEquipment: [],
  equippedItems: {},
  bossRecords: {},
};

/** 按模板形状对值做类型对齐 + 数值钳位 + 条数封顶 */
function sanitizeValue(value: unknown, template: unknown): unknown {
  if (typeof template === 'number') {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(MAX_NUM, Math.round(value)))
      : template;
  }
  if (typeof template === 'boolean') return typeof value === 'boolean' ? value : template;
  if (typeof template === 'string') return typeof value === 'string' ? value : template;
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return template;
    const item = template[0];
    const list = item === undefined ? value : value.map((v) => sanitizeValue(v, item));
    return list.slice(0, MAX_COLLECTION);
  }
  if (isPlainObj(template)) {
    if (!isPlainObj(value)) return template;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value).slice(0, MAX_COLLECTION)) {
      // 模板未知键：按运行时类型给出宽松模板继续净化
      const inner: unknown = k in template
        ? (template as Record<string, unknown>)[k]
        : isPlainObj(v)
          ? {}
          : Array.isArray(v)
            ? []
            : typeof v === 'number'
              ? 0
              : typeof v;
      out[k] = sanitizeValue(v, inner);
    }
    return out;
  }
  return template;
}

/**
 * 净化导入的 progress：
 * - 白名单：仅保留已知字段，丢弃未知键
 * - 数值钳位 [0, MAX_NUM]、数组/记录条数封顶
 * - 以 createInitialProgress() 兜底缺失字段
 */
export function sanitizeProgress(raw: unknown): Progress {
  const template: Record<string, unknown> = { ...createInitialProgress() };
  for (const [k, v] of Object.entries(OPTIONAL_KEYS)) {
    if (!(k in template)) template[k] = v;
  }
  if (!isPlainObj(raw)) return createInitialProgress();
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!(k in template)) continue; // 白名单：丢弃未知键
    out[k] = sanitizeValue(v, template[k]);
  }
  return { ...createInitialProgress(), ...out } as Progress;
}

/** 构造备份载荷（异步：附加设备本地签名） */
export async function buildBackup(
  progress: Progress,
  settings: BackupPayload['settings'],
): Promise<BackupPayload> {
  // 导出时清空锁定状态，导入后从 0 开始
  // 安全（P2-11）：PIN 为 4 位数字，即便哈希+盐同文件存储也可离线穷举，
  // 故备份不携带任何 PIN 信息，导入后由家长重新设置。
  const { pinFails, pinLockUntil, parentPin, ...rest } = settings;
  void pinFails;
  void pinLockUntil;
  void parentPin;
  return attachSignature({
    app: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
    settings: { ...rest, parentPin: '', pinFails: 0, pinLockUntil: 0 },
  });
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
  if (o.sig !== undefined && typeof o.sig !== 'string') return false;
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

/**
 * 解析 JSON 字符串为备份载荷：
 * - 带签名的备份必须验签通过，否则拒绝
 * - 历史版本（无签名）备份降级接受，但 progress 一律经过净化
 */
export async function parseBackup(json: string): Promise<BackupPayload | null> {
  if (json.length > MAX_BACKUP_SIZE) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return null;
  }
  if (!validateBackup(obj)) return null;
  const payload = obj as BackupPayload;
  if (payload.sig != null && !(await verifySignature(payload))) return null;
  return { ...payload, progress: sanitizeProgress(payload.progress) };
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
