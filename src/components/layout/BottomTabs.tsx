import { motion } from 'motion/react';
import { NAV_ITEMS } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { TONE_STYLE } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { sfxTap } from '@/lib/sfx';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTranslation } from '@/i18n/useTranslation';

export function BottomTabs({ active }: { active: RouteId }) {
  const { t: translate } = useTranslation();
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t-4 border-pink-200 bg-pink-50/92 backdrop-blur-xl lg:hidden shadow-fluffy"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-1 py-1.5">
        {NAV_ITEMS.filter((it) => it.bottom).map((item) => {
          const t = TONE_STYLE[item.tone]!
          const isActive = active === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                onClick={() => {
                  sfxTap();
                  navigate(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={translate(`nav.${item.id}.label`) || item.label}
                className={cn(
                  'no-select relative flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1',
                  'transition-transform duration-150 active:scale-95',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-x-1 inset-y-0.5 -z-10 rounded-2xl border-2 border-pink-300 shadow-sm"
                    style={{ background: t.soft }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <motion.div
                  animate={isActive ? { scale: [1, 1.15, 1.08] } : { scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <FluffyIcon type={item.id} size="sm" className={cn('transition-transform', isActive && 'scale-110 border-pink-400')} />
                </motion.div>
                <span
                  className={cn("text-[11px] leading-tight font-black transition-colors", isActive ? "text-pink-600 font-extrabold" : "text-purple-900/60")}
                >
                  {translate(`nav.${item.id}.short`) || item.short}
                </span>

              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
