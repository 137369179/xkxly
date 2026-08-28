/**
 * 学习护照成就册
 * 仿真实护照风格，每获一个徽章盖一个"印章"
 */

import { useState } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useBadges, useBadgeDates, useStars, useStreak } from '@/store/useStore';
import { BADGES } from '@/data/badges';
import { TONE_STYLE } from '@/lib/tones';
import { motion } from 'motion/react';
import { sfxTap } from '@/lib/sfx';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTranslation } from '@/i18n/useTranslation';


export function BadgeCollection() {
  const { t } = useTranslation();
  const badges = useBadges();
  const badgeDates = useBadgeDates();
  const stars = useStars();
  const streak = useStreak();
  const [page, setPage] = useState(0);
  const PER_PAGE = 6;

  const owned = new Set(badges);
  const ownedBadges = BADGES.filter(b => owned.has(b.id));
  const lockedBadges = BADGES.filter(b => !owned.has(b.id));
  const allSorted = [...ownedBadges, ...lockedBadges];
  const totalPages = Math.ceil(allSorted.length / PER_PAGE);
  const pageItems = allSorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <Panel className="overflow-hidden">
      <PanelTitle
        iconType="medal"
        title={t('studyPassport.passportTitle')}
        subtitle={t('studyPassport.collected', { owned: ownedBadges.length, total: BADGES.length })}
        tone="purple"
      />

      {/* 护照封面风格 */}
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 p-4 text-white shadow-fluffy relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs font-extrabold tracking-widest text-pink-200 uppercase">BABY LEARNING PARK</p>
            <p className="text-xl font-black tracking-wide drop-shadow">宝贝学习乐园 · 成就护照</p>
          </div>
          <FluffyIcon type="medal" size="md" className="border-amber-300 shadow-md" />
        </div>
        <div className="mt-3 flex gap-4 text-xs font-black opacity-95 relative z-10">
          <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">⭐ {stars} 金星</span>
          <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">🔥 {streak} 天连胜</span>
          <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">🏅 {ownedBadges.length}/{BADGES.length} 勋章</span>
        </div>
      </div>


      {/* 翻页内容 */}
      <div className="relative min-h-[280px]">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {pageItems.map(b => {
            const owned = badges.includes(b.id);
            const date = badgeDates?.[b.id];
            const t = TONE_STYLE[b.tone] ?? TONE_STYLE.purple;
            return (
              <div
                key={b.id}
                className={`relative flex flex-col items-center rounded-2xl border-4 p-3 text-center transition-all ${
                  owned
                    ? 'border-candy-purple-soft bg-white'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
                style={owned ? { borderColor: t.deep + '40' } : {}}
              >
                <div className={`text-4xl ${owned ? '' : 'grayscale opacity-40'}`}>
                  {owned ? b.emoji : '🔒'}
                </div>
                <div className="mt-1 text-sm font-extrabold text-ink">{b.name}</div>
                <div className="text-xs font-bold text-ink-soft">{b.desc}</div>
                {owned && date && (
                  <div className="mt-1 text-xs font-bold text-ink-soft">
                    {new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </div>
                )}
                {owned && (
                  <div
                    className="absolute -right-1 -top-1 flex h-6 w-6 rotate-12 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{ background: t.deep }}
                  >
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* 翻页控制 */}
      <div className="mt-4 flex items-center justify-between">
        <CandyButton
          tone="purple"
          variant="soft"
          size="sm"
          disabled={page === 0}
          onClick={() => { sfxTap(); setPage(p => p - 1); }}
        >
          {t('studyPassport.prevPage')}
        </CandyButton>
        <span className="text-sm font-bold text-ink-soft">
          {t('studyPassport.pageInfo', { page: page + 1, total: totalPages })}
        </span>
        <CandyButton
          tone="purple"
          variant="soft"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={() => { sfxTap(); setPage(p => p + 1); }}
        >
          {t('studyPassport.nextPage')}
        </CandyButton>
      </div>
    </Panel>
  );
}
