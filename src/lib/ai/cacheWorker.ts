/**
 * 性能优化：AI Cache Web Worker
 * ------------------------------------------------------------
 * 将AI缓存的序列化操作移到Web Worker，避免阻塞主线程
 */

interface WorkerResponse {
  type: 'result' | 'error';
  data?: any;
  error?: string;
}

class AiCacheWorker {
  private worker: Worker | null = null;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }>();
  private requestCounter = 0;

  init(): void {
    if (this.worker) return;
    
    // 创建内联Worker（避免额外文件）
    const workerCode = `
      const cache = new Map();
      const MAX_SIZE = 120; // 最多缓存120条
      
      self.onmessage = function(e) {
        const msg = e.data;
        let result;
        
        try {
          switch (msg.type) {
            case 'cache-get':
              result = cache.get(msg.key) || null;
              break;
            case 'cache-set':
              if (cache.size >= MAX_SIZE) {
                // LRU淘汰最旧的条目
                const oldestKey = Array.from(cache.keys())[0];
                cache.delete(oldestKey);
              }
              cache.set(msg.key, msg.value);
              result = { ok: true };
              break;
            case 'cache-clear':
              cache.clear();
              result = { ok: true };
              break;
            default:
              result = { error: 'Unknown command' };
          }
          
          self.postMessage({ type: 'result', data: result });
        } catch (err) {
          self.postMessage({ type: 'error', error: err.message });
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const requestId = msg.data?.requestId;
      if (requestId && this.pendingRequests.has(requestId)) {
        const { resolve } = this.pendingRequests.get(requestId)!;
        resolve(msg.data?.result);
        this.pendingRequests.delete(requestId);
      }
    };
  }

  private async request<T>(type: string, payload?: any): Promise<T> {
    if (!this.worker) this.init();
    
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestCounter;
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.worker!.postMessage({ type, payload, requestId });
      
      // 超时保护
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          const { reject: rej } = this.pendingRequests.get(requestId)!;
          rej(new Error('Worker request timeout'));
          this.pendingRequests.delete(requestId);
        }
      }, 5000);
    });
  }

  get(key: string): Promise<any> {
    return this.request('cache-get', { key });
  }

  set(key: string, value: any): Promise<void> {
    return this.request('cache-set', { key, value });
  }

  clear(): Promise<void> {
    return this.request('cache-clear');
  }
}

// 单例实例
export const aiCacheWorker = new AiCacheWorker();

/**
 * 装饰器模式：用Worker增强原有缓存逻辑
 */
export function createCachedWithWorker<T extends (...args: any[]) => any>(
  fn: T,
  getKey: (...args: Parameters<T>) => string
): T {
  const cached = new Map<string, any>();
  
  return (async (...args: Parameters<T>) => {
    const key = getKey(...args);
    
    // 先查内存缓存
    if (cached.has(key)) {
      return cached.get(key);
    }
    
    // 再查Worker缓存
    try {
      const workerResult = await aiCacheWorker.get(key);
      if (workerResult !== undefined) {
        cached.set(key, workerResult);
        return workerResult;
      }
    } catch (e) {
      console.warn('[AiCache] Worker查询失败:', e);
    }
    
    // 执行原函数
    const result = await fn(...args);
    
    // 写入缓存
    cached.set(key, result);
    try {
      await aiCacheWorker.set(key, result);
    } catch (e) {
      console.warn('[AiCache] Worker写入失败:', e);
    }
    
    return result;
  }) as T;
}
