/**
 * 全局轻点反馈 Hook（点哪都有反应）
 * ------------------------------------------------------------
 * 现状：只有按钮自带音效，孩子点空白处没有任何回应，
 * 会怀疑"是不是没点到"而反复乱戳。本 Hook 让任意元素都能
 * 在轻点时给出三重即时反馈：音效 + 触感 + 星光粒子。
 *
 * 实现取舍：
 *   - 粒子用真实 DOM 元素 + Web Animations API（等价于 CSS 动画，
 *     但不需要往全局样式表注入 @keyframes，零副作用、零新依赖）；
 *   - 图层是 document.body 上的单例，最后一个粒子消失后自动摘除，
 *     不会在 DOM 里长期驻留，也不泄漏定时器；
 *   - prefers-reduced-motion 下完全跳过粒子，只保留音效与触感
 *     （与 src/styles/index.css 的全局降级规则保持一致，不破坏它）。
 *
 * 用法：
 *   const onTap = useTapFeedback();
 *   <div onClick={(e) => onTap(e)}>…</div>
 */
import { useCallback } from 'react';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { useReducedMotion } from '@/game/useReducedMotion';

/** 轻点位置；兼容 React 鼠标/触摸事件，也接受手写的坐标对象 */
export interface TapPoint {
  clientX?: number;
  clientY?: number;
}

/** 星光图层 id（单例） */
const LAYER_ID = 'tap-spark-layer';
/** 单个粒子存活时长（毫秒），到点强制移除 */
const SPARK_LIFE_MS = 700;
/** 星光字符池，随机取用让每次轻点略有不同 */
const SPARK_CHARS = ['✨', '⭐', '💫'] as const;

/** 取（或创建）星光图层；SSR / 无 body 环境安全返回 null */
function ensureLayer(): HTMLDivElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  const existing = document.getElementById(LAYER_ID);
  if (existing instanceof HTMLDivElement) return existing;
  const layer = document.createElement('div');
  layer.id = LAYER_ID;
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:9999;';
  document.body.appendChild(layer);
  return layer;
}

/** 粒子清空后摘除图层，避免空节点长期挂在 body 上 */
function releaseLayerIfEmpty(layer: HTMLDivElement): void {
  if (layer.childElementCount === 0) layer.remove();
}

/** 在 (x, y) 生成一个向上飘散并淡出的星光粒子 */
function spawnSpark(layer: HTMLDivElement, x: number, y: number): void {
  const el = document.createElement('span');
  const char = SPARK_CHARS[Math.floor(Math.random() * SPARK_CHARS.length)] ?? '✨';
  el.textContent = char;
  el.style.cssText = [
    'position:fixed',
    `left:${x}px`,
    `top:${y}px`,
    'font-size:20px',
    'line-height:1',
    'pointer-events:none',
    'user-select:none',
    'will-change:transform,opacity',
    'transform:translate(-50%,-50%)',
  ].join(';');
  layer.appendChild(el);

  // 向上 ±40° 随机飘散 26~52px：像小烟花，但幅度很小，不干扰阅读
  const angle = (-90 + (Math.random() * 80 - 40)) * (Math.PI / 180);
  const distance = 26 + Math.random() * 26;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;

  if (typeof el.animate === 'function') {
    el.animate(
      [
        { transform: 'translate(-50%,-50%) translate(0px,0px) scale(0.4)', opacity: 0 },
        {
          transform: `translate(-50%,-50%) translate(${dx * 0.62}px, ${dy * 0.62}px) scale(1.15)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(0.6)`,
          opacity: 0,
        },
      ],
      {
        duration: SPARK_LIFE_MS,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'forwards',
      },
    );
  }

  // 兜底清理：动画结束或环境不支持 animate 时都保证节点被摘掉
  window.setTimeout(() => {
    el.remove();
    releaseLayerIfEmpty(layer);
  }, SPARK_LIFE_MS + 60);
}

/**
 * 返回 onTap：轻点的统一反馈入口
 * 音效与触感始终触发；坐标有效且未开启「减少动态效果」时追加星光粒子。
 */
export function useTapFeedback(): (point?: TapPoint) => void {
  const reduced = useReducedMotion();

  return useCallback(
    (point?: TapPoint) => {
      sfxTap();
      triggerHaptic(20);

      // 降级：不做任何视觉粒子，只保留听觉与触觉反馈
      if (reduced) return;

      const x = point?.clientX;
      const y = point?.clientY;
      // 键盘触发等拿不到坐标的场景，只保留音效与触感
      if (typeof x !== 'number' || typeof y !== 'number') return;

      const layer = ensureLayer();
      if (!layer) return;

      const count = 2 + Math.floor(Math.random() * 2); // 2~3 个
      for (let i = 0; i < count; i += 1) {
        spawnSpark(layer, x, y);
      }
    },
    [reduced],
  );
}

export default useTapFeedback;
