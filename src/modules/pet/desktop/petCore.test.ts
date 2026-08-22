/**
 * 桌面宠物 · 核心纯逻辑 单测
 */
import { describe, it, expect, vi } from 'vitest';
import {
  affinityLevel,
  levelProgress,
  canInteractToday,
  addInteraction,
  todayKey,
} from './lib/affinity';
import { startPhase, tickPomodoro, formatRemain, createPomodoro } from './lib/pomodoro';
import { todosReducer, openCount } from './lib/todos';
import { blankGrid, serialize, parse, validGrid, hasContent, colorIndex } from './lib/pixel';
import { PALETTE } from './data';
import { dayPhase, brightnessFactor, activityFactor, stepPhysics, idleBob } from './lib/env';
import { petReducer, defaultPetState } from './petReducer';

describe('好感度 affinity', () => {
  it('等级随 exp 提升，分档正确', () => {
    expect(affinityLevel(0)).toBe(1);
    expect(affinityLevel(60)).toBe(2);
    expect(affinityLevel(319)).toBe(3);
    expect(affinityLevel(320)).toBe(4);
  });
  it('levelProgress 给出本等级进度与到下一级所需', () => {
    // lv1: floor0 ceil60
    expect(levelProgress(30)).toMatchObject({ level: 1, toNext: 30 });
    expect(levelProgress(30).progress).toBeCloseTo(0.5);
  });
  it('每日次数上限：feed 每天 10 次，第 11 次不生效', () => {
    const now = new Date('2026-08-21T10:00:00');
    vi.setSystemTime(now);
    let st = defaultPetState().affinity;
    for (let i = 0; i < 10; i++) {
      const r = addInteraction(st, 'feed', now);
      st = r.state;
    }
    expect(canInteractToday(st, 'feed', now)).toBe(false);
    const blocked = addInteraction(st, 'feed', now);
    expect(blocked.gained).toBe(0);
    expect(blocked.state.exp).toBe(st.exp); // 未增加
    vi.useRealTimers();
  });
  it('跨日重置次数', () => {
    const day1 = new Date('2026-08-21T10:00:00');
    const day2 = new Date('2026-08-22T10:00:00');
    let st = defaultPetState().affinity;
    for (let i = 0; i < 10; i++) st = addInteraction(st, 'feed', day1).state;
    // 次日 feed 仍可用
    expect(canInteractToday(st, 'feed', day2)).toBe(true);
  });
  it('升级触发 leveledUp（跨档）', () => {
    const now = new Date('2026-08-21T10:00:00');
    // 5 次 pet 各后期：用 feed(10) 快速凑到 60 → lv2
    // 先用 talk(8) 7 次 = 56
    let st = defaultPetState().affinity;
    for (let i = 0; i < 7; i++) st = addInteraction(st, 'talk', now).state; // exp 56 lv1
    const r = addInteraction(st, 'talk', now); // +8 = 64 lv2
    expect(r.leveledUp).toBe(true);
  });
  it('todayKey 格式', () => {
    expect(todayKey(new Date('2026-08-05T00:00:00'))).toBe('2026-08-05');
  });
});

describe('番茄钟 pomodoro', () => {
  const cfg = { workMin: 1, restMin: 1 };
  it('start work 后推进但不结束', () => {
    let s = startPhase(createPomodoro(), 'work', cfg);
    const { state, finished } = tickPomodoro(s, cfg, 10_000);
    expect(finished).toBe(false);
    expect(state.phase).toBe('work');
    expect(state.remainingMs).toBeLessThan(60_000);
  });
  it('work 结束自动切到 rest 并标记 finished', () => {
    let s = createPomodoro();
    // 直接构造已剩极少的时间
    s = startPhase(s, 'work', cfg);
    s = { ...s, remainingMs: 1000 };
    const { state, finished } = tickPomodoro(s, cfg, 1000);
    expect(finished).toBe(true);
    expect(state.phase).toBe('rest');
  });
  it('rest 结束回到 idle 并累计一轮 cycles', () => {
    let s = createPomodoro();
    s = startPhase(s, 'work', cfg);
    s = { ...s, remainingMs: 0 };
    const afterWork = tickPomodoro(s, cfg, 1).state; // -> rest
    const r = tickPomodoro({ ...afterWork, remainingMs: 0 }, cfg, 1);
    expect(r.state.phase).toBe('idle');
    expect(r.state.cycles).toBe(1);
  });
  it('formatRemain 格式 mm:ss', () => {
    expect(formatRemain(65_000)).toBe('01:05');
    expect(formatRemain(0)).toBe('00:00');
  });
  it('pomodoro-config 更新配置并钳制到 [1,120]', () => {
    let r = petReducer(defaultPetState(), { type: 'pomodoro-config', workMin: 40, restMin: 8 });
    expect(r.state.pomodoroConfig).toEqual({ workMin: 40, restMin: 8 });
    r = petReducer(defaultPetState(), { type: 'pomodoro-config', workMin: 999, restMin: 0 });
    expect(r.state.pomodoroConfig).toEqual({ workMin: 120, restMin: 1 });
    // 配置后开始专注使用新时长
    const started = petReducer(r.state, { type: 'pomodoro-start', phase: 'work' }).state.pomodoro;
    expect(started.remainingMs).toBe(120 * 60_000);
  });
});

