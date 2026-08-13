/**
 * 自适应学习链面板（M7 家长仪表盘增强）
 * ------------------------------------------------------------
 * 把 adaptChain 的 8 条学习链可视化成仪表盘卡片，
 * 家长可一眼看到孩子在各模块的进退态势，并手动干预降级/重置。
 */
import { useState } from 'react';
import { getChainSnapshot, resetChain, type ChainSlot } from '@/lib/adaptChain';
import { SUBJECTS } from '@/lib/srs';

import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface CategoryMeta {
  key: string;
  label: string;
  emoji: string;
  tone: Tone;
}

// 学科映射单一真相源：取自 @/lib/srs（learning skill taxonomy），避免各处硬编码漂移。
// 自适应链实际跟踪以下 8 个学科，顺序与此前保持一致。
const CHAIN_KEYS = ['letter', 'number', 'math', 'hanzi', 'pinyin', 'poem', 'word', 'logic'];
const CATEGORIES: CategoryMeta[] = CHAIN_KEYS.map((key) => {
  const def = SUBJECTS.find((s) => s.key === key)!;
  return { key, label: def.label, emoji: def.emoji, tone: def.tone };
});

const LV_LABELS = ['未开始', '基础', '提升', '熟练', '进阶', '挑战'];
const LV_COLORS = [
  'bg-gray-300',          // 0 未开始
  'bg-sky-400',           // 1 基础
  'bg-green-400',         // 2 提升
  'bg-amber-400',         // 3 熟练
  'bg-orange-500',        // 4 进阶
  'bg-red-500',           // 5 挑战
];

const LV_DIRECTION: Record<number, string> = {
  '0': '📭',
  '1': '↗️',
  '2': '↗️',
  '3': '➡️',
  '4': '↗️',
  '5': '🏆',
};

function StreakBar({ slot }: { slot: ChainSlot }) {
  const total = 5;
  const filled = slot.streak > 0 ? Math.min(slot.streak, total) : 0;
  const danger = slot.streak < 0 ? Math.min(-slot.streak, 3) : 0;

  return (
    <div className="mt-1 flex items-center gap-0.5">
      {slot.pendingUp && (
        <span className="mr-1 text-xs font-black text-amber-500 animate-bounce">⚡升级考核中</span>
      )}
      {slot.streak > 0 && (
        <>
          <span className="text-[10px] font-bold text-green-600">连对{slot.streak}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={`_-${i}`}
                className={cn('h-1.5 w-3 rounded-sm', i < filled ? 'bg-green-500' : 'bg-green-200')}
              />
            ))}
          </div>
          {slot.streak >= 5 && !slot.pendingUp && <span className="text-[9px] font-semibold text-amber-600">→即将升级</span>}
        </>
      )}
      {slot.streak < 0 && (
        <>
          <span className="text-[10px] font-bold text-red-500">连错{-slot.streak}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`_-${i}`}
                className={cn('h-1.5 w-3 rounded-sm', i < danger ? 'bg-red-500' : 'bg-red-100')}
              />
            ))}
          </div>
          {danger >= 3 && <span className="text-[9px] font-semibold text-orange-600">→降级</span>}
        </>
      )}
      {slot.streak === 0 && (
        <span className="text-[10px] font-medium text-ink-muted">持平中</span>
      )}
    </div>
  );
}

export function ChainDashboard() {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState(() => getChainSnapshot());
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

  const refresh = () => setSnapshot(getChainSnapshot());
  const handleReset = (cat: string) => {
    resetChain(cat);
    setConfirmReset(null);
    refresh();
  };

  // 补全未在 snapshot 中的分类
  const full: (ChainSlot & CategoryMeta)[] = CATEGORIES.map((c) => {
    const slot = snapshot.find((s) => s.category === c.key);
    return {
      category: c.key,
      lv: slot?.lv ?? 0,
      streak: slot?.streak ?? 0,
      lastCorrect: slot?.lastCorrect ?? false,
      pendingUp: slot?.pendingUp ?? false,
      ...c,
    };
  });

  const avgLv = full.length
    ? Math.round((full.reduce((s, f) => s + f.lv, 0) / full.length) * 10) / 10
    : 0;

  return (
    <div className="card-candy p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-ink">{t('chainDashboard.title')}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink-soft">
            综合等级 {avgLv} / 5
          </span>
          <button aria-label="🔄 刷新"
            onClick={refresh}
            className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-ink-soft shadow-sm hover:bg-pink-50"
          >
            🔄 刷新
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs font-medium text-ink-muted">
        连对 5 题触发升级评估 · 连错 3 题自动降级 · 等级越高题目越难
      </p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {full.map((f) => {
          const t = TONE_STYLE[f.tone] ?? TONE_STYLE.blue;

          return (
            <div
              key={f.key}
              className="relative rounded-xl border-2 p-3"
              style={{ borderColor: t.main + '33', background: t.soft + '55' }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-extrabold" style={{ color: t.deep }}>
                  {f.emoji} {f.label}
                </span>
                <span className="text-xs font-bold" style={{ color: t.main }}>
                  Lv.{f.lv} {LV_LABELS[f.lv] ?? ''} {LV_DIRECTION[f.lv] ?? ''}
                </span>

              </div>

              {/* 等级条 */}
              <div className="mb-1.5 flex gap-0.5">
                {LV_COLORS.map((color, i) => (
                  <div
                    key={`color-${i}`}
                    className={cn('h-2 flex-1 rounded-sm transition-all', i <= f.lv ? color : 'bg-gray-100')}
                  />
                ))}
              </div>

              {/* 方向指示器 */}
              <StreakBar slot={f} />

              {/* 待升级标记 */}
              {f.pendingUp && (
                <div className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-center text-[10px] font-bold text-amber-700">
                  🎯 等待升级评估
                </div>
              )}

              {/* 手动干预 */}
              {confirmReset === f.key ? (
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => handleReset(f.key)}
                    className="flex-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white"
                  >
                    确认重置
                  </button>
                  <button
                    onClick={() => setConfirmReset(null)}
                    className="flex-1 rounded-md bg-gray-300 px-1.5 py-0.5 text-[9px] font-bold text-gray-700"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button aria-label="🔧 重置"
                  onClick={() => setConfirmReset(f.key)}
                  className="mt-2 text-[9px] font-medium text-ink-muted hover:text-red-500"
                  title="将链条重置为初始状态"
                >
                  🔧 重置
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
