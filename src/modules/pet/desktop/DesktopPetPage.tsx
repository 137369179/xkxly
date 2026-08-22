/**
 * 桌面宠物 · 主页面（12 模块整合）
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePet, useWeather, PetProvider } from './PetProvider';
import type { PetState, PetAction } from './petReducer';
import { PetStage } from './PetStage';
import { ChatPanel } from './ChatPanel';
import { INTERACTIONS, ACCESSORIES, PALETTE, type InteractionType, type AccessoryId } from './data';
import { affinityLevel, addInteraction, levelProgress, todayKey } from './lib/affinity';
import { formatRemain } from './lib/pomodoro';
import { todosReducer } from './lib/todos';
import { blankGrid, serialize, paletteAt, parse, PIXEL_W, PIXEL_H, PIXEL_PRESETS, type PixelGrid } from './lib/pixel';

export function DesktopPetPage() {
  return (
    <PetProvider>
      <PetManager />
    </PetProvider>
  );
}

function PetManager() {
  const { state, dispatch } = usePet();
  const { code: weather, preset, error: weatherError } = useWeather();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const interact = (type: InteractionType) => {
    const before = affinityLevel(state.affinity.exp);
    const sim = addInteraction(state.affinity, type);
    const after = affinityLevel(sim.state.exp);
    dispatch({ type: 'interact', interaction: type });
    if (after > before) showToast(`🎉 好感度升到 ${after} 级啦！`);
  };

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'pomodoro-tick', delta: 1000 }), 1000);
    return () => window.clearInterval(id);
  }, [dispatch]);

  const prevPhase = useRef(state.pomodoro.phase);
  useEffect(() => {
    const cur = state.pomodoro.phase;
    const was = prevPhase.current;
    prevPhase.current = cur;
    if (was === 'work' && cur === 'rest') showToast('⏰ 专注结束，休息一下眼睛吧！');
    if (was === 'rest' && cur === 'idle') {
      showToast('🍅 完成一轮番茄，真棒！');
      dispatch({ type: 'interact', interaction: 'pomodoro' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pomodoro.phase]);

  const { level, progress, toNext } = levelProgress(state.affinity.exp);
  const today = todayKey();
  const usedFeed = state.affinity.interacted[today]?.feed ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:p-5">
      {/* 顶部 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-black text-ink">🐾 桌面小宠物</h1>
        <div className="flex items-center gap-2">
          {weatherError ? (
            <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-bold text-ink/60">天气：离线</span>
          ) : (
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-sm font-bold text-ink">{preset.emoji} {preset.label}</span>
          )}
          <button
            onClick={() => { dispatch({ type: 'home', value: !state.home }); }}
            className="rounded-full bg-pink-500 px-3 py-1.5 text-sm font-bold text-white transition active:translate-y-[1px]"
          >
            🏠 {state.home ? '出门玩' : '回家'}
          </button>
        </div>
      </div>

      <PetStage
        state={state}
        weather={weather}
        onPetInteract={() => interact('pet')}
        onGoHome={(home: boolean) => {
          dispatch({ type: 'home', value: home });
          if (home) showToast('回到家啦🏠');
        }}
      />

      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl bg-ink/90 px-4 py-2 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AffinityPanel state={state} onInteract={interact} level={level} progress={progress} usedFeed={usedFeed} />
        <ChatPanel
          personality={state.personality}
          onPersonalityChange={(id) => dispatch({ type: 'personality', id })}
          onTalk={() => interact('talk')}
        />
        <AccessoryPanel state={state} onToggle={(id) => dispatch({ type: 'equip', id })} />
        <PomodoroPanel state={state} dispatch={dispatch} />
        <TodoPanel state={state} onAdd={(t) => dispatch({ type: 'todo', action: { type: 'add', text: t } })} onToggle={(id) => {
          const res = todosReducer(state.todos, { type: 'toggle', id });
          dispatch({ type: 'todo', action: { type: 'toggle', id } });
          if (res.justCompleted) interact('task');
        }} onRemove={(id) => dispatch({ type: 'todo', action: { type: 'remove', id } })} />
        <PixelEditorPanel initial={state.pixel} onSave={(serialized) => dispatch({ type: 'pixel', serialized })} onToast={showToast} />
      </div>

      <SettingsPanel state={state} dispatch={dispatch} toNext={toNext} />
    </div>
  );
}

/* ---------------- 好感度面板 ---------------- */
function AffinityPanel({ state, onInteract, level, progress, usedFeed }: {
  state: PetState; onInteract: (t: InteractionType) => void; level: number; progress: number; usedFeed: number;
}) {
  const today = todayKey();
  return (
    <Section emoji="💕" title="好感度">
      <div className="mb-2">
        <div className="mb-1 flex justify-between text-xs font-bold text-ink/70">
          <span>Lv.{level}</span>
          <span>{state.affinity.exp} 经验 · 今日零食已喂 {usedFeed}/10</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {INTERACTIONS.map((it) => {
          const used = state.affinity.interacted[today]?.[it.type] ?? 0;
          const left = Math.max(0, it.daily - used);
          return (
            <button
              key={it.type}
              onClick={() => onInteract(it.type)}
              disabled={left <= 0}
              className="flex items-center justify-between rounded-xl bg-white/80 px-2.5 py-2 text-sm font-bold text-ink transition active:translate-y-[1px] disabled:opacity-40"
            >
              <span>{it.emoji} {it.label}</span>
              <span className="text-xs text-ink/50">{it.exp}分 · {left}次</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------- 配件面板 ---------------- */
function AccessoryPanel({ state, onToggle }: { state: PetState; onToggle: (id: AccessoryId) => void }) {
  return (
    <Section emoji="🎀" title="装扮 / 配件">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {ACCESSORIES.map((a) => {
          const on = state.accessories.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => onToggle(a.id)}
              className={`flex flex-col items-center rounded-xl border-2 px-2 py-2 transition active:translate-y-[1px] ${on ? 'border-pink-400 bg-pink-100' : 'border-white/70 bg-white/70'}`}
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="mt-0.5 text-xs font-bold text-ink">{a.label}</span>
              <span className="text-[10px] text-ink/50">{on ? '已佩戴' : '未佩戴'}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------- 番茄钟面板 ---------------- */
function PomodoroPanel({ state, dispatch }: { state: PetState; dispatch: (a: PetAction) => void }) {
  const { phase, remainingMs, cycles } = state.pomodoro;
  const { workMin, restMin } = state.pomodoroConfig;
  const [w, setW] = useState(workMin);
  const [r, setR] = useState(restMin);
  // 外部配置变化（如 localStorage 恢复）时同步输入框
  useEffect(() => { setW(workMin); }, [workMin]);
  useEffect(() => { setR(restMin); }, [restMin]);

  const applyConfig = (nextW = w, nextR = r) => {
    const nw = Math.min(120, Math.max(1, Math.round(nextW) || 1));
    const nr = Math.min(120, Math.max(1, Math.round(nextR) || 1));
    setW(nw); setR(nr);
    dispatch({ type: 'pomodoro-config', workMin: nw, restMin: nr });
  };

  return (
    <Section emoji="🍅" title="番茄钟">
      <div className="mb-2 text-center">
        <div className="text-4xl font-black tabular-nums text-ink">{formatRemain(remainingMs)}</div>
        <div className="text-xs font-bold text-ink/60">
          {phase === 'idle' ? '未开始' : phase === 'work' ? '专注中' : '休息中'}
          {cycles > 0 && ` · 已完成 ${cycles} 轮`}
        </div>
      </div>

      {/* 时长配置（仅空闲时可改，运行中锁定避免状态混乱） */}
      <div className={`mb-2 rounded-xl bg-white/50 p-2 transition ${phase === 'idle' ? '' : 'pointer-events-none opacity-40'}`}>
        <div className="mb-1.5 flex items-center gap-2">
          <label className="flex flex-1 items-center gap-1.5 text-xs font-bold text-ink/70">
            专注
            <input
              type="number" min={1} max={120} value={w}
              onChange={(e) => setW(Number(e.target.value))}
              onBlur={() => applyConfig()}
              onKeyDown={(e) => { if (e.key === 'Enter') applyConfig(); }}
              className="w-14 rounded-lg border-2 border-white/80 bg-white px-1.5 py-1 text-center text-sm font-bold text-ink outline-none focus:border-purple-400"
              aria-label="专注时长（分钟）"
            />
            分钟
          </label>
          <label className="flex flex-1 items-center gap-1.5 text-xs font-bold text-ink/70">
            休息
            <input
              type="number" min={1} max={120} value={r}
              onChange={(e) => setR(Number(e.target.value))}
              onBlur={() => applyConfig()}
              onKeyDown={(e) => { if (e.key === 'Enter') applyConfig(); }}
              className="w-14 rounded-lg border-2 border-white/80 bg-white px-1.5 py-1 text-center text-sm font-bold text-ink outline-none focus:border-teal-400"
              aria-label="休息时长（分钟）"
            />
            分钟
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold text-ink/50">快捷：</span>
          {[15, 25, 50].map((m) => (
            <button
              key={m}
              onClick={() => applyConfig(m, r)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition active:translate-y-[1px] ${w === m ? 'bg-purple-500 text-white' : 'bg-white/80 text-ink'}`}
            >
              专注{m}分
            </button>
          ))}
          {phase !== 'idle' && <span className="ml-auto text-[10px] text-ink/40">运行中锁定</span>}
        </div>
      </div>

      <div className="flex gap-2">
        {phase === 'idle' ? (
          <>
            <button onClick={() => dispatch({ type: 'pomodoro-start', phase: 'work' })} className="flex-1 rounded-xl bg-purple-500 px-3 py-2 text-sm font-bold text-white active:translate-y-[1px]">▶ 开始专注</button>
            <button onClick={() => dispatch({ type: 'pomodoro-start', phase: 'rest' })} className="flex-1 rounded-xl bg-teal-500 px-3 py-2 text-sm font-bold text-white active:translate-y-[1px]">☕ 开始休息</button>
          </>
        ) : (
          <button onClick={() => dispatch({ type: 'pomodoro-reset' })} className="flex-1 rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-ink active:translate-y-[1px]">⏹ 停止</button>
        )}
      </div>
    </Section>
  );
}

/* ---------------- 待办面板 ---------------- */
function TodoPanel({ state, onAdd, onToggle, onRemove }: {
  state: PetState;
  onAdd: (t: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <Section emoji="📝" title="待办清单（完成有好感度奖励）">
      <div className="mb-2 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border-2 border-white/80 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-purple-400"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onAdd(text); setText(''); } }}
          placeholder="添加一个任务…"
          aria-label="新增待办"
        />
        <button onClick={() => { if (text.trim()) { onAdd(text); setText(''); } }} className="rounded-xl bg-purple-500 px-3 py-2 text-sm font-bold text-white active:translate-y-[1px]">添加</button>
      </div>
      <div className="space-y-1.5">
        {state.todos.length === 0 && <p className="py-3 text-center text-sm text-ink/50">还没有任务，加一个吧～</p>}
        {state.todos.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2">
            <button
              onClick={() => onToggle(t.id)}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm ${t.done ? 'border-pink-400 bg-pink-400 text-white' : 'border-ink/30 text-transparent'}`}
              aria-label={t.done ? '标记未完成' : '标记完成'}
            >
              ✓
            </button>
            <span className={`flex-1 text-sm font-bold ${t.done ? 'text-ink/40 line-through' : 'text-ink'}`}>{t.text}</span>
            <button onClick={() => onRemove(t.id)} className="text-sm text-ink/40 hover:text-rose-500" aria-label="删除">✕</button>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- 拼豆编辑器 ---------------- */
function PixelEditorPanel({ initial, onSave, onToast }: {
  initial: string | null; onSave: (s: string) => void; onToast: (m: string) => void;
}) {
  // 初始化时回显已保存的图案（刷新/重进后编辑区不丢内容）
  const [grid, setGrid] = useState<PixelGrid>(() => {
    const p = initial ? parse(initial) : null;
    return p && p.w === PIXEL_W && p.h === PIXEL_H && p.grid.length === PIXEL_W * PIXEL_H
      ? p.grid
      : blankGrid();
  });
  const [color, setColor] = useState(4);

  const paint = (i: number) => {
    setGrid((g) => {
      const next = g.slice();
      next[i] = next[i] === color ? -1 : color;
      return next;
    });
  };

  return (
    <Section emoji="🧩" title="拼豆编辑器（画自己的宠物）">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div
          className="grid shrink-0 gap-0.5 rounded-xl bg-white/80 p-1.5"
          style={{ gridTemplateColumns: `repeat(16, 8px)` }}
        >
          {grid.map((v, i) => (
            <button
              key={i}
              onClick={() => paint(i)}
              className="h-2 w-2"
              style={{ background: v >= 0 ? paletteAt(v) : '#e8e8ec' }}
              aria-label={`格 ${i}`}
            />
          ))}
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {PALETTE.map((hex, i) => (
              <button
                key={hex}
                onClick={() => setColor(i)}
                className={`h-5 w-5 rounded-full border-2 ${i === color ? 'border-ink' : 'border-white/70'}`}
                style={{ background: hex }}
                aria-label={`颜色 ${hex}`}
              />
            ))}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-black text-ink/60">预设模板：</span>
            {PIXEL_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setGrid(p.grid.slice())}
                className="flex items-center gap-1 rounded-lg border border-purple-200 bg-white/90 px-2 py-1 text-xs font-bold text-ink shadow-xs transition hover:scale-105 active:scale-95"
                title={`加载${p.name}模板`}
              >
                <span>{p.emoji}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setGrid(blankGrid())} className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-bold text-ink active:translate-y-[1px]">清空</button>
            <button onClick={() => { onSave(serialize(grid)); onToast('💾 已应用为宠物外观！'); }} className="rounded-lg bg-purple-500 px-2.5 py-1.5 text-xs font-bold text-white active:translate-y-[1px]">保存并应用</button>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- 设置面板 ---------------- */
function SettingsPanel({ state, dispatch, toNext }: { state: PetState; dispatch: (a: PetAction) => void; toNext: number | null }) {
  return (
    <Section emoji="⚙️" title="设置">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          透明度
          <input
            type="range" min={30} max={100} value={Math.round(state.opaqueness * 100)}
            onChange={(e) => dispatch({ type: 'opacity', value: Number(e.target.value) / 100 })}
            className="w-40 accent-purple-500"
          />
          <span className="text-xs text-ink/60">{Math.round(state.opaqueness * 100)}%</span>
        </label>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-ink/60">✨ 页面内置顶显示，拖动宠物移动，拖到门口回家</span>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-ink/60">⭐ 距下一级 {toNext ?? '—'} 经验</span>
      </div>
    </Section>
  );
}

/* ---------------- 通用区块 ---------------- */
function Section({ emoji, title, children }: { emoji: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-white/60 bg-white/40 p-3.5 backdrop-blur-sm">
      <h2 className="mb-2.5 flex items-center gap-1.5 text-base font-black text-ink">
        <span>{emoji}</span> {title}
      </h2>
      {children}
    </div>
  );
}

export default DesktopPetPage;