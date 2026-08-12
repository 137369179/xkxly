/**
 * 家长 PIN 哈希与锁定工具
 * ------------------------------------------------------------
 * 旧实现：明文 4 位数字直接存 localStorage、明文比较、无锁定，
 * 任何人打开 DevTools 即可读取或暴力穷举。
 *
 * 新实现：
 *   - SHA-256 + 随机盐哈希存储（Web Crypto API，所有现代浏览器原生支持）；
 *   - 存储格式 `sha256:<saltHex>:<hashHex>`，旧明文格式自动兼容并渐进升级；
 *   - 失败 5 次锁定 5 分钟，成功后清零；
 *   - 提供「忘记密码」入口（清空 PIN，需重新设置）。
 *
 * 为什么不引入 bcrypt/argon2：
 *   浏览器端无原生实现，引入 wasm 包体积大；4 位数字密钥空间本就有限，
 *   SHA-256 + 盐 + 锁定已足以挡住脚本穷举。真正的强密码场景应由服务端负责。
 */

/** 失败多少次后锁定 */
export const PIN_FAIL_LIMIT = 5;
/** 锁定时长（毫秒） */
export const PIN_LOCK_MS = 5 * 60 * 1000;

/** 哈希存储格式正则：sha256:<16位hex盐>:<64位hex哈希> */
const PIN_HASH_RE = /^sha256:[0-9a-f]{16}:[0-9a-f]{64}$/;

/** 8 字节随机盐，输出 16 位 hex */
function randomSalt(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** ArrayBuffer → hex 字符串 */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 把明文 PIN 哈希为 `sha256:<salt>:<hash>` 格式。
 * @param pin 4 位数字明文
 * @param salt 可选盐（验证时传入已存盐），省略则随机生成
 */
export async function hashPin(pin: string, salt?: string): Promise<string> {
  const s = salt ?? randomSalt();
  const data = new TextEncoder().encode(s + ':' + pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return `sha256:${s}:${bufToHex(digest)}`;
}

/**
 * 校验输入是否匹配已存的 PIN 串。
 * 兼容两种已存格式：
 *   - 旧明文（4 位数字）：直接比对，匹配后建议调用方重新哈希升级
 *   - 新哈希格式：用同样盐重新哈希后比对
 */
export async function verifyPin(input: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  // 旧明文格式：4 位纯数字
  if (/^\d{4}$/.test(stored)) {
    return input === stored;
  }
  if (!PIN_HASH_RE.test(stored)) return false;
  const [, salt] = stored.split(':');
  const recomputed = await hashPin(input, salt);
  return recomputed === stored;
}

/** 判断已存 PIN 是否为旧明文格式（需要升级） */
export function isLegacyPin(stored: string): boolean {
  return /^\d{4}$/.test(stored);
}

/** 当前是否处于锁定状态 */
export function isLocked(fails: number, lockUntil: number, now = Date.now()): boolean {
  return fails >= PIN_FAIL_LIMIT && lockUntil > now;
}

/** 锁定剩余秒数（未锁定返回 0） */
export function lockRemaining(lockUntil: number, now = Date.now()): number {
  if (lockUntil <= now) return 0;
  return Math.ceil((lockUntil - now) / 1000);
}

/** 把秒数格式化为「分:秒」或「X 分」展示 */
export function formatLock(sec: number): string {
  if (sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s} 秒`;
  return `${m} 分 ${s.toString().padStart(2, '0')} 秒`;
}