describe('待办 todos', () => {
  it('增/完成/删流转', () => {
    let r = todosReducer([], { type: 'add', text: '  练字  ' });
    expect(r.todos).toHaveLength(1);
    expect(r.todos[0]!.text).toBe('练字');
    const id = r.todos[0]!.id;
    const done = todosReducer(r.todos, { type: 'toggle', id });
    expect(done.justCompleted).toBe(true);
    expect(openCount(done.todos)).toBe(0);
    const removed = todosReducer(done.todos, { type: 'remove', id });
    expect(removed.todos).toHaveLength(0);
  });
  it('空文本不入队', () => {
    const r = todosReducer([], { type: 'add', text: '   ' });
    expect(r.todos).toHaveLength(0);
  });
});

describe('拼豆 pixel', () => {
  it('调色板恰 51 色', () => {
    expect(PALETTE).toHaveLength(51);
  });
  it('序列化/反序列化往返一致且校验通过', () => {
    const g = blankGrid();
    g[0] = 1;
    g[10] = 5;
    expect(hasContent(g)).toBe(true);
    const s = serialize(g);
    const p = parse(s)!;
    expect(p.grid).toEqual(g);
    expect(validGrid(g)).toBe(true);
  });
  it('非法序列化返回 null', () => {
    expect(parse('garbage')).toBeNull();
    expect(parse('2,2;1,1,1')).toBeNull(); // 长度不符
  });
  it('colorIndex 命中与未命中', () => {
    expect(colorIndex('#ffffff')).toBe(0);
    expect(colorIndex('#123456')).toBe(-1);
  });
});

describe('时间感知 env', () => {
  it('dayPhase 分界', () => {
    expect(dayPhase(3)).toBe('night');
    expect(dayPhase(6)).toBe('dawn');
    expect(dayPhase(12)).toBe('day');
    expect(dayPhase(20)).toBe('dusk');
  });
  it('夜晚降低亮度、减慢活动，清晨恢复', () => {
    expect(brightnessFactor('night')).toBeLessThan(brightnessFactor('day'));
    expect(activityFactor('night')).toBeLessThan(activityFactor('day'));
    expect(activityFactor('dawn')).toBeGreaterThan(activityFactor('night'));
  });
});

describe('2D 物理 env', () => {
  it('重力下落并触地反弹衰减', () => {
    let b = { x: 100, y: 100, vx: 20, vy: 0, grounded: false, squash: 0 };
    // 步进若干帧：至少落地一次，且任何时候都不越过地面
    let landedAt = -1;
    for (let i = 0; i < 80; i++) {
      b = stepPhysics(b, 1 / 60, { floorY: 400 });
      if (b.grounded && landedAt < 0) landedAt = i;
    }
    expect(landedAt).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeLessThanOrEqual(400);
    // 触地反弹速度应明显小于纯重力末端速度
    expect(Math.abs(b.vy)).toBeLessThan(2400);
  });
  it('边缘碰撞反向并夹回', () => {
    let b = { x: -5, y: 390, vx: -100, vy: 0, grounded: true, squash: 0 };
    b = stepPhysics(b, 1 / 60, { floorY: 400 });
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.vx).toBeGreaterThanOrEqual(0);
  });
  it('idleBob 有界振荡', () => {
    expect(Math.abs(idleBob(0))).toBeLessThanOrEqual(4);
    expect(idleBob(0)).toBeCloseTo(0);
  });
});

describe('聚合 reducer', () => {
  it('互动升级后 todo 联动标志互不干扰', () => {
    let r = petReducer(defaultPetState(), { type: 'interact', interaction: 'feed', now: Date.now() });
    expect(r.state.affinity.exp).toBeGreaterThan(0);
    expect(r.todoDone).toBe(false);

    const s2 = petReducer(r.state, { type: 'todo', action: { type: 'add', text: '题目' } }).state;
    const tid = s2.todos[0]!.id;
    const done = petReducer(s2, { type: 'todo', action: { type: 'toggle', id: tid } });
    expect(done.todoDone).toBe(true);
  });
  it('配件穿脱切换', () => {
    let r = petReducer(defaultPetState(), { type: 'equip', id: 'crown' });
    expect(r.state.accessories).toContain('crown');
    r = petReducer(r.state, { type: 'equip', id: 'crown' });
    expect(r.state.accessories).not.toContain('crown');
  });
  it('透明度钳制到 [0.3,1]', () => {
    expect(petReducer(defaultPetState(), { type: 'opacity', value: 0 }).state.opaqueness).toBe(0.3);
    expect(petReducer(defaultPetState(), { type: 'opacity', value: 2 }).state.opaqueness).toBe(1);
  });
});