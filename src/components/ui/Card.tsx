import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TONE_STYLE, TONES, type Tone } from '@/lib/tones';
import { FluffyIcon, type FluffyIconType } from '@/components/ui/FluffyIcon';

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn('card-candy border-4 border-pink-200/90 bg-white/92 shadow-fluffy rounded-[2.2rem]', padded && 'p-5 sm:p-7', className)}>
      {children}
    </section>
  );
}

export function PanelTitle({
  emoji,
  iconType,
  title,
  subtitle,
  tone = 'pink',
  right,
}: {
  emoji?: string;
  iconType?: FluffyIconType;
  title: string;
  subtitle?: string;
  tone?: Tone;
  right?: ReactNode;
}) {
  const t = TONE_STYLE[tone]!
  return (
    <header className="mb-5 flex items-center gap-3">
      {iconType ? (
        <FluffyIcon type={iconType} size="md" className="shrink-0" />
      ) : emoji ? (
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl border-2 border-white shadow-sm"
          style={{ background: t.soft }}
        >
          {emoji}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-extrabold sm:text-2xl" style={{ color: t.deep }}>
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 truncate text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

/** 大标题页头 - 粉色毛绒 3D 统一样式（支持 tone 主题色） */
export function PageHeader({
  emoji,
  iconType,
  title,
  subtitle,
  tone,
  right,
}: {
  emoji?: string;
  iconType?: FluffyIconType;
  title: string;
  subtitle?: string;
  tone?: string;
  right?: ReactNode;
}) {

  const tk: Tone = tone && (TONES as readonly string[]).includes(tone) ? (tone as Tone) : 'pink';
  const t = TONE_STYLE[tk]!
  return (
    <div
      className="relative overflow-hidden rounded-[2.2rem] border-4 shadow-fluffy p-5 sm:p-7 mb-6"
      style={{
        borderColor: t.soft,
        background: `linear-gradient(90deg, ${t.soft} 0%, #ffffff 55%, ${t.soft} 100%)`,
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {iconType ? (
            <FluffyIcon type={iconType} size="lg" className="shrink-0" />
          ) : emoji ? (
            <span
              className="grid h-16 w-16 place-items-center rounded-3xl text-3xl shadow-sm border-2 shrink-0"
              style={{ background: t.soft, borderColor: t.main }}
            >
              {emoji}
            </span>
          ) : null}
          <div>
            {/* clamp 流式字号：375px≈24px → 640px≈29px → ≥1024px 封顶 30px，替代断点跳跃 */}
            <h1 className="text-[clamp(1.5rem,1rem+2vw,1.875rem)] font-black tracking-wide" style={{ color: t.deep }}>
              {title}
            </h1>
            {subtitle && <p className="text-xs sm:text-sm font-bold text-ink-soft mt-1">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}
