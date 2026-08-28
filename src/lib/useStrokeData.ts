/**
 * 笔顺数据加载 hook
 * ------------------------------------------------------------
 * 封装 ensureStrokeData 的 useEffect + useState 模式，
 * 消除 StrokeTrace / StrokeAnimation 中的重复代码。
 * 配合 HanziLearn 的 warmupStrokes() 预加载，进入写环节时数据已缓存。
 */
import { useEffect, useState } from 'react';
import { ensureStrokeData, type StrokeData } from './strokes';

export function useStrokeData(char: string) {
  const [data, setData] = useState<StrokeData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setLoaded(false);
    ensureStrokeData(char).then((d) => {
      if (!alive) return;
      setData(d);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [char]);

  return { data, loaded };
}