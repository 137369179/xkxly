/**
 * 桌面宠物 · 状态提供器
 * 用 reducer 管理整体状态并持久化到 localStorage；附带天气感知 hook（Open-Meteo，无 key）。
 */
import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { petReducer, defaultPetState, type PetState } from './petReducer';
import type { PetAction } from './petReducer';
import type { WeatherCode, InteractionType } from './data';
import { weatherPreset } from './lib/env';

const KEY = 'xkxly_desktop_pet_v1';

function loadInitial(): PetState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPetState();
    const parsed = JSON.parse(raw) as Partial<PetState>;
    const base = defaultPetState();
    return {
      ...base,
      ...parsed,
      affinity: { ...base.affinity, ...(parsed.affinity ?? {}) },
    };
  } catch {
    return defaultPetState();
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

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* 存储满则忽略 */
    }
  }, [state]);

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