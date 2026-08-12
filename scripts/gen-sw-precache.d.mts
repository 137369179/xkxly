/**
 * 类型声明：scripts/gen-sw-precache.mjs
 * 让 TypeScript（tsc -b 与测试）能解析该纯 JS 模块的导出签名。
 */

/** 派生稳定版本号：对 [url:byteSize, ...] 排序后 sha256 取前 8 位。 */
export function deriveVersion(urls: string[], sizeOf: (url: string) => number): string;

/** 构建预缓存清单（纯函数，不写磁盘）。 */
export function buildManifest(publicDir: string): { version: string; urls: string[] };
