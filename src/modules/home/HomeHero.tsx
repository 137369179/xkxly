/**
 * 首页 Hero（规格五：首页 Hero 区域）
 * ------------------------------------------------------------------
 * 让孩子 3 秒内理解「这是什么」：主标题 + 副标题 + 双 CTA（开始今天的学习 / 和 AI 小老师聊聊）
 * + 拟人化 AI 角色 + 个性化问候（用孩子名字与年龄）。
 * 底部一张紧凑「今日学习」状态卡，复用 buildDailyPlan 的真实课程数。
 * 2026-08-16 果冻粉化：背景升级为 AI 主视觉插画（hero_jelly.png），叠加果冻粉遮罩保证可读性，
 * 并套用 jelly-shine 高光 + shadow-jelly Q 弹阴影。图缺失时深粉渐变兜底。
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDailyLog, useMastery } from '@/store/useStore';
import type { Progress } from '@/types';
import { useActiveProfileMeta, AGE_RANGES } from '@/store/useProfilesStore';
import { navigate } from '@/lib/router';
import { dateKey, buildDailyPlan } from '@/lib/dailyPlan';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';
import { AiAvatar } from '@/components/ai/AiAvatar';

export function HomeHero() {
  const { t } = useTranslation();
  const dailyLog = useDailyLog();
  const mastery = useMastery();
  const meta = useActiveProfileMeta();

  const name = meta?.name && meta.name !== '宝贝' ? meta.name : '';
  const ageLabel = AGE_RANGES.find((a) => a.key === meta?.ageRange)?.label ?? '';

  const today = dateKey();
  const lessonDone = !!dailyLog[today]?.lesson;
  const plan = useMemo(() => buildDailyPlan({ mastery } as Progress, Date.now()), [mastery, today]);
  const lessonCount = plan.sections.length;

  const greeting = name ? t('home.heroGreeting', { name }) : t('onboarding.welcome');

  return (
    <section className="jelly-shine relative overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-br from-candy-pink-deep to-candy-pink shadow-jelly p-5 sm:p-7">
      {/* 主视觉背景图（果冻粉 Key Visual，图缺失时深粉渐变兜底） */}
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: "url('/hero_jelly.png')", backgroundPosition: 'center 38%' }}
      />
      {/* 左深右浅果冻粉遮罩：保证白字在插画上清晰可读 */}
      <div className="absolute inset-0 bg-gradient-to-r from-candy-pink-deep/60 via-candy-pink/30 to-transparent" />

      {/* 背景装饰泡泡 */}
      <motion.span
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/20"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ repeat: Infinity, duration: 4 }}
      />
      <motion.span
        className="pointer-events-none absolute -bottom-8 left-2 h-20 w-20 rounded-full bg-white/15"
        animate={{ scale: [1, 1.18, 1] }}
        transition={{ repeat: Infinity, duration: 5, delay: 0.6 }}
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* 左：文案 + CTA */}
        <div className="min-w-0 flex-1">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-1 text-sm font-extrabold text-white/90"
          >
            👋 {greeting}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-2xl font-black leading-tight text-white drop-shadow-sm sm:text-3xl"
          >
            🌈 {t('home.heroTitle')}
          </motion.h1>
          <p className="mt-2 max-w-md text-sm font-bold text-white/90">{t('home.heroSubtitle')}</p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                sfxTap();
                navigate('today');
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-candy-purple-deep shadow-candy-sm"
            >
              🚀 {t('home.heroCtaLearn')}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                sfxTap();
                navigate('companion');
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-white/20 px-4 py-3 text-sm font-extrabold text-white ring-2 ring-white/50 backdrop-blur"
            >
              🤖 {t('home.heroCtaAi')}
            </motion.button>
          </div>

          {ageLabel && (
            <p className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white/90">
              🎯 {t('home.heroAgeHint', { age: ageLabel })}
            </p>
          )}
        </div>

        {/* 右：AI 角色 + 对话气泡 */}
        <div className="relative flex shrink-0 items-center justify-center sm:w-44">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          >
            <AiAvatar size={96} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute -left-2 -top-2 hidden rounded-2xl bg-white px-2.5 py-1 text-[11px] font-extrabold text-candy-purple-deep shadow sm:block"
          >
            想和我聊聊吗？💬
          </motion.div>
        </div>
      </div>

      {/* 今日学习状态卡 */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          sfxTap();
          navigate('today');
        }}
        className="relative z-10 mt-5 flex w-full items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left shadow-sm"
      >
        <span className="text-3xl">{lessonDone ? '🎉' : '📅'}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-candy-purple-deep">
            {lessonDone ? t('home.heroTodayDone') : t('home.heroTodayTodo', { count: lessonCount })}
          </span>
          <span className="block text-xs font-bold text-ink-soft">
            {lessonDone ? '⭐ +50' : t('home.heroCtaLearn') + ' →'}
          </span>
        </span>
        <span className="text-xl text-candy-purple-deep">→</span>
      </motion.button>
    </section>
  );
}
