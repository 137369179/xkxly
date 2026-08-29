import { useMemo } from 'react';
import { ISLAND_META, navByIsland, type NavItem } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { TONE_STYLE } from '@/lib/tones';
import { speak } from '@/lib/speech';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTapFeedback } from '@/hooks/useTapFeedback';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 乐园地图（改版 Phase B3）
 * ------------------------------------------------------------------
 * 对标洪恩识字的「星球/关卡地图」与宝宝巴士的「场景化世界」：
 * 用 4 座岛屿替代原侧边栏 32 项平铺与 🔎 分类抽屉，
 * 42 个模块零删减，全部在 ≤2 步内可达。
 *
 * 交互纪律（对标帮帮识字「全图标 + 语音引导、三步内完成」）：
 * - 每个乐园入口都是「大图标 + 文字 + 🔊 朗读」，不识字也能用；
 * - 点击卡片直接进模块（1 步），点小喇叭只朗读不跳转（防误触）；
 * - 触控目标 ≥88px，卡片间距走 --space-hub。
 */
export default function HallPage() {
  const { t } = useTranslation();
  const islands = useMemo(() => navByIsland(), []);
  /** 轻点反馈：音效 + 触感 + 星光粒子（对标三家「点哪都有反应」） */
  const onTap = useTapFeedback();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">🗺️ 乐园地图</h1>
          <p className="mt-0.5 text-sm font-bold text-ink-soft">
            {t('hall.subtitle') || '选一个乐园，马上开始玩'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-candy-yellow-soft px-3 py-1.5 text-xs font-black text-candy-yellow-deep">
          {islands.reduce((n, g) => n + g.items.length, 0)} 个乐园
        </span>
      </div>

      {/* 岛屿之间用虚线路径串联，强化「地图」心智 */}
      <div className="relative space-y-5">
        <span
          aria-hidden="true"
          className="absolute left-6 top-8 bottom-8 w-1 rounded-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, var(--color-line, #F3E3CF) 0 10px, transparent 10px 20px)',
          }}
        />
        {islands.map((g, gi) => {
          const meta =
            ISLAND_META.find((m) => m.key === g.key) ??
            { key: g.key, label: g.key, emoji: '🏝️', tone: 'blue' as const };
          const tone = TONE_STYLE[meta.tone] ?? TONE_STYLE.blue;
          // 岛屿入场基准延迟：后续卡片在此基础上继续错峰，形成自上而下的涟漪感
          const baseDelay = gi * 0.08;
          return (
            // 复用 Hero 的淡入上移 keyframes（reduced-motion 已由 @media 全局禁用）
            <section
              key={g.key}
              className="relative animate-hero-fade-up"
              style={{ animationDelay: `${baseDelay}s` }}
            >
              <div className="mb-2 flex items-center gap-2">
                {meta.brandIcon ? (
                  <img
                    src={meta.brandIcon}
                    alt=""
                    aria-hidden="true"
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-2xl border-4 border-white object-cover shadow-candy-sm"
                    style={{ background: tone.soft }}
                  />
                ) : (
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-4 border-white text-2xl shadow-candy-sm"
                    style={{ background: tone.soft }}
                    aria-hidden="true"
                  >
                    {meta.emoji}
                  </span>
                )}
                <div>
                  <h2 className="text-xl font-black" style={{ color: tone.deep }}>
                    {meta.label}
                  </h2>
                  <p className="text-xs font-bold text-ink-soft">{g.items.length} 个乐园</p>
                </div>
              </div>

              <ul className="grid grid-cols-2 gap-[var(--space-hub,16px)] sm:grid-cols-3 xl:grid-cols-4">
                {g.items.map((item, ii) => (
                  <li
                    key={item.id}
                    className="animate-hero-fade-up"
                    style={{ animationDelay: `${baseDelay + ii * 0.03}s` }}
                  >
                    <HubCard
                      item={item}
                      onOpen={(e) => {
                        // onTap 已含音效 + 触感 + 星光粒子，此处只负责跳转
                        onTap(e);
                        navigate(item.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-center text-xs font-bold text-ink-soft">
        {t('hall.tip') || '找不到想玩的？问问右下角的小伙伴吧～'}
      </p>
    </div>
  );
}

/** 乐园入口大卡（HubCard）：大图标 + 文字 + 朗读角标，一键直达 */
function HubCard({
  item,
  onOpen,
}: {
  item: NavItem;
  onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const tone = TONE_STYLE[item.tone] ?? TONE_STYLE.pink;
  const onTap = useTapFeedback();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => onOpen(e)}
        aria-label={item.label}
        // hover 桌面端微上浮（触摸端无 hover，按下反馈仍由 active 即时响应）
        className="no-select flex min-h-[128px] w-full flex-col overflow-hidden rounded-[1.5rem] border-4 bg-white text-left shadow-candy transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-1"
        style={{ borderColor: tone.soft }}
      >
        <span
          className="grid flex-1 place-items-center text-4xl"
          style={{ background: `linear-gradient(135deg, ${tone.soft} 0%, #ffffff 90%)` }}
          aria-hidden="true"
        >
          {item.brandIcon ? (
            <img
              src={item.brandIcon}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl object-cover shadow-candy-sm"
            />
          ) : (
            <FluffyIcon type={item.id as RouteId} size="md" />
          )}
        </span>
        <span className="px-3 py-2">
          <span className="block truncate text-base font-black" style={{ color: tone.deep }}>
            {item.label}
          </span>
          <span className="block truncate text-xs font-bold text-ink-soft">{item.desc}</span>
        </span>
      </button>

      {/* 朗读角标：点它只发音，不跳转（防误触 + 不识字可用） */}
      <button
        type="button"
        aria-label={`朗读 ${item.label}`}
        onClick={(e) => {
          e.stopPropagation();
          onTap(e);
          void speak(item.label);
        }}
        className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-white/95 text-lg shadow-candy-sm transition-transform active:scale-95"
      >
        🔊
      </button>
    </div>
  );
}
