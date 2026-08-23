/**
 * 桌面宠物 · 状态提供器
 * 用 reducer 管理整体状态并持久化到 localStorage；附带天气感知 hook（Open-Meteo，无 key）。
 */
import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { petReducer, defaultPetState, type PetState } from './petReducer';
import type { PetAction } from './petReducer';
import type { WeatherCode, InteractionType } from './data';
import { weatherPreset } from './lib/env';
import { attrLevel } from './lib/attributes';
import { affinityLevel } from './lib/affinity';
import { stageOf, totalLevel } from './lib/evolution';
import { decide } from './lib/behavior';
import { usePetLinkStore } from '@/store/usePetLinkStore';

const KEY = 'xkxly_desktop_pet_v2';
const KEY_V1 = 'xkxly_desktop_pet_v1';

export function loadInitial(): PetState {
  const base = defaultPetState();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY) ?? localStorage.getItem(KEY_V1);
  } catch { return base; }
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<PetState>;
    const merged: PetState = {
      ...base,
      ...parsed,
      affinity: { ...base.affinity, ...(parsed.affinity ?? {}) },
      attributes: { ...base.attributes, ...(parsed.attributes ?? {}) },
      evolution: { ...base.evolution, ...(parsed.evolution ?? {}) },
      behavior: { ...base.behavior, ...(parsed.behavior ?? {}) },
    };
    if (Object.keys(merged.evolution.dex).length === 0) {
      const five = {
        int: attrLevel(merged.attributes.exp.int),
        vit: attrLevel(merged.attributes.exp.vit),
        cha: attrLevel(merged.attributes.exp.cha),
        cre: attrLevel(merged.attributes.exp.cre),
        aff: affinityLevel(merged.affinity.exp),
      };
      const stage = stageOf(totalLevel(five));
      merged.evolution = { stage, dex: { [stage]: Date.now() } };
    }
    try { localStorage.removeItem(KEY_V1); } catch { /* ignore */ }
    return merged;
  } catch {
    return base;
  }
}

interface PetContextValue {
  state: PetState;
  dispatch: (a: PetAction) => void;
}

const PetCtx = createContext<PetContextValue | null>(null);

export function PetProvider({ children }: { children: ReactNode }) {
  const [state, internalDispatch] = useReducer(
    (s: PetState, a: PetAction) => petReducer(s, a).state,
    undefined,
    loadInitial,
  );
  const dispatch = useCallback((a: PetAction) => internalDispatch(a), []);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* 存储满则忽略 */
    }
  }, [state]);

  // 全站学习行为 → 属性
  useEffect(() => {
    const off = usePetLinkStore.getState().subscribe((kind) => {
      dispatch({ type: 'gain-attr', kind });
    });
    return off;
  }, [dispatch]);

  // 行为决策周期 3s + 进化检测
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = stateRef.current;
      const now = Date.now();
      const hour = new Date().getHours();
      const night = hour >= 21 || hour < 6;
      const e = s.attributes.exp;
      const { action } = decide(s.behavior, {
        hour,
        night,
        atHome: s.home,
        affinityLv: affinityLevel(s.affinity.exp),
        lowestIsInt: e.int <= e.vit && e.int <= e.cha && e.int <= e.cre,
        now,
      });
      if (action !== s.behavior.current) dispatch({ type: 'behavior-adopt', action, now });
      dispatch({ type: 'evolve-check', now });
    }, 3000);
    return () => window.clearInterval(id);
  }, [dispatch]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <PetCtx.Provider value={value}>{children}</PetCtx.Provider>;
}

/** 读取状态与 dispatch；必须包裹在 <PetProvider> 内 */
export function usePet(): { state: PetState; dispatch: (a: PetAction) => void } {
  const ctx = useContext(PetCtx);
  if (!ctx) throw new Error('usePet 必须在 <PetProvider> 内使用');
  return ctx;
}

/** 便捷互动动作 */
export function usePetInteract() {
  const { dispatch } = usePet();
  return useCallback((interaction: InteractionType) => {
    dispatch({ type: 'interact', interaction });
  }, [dispatch]);
}

/* ---------------- 天气感知（Open-Meteo，无 key） ---------------- */
function mapToWeather(code: number | undefined, hour: number): WeatherCode {
  if (code == null) {
    return hour >= 18 || hour < 6 ? 'cloudy' : 'clear';
  }
  if ((code >= 60 && code <= 82) || code === 96 || code === 99) return 'rain';
  if (code === 85 || code === 86 || code === 71 || code === 73 || code === 75 || code === 77) return 'snow';
  return 'clear';
}

export function useWeather(): { code: WeatherCode; preset: ReturnType<typeof weatherPreset>; error: boolean } {
  const [code, setCode] = useState<WeatherCode>('clear');
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const hour = new Date().getHours();
    setCode(mapToWeather(undefined, hour)); // 先用本地兜底，避免空窗

    (async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current_weather=true',
        );
        if (!res.ok) throw new Error('weather');
        const data = (await res.json()) as { current_weather?: { weathercode?: number; temperature?: number } };
        if (!alive) return;
        const temp = data.current_weather?.temperature ?? 20;
        const base = mapToWeather(data.current_weather?.weathercode, hour);
        setCode(temp >= 32 && base === 'clear' ? 'hot' : base);
      } catch {
        if (alive) setError(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const preset = useMemo(() => weatherPreset(code), [code]);
  return { code, preset, error };
}