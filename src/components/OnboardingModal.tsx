/**
 * 首启引导页（自动登录配置）
 * ------------------------------------------------------------------
 * 全新用户首次访问时全屏弹出：设置孩子名字 / 头像 / 主题色，完成后自动进入应用。
 * 老用户（曾用过应用）不弹，直接迁移进度自动进入 —— 即「自动登录」。
 * 家长中心可调用 reopenOnboarding() 重新打开本引导（自动登录配置）。
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';
import {
  useActiveProfileMeta,
  PROFILE_AVATARS,
  PROFILE_COLORS,
  AGE_RANGES,
  type AgeRangeKey,
  colorHex,
  colorSoft,
} from '@/store/useProfilesStore';

export function OnboardingModal({ onComplete }: { onComplete: (name: string, avatar: string, color: string, ageRange: AgeRangeKey) => void }) {
  const { t } = useTranslation();
  const active = useActiveProfileMeta();

  const [name, setName] = useState(active?.name && active.name !== '宝贝' ? active.name : '');
  const [avatar, setAvatar] = useState(active?.avatar ?? PROFILE_AVATARS[0]!);
  const [color, setColor] = useState(active?.color ?? PROFILE_COLORS[0]!.key);
  const [ageRange, setAgeRange] = useState<AgeRangeKey>(active?.ageRange ?? '7-8');

  const start = () => {
    sfxTap();
    onComplete(name.trim() || '宝贝', avatar, color, ageRange);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-gradient-to-br from-pink-200/95 via-white/95 to-purple-200/95 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="relative w-full max-w-[420px] rounded-[28px] border-2 border-white bg-white/95 p-6 shadow-2xl"
        role="dialog"
        aria-label={t('onboarding.welcome')}
      >
        {/* 顶部装饰 */}
        <div className="mb-3 flex justify-center gap-2 text-3xl">
          <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>🎈</motion.span>
          <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6, delay: 0.2 }}>⭐</motion.span>
          <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6, delay: 0.4 }}>🧸</motion.span>
        </div>

        <h2 className="text-center text-2xl font-extrabold text-rainbow">{t('onboarding.welcome')}</h2>
        <p className="mt-1 text-center text-sm font-medium text-gray-500">{t('onboarding.subtitle')}</p>

        <div className="mt-5 flex flex-col gap-4">
          {/* 预览头像 */}
          <div className="flex justify-center">
            <span
              className="flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-lg"
              style={{ background: colorSoft(color), border: `3px solid ${colorHex(color)}` }}
            >
              {avatar}
            </span>
          </div>

          <label className="flex flex-col gap-1">
            <span className="px-1 text-xs font-bold text-gray-500">{t('onboarding.childName')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('onboarding.namePlaceholder')}
              maxLength={12}
              autoFocus
              className="rounded-2xl border-2 border-candy-purple/30 bg-white px-4 py-2.5 text-center text-lg font-extrabold text-gray-800 outline-none focus:border-candy-purple"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="px-1 text-xs font-bold text-gray-500">{t('onboarding.avatar')}</span>
            <div className="grid grid-cols-6 gap-1.5">
              {PROFILE_AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { sfxTap(); setAvatar(a); }}
                  aria-label={a}
                  className="flex h-10 items-center justify-center rounded-xl border-2 text-2xl transition active:translate-y-[1px]"
                  style={{
                    borderColor: avatar === a ? colorHex(color) : 'rgba(0,0,0,0.08)',
                    background: avatar === a ? colorSoft(color) : '#fff',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="px-1 text-xs font-bold text-gray-500">{t('onboarding.color')}</span>
            <div className="flex flex-wrap gap-2">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => { sfxTap(); setColor(c.key); }}
                  aria-label={c.key}
                  className="h-9 w-9 rounded-full border-2 transition active:translate-y-[1px]"
                  style={{
                    background: c.hex,
                    borderColor: color === c.key ? '#333' : 'transparent',
                    boxShadow: color === c.key ? `0 0 0 3px ${c.soft}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="px-1 text-xs font-bold text-gray-500">{t('onboarding.age')}</span>
            <div className="grid grid-cols-5 gap-1.5">
              {AGE_RANGES.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => { sfxTap(); setAgeRange(a.key); }}
                  aria-label={a.label}
                  className="flex flex-col items-center gap-0.5 rounded-xl border-2 py-2 transition active:translate-y-[1px]"
                  style={{
                    borderColor: ageRange === a.key ? colorHex(color) : 'rgba(0,0,0,0.08)',
                    background: ageRange === a.key ? colorSoft(color) : '#fff',
                  }}
                >
                  <span className="text-xl leading-none">{a.emoji}</span>
                  <span className="text-[10px] font-extrabold text-gray-600">{a.short}</span>
                </button>
              ))}
            </div>
          </div>

          <motion.button
            type="button"
            onClick={start}
            whileTap={{ scale: 0.96 }}
            className="mt-1 rounded-2xl bg-candy-purple py-3 text-base font-extrabold text-white shadow-candy active:translate-y-[1px]"
          >
            🚀 {t('onboarding.start')}
          </motion.button>
          <p className="text-center text-xs text-gray-400">{t('onboarding.tip')}</p>
        </div>
      </motion.div>
    </div>
  );
}
