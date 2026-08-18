import { useCallback, useEffect, useState } from 'react';
import { useRoute, type RouteId } from '@/lib/router';
import { SUB_LABELS } from '@/lib/skillRouting';
import type { TrainingTarget } from '@/lib/skillRouting';

/** 各路由 param（子活动标识）→ 横幅中文文案（标签见 skillRouting.SUB_LABELS 单一事实源） */

function buildLabel(route: RouteId, param: string): string {
  const colon = param.indexOf(':');
  const sub = colon === -1 ? param : param.slice(0, colon);
  const value = colon === -1 ? '' : param.slice(colon + 1);
  const subLabel = SUB_LABELS[route]?.[sub];
  if (subLabel) return value ? `${subLabel} · ${value}` : subLabel;
  if (route === 'hanzi') return `汉字学习 · ${param}`;
  if (route === 'letters') return `字母学习 · ${param}`;
  return param;
}

/**
 * 订阅当前 hash 路由的深链 param，供页面实现「薄弱点 → 专项训练」自动进入。
 * 仅当当前路由等于 route 且 hash 携带 param 时返回 target，否则返回 null。
 * param 变化时才更新 target 引用，保证页面 useEffect 只触发一次。
 */
export function useTrainingTarget(route: RouteId): { target: TrainingTarget | null; clear: () => void } {
  const { route: currentRoute, param } = useRoute();

  const [target, setTarget] = useState<TrainingTarget | null>(() =>
    currentRoute === route && param ? { route, param, label: buildLabel(route, param) } : null,
  );

  useEffect(() => {
    if (currentRoute === route && param) {
      setTarget((prev) =>
        prev && prev.param === param ? prev : { route, param, label: buildLabel(route, param) },
      );
    } else {
      setTarget(null);
    }
  }, [currentRoute, route, param]);

  const clear = useCallback(() => setTarget(null), []);

  return { target, clear };
}
