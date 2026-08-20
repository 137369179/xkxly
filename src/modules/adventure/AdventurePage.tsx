import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { LevelDef, Question } from '@/types';
import { LEVELS, TOTAL_LEVELS } from '@/data/levels';
import { STORY_MAP } from '@/data/adventureStory';
import POEMS from '@/data/poems';
import { BADGES } from '@/data/badges';
import { StoryUnlock } from '@/components/games/StoryUnlock';
import { CHAPTERS, findChapterByLevel, isBossLevel } from '@/data/adventureChapters';
import { BossBattle } from '@/components/games/BossBattle';
import { EquipmentPanel } from '@/components/EquipmentPanel';
import { calcTotalBonus } from '@/data/equipment';
import {
  makeLetterQuestion,
  makeNumberQuestion,
  makeMathQuestion,
  makeCountQuestion,
  makeLogicQuestion,
  makePoemQuestion,
  makeCompareQuestion,
  makeCategoryQuestion,
  makeOppositeQuestion,
  makeSimilarHanziQuestion,
  makePinyinQuestion,
  makeWordQuestion,
  type Difficulty,
} from '@/lib/questions';
import { makeHanziQuestion } from '@/lib/hanziQuestions';
import { getHanziByLevel } from '@/data/hanziIndex';
import { makeSpacedDrill } from '@/lib/drill';
import { rampDifficulty } from '@/lib/difficulty';
import { sample, cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Progress } from '@/types';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { PageHeader } from '@/components/ui/Card';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/Stars';
import { RoundRunner } from '@/components/quiz/RoundRunner';
import { useTranslation } from '@/i18n/useTranslation';

const MAKERS: Record<string, (d: Difficulty) => Question> = {
  letter: makeLetterQuestion,
  number: makeNumberQuestion,
  math: makeMathQuestion,
  count: makeCountQuestion,
  logic: (d) => makeLogicQuestion('mixed', d),
  poem: (d) => makePoemQuestion(POEMS, d) ?? makeMathQuestion(d),
  hanzi: (d) => makeHanziQuestion(getHanziByLevel(d)[0]!, d),
  // 核心加强 M：pinyin/word 改用统一 makePinyinQuestion/makeWordQuestion
  // 原 inline 实现缺少 hint/speak/why 字段，孩子卡住时无提示无讲解，
  // 且题型单一（拼音只出"类型识别"，单词只出"看英文选中文"）。
  // 统一函数支持多题型（顺口溜/示例字/看图选词等）+ 完整 hint/speak/why。
  pinyin: (d) => makePinyinQuestion(d) ?? makeMathQuestion(d),
  word: (d) => makeWordQuestion(d) ?? makeMathQuestion(d),
  compare: makeCompareQuestion,
  sort: makeCategoryQuestion,
  pair: makeOppositeQuestion,
  similar: makeSimilarHanziQuestion,
};

function makeAdventureQuestion(level: LevelDef, d: Difficulty): Question {
  const kinds = level.kinds ?? [];
  const kind = kinds.length ? sample(kinds) : 'math';
  return makeSpacedDrill(kind, MAKERS[kind]! ?? [], () => useStore.getState().progress)(d);
}

