import { useEffect, useRef } from 'react';

/**
 * 安全的 setInterval
 * ------------------------------------------------------------
 * 回调用 ref 持有，因此 callback 变化时无需重建定时器；
 * delay 为 null/undefined 时暂停（不启动）。组件卸载时自动 clearInterval，
 * 从根本上消除「裸 setInterval」导致的定时器泄漏。
 *
 * 用法：
 *   useInterval(() => doTick(), running ? 1000 : null);
 */
export function useInterval(callback: () => void, delay: number | null | undefined) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || delay === undefined) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * 安全的 setTimeout 调度器
 * ------------------------------------------------------------
 * 返回 schedule(cb, ms)。每次调度都被登记，组件卸载时统一 clearTimeout，
 * 避免「裸 setTimeout」在组件卸载后仍 setState（React 18 虽静默但属泄漏）
 * 以及长期运行下的定时器堆积。
 *
 * 适用于事件处理器里的单次延时（如动画复位、提示自动消失）：
 *   const schedule = useSafeTimeout();
 *   const onClick = () => schedule(() => setDone(true), 1600);
 */
export function useSafeTimeout() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
    };
  }, []);

  return (cb: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      cb();
    }, ms);
    timers.current.add(id);
    return id;
  };
}
