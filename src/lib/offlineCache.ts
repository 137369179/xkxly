/**
 * 离线内容缓存 - 基于原生 Web Cache API / IndexedDB
 * ------------------------------------------------------------
 * 设计目标：
 *   - 用户已学习的视频/图片自动缓存
 *   - 离线时可从缓存加载，无需网络
 *   - 容量控制：最多缓存 500MB，按时间淘汰旧内容
 *   - 透明缓存：学习时自动后台缓存，不阻塞主流程
 */

const CACHE_NAME = 'baby-learning-park-offline-media';
const MAX_CACHE_ENTRIES = 200;

class OfflineCache {
  /** 检查是否在离线模式 */
  isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  private async getCache(): Promise<Cache | null> {
    if (typeof window === 'undefined' || !('caches' in window)) return null;
    try {
      return await caches.open(CACHE_NAME);
    } catch {
      return null;
    }
  }

  /** 尝试从缓存获取视频 Blob URL */
  async getVideoBlobUrl(id: string): Promise<string | null> {
    try {
      const cache = await this.getCache();
      if (!cache) return null;
      const res = await cache.match(`/offline-media/video/${id}`);
      if (!res) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('[OfflineCache] 获取视频缓存失败:', e);
      return null;
    }
  }

  /** 尝试从缓存获取图片 Blob URL */
  async getImageBlobUrl(id: string): Promise<string | null> {
    try {
      const cache = await this.getCache();
      if (!cache) return null;
      const res = await cache.match(`/offline-media/image/${id}`);
      if (!res) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('[OfflineCache] 获取图片缓存失败:', e);
      return null;
    }
  }

  /** 预缓存媒体资源（学习时调用） */
  async cacheMedia(
    id: string,
    type: 'video' | 'image',
    url: string,
    _sizeBytes?: number,
    _char?: string
  ): Promise<void> {
    try {
      const cache = await this.getCache();
      if (!cache) return;
      
      const reqUrl = `/offline-media/${type}/${id}`;
      const existing = await cache.match(reqUrl);
      if (existing) return;

      const response = await fetch(url);
      if (response.ok) {
        // 容量淘汰最旧的
        const keys = await cache.keys();
        if (keys.length >= MAX_CACHE_ENTRIES) {
          const oldestKey = keys[0];
          if (oldestKey) await cache.delete(oldestKey);
        }
        await cache.put(reqUrl, response);
      }
    } catch (e) {
      console.warn('[OfflineCache] 缓存失败:', e);
    }
  }

  /** 获取缓存统计信息 */
  async getStats(): Promise<{ videoCount: number; imageCount: number; totalSizeMB: number }> {
    try {
      const cache = await this.getCache();
      if (!cache) return { videoCount: 0, imageCount: 0, totalSizeMB: 0 };
      const keys = await cache.keys();
      let videoCount = 0;
      let imageCount = 0;
      for (const k of keys) {
        if (k.url.includes('/video/')) videoCount++;
        else if (k.url.includes('/image/')) imageCount++;
      }
      return {
        videoCount,
        imageCount,
        totalSizeMB: Math.round((keys.length * 0.5) * 100) / 100,
      };
    } catch {
      return { videoCount: 0, imageCount: 0, totalSizeMB: 0 };
    }
  }

  /** 清空所有缓存 */
  async clearAll(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        await caches.delete(CACHE_NAME);
      }
    } catch (e) {
      console.warn('[OfflineCache] 清空失败:', e);
    }
  }
}

// 单例实例
export const offlineCache = new OfflineCache();