export default function AdventurePage(_: { param?: string }) {
  const { t: tr } = useTranslation();
  // 仅订阅本页读取的字段：badges / mastery(rampDifficulty) / 冒险装备进度
  const progress = useStore(
    useShallow(
      (s) =>
        ({
          badges: s.progress.badges,
          mastery: s.progress.mastery,
          ownedFragments: s.progress.ownedFragments,
          ownedEquipment: s.progress.ownedEquipment,
          equippedItems: s.progress.equippedItems,
          unlockedLevel: s.progress.unlockedLevel,
          levelStars: s.progress.levelStars,
          bossRecords: s.progress.bossRecords,
        }) as Progress,
    ),
  );
  const completeLevel = useStore((s) => s.completeLevel);
  const [level, setLevel] = useState<LevelDef | null>(null);
  const [storyUnlockId, setStoryUnlockId] = useState<number | null>(null);

  const ownedBadges = useMemo(() => new Set(progress.badges), [progress.badges]);

  // 动态难度：以关卡基础难度为下限，根据该关卡涉及题型的掌握度上调，
  // 让已经掌握的技能自然变难，形成顺滑的难度曲线（不会低于关卡预设难度）
  const adventureDifficulty = useMemo<Difficulty>(() => {
    if (!level) return 1;
    const base = (level.difficulty ?? 1) as 1 | 2 | 3;
    const kinds = level.kinds ?? [];
    let d: 1 | 2 | 3 = base;
    for (const k of kinds) {
      const rd = rampDifficulty(progress, k);
      if (rd > d) d = rd;
    }
    return d as Difficulty;
  }, [level, progress]);

  if (level) {
    const nextLevel = LEVELS.find((l) => l.id === level.id + 1) ?? null;
    const bossLevel = isBossLevel(level.id);
    const chapter = findChapterByLevel(level.id);
    const equipmentBonus = calcTotalBonus(progress.ownedFragments ?? []);

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setLevel(null)}
            className="no-select inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-base font-extrabold text-ink-soft shadow-candy-sm active:translate-y-[2px]"
          >
            {tr('adventure.backMap')}
          </button>
          <span className="text-base font-extrabold text-ink-soft">
            {tr('adventure.levelProgress', { id: level.id, total: TOTAL_LEVELS })}
          </span>
        </div>

        <PageHeader
          emoji={level.emoji}
          title={level.name ?? ''}
          subtitle={level.desc ?? ''}
          tone={level.tone}
        />

        {/* Boss关警告横幅 */}
        {bossLevel && chapter && (
          <div className="mb-4 rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3 text-center">
            <span className="text-lg font-black text-red-600">
              ⚠️ Boss关！{chapter.boss.emoji} {chapter.boss.name} 等待着你的挑战！
            </span>
          </div>
        )}

        {bossLevel && chapter ? (
          <BossBattle
            key={`boss-${level.id}`}
            boss={chapter.boss}
            makeQuestion={(d) => makeAdventureQuestion(level, d)}
            difficulty={adventureDifficulty}
            equipmentBonus={equipmentBonus}
            onAnswered={(q, c, d) => { if (q.skill) useStore.getState().practice(q.skill, c, 1, d); }}
            onVictory={(turns) => {
              // 掉落碎片 + 解锁装备 + 记录Boss战结果
              const drop = chapter.boss.drops[0]!;
              useStore.getState().addFragment(drop);
              useStore.getState().unlockEquipment(drop);
              useStore.getState().recordBossResult(level.id, true, turns);
              const stars = turns <= chapter.boss.hp + 2 ? 3 : turns <= chapter.boss.hp + 5 ? 2 : 1;
              const wasCompleted = useStore.getState().progress.levelStars[level.id] !== undefined;
              completeLevel(level.id, stars);
              if (!wasCompleted) setStoryUnlockId(level.id);
            }}
            renderVictory={(turns, onReplay) => (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                >
                  <div className="text-7xl">🏆</div>
                  <h3 className="mt-3 text-3xl font-extrabold text-rainbow">
                    击败了{chapter.boss.name}！
                  </h3>
                  <p className="mt-2 text-base font-bold text-ink-soft">
                    用了 {turns} 回合
                  </p>
                  <div className="mt-3 rounded-xl bg-amber-50 border-2 border-amber-200 px-4 py-2">
                    <span className="text-sm font-bold text-amber-700">
                      ✨ 获得装备碎片：{chapter.boss.drops[0]}
                    </span>
                  </div>
                  {nextLevel && (
                    <div className="mt-4">
                      <CandyButton tone="green" size="lg" fullWidth onClick={() => setLevel(nextLevel)}>
                        {tr('adventure.nextLevel', { emoji: nextLevel.emoji ?? '', name: nextLevel.name ?? '' })}
                      </CandyButton>
                    </div>
                  )}
                  <div className="mt-3 flex gap-3">
                    <CandyButton tone="purple" variant="soft" size="lg" fullWidth onClick={onReplay}>
                      再战Boss
                    </CandyButton>
                    <CandyButton tone="orange" variant="soft" size="lg" fullWidth onClick={() => setLevel(null)}>
                      {tr('adventure.map')}
                    </CandyButton>
                  </div>
                </motion.div>
              </div>
            )}
          />
        ) : (
          <RoundRunner
          key={level.id}
          makeQuestion={(d) => makeAdventureQuestion(level, d)}
          difficulty={adventureDifficulty}
          tone={level.tone}
          questionsPerRound={level.count}
          onAnswered={(q, c, d) => { if (q.skill) useStore.getState().practice(q.skill, c, 1, d); }}
          onComplete={(stars) => {
            const wasCompleted = useStore.getState().progress.levelStars[level.id] !== undefined;
            completeLevel(level.id, stars);
            if (!wasCompleted) setStoryUnlockId(level.id);
          }}
          renderSummary={(stars, onReplay) => (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              >
                <div className="text-7xl">{stars === 3 ? '🏆' : '🎉'}</div>
                <h3 className="mt-3 text-3xl font-extrabold text-rainbow">
                  {tr('adventure.cleared', { name: level.name ?? '' })}！
                </h3>
                <p className="mt-2 text-base font-bold text-ink-soft">
                  {stars === 3 ? tr('adventure.perfect') : tr('adventure.great')}
                </p>
                {/* v6: 1 星通关时 AI 个性化鼓励 */}
                {stars < 3 && <AdventureEncourage levelName={level.name ?? ''} stars={stars} kinds={level.kinds ?? []} />}
                <div className="mt-4 flex justify-center">
                  <StarRating value={stars} size={42} animated />
                </div>
              </motion.div>

              <div className="mt-6 flex flex-col gap-3">
                {nextLevel && (
                  <CandyButton tone="green" size="lg" fullWidth onClick={() => setLevel(nextLevel)}>
                    {tr('adventure.nextLevel', { emoji: nextLevel.emoji ?? '', name: nextLevel.name ?? '' })}
                  </CandyButton>
                )}
                <div className="flex gap-3">
                  <CandyButton tone="purple" variant="soft" size="lg" fullWidth onClick={onReplay}>
                    {tr('adventure.replay')}
                  </CandyButton>
                  <CandyButton
                    tone="orange"
                    variant="soft"
                    size="lg"
                    fullWidth
                    onClick={() => setLevel(null)}
                  >
                    {tr('adventure.map')}
                  </CandyButton>
                </div>
              </div>
            </div>
          )}
        />
        )}

        {/* 通关新关卡时弹出剧情解锁卡片 */}
        <StoryUnlock
          story={storyUnlockId !== null ? STORY_MAP.get(storyUnlockId) : undefined}
          onContinue={() => setStoryUnlockId(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        iconType="town"
        title={tr('adventure.title')}
        subtitle={tr('adventure.subtitle')}
        tone="purple"
      />

      {/* 故事主线进度提示 */}
      <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 px-5 py-3 shadow-fluffy">
        <div className="flex items-center gap-3">
          <img src="/english/word_town.jpg" alt="Felt Town" loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm" />
          <div>
            <div className="text-sm font-black text-purple-900">{tr('adventure.mapProgress', { unlocked: progress.unlockedLevel, total: TOTAL_LEVELS })}</div>
            <div className="text-xs font-bold text-purple-600">{tr('adventure.unlockHint')}</div>
          </div>
        </div>
        <span className="text-2xl animate-bounce">🐰</span>
      </div>

      {/* 章节制关卡地图 */}
      <div className="space-y-5">
        {CHAPTERS.map((chapter) => {
          const chapterLevels = chapter.levelIds
            .map(id => LEVELS.find(l => l.id === id)!)
            .filter(Boolean);
          const chapterUnlocked = chapterLevels[0]!.id <= progress.unlockedLevel;

          return (
            <div
              key={chapter.id}
              className={cn(
                'rounded-[2rem] border-4 border-white bg-gradient-to-br p-5 shadow-candy-sm',
                chapter.bgGradient,
                !chapterUnlocked && 'opacity-60'
              )}
            >
              {/* 章节标题 */}
              <div className="mb-4 flex items-center gap-3">
                <span className="text-4xl">{chapter.emoji}</span>
                <div className="flex-1">
                  <h2 className="text-xl font-extrabold text-ink">
                    {tr('adventure.chapterN', { n: chapter.id })} · {chapter.name}
                  </h2>
                  <p className="text-xs font-bold text-ink-soft">{chapter.desc}</p>
                </div>
                {!chapterUnlocked && <span className="text-2xl">🔒</span>}
              </div>

              {/* 关卡卡片 */}
              <div className="grid grid-cols-3 gap-3">
                {chapterLevels.map((lv) => {
                  const isBoss = lv.id === chapter.bossLevelId;
                  const unlocked = lv.id <= progress.unlockedLevel;
                  const stars = progress.levelStars[lv.id] ?? 0;
                  const isCurrent = lv.id === progress.unlockedLevel && stars === 0;
                  const bossDefeated = progress.bossRecords?.[lv.id]?.defeated ?? false;

                  return (
                    <motion.button
                      key={lv.id}
                      disabled={!unlocked}
                      onClick={() => unlocked && setLevel(lv)}
                      whileTap={unlocked ? { scale: 0.95 } : undefined}
                      className={cn(
                        'no-select relative flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-[1.4rem] p-3 text-center shadow-candy-sm transition-all',
                        isBoss
                          ? 'border-2 border-red-300 bg-gradient-to-b from-red-100 to-orange-100'
                          : 'bg-white/70',
                        !unlocked && 'cursor-not-allowed opacity-50 grayscale'
                      )}
                    >
                      {/* 关卡编号 */}
                      <span className="absolute top-2 left-2.5 text-sm font-extrabold text-ink-soft">
                        {lv.id}
                      </span>
                      {!unlocked && <span className="absolute top-2 right-2.5 text-base">🔒</span>}

                      {/* BOSS标签 */}
                      {isBoss && (
                        <span className="absolute top-1.5 right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                          BOSS
                        </span>
                      )}

                      {/* 当前关卡脉冲 */}
                      {isCurrent && (
                        <motion.span
                          className="pointer-events-none absolute inset-0 rounded-[1.4rem] border-4 border-candy-orange"
                          animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.85, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                        />
                      )}

                      <span className="text-3xl">{lv.emoji}</span>
                      <span className="text-sm font-extrabold leading-tight text-ink">{lv.name}</span>
                      {stars > 0 && <StarRating value={stars} size={14} />}
                      {isBoss && bossDefeated && (
                        <span className="text-[9px] font-bold text-green-600">✓ 已击败</span>
                      )}
                      {isBoss && !bossDefeated && unlocked && (
                        <span className="text-[9px] font-bold text-red-500">{chapter.boss.emoji} {chapter.boss.name}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 装备背包 */}
      <div className="mt-6">
        <EquipmentPanel
          ownedFragments={progress.ownedFragments ?? []}
          ownedEquipment={progress.ownedEquipment ?? []}
          equippedItems={progress.equippedItems ?? {}}
          onToggle={(id) => useStore.getState().toggleEquip(id)}
        />
      </div>

      {/* 徽章墙 */}
      <Panel className="mt-6">
        <PanelTitle emoji="🏅" title={tr('adventure.badgesTitle')} subtitle={tr('adventure.badgesCount', { owned: progress.badges.length, total: BADGES.length })} tone="orange" />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {BADGES.map((b) => {
            const owned = ownedBadges.has(b.id);
            const t = TONE_STYLE[(b.tone ?? 'blue') as Tone]!
            const meter = b.meter?.(progress);
            return (
              <div
                key={b.id}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl p-3 text-center',
                  owned ? '' : 'opacity-55 grayscale',
                )}
                style={{ background: owned ? t.soft : '#F3EEF6' }}
                title={b.desc}
              >
                <span className="text-3xl">{b.emoji}</span>
                <span className="line-clamp-1 text-[11px] font-extrabold" style={{ color: owned ? t.deep : '#8B7F96' }}>
                  {b.name}
                </span>
                {meter && !owned && (
                  <span className="text-[10px] font-bold text-ink-soft">
                    {Math.min(meter[0], meter[1])}/{meter[1]}
                  </span>
                )}
                {owned && <span className="text-[10px] font-extrabold text-candy-green-deep">{tr('adventure.owned')}</span>}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* v6: 闯关失败 AI 鼓励 */
import { adventureEncourageTask } from '@/lib/ai/tasks';
import { useAiStream as useAiStreamAdv } from '@/lib/ai/useAi';
import { AiPanel as AiPanelAdv } from '@/components/ai';

function AdventureEncourage({ levelName, stars, kinds }: { levelName: string; stars: number; kinds: string[] }) {
  const task = useMemo(
    () => adventureEncourageTask(levelName, kinds.join('、'), stars),
    [levelName, stars, kinds],
  );
  const ai = useAiStreamAdv(task);
  return (
    <div className="mt-3 text-left">
      <AiPanelAdv state={ai} tone="orange" compact />
    </div>
  );
}
