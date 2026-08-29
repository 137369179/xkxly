/**
 * 首页 Hero（规格五：首页 Hero 区域）
 * ------------------------------------------------------------------
 * 让孩子 3 秒内理解「这是什么」：主标题 + 副标题 + 双 CTA（开始今天的学习 / 和 AI 小老师聊聊）
 * + 拟人化 AI 角色 + 个性化问候（用孩子名字与年龄）。
 * 底部一张紧凑「今日学习」状态卡，复用 buildDailyPlan 的真实课程数。
 * 2026-08-16 果冻粉化：背景升级为 AI 主视觉插画（hero_jelly.jpg），叠加果冻粉遮罩保证可读性，
 * 并套用 jelly-shine 高光 + shadow-jelly Q 弹阴影。图缺失时深粉渐变兜底。
 */
import { useMemo } from 'react';
import { useDailyLog, useMastery, useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Progress } from '@/types';
import { pickGoals } from '@/components/quiz/DailyGoal';
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

  // 今日目标进度：复用 DailyGoal 卡同一套目标池与选取算法，
  // 保证首页与目标卡口径完全一致（各目标 current() 只依赖这 4 个字段）。
  const goalProgress = useStore(
    useShallow((s) => ({
      dailyLog: s.progress.dailyLog,
      mastery: s.progress.mastery,
      poemsRead: s.progress.poemsRead,
      mathCorrect: s.progress.mathCorrect,
    })),
  );
  const goals = useMemo(() => pickGoals(today), [today]);
  const goalStates = useMemo(
    () => goals.map((g) => g.current(goalProgress as Progress) >= g.target),
    [goals, goalProgress],
  );
  const doneGoals = goalStates.filter(Boolean).length;

  const greeting = name ? t('home.heroGreeting', { name }) : t('onboarding.welcome');

  return (
    <section className="jelly-shine relative overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-br from-candy-pink to-candy-pink-soft shadow-jelly p-5 sm:p-7">
      {/* 主视觉背景图（果冻粉 Key Visual，带 fetchPriority="high" 极速命中 LCP） */}
      <img
        src="/hero_jelly.jpg"
        alt=""
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
      />
      {/* 浅色果冻粉 scrim：保证深 on 字在插画上清晰可读（替代原深粉遮罩+白字方案） */}
      <div className="absolute inset-0 bg-gradient-to-r from-candy-pink-soft/80 via-white/30 to-transparent" />

      {/* 背景装饰泡泡（CSS 永动动画，替代 motion.span） */}
      <span
        className="animate-bubble-pulse pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/20"
      />
      <span
        className="animate-bubble-pulse pointer-events-none absolute -bottom-8 left-2 h-20 w-20 rounded-full bg-white/15"
        style={{ animationDelay: '0.6s' }}
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* 左：文案 + CTA */}
        <div className="min-w-0 flex-1">
          <p className="animate-hero-fade-up mb-1 text-sm font-extrabold text-candy-pink-on">
            👋 {greeting}
          </p>
          <h1
            className="animate-hero-fade-up text-2xl font-black leading-tight text-candy-pink-on sm:text-3xl"
            style={{ animationDelay: '0.05s' }}
          >
            🌈 {t('home.heroTitle')}
          </h1>
          <p className="mt-2 max-w-md text-sm font-bold text-candy-pink-on">{t('home.heroSubtitle')}</p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                sfxTap();
                navigate('today');
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-candy-purple-deep shadow-candy-sm transition-transform active:scale-95"
            >
              🚀 {t('home.heroCtaLearn')}
            </button>
            <button
              onClick={() => {
                sfxTap();
                navigate('companion');
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-white/30 px-4 py-3 text-sm font-extrabold text-candy-pink-on ring-2 ring-candy-pink/40 backdrop-blur transition-transform active:scale-95"
            >
              🤖 {t('home.heroCtaAi')}
            </button>
          </div>

          {ageLabel && (
            <p className="mt-3 inline-block rounded-full bg-white/30 px-3 py-1 text-xs font-bold text-candy-pink-on">
              🎯 {t('home.heroAgeHint', { age: ageLabel })}
            </p>
          )}
        </div>

        {/* 右：AI 角色 + 对话气泡 */}
        <div className="relative flex shrink-0 items-center justify-center sm:w-44">
          <div className="animate-float">
            <AiAvatar size={96} />
          </div>
          <div
            className="animate-hero-fade-up absolute -left-2 -top-2 hidden rounded-2xl bg-white px-2.5 py-1 text-xs font-extrabold text-candy-purple-deep shadow sm:block"
            style={{ animationDelay: '0.2s' }}
          >
            想和我聊聊吗？💬
          </div>
        </div>
      </div>

      {/* 今日学习状态卡 */}
      <button
        className="animate-hero-fade-up relative z-10 mt-5 flex w-full items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left shadow-sm transition-transform active:scale-95"
        style={{ animationDelay: '0.15s' }}
        onClick={() => {
          sfxTap();
          navigate('today');
        }}
      >
        <span className="text-3xl">{lessonDone ? '🎉' : '📅'}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-candy-purple-deep">
            {lessonDone ? t('home.heroTodayDone') : t('home.heroTodayTodo', { count: lessonCount })}
          </span>
          <span className="block text-xs font-bold text-ink-soft">
            {lessonDone ? '⭐ +50' : t('home.heroCtaLearn') + ' →'}
          </span>
          {/* 今日目标进度：圆点直观呈现完成度（数字无需翻译，故不新增 i18n 键） */}
          <span className="mt-1.5 flex items-center gap-1.5">
            <span className="flex gap-1" aria-hidden="true">
              {goalStates.map((done, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                    done ? 'bg-candy-green-deep' : 'bg-candy-purple/25'
                  }`}
                />
              ))}
            </span>
            <span className="text-xs font-black text-candy-purple-deep">
              {t('home.todayGoal')} {doneGoals}/{goals.length}
            </span>
          </span>
        </span>
        <span className="text-xl text-candy-purple-deep">→</span>
      </button>
    </section>
  );
}
