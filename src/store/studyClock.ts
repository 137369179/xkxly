/**
 * 学习计时器 · 时长上限与护眼提醒的执行引擎
 * ------------------------------------------------------------------
 * 背景：store 里的 tickTime 与 settings.dailyLimitMin / eyeCareMin 早就写好了，
 * 但全站没有任何地方调用 tickTime —— 家长在设置页点了半天，实际什么也没发生，
 * 今日学习日志里的"学习时长"也永远是 0 分钟。这里补上真正的驱动。
 *
 * 三条计时规则：
 *   1. 只在页面可见时计时 —— 切后台/锁屏不算
 *   2. 只在有交互时计时 —— 两分钟没碰屏幕视为离开，避免平板挂机刷时长
 *   3. 达到上限后停表 —— 不再累计，也不重复弹窗
 */
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { dateKey } from '@/lib/dailyPlan';

/** 计时粒度：30s 一跳，兼顾精度与写盘频率 */
const TICK_SEC = 30;
/** 超过这么久没有任何交互就判定为"人不在" */
const IDLE_MS = 120_000;
/** 「再学一会儿」的宽限时长 */
const SNOOZE_MS = 10 * 60_000;

export interface StudyClock {
  /** 今日累计学习秒数 */
  todaySec: number;
  /** 已达家长设定的每日上限 */
  overLimit: boolean;
  /** 该休息眼睛了 */
  needBreak: boolean;
  /** 再学 10 分钟 */
  snooze: () => void;
  /** 我去休息（重置护眼计时） */
  takeBreak: () => void;
}

export function useStudyClock(): StudyClock {
  const todaySec = useStore((s) => s.progress.dailyLog[dateKey()]?.sec ?? 0);
  const dailyLimitMin = useSettingsStore((s) => s.settings.dailyLimitMin);
  const eyeCareMin = useSettingsStore((s) => s.settings.eyeCareMin);

  const [sinceBreakSec, setSinceBreakSec] = useState(0);
  const [snoozeUntil, setSnoozeUntil] = useState(0);

  const overLimit = dailyLimitMin > 0 && todaySec >= dailyLimitMin * 60 && Date.now() > snoozeUntil;
  const needBreak = eyeCareMin > 0 && sinceBreakSec >= eyeCareMin * 60;
  // 停表条件：已超上限 或 正在提醒护眼（提醒期间继续累计没有意义）
  const paused = overLimit || needBreak;

  useEffect(() => {
    if (paused) return;

    let lastActive = Date.now();
    const bump = () => {
      lastActive = Date.now();
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActive > IDLE_MS) return;
      useStore.getState().tickTime(TICK_SEC);
      setSinceBreakSec((v) => v + TICK_SEC);
    }, TICK_SEC * 1000);

    return () => {
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [paused]);

  // 跨过零点：护眼计时归零，宽限作废
  useEffect(() => {
    const key = dateKey();
    const id = setInterval(() => {
      if (dateKey() !== key) {
        setSinceBreakSec(0);
        setSnoozeUntil(0);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return {
    todaySec,
    overLimit,
    needBreak,
    snooze: () => setSnoozeUntil(Date.now() + SNOOZE_MS),
    takeBreak: () => setSinceBreakSec(0),
  };
}
