/**
 * RPG 属性引擎（纯函数，可单测）
 * 4 个新维度 exp（好感维沿用既有 affinity），50exp/级封顶 Lv10。
 */
export type AttrDim = 'int' | 'vit' | 'cha' | 'cre';

export type AttrSourceKind =
  | 'letters' | 'hanzi' | 'pinyin' | 'poems' | 'words' | 'numbers'
  | 'pomodoro' | 'games' | 'logic'
  | 'songs' | 'music' | 'art'
  | 'pixel' | 'storybook' | 'story';

export interface SourceSpec { dim: AttrDim; exp: number; dailyCap: number }

/** 15 个来源集中映射 */
export const ATTR_SOURCES: Record<AttrSourceKind, SourceSpec> = {
  letters:   { dim: 'int', exp: 8,  dailyCap: 6 },
  hanzi:     { dim: 'int', exp: 8,  dailyCap: 6 },
  pinyin:    { dim: 'int', exp: 8,  dailyCap: 6 },
  poems:     { dim: 'int', exp: 8,  dailyCap: 6 },
  words:     { dim: 'int', exp: 8,  dailyCap: 6 },
  numbers:   { dim: 'int', exp: 10, dailyCap: 6 },
  pomodoro:  { dim: 'vit', exp: 15, dailyCap: 5 },
  games:     { dim: 'vit', exp: 10, dailyCap: 5 },
  logic:     { dim: 'vit', exp: 10, dailyCap: 5 },
  songs:     { dim: 'cha', exp: 8,  dailyCap: 5 },
  music:     { dim: 'cha', exp: 8,  dailyCap: 5 },
  art:       { dim: 'cha', exp: 10, dailyCap: 5 },
  pixel:     { dim: 'cre', exp: 10, dailyCap: 4 },
  storybook: { dim: 'cre', exp: 10, dailyCap: 4 },
  story:     { dim: 'cre', exp: 10, dailyCap: 4 },
};

export interface AttributesState {
  exp: Record<AttrDim, number>;
  daily: Record<string, Partial<Record<AttrSourceKind, number>>>;
  lastAt: Partial<Record<AttrSourceKind, number>>;
}

export const emptyAttributes = (): AttributesState => ({
  exp: { int: 0, vit: 0, cha: 0, cre: 0 },
  daily: {},
  lastAt: {},
});

export const ATTR_MAX_EXP = 450;

export function attrLevel(exp: number): number {
  return Math.min(10, 1 + Math.floor(Math.max(0, exp) / 50));
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 记一次来源上报：60s 去重 + 日上限。capped/dup 时返回原状态引用。 */
export function gainAttr(
  state: AttributesState,
  kind: AttrSourceKind,
  now: number,
): { state: AttributesState; dim: AttrDim; gained: number; capped: boolean } {
  const spec = ATTR_SOURCES[kind];
  if (state.lastAt[kind] != null && now - state.lastAt[kind]! < 60_000) {
    return { state, dim: spec.dim, gained: 0, capped: false };
  }
  const day = dayKey(now);
  const used = state.daily[day]?.[kind] ?? 0;
  if (used >= spec.dailyCap) return { state, dim: spec.dim, gained: 0, capped: true };
  return {
    state: {
      exp: { ...state.exp, [spec.dim]: state.exp[spec.dim] + spec.exp },
      daily: { ...state.daily, [day]: { ...state.daily[day], [kind]: used + 1 } },
      lastAt: { ...state.lastAt, [kind]: now },
    },
    dim: spec.dim,
    gained: spec.exp,
    capped: false,
  };
}
