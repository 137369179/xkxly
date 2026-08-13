import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useStore, useAvailableStars, useProgress } from '@/store/useStore';
import { ALBUMS, albumStickers, STICKER_MAP } from '@/data/stickers';
import { BADGES } from '@/data/badges';
import { BadgeCollection } from '@/modules/rewards/BadgeCollection';
import { PosterCard } from '@/components/PosterCard';
import { StickerScene } from '@/components/StickerScene';
import POEMS from '@/data/poems';
import { skillLabel } from '@/lib/srs';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { StarCounter } from '@/components/ui/Stars';
import { Modal } from '@/components/ui/Modal';
import { BigPraise } from '@/components/ui/Feedback';
import { celebrateBig } from '@/lib/celebrate';

import { WrongBookTrainer } from '@/modules/rewards/WrongBookTrainer';

import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTranslation } from '@/i18n/useTranslation';

const poemTitle = (id: string) => POEMS.find((p) => p.id === id)?.title;

export default function RewardsPage() {
  const { t } = useTranslation();
  const progress = useProgress();
  const available = useAvailableStars();
  const buySticker = useStore((s) => s.buySticker);
  const clearWrongBook = useStore((s) => s.clearWrongBook);
  const owned = useMemo(() => new Set(progress.stickers), [progress.stickers]);
  const ownedBadges = useMemo(() => new Set(progress.badges), [progress.badges]);

  const [album, setAlbum] = useState(ALBUMS[0] ?? '');
  const [justGot, setJustGot] = useState<string | null>(null);
  const justGotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const items = albumStickers(album);

  useEffect(() => {
    return () => {
      if (justGotTimerRef.current) clearTimeout(justGotTimerRef.current);
    };
  }, []);

  const handleBuy = (id: string, cost: number) => {
    if (owned.has(id)) return;
    const ok = buySticker(id, cost);
    if (ok) {
      setJustGot(id);
      celebrateBig();
      if (justGotTimerRef.current) clearTimeout(justGotTimerRef.current);
      justGotTimerRef.current = setTimeout(() => setJustGot(null), 2200);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader iconType="medal" title={t('rewards.pageTitle')} subtitle={t('rewards.pageSubtitle')} tone="pink" />

      <Panel className="!py-4 bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 border-2 border-pink-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FluffyIcon type="box" size="sm" />
            <div>
              <span className="text-sm font-extrabold text-pink-900">{t('rewards.wallet')}</span>
              <p className="text-[11px] font-bold text-pink-600">
                {t('rewards.walletSummary', { stars: progress.stars, spent: progress.spent })}
              </p>
            </div>
          </div>
          <StarCounter count={available} />
        </div>
      </Panel>

      {/* 3D 羊毛毡梦幻小屋与宠物互动换装面板 */}
      <Panel className="border-2 border-pink-300 bg-gradient-to-b from-pink-50 via-rose-50/50 to-purple-50">
        <PanelTitle iconType="pet" title={t('rewards.houseTitle')} subtitle={t('rewards.houseSubtitle')} tone="pink" />
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 左侧：宠物互动小屋 */}
          <div className="relative flex flex-col items-center justify-between rounded-3xl border-2 border-pink-200 bg-white p-4 shadow-sm sm:col-span-1">
            <span className="absolute left-3 top-3 rounded-full bg-pink-100 px-3 py-1 text-[11px] font-extrabold text-pink-600">
              💖 {t('rewards.affection100')}
            </span>
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94, rotate: [0, -5, 5, 0] }}
              onClick={() => { celebrateBig(); }}
              className="group cursor-pointer relative my-4 flex flex-col items-center"
            >
              <img
                src="/icons/felt_pet.jpg"
                alt="3D Felt Bunny Pet"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-36 w-36 rounded-full border-4 border-pink-300 object-cover shadow-fluffy transition-transform duration-300 group-hover:scale-105"
              />
              <span className="mt-2 rounded-full bg-pink-500 px-4 py-1 text-xs font-black text-white shadow-sm">
                🐰 {t('rewards.bunnyName')}
              </span>
            </motion.div>
            <CandyButton
              tone="pink"
              size="sm"
              fullWidth
              onClick={() => { celebrateBig(); }}
            >
              🍓 {t('rewards.feedBunny')}
            </CandyButton>
          </div>

          {/* 右侧：梦幻家装与魔法装备 */}
          <div className="flex flex-col gap-3 sm:col-span-2">
            <span className="text-xs font-extrabold text-pink-900">{t('rewards.dressUp')}</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-pink-200 bg-white p-3 shadow-sm">
                <FluffyIcon type="wand" size="md" />
                <div className="flex-1">
                  <p className="text-xs font-black text-pink-900">{t('rewards.magicWand')}</p>
                  <p className="text-[10px] font-bold text-pink-500">{t('rewards.magicWandDesc')}</p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                    {t('rewards.equipped')} ✨
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-purple-200 bg-white p-3 shadow-sm">
                <FluffyIcon type="room" size="md" />
                <div className="flex-1">
                  <p className="text-xs font-black text-purple-900">{t('rewards.strawberryHouse')}</p>
                  <p className="text-[10px] font-bold text-purple-500">{t('rewards.strawberryHouseDesc')}</p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                    {t('rewards.unlocked')} 🏡
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* 贴纸册 */}
      <Panel>
        <PanelTitle iconType="album" title={t('rewards.albumTitle')} subtitle={t('rewards.albumSubtitle', { collected: owned.size, total: Object.keys(STICKER_MAP).length })} tone="pink" />


        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {ALBUMS.map((a) => {
            const stk = albumStickers(a)[0];
            const t = TONE_STYLE[(stk?.id ? STICKER_MAP.get(stk.id)?.tone : undefined) ?? 'blue']!
            const active = a === album;
            return (
              <button
                key={a}
                onClick={() => setAlbum(a ?? '')}
                className={cn(
                  'no-select shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition-all',
                  active ? 'text-white' : 'text-ink-soft',
                )}
                style={active ? { background: t.main } : { background: t.soft }}
              >
                {a}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {items.map((s) => {
            const got = owned.has(s.id);
            const toneStyle = TONE_STYLE[s.tone ?? 'blue']!;
            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.92 }}
                disabled={got}
                onClick={() => handleBuy(s.id, s.cost)}
                className={cn(
                  'no-select flex flex-col items-center gap-1 rounded-[1.4rem] p-3 text-center shadow-candy-sm',
                  got ? '' : 'opacity-90',
                )}
                style={{ background: got ? toneStyle.soft : '#F3EEF6' }}
              >
                <span className={cn('text-4xl', !got && 'opacity-35 grayscale')}>{s.emoji}</span>
                <span className="line-clamp-1 text-[11px] font-extrabold" style={{ color: got ? toneStyle.deep : '#8B7F96' }}>
                  {s.name}
                </span>
                {!got && (
                  <span className="flex items-center gap-0.5 text-[11px] font-bold text-candy-yellow-deep">
                    ⭐ {s.cost}
                  </span>
                )}
                {got && <span className="text-[11px] font-extrabold text-candy-green-deep">{t('rewards.collected')} ✅</span>}
              </motion.button>
            );
          })}
        </div>
      </Panel>

      {/* 学习护照 */}
      <BadgeCollection />
      <PosterCard />

      {/* 贴纸场景装扮 */}
      <StickerScene />

      {/* 徽章墙 */}
      <Panel>
        <PanelTitle iconType="medal" title={t('rewards.badgeWall')} subtitle={t('rewards.badgeWallSubtitle', { count: progress.badges.length, total: BADGES.length })} tone="orange" />

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {BADGES.map((b) => {
            const has = ownedBadges.has(b.id);
            const toneStyle = TONE_STYLE[(b.tone ?? 'blue') as Tone]!;
            // 核心加强 J：未获得徽章展示进度条，让孩子知道"还差多少"
            // meter 返回 [当前值, 目标值]，无 meter 的徽章只显示 desc 引导
            const meter = !has && b.meter ? b.meter(progress) : null;
            const meterPct = meter ? Math.min(100, Math.round((meter[0] / meter[1]) * 100)) : 0;
            return (
              <div
                key={b.id}
                className={cn('flex flex-col items-center gap-1 rounded-2xl p-3 text-center', !has && 'opacity-55 grayscale')}
                style={{ background: has ? toneStyle.soft : '#F3EEF6' }}
                title={b.desc}
              >
                <span className="text-3xl">{b.emoji}</span>
                <span className="line-clamp-1 text-[11px] font-extrabold" style={{ color: has ? toneStyle.deep : '#8B7F96' }}>
                  {b.name}
                </span>
                {has ? (
                  <span className="text-[10px] font-extrabold text-candy-green-deep">{t('rewards.gotBadge')} ✅</span>
                ) : meter ? (
                  <div className="w-full space-y-0.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${meterPct}%`, background: toneStyle.main }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-ink-soft">
                      {meter[0]}/{meter[1]}
                    </span>
                  </div>
                ) : (
                  <span className="line-clamp-2 text-[9px] font-bold text-ink-soft/70">{b.desc}</span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 错题本 */}
      <WrongBookTrainer />

      <Panel>
        <PanelTitle
          emoji="📒"
          title={t('rewards.wrongbookTitle')}
          subtitle={progress.wrongBook.length ? t('rewards.wrongbookCount', { count: progress.wrongBook.length }) : t('rewards.wrongbookEmpty')}
          tone="purple"
          right={
            progress.wrongBook.length > 0 ? (
              <CandyButton tone="orange" variant="soft" size="sm" onClick={() => setConfirmClear(true)}>
                {t('rewards.clear')}
              </CandyButton>
            ) : undefined
          }
        />
        {progress.wrongBook.length === 0 ? (
          <p className="py-2 text-center text-sm font-bold text-ink-soft">{t('rewards.wrongbookTip')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {progress.wrongBook.map((skill) => {
              const cat = skill.split(':')[0] as Tone;
              const t = TONE_STYLE[cat]! ?? TONE_STYLE.purple;
              return (
                <span
                  key={skill}
                  className="rounded-full px-3 py-1.5 text-sm font-extrabold"
                  style={{ background: t.soft, color: t.deep }}
                >
                  {skillLabel(skill, poemTitle)}
                </span>
              );
            })}
          </div>
        )}
      </Panel>

      <BigPraise show={!!justGot} text={t('rewards.exchangeSuccess')} emoji={justGot ? STICKER_MAP.get(justGot)?.emoji ?? '🌟' : '🌟'} />

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} className="max-w-sm text-center">
        <h3 className="text-2xl font-extrabold text-rainbow">{t('rewards.clearConfirmTitle')}</h3>
        <p className="mt-2 text-base font-bold text-ink-soft">{t('rewards.clearConfirmDesc')}</p>
        <div className="mt-6 flex gap-3">
          <CandyButton tone="purple" variant="soft" size="lg" fullWidth onClick={() => setConfirmClear(false)}>
            {t('rewards.rethink')}
          </CandyButton>
          <CandyButton
            tone="orange"
            size="lg"
            fullWidth
            onClick={() => {
              clearWrongBook();
              setConfirmClear(false);
            }}
          >
            {t('rewards.confirmClear')}
          </CandyButton>
        </div>
      </Modal>
    </div>
  );
}
