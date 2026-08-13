import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DailyQuest, Progress, ReciteStat } from '@/types';
import { findEquipmentByFragment, EQUIPMENT_MAP } from '@/data/equipment';

import { dateKey } from '@/lib/dailyPlan';
import { setAiEnabled as aiSetEnabled } from '@/lib/ai/client';
import { review } from '@/lib/srs';
import { registerTtsBridge } from '@/lib/speech';
import { createInitialProgress } from '@/lib/progress';
import { useSettingsStore } from './useSettingsStore';
import { useTtsStore } from './useTtsStore';
import type { BackupPayload } from '@/lib/backup';

const todayStr = () => dateKey();

/**
 * 节流版 localStorage 包装（核心加强 N）
 * ------------------------------------------------------------
 * zustand persist 默认每次 set 都同步 localStorage.setItem，
 * 孩子连答时每答一题都全量 JSON.stringify + 同步写盘，
 * 主线程压力大、答题跟手度下降（INP 变差）。
 *
 * 策略：500ms 内多次 set 只保留最新值，定时器到期才写盘。
 * 关闭页面时通过 beforeunload 立即 flush，避免丢最后一次未落盘的进度。
 */
const { storage: throttledLocalStorage } = createThrottledStorage();

import {
  applyProgress as _applyProgress,
  bumpLog as _bumpLog,
  applyWrongBook as _applyWrongBook,
  applyPractice as _applyPractice,
  withDailySnapshot as _withDailySnapshot,
  toggleIn as _toggleIn,
  applyLearn as _applyLearn,
  emptyStat as _emptyStat,
  createThrottledStorage,
} from './storeHelpers';
import { localDailyQuestPlan } from '@/lib/ai/tasks';
// 默认进度工厂已抽离至 @/lib/progress（与单测 fixture 共用同一真相源，见 P3-3）。

// Keep initialProgress as a constant for reference (but resetAll uses factory)
const initialProgress: Progress = createInitialProgress();

/** 是否为纯对象（非数组、非 null），用于深合并判定 */
function isPlainObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 真正深合并（P2-8）：原 `restoreProgress` / `merge` 用 `{ ...initialProgress, ...override }` 是浅合并，
 * 老数据升级时若新增了嵌套字段（如 researchStats.exploreSeconds），覆盖层（旧 backup）里没有该键，
 * 浅合并会直接用旧对象整体替换初始值对象，导致新字段丢失为 undefined。
 * 这里对嵌套纯对象做一层「以初始值为底、覆盖层优先」的合并，补齐缺失的新字段默认值；
 * 数组与原始值直接以覆盖层为准（符合进度语义，避免按索引合并出错）。
 */
function deepMergeProgress(base: Progress, override: Partial<Progress>): Progress {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override) as (keyof Progress)[]) {
    const ov = override[key];
    if (ov === undefined) continue;
    const bv = (base as unknown as Record<string, unknown>)[key];
    if (isPlainObj(ov) && isPlainObj(bv)) {
      out[key] = { ...bv, ...ov };
    } else {
      out[key] = ov;
    }
  }
  return out as unknown as Progress;
}

/**
 * S2 错误连续计数（P3）：recordMath / recordCount / recordLogic 三处 copy-paste 的 wrongStreak 逻辑，
 * 抽为公共函数复用，避免漂移。连错 >=3 且未安抚时触发安抚并清零，否则累计；答对则清零。
 */
function scheduleWrongStreakUpdate(prevStreak: number, comfortingActive: boolean, correct: boolean) {
  if (correct) {
    queueMicrotask(() => useStore.setState({ wrongStreak: 0 }));
    return;
  }
  const nextStreak = prevStreak + 1;
  if (nextStreak >= 3 && !comfortingActive) {
    queueMicrotask(() => useStore.setState({ wrongStreak: 0, comfortingActive: true }));
  } else {
    queueMicrotask(() => useStore.setState({ wrongStreak: nextStreak }));
  }
}

interface StoreState {
  progress: Progress;
  /** 刚解锁、还未展示给用户的徽章队列（不持久化） */
  pendingBadges: string[];

  // —— 原有 actions ——
  addStars: (n: number) => void;
  heardLetter: (l: string) => void;
  wonMatchGame: () => void;
  readPoem: (id: string) => void;
  togglePoemFavorite: (id: string) => void;
  /** 保存某首诗的用户批注 */
  setPoemNote: (id: string, text: string) => void;
  /** 标记 / 取消标记难字 */
  togglePoemCharMark: (id: string, char: string) => void;
  /** 标记 / 取消标记难句 */
  togglePoemLineMark: (id: string, line: number) => void;
  /** 清空某首诗的全部难点标记 */
  clearPoemMarks: (id: string) => void;
  /** 记录一次背诵训练结果（回写 SRS 与成绩） */
  recordRecite: (id: string, score: number, stage: number) => void;
  heardNumber: (n: number) => void;
  recordMath: (correct: boolean, skill?: string) => void;
  recordSpeed: (correct: boolean) => void;
  recordCount: (correct: boolean) => void;
  /** 记录小游戏最高分（仅当超过历史最高时才更新） */
  setGameBest: (game: string, score: number) => void;

  recordLogic: (correct: boolean, skill?: string) => void;
  completeLevel: (levelId: number, stars: number) => void;
  checkIn: () => void;
  consumeBadge: () => void;
  resetAll: () => void;

  // —— v2 新增 ——
  /** 记录一次知识点练习（间隔重复核心入口） */
  practice: (skill: string, correct: boolean, star?: number, difficulty?: 1 | 2 | 3) => void;
  /** 首次接触某知识点（教学环节，不计对错） */
  learnSkill: (skill: string) => void;
  /** 累计学习时长（秒） */
  tickTime: (sec: number) => void;
  /** 推进今日课程到第 n 节 */
  setLessonStep: (n: number) => void;
  /** 标记今日课程已完成（幂等：当天重复调用不会重复发放星星） */
  finishLesson: (bonus: number) => void;
  /** 重置今日课程完成状态，允许重新学习 */
  resetTodayLesson: () => void;
  /** 记录一次描红完成 */
  markTraced: (id: string) => void;
  /** 兑换贴纸 */
  buySticker: (id: string, cost: number) => boolean;
  /** 清空错题本 */
  clearWrongBook: () => void;
  incPkCount: () => void;
  incCreativeCount: () => void;
  /** 增加小鱼干 */
  addFish: (count: number) => void;
  /** 喂食小鱼干 (Legacy 废弃, 改用 feedCatStats) */
  feedCat: (cost: number) => boolean;
  /** 增加饱食度 (消耗鱼干) */
  feedCatStats: (amount: number, cost: number) => boolean;
  /** 洗澡增加清洁度 (不消耗鱼干，或者随便设个花费) */
  cleanCatStats: (amount: number) => void;
  /** 触发离线猫咪状态衰减 */
  tickCatStats: () => void;
  /** 购买装扮 */
  buyOutfit: (outfitId: string, cost: number) => boolean;
  /** 穿戴装扮 */
  equipOutfit: (type: string, outfitId: string) => void;
  /** 抚摸猫咪，增加心情/亲密度 */
  petCat: () => void;
  /** 给猫咪洗澡，恢复清洁度 */
  bathCat: () => void;
  /** companion: 聊天计数 +1（顺便触发徽章检查） */
  incrementAiChatCount: () => void;
  /** companion: 讲解主题标记（顺便触发徽章检查） */
  markExplained: (topicId: string) => void;
  /** 派遣猫咪去知识城堡探险（打工小庄园） */
  dispatchCatQuest: (id: string, name: string, durationSec: number, reward: number) => void;
  /** 领取已完成探险的奖励（小鱼干 + 亲密度） */
  claimCatQuest: (id: string) => void;
  /** 猫咪进化：满足星星 + 亲密度阈值时升级，返回是否成功 */
  evolveCat: () => boolean;
  /** 从备份恢复进度（覆盖当前）；可选携带备份设置，空 PIN 不覆盖已有 PIN */
  restoreProgress: (progress: Progress, settings?: BackupPayload['settings']) => void;

  // —— S2 新增：情绪陪伴（不持久化）——
  wrongStreak: number;
  comfortingActive: boolean;
  recordWrong: () => void;
  resetWrongStreak: () => void;
  setComforting: (v: boolean) => void;

  // —— S2 新增：学习搭子 ——
  buddyJudge: (correct: boolean) => void;

  // —— S2 新增：每日任务 ——
  generateDailyQuests: () => void;
  checkQuestCompletion: () => void;
  claimQuestReward: (questId: string) => void;

  // —— A4: 错题本自适应复习 ——
  /** 记录错题训练结果（带难度感知 + wrongHistory 更新） */
  practiceWrong: (skill: string, correct: boolean, difficulty?: 1 | 2 | 3) => void;
  /** 更新错题训练历史（连击、AI 分析次数等） */
  updateWrongHistory: (patch: Partial<NonNullable<Progress['wrongHistory']>>) => void;

  // —— 绘本工坊 ——
  /** 保存绘本到书架（上限 50 本，超出删最旧） */
  saveStorybook: (book: import('@/modules/storybook/types').SavedStorybook) => void;
  /** 从书架删除绘本 */
  removeStorybook: (id: string) => void;
  /** 增加绘本阅读次数 */
  incrementStorybookRead: (id: string) => void;
  /** P1-收尾：收藏 / 取消收藏绘本 */
  toggleStorybookFavorite: (id: string) => void;

  // —— P4: 闯关冒险 ——
  /** P4: 添加装备碎片 */
  addFragment: (fragmentId: string) => void;
  /** P4: 解锁装备（碎片→装备） */
  unlockEquipment: (fragmentId: string) => void;
  /** P4: 装备/卸下装备 */
  toggleEquip: (equipmentId: string) => void;
  /** P4: 记录Boss战结果 */
  recordBossResult: (levelId: number, defeated: boolean, turns: number) => void;

  // —— 设置路由（委托到 useSettingsStore，保持旧 API 兼容）——
  setSound: (v: boolean) => void;
  setShowPinyin: (v: boolean) => void;
  setParentPin: (pin: string) => void;
  recordPinFail: () => void;
  recordPinSuccess: () => void;
  clearPin: () => void;
  setDailyLimit: (min: number) => void;
  setEyeCare: (min: number) => void;
  setAiEnabled: (v: boolean) => void;
  setVoiceGuide: (v: boolean) => void;

  // —— 研究模式（CMML）：F19 行为型数据源 + 收藏 + 笔记 ——
  /** 记录一次研究探索行为（计数 + 累计时长；exploreMs 单位秒）。行为型徽章唯一数据源。opts.readCard=true 时 cardsRead+1（知识卡已读）。 */
  recordResearchAction: (topicId: string, deltaSec?: number, opts?: { readCard?: boolean }) => void;
  /** 收藏一张知识卡（kvId 非空才可调；去重） */
  discoverCard: (kvId: string) => void;
  /** 取消收藏一张知识卡（画廊管理用） */
  removeDiscovery: (kvId: string) => void;
  /** 记录一条研究笔记（仿 setPoemNote） */
  setResearchNote: (topicId: string, text: string) => void;
  /** 删除一条研究笔记 */
  removeResearchNote: (topicId: string) => void;
  /** 完成一个研究会话（researchStats.sessionsCompleted+1） */
  completeResearchSession: () => void;
}

/**
 * 每次 progress 变更后统一走这里：
 * 写入新进度 → 计算新解锁徽章 → 追加到 badges 与 pendingBadges
 */

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      progress: initialProgress,
      pendingBadges: [],

      addStars: (n) =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            stars: p.stars + n,
            dailyLog: _bumpLog(p, { stars: n }),
          })),
        ),

      heardLetter: (l) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const next = _applyLearn(p, `letter:${l.toUpperCase()}`);
            return next.lettersHeard.includes(l)
              ? next
              : { ...next, lettersHeard: [...next.lettersHeard, l] };
          }),
        ),

      wonMatchGame: () =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            matchGamesWon: p.matchGamesWon + 1,
            stars: p.stars + 3,
            dailyLog: _bumpLog(p, { items: 1, ok: 1, stars: 3 }),
          })),
        ),

      readPoem: (id) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const next = _applyLearn(p, `poem:${id}`);
            return next.poemsRead.includes(id)
              ? next
              : {
                  ...next,
                  poemsRead: [...next.poemsRead, id],
                  stars: next.stars + 1,
                  dailyLog: _bumpLog(next, { items: 1, ok: 1, stars: 1 }),
                };
          }),
        ),

      togglePoemFavorite: (id) =>
        set((s) => ({
          progress: {
            ...s.progress,
            poemFavorites: s.progress.poemFavorites.includes(id)
              ? s.progress.poemFavorites.filter((x) => x !== id)
              : [...s.progress.poemFavorites, id],
          },
        })),

      setPoemNote: (id, text) =>
        set((s) => ({
          progress: {
            ...s.progress,
            poemNotes: { ...s.progress.poemNotes, [id]: text },
          },
        })),

      togglePoemCharMark: (id, char) =>
        set((s) => ({
          progress: {
            ...s.progress,
            poemMarks: { ...s.progress.poemMarks, [id]: _toggleIn(s.progress.poemMarks[id], 'chars', char) },
          },
        })),

      togglePoemLineMark: (id, line) =>
        set((s) => ({
          progress: {
            ...s.progress,
            poemMarks: { ...s.progress.poemMarks, [id]: _toggleIn(s.progress.poemMarks[id], 'lines', line) },
          },
        })),

      clearPoemMarks: (id) =>
        set((s) => {
          const next = { ...s.progress.poemMarks };
          delete next[id];
          return { progress: { ...s.progress, poemMarks: next } };
        }),

      recordRecite: (id, score, stage) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const now = Date.now();
            const prev = p.poemRecite[id];
            const stat: ReciteStat = {
              best: Math.max(prev?.best ?? 0, score),
              runs: (prev?.runs ?? 0) + 1,
              lastAt: now,
              // 只有 80 分以上才算「通关」该遮挡等级
              stage: score >= 80 ? Math.max(prev?.stage ?? 0, stage) : (prev?.stage ?? 0),
            };
            // 背诵成绩回写间隔重复：≥80 分记为掌握一次，否则记为需回炉
            const gained = score >= 80 ? Math.round(score / 25) : 0;
            const next = _applyPractice(p, `poem:${id}`, score >= 80, gained);
            return { ...next, poemRecite: { ...next.poemRecite, [id]: stat } };
          }),
        ),

      heardNumber: (n) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const next = _applyLearn(p, `number:${n}`);
            return next.numbersHeard.includes(n)
              ? next
              : { ...next, numbersHeard: [...next.numbersHeard, n] };
          }),
        ),

      recordMath: (correct: boolean, skill = 'math:add') =>

        set((s) => {
          // S2: 错误连续计数（抽公共函数，见 scheduleWrongStreakUpdate）
          scheduleWrongStreakUpdate(s.wrongStreak, s.comfortingActive, correct);
          return _applyProgress(s, (p) => {
            const next = _applyPractice(p, skill, correct, 1);
            return {
              ...next,
              mathTotal: next.mathTotal + 1,
              mathCorrect: next.mathCorrect + (correct ? 1 : 0),
            };
          });
        }),

      recordSpeed: (correct) =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            speedCorrect: p.speedCorrect + (correct ? 1 : 0),
          })),
        ),

      setGameBest: (game, score) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const prev = p.gameBest[game] ?? 0;
            if (score <= prev) return p;
            return { ...p, gameBest: { ...p.gameBest, [game]: score } };
          }),
        ),

      recordCount: (correct) =>
        set((s) => {
          // S2: 错误连续计数（抽公共函数，见 scheduleWrongStreakUpdate）
          scheduleWrongStreakUpdate(s.wrongStreak, s.comfortingActive, correct);
          return _applyProgress(s, (p) => {
            const next = _applyPractice(p, 'number:count', correct, 1);
            return { ...next, countCorrect: next.countCorrect + (correct ? 1 : 0) };
          });
        }),

      recordLogic: (correct, skill = 'logic:pattern') =>
        set((s) => {
          // S2: 错误连续计数（抽公共函数，见 scheduleWrongStreakUpdate）
          scheduleWrongStreakUpdate(s.wrongStreak, s.comfortingActive, correct);
          return _applyProgress(s, (p) => {
            const next = _applyPractice(p, skill, correct, 1);
            return {
              ...next,
              logicTotal: next.logicTotal + 1,
              logicCorrect: next.logicCorrect + (correct ? 1 : 0),
            };
          });
        }),

      completeLevel: (levelId, stars) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const prev = p.levelStars[levelId] ?? 0;
            const best = Math.max(prev, stars);
            // 只为「比上次更好的成绩」补发差额星星，避免刷分
            const gained = Math.max(0, best - prev) * 2;
            return {
              ...p,
              levelStars: { ...p.levelStars, [levelId]: best },
              unlockedLevel: Math.max(p.unlockedLevel, Math.min(levelId + 1, 20)),

              stars: p.stars + gained,
              dailyLog: _bumpLog(p, { items: 1, ok: 1, stars: gained }),
            };
          }),
        ),

      checkIn: () =>
        set((s) =>
          _applyProgress(s, (p) => {
            const today = todayStr();
            if (p.lastVisit === today) return p;
            const yesterday = dateKey(Date.now() - 86400000);
            const streak = p.lastVisit === yesterday ? p.streak + 1 : 1;
            // 每日首次登录时记录数学/逻辑起始值，供每日挑战计算当日增量
            return {
              ...p,
              lastVisit: today,
              streak,
              dailyLog: _bumpLog(p, {
                startMathTotal: p.mathTotal,
                startLogicTotal: p.logicTotal,
              }),
            };
          }),
        ),

      consumeBadge: () => set((s) => ({ pendingBadges: s.pendingBadges.slice(1) })),

      resetAll: () => set(() => ({ progress: createInitialProgress(), pendingBadges: [] })),

      /** 从备份恢复进度：与初始值深合并（P2-8），保证嵌套字段完整回填 */
      restoreProgress: (progress, settings) => {
        // 备份导入兼容：备份已剔除 PIN（恒为 ''），空串时跳过 PIN 覆盖——
        // 既不清空已有 PIN、也不写入空串，避免家长 PIN 丢失；非空 PIN 才覆盖。
        // 其余设置按需恢复（备份导出已清空锁定态，导入后从 0 开始，安全且不会崩溃）。
        if (settings) {
          const s = useSettingsStore.getState();
          if (settings.parentPin) s.setParentPin(settings.parentPin);
          s.setSound(settings.sound);
          s.setShowPinyin(settings.showPinyin);
          s.setDailyLimit(settings.dailyLimitMin);
          s.setEyeCare(settings.eyeCareMin);
          s.setAiEnabled(settings.aiEnabled);
        }
        set(() => ({
          progress: deepMergeProgress(initialProgress, progress),
          pendingBadges: [],
        }));
      },

      // —— S2 新增：情绪陪伴 ——
      wrongStreak: 0,
      comfortingActive: false,
      recordWrong: () =>
        set((s) => {
          const next = s.wrongStreak + 1;
          if (next >= 3 && !s.comfortingActive) {
            return { wrongStreak: 0, comfortingActive: true };
          }
          return { wrongStreak: next };
        }),
      resetWrongStreak: () => set(() => ({ wrongStreak: 0 })),
      setComforting: (v) => set(() => ({ comfortingActive: v })),

      // —— S2 新增：学习搭子 ——
      buddyJudge: (correct) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const judgeCount = (p.buddyJudgeCount ?? 0) + 1;
            const correctCount = (p.buddyCorrectJudge ?? 0) + (correct ? 1 : 0);
            const streak = correct ? (p.buddyStreak ?? 0) + 1 : 0;
            const difficulty = streak >= 3 ? Math.min((p.buddyDifficulty ?? 1) + 1, 3) : (p.buddyDifficulty ?? 1);
            return {
              ...p,
              buddyJudgeCount: judgeCount,
              buddyCorrectJudge: correctCount,
              buddyStreak: streak,
              buddyDifficulty: difficulty,
              stars: p.stars + (correct ? 2 : 0),
              dailyLog: _bumpLog(p, { items: 1, ok: correct ? 1 : 0, stars: correct ? 2 : 0 }),
            };
          }),
        ),

      // —— S2 新增：每日任务 ——
      generateDailyQuests: () => {
        const today = todayStr();
        const existing = useStore.getState().progress.dailyQuests?.[today];
        if (existing && existing.length > 0) return;

        const streak = useStore.getState().progress.streak;
        const plan = localDailyQuestPlan(streak, 0);
        const quests: DailyQuest[] = plan.quests.map((q) => ({
          ...q,
          currentCount: 0,
          completed: false,
        }));
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            dailyQuests: { ...(p.dailyQuests ?? {}), [today]: quests },
          })),
        );
      },

      checkQuestCompletion: () => {
        const today = todayStr();
        const quests = useStore.getState().progress.dailyQuests?.[today];
        if (!quests) return;

        const p = useStore.getState().progress;
        const todayLog = p.dailyLog[today];
        const itemsToday = todayLog?.items ?? 0;

        let changed = false;
        const updated = quests.map((q) => {
          if (q.completed) return q;
          let current = q.currentCount;
          if (q.type === 'math') current = Math.min(itemsToday, q.targetCount);
          else if (q.type === 'poem') current = Math.min(p.poemsRead.length, q.targetCount);
          else if (q.type === 'logic') current = Math.min(p.logicTotal, q.targetCount);
          else if (q.type === 'hanzi') current = Math.min(p.traced.length, q.targetCount);
          else if (q.type === 'word') current = Math.min(p.lettersHeard.length, q.targetCount);

          const isDone = current >= q.targetCount;
          if (isDone && !q.completed) {
            changed = true;
            return { ...q, currentCount: current, completed: true, completedAt: Date.now() };
          }
          if (current !== q.currentCount) {
            changed = true;
            return { ...q, currentCount: current };
          }
          return q;
        });

        if (changed) {
          set((s) =>
            _applyProgress(s, (pp) => ({
              ...pp,
              dailyQuests: { ...(pp.dailyQuests ?? {}), [today]: updated },
            })),
          );
        }
      },

      claimQuestReward: (questId) => {
        const today = todayStr();
        const quests = useStore.getState().progress.dailyQuests?.[today];
        if (!quests) return;

        const quest = quests.find((q) => q.id === questId);
        if (!quest || !quest.completed) return;

        // 检查是否已领过奖（防止重复领取）
        const claimedKey = `questClaimed_${questId}_${today}`;
        if ((useStore.getState().progress.chatHistory?.[claimedKey] as number | undefined)) return;

        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            stars: p.stars + quest.reward,
            dailyLog: _bumpLog(p, { items: 1, ok: 1, stars: quest.reward }),
            chatHistory: { ...(p.chatHistory ?? {}), [claimedKey]: 1 },
          })),
        );
      },

      /** —— v2 —— */
      // 关键修复（P1-4）：此前实现把第 4 参 star 当作末尾参数，从未传入 difficulty，
      // 导致 SRS review 的难度感知形同虚设。现正确透传 difficulty（1|2|3）。
      practice: (skill, correct, star = 1, difficulty?: 1 | 2 | 3) =>
        set((s) => _applyProgress(s, (p) => _applyPractice(p, skill, correct, star, difficulty))),

      learnSkill: (skill) => set((s) => _applyProgress(s, (p) => _applyLearn(p, skill))),

      // P1-6 修复：原先每 30s 用 `_bumpLog` 展开整棵 dailyLog（最多 90 天）重建整个 progress 对象，
      // 触发大量 useProgress 订阅者无谓重渲染。现细粒度只改「今日 dailyLog.sec」这一条，
      // 不重建整棵 dailyLog / progress 其它字段引用。
      tickTime: (sec) =>
        set((s) => {
          const key = todayStr();
          const cur = s.progress.dailyLog[key] ?? _emptyStat();
          const nextEntry = { ...cur, sec: cur.sec + sec };
          return {
            progress: { ...s.progress, dailyLog: { ...s.progress.dailyLog, [key]: nextEntry } },
          };
        }),

      setLessonStep: (n) =>
        set((s) => ({
          progress: { ...s.progress, lessonDate: todayStr(), lessonStep: n },
        })),

      finishLesson: (bonus) =>
        set((s) =>
          _applyProgress(s, (p) => {
            // 幂等保护：当天已完成则不再重复发放星星
            const today = todayStr();
            if (p.dailyLog[today]?.lesson) return p;
            return {
              ...p,
              lessonDate: today,
              stars: p.stars + bonus,
              dailyLog: _bumpLog(p, { items: 1, ok: 1, stars: bonus, lesson: true }),
            };
          }),
        ),

      resetTodayLesson: () =>
        set((s) => {
          const today = todayStr();
          const log = { ...s.progress.dailyLog };
          // 清除今日完成标记，保留其他学习数据
          if (log[today]) {
            const { lesson: _lesson, stars: _stars, ...rest } = log[today]!;
            log[today] = rest as typeof log[string];
          }
          return {
            progress: {
              ...s.progress,
              lessonDate: '',
              lessonStep: 0,
              dailyLog: log,
            },
          };
        }),

      markTraced: (id) =>
        set((s) =>
          _applyProgress(s, (p) =>
            p.traced.includes(id) ? p : { ...p, traced: [...p.traced, id] },
          ),
        ),

      buySticker: (id, cost) => {
        const p = get().progress;
        if (p.stickers.includes(id)) return false;
        if (p.stars - p.spent < cost) return false;
        set((s) =>
          _applyProgress(s, (q) => ({
            ...q,
            spent: q.spent + cost,
            stickers: [...q.stickers, id],
          })),
        );
        return true;
      },

      addFish: (count) =>
        set((s) => ({
          progress: { ...s.progress, fishCount: (s.progress.fishCount ?? 0) + count },
        })),

      incrementAiChatCount: () =>
        set((s) =>
          _applyProgress(s, (p) => {
            const today = todayStr();
            const key = `chatCount_${today}`;
            const cur = (p.chatHistory?.[key] as number | undefined) ?? 0;
            return {
              ...p,
              chatHistory: { ...(p.chatHistory ?? {}), [key]: cur + 1 },
            };
          }),
        ),

      markExplained: (topicId) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const today = todayStr();
            const key = `explained_${today}`;
            const arr: string[] = ((p.chatHistory?.[key] as string[] | undefined) ?? []);
            if (arr.includes(topicId)) return p;
            return {
              ...p,
              chatHistory: { ...(p.chatHistory ?? {}), [key]: [...arr, topicId] },
            };
          }),
        ),

      feedCat: (cost) => {
        let ok = false;
        set((s) => {
          const cur = s.progress.fishCount ?? 0;
          if (cur >= cost) {
            ok = true;
            const nextAffection = Math.min(100, (s.progress.catAffection ?? 20) + cost * 5);
            return {
              progress: { ...s.progress, fishCount: cur - cost, catAffection: nextAffection },
            };
          }
          return s;
        });
        return ok;
      },

      feedCatStats: (amount, cost) => {
        let ok = false;
        set((s) => {
          const curFish = s.progress.fishCount ?? 0;
          if (curFish >= cost) {
            ok = true;
            const nextFullness = Math.min(100, (s.progress.catFullness ?? 80) + amount);
            // Feeding also slightly increases affection
            const nextAffection = Math.min(100, (s.progress.catAffection ?? 20) + Math.floor(amount / 2));
            return {
              progress: {
                ...s.progress,
                fishCount: curFish - cost,
                catFullness: nextFullness,
                catAffection: nextAffection,
              },
            };
          }
          return s;
        });
        return ok;
      },

      cleanCatStats: (amount) => {
        set((s) => {
          const nextClean = Math.min(100, (s.progress.catCleanliness ?? 80) + amount);
          return {
            progress: { ...s.progress, catCleanliness: nextClean }
          };
        });
      },

      tickCatStats: () => {
        set((s) => {
          const now = Date.now();
          const lastUpdate = s.progress.lastCatUpdate ?? now;
          const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

          if (diffHours < 1) return s; // Not enough time passed

          // Decay 2 points per hour
          const decay = Math.floor(diffHours * 2);

          const newFullness = Math.max(0, (s.progress.catFullness ?? 80) - decay);
          const newCleanliness = Math.max(0, (s.progress.catCleanliness ?? 80) - decay);

          return {
            progress: {
              ...s.progress,
              catFullness: newFullness,
              catCleanliness: newCleanliness,
              lastCatUpdate: now
            }
          };
        });
      },

      buyOutfit: (outfitId, cost) => {
        let ok = false;
        set((s) => {
          const curFish = s.progress.fishCount ?? 0;
          const unlocked = s.progress.unlockedOutfits ?? [];
          if (curFish >= cost && !unlocked.includes(outfitId)) {
            ok = true;
            return {
              progress: {
                ...s.progress,
                fishCount: curFish - cost,
                unlockedOutfits: [...unlocked, outfitId],
              },
            };
          }
          return s;
        });
        return ok;
      },

      equipOutfit: (type, outfitId) => {
        set((s) => {
          const equipped = s.progress.equippedOutfits ?? {};
          // If equipping the same outfit, unequip it
          if (equipped[type] === outfitId) {
            const nextEquipped = { ...equipped };
            delete nextEquipped[type];
            return { progress: { ...s.progress, equippedOutfits: nextEquipped } };
          }
          return {
            progress: {
              ...s.progress,
              equippedOutfits: { ...equipped, [type]: outfitId },
            },
          };
        });
      },

      petCat: () => {
        set((s) => {
          const nextAffection = Math.min(100, (s.progress.catAffection ?? 20) + 2);
          return {
            progress: { ...s.progress, catAffection: nextAffection }
          };
        });
      },

      bathCat: () => {
        set((s) => {
          const nextClean = Math.min(100, (s.progress.catCleanliness ?? 80) + 20);
          return {
            progress: { ...s.progress, catCleanliness: nextClean }
          };
        });
      },

      dispatchCatQuest: (id: string, name: string, durationSec: number, reward: number) => {
        set((s) => {
          const quests = s.progress.catQuests ?? [];
          const newQ = { id, name, endAt: Date.now() + durationSec * 1000, reward };
          return { progress: { ...s.progress, catQuests: [...quests.filter((q) => q.id !== id), newQ] } };
        });
      },

      claimCatQuest: (id: string) => {
        set((s) => {
          const quests = s.progress.catQuests ?? [];
          const target = quests.find((q) => q.id === id);
          if (!target || Date.now() < target.endAt) return s;
          const nextFish = (s.progress.fishCount ?? 0) + target.reward;
          const nextAffection = Math.min(100, (s.progress.catAffection ?? 20) + 10);
          return {
            progress: {
              ...s.progress,
              fishCount: nextFish,
              catAffection: nextAffection,
              catQuests: quests.filter((q) => q.id !== id),
            },
          };
        });
      },

      evolveCat: () => {
        let ok = false;
        set((s) => {
          const curLv = s.progress.catLevel ?? 1;
          const curAff = s.progress.catAffection ?? 20;
          const stars = s.progress.stars ?? 0;

          let canEvolve = false;
          if (curLv === 1 && stars >= 50 && curAff >= 50) canEvolve = true;
          if (curLv === 2 && stars >= 200 && curAff >= 80) canEvolve = true;
          if (curLv === 3 && stars >= 500 && curAff >= 100) canEvolve = true;

          if (canEvolve) {
            ok = true;
            return {
              progress: {
                ...s.progress,
                catLevel: curLv + 1,
                // Affection resets a bit, or just keep it? Let's just consume a bit of it for evolution
                catAffection: Math.max(20, curAff - 30),
              },
            };
          }
          return s;
        });
        return ok;
      },


      clearWrongBook: () => set((s) => ({ progress: { ...s.progress, wrongBook: [] } })),

      // —— A4: 错题本自适应复习 ——
      practiceWrong: (skill, correct, difficulty) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const now = Date.now();
            const m = p.mastery[skill];
            const wasInWrongBook = p.wrongBook.includes(skill);

            // 使用难度感知的 SRS review
            const diff = difficulty ?? (m && m.lv <= 1 ? 1 : m && m.lv <= 3 ? 2 : 3) as 1 | 2 | 3;
            const newMastery = review(m, correct, now, diff);
            const newWrongBook = _applyWrongBook(p, skill, correct, newMastery);

            // 判断是否消灭了错题（答对且从错题本移出）
            const justCleared = correct && wasInWrongBook && !newWrongBook.includes(skill);

            // 更新 wrongHistory
            const wh = p.wrongHistory ?? {
              totalEver: 0,
              uniqueSkills: 0,
              cleared: 0,
              maxCount: 0,
              bestStreak: 0,
              dailyStreak: 0,
              lastTrainDate: '',
              aiAnalyzeCount: 0,
            };

            const today = todayStr();
            const dailyStreak = wh.lastTrainDate === today
              ? wh.dailyStreak
              : (wh.lastTrainDate === dateKey(Date.now() - 86400000) ? wh.dailyStreak + 1 : 1);

            // totalEver：每次答错累加（对应「累计 N 次错题」徽章）；uniqueSkills：新错题入本时 +1
            const isWrong = !correct;
            const newlyAdded = !wasInWrongBook && !correct;
            const gained = correct ? (diff >= 3 ? 2 : 1) : 0;

            const next = {
              ...p,
              mastery: { ...p.mastery, [skill]: newMastery },
              wrongBook: newWrongBook,
              stars: p.stars + gained,
              fishCount: (p.fishCount ?? 0) + (correct ? 1 : 0),
              dailyLog: _bumpLog(p, { items: 1, ok: correct ? 1 : 0, stars: gained }),
              wrongHistory: {
                ...wh,
                totalEver: wh.totalEver + (isWrong ? 1 : 0),
                uniqueSkills: wh.uniqueSkills + (newlyAdded ? 1 : 0),
                maxCount: Math.max(wh.maxCount, newWrongBook.length),
                dailyStreak,
                lastTrainDate: today,
                cleared: wh.cleared + (justCleared ? 1 : 0),
              },
            };
            return _withDailySnapshot(next);
          }),
        ),

      updateWrongHistory: (patch) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const wh = p.wrongHistory ?? {
              totalEver: 0,
              uniqueSkills: 0,
              cleared: 0,
              maxCount: 0,
              bestStreak: 0,
              dailyStreak: 0,
              lastTrainDate: '',
              aiAnalyzeCount: 0,
            };
            return { ...p, wrongHistory: { ...wh, ...patch } };
          }),
        ),

      // —— 绘本工坊 ——
      saveStorybook: (book) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const list = p.storybooks ?? [];
            // 避免重复保存同一本
            if (list.some((b) => b.id === book.id)) return p;
            const next = [book, ...list].slice(0, 50);
            return { ...p, storybooks: next };
          }),
        ),

      removeStorybook: (id) =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            storybooks: (p.storybooks ?? []).filter((b) => b.id !== id),
          })),
        ),

      incrementStorybookRead: (id) =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            storybooks: (p.storybooks ?? []).map((b) =>
              b.id === id ? { ...b, readCount: b.readCount + 1 } : b,
            ),
          })),
        ),

      toggleStorybookFavorite: (id) =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            storybooks: (p.storybooks ?? []).map((b) =>
              b.id === id ? { ...b, favorite: !b.favorite } : b,
            ),
          })),
        ),

      // —— P4: 闯关冒险 ——
      addFragment: (fragmentId) => set((s) => _applyProgress(s, (p) => {
        if (p.ownedFragments?.includes(fragmentId)) return p;
        return { ...p, ownedFragments: [...(p.ownedFragments ?? []), fragmentId] };
      })),

      unlockEquipment: (fragmentId) => set((s) => _applyProgress(s, (p) => {
        // 检查是否已有碎片
        if (!p.ownedFragments?.includes(fragmentId)) return p;
        // 查找对应装备
        const equip = findEquipmentByFragment(fragmentId);
        if (!equip) return p;
        // 检查是否已解锁
        if (p.ownedEquipment?.includes(equip.id)) return p;
        return { ...p, ownedEquipment: [...(p.ownedEquipment ?? []), equip.id] };
      })),

      toggleEquip: (equipmentId) => set((s) => _applyProgress(s, (p) => {
        const equip = EQUIPMENT_MAP.get(equipmentId);
        if (!equip || !p.ownedEquipment?.includes(equipmentId)) return p;
        const currentEquipped = p.equippedItems ?? {};
        const isEquipped = currentEquipped[equip.slot] === equipmentId;
        return {
          ...p,
          equippedItems: isEquipped
            ? Object.fromEntries(Object.entries(currentEquipped).filter(([k]) => k !== equip.slot))
            : { ...currentEquipped, [equip.slot]: equipmentId },
        };
      })),

      recordBossResult: (levelId, defeated, turns) => set((s) => _applyProgress(s, (p) => {
        const prev = p.bossRecords?.[levelId];
        if (prev && !defeated) return p; // 只记录胜利
        if (prev && prev.defeated && prev.bestTurns <= turns) return p; // 只记录最佳成绩
        return {
          ...p,
          bossRecords: {
            ...(p.bossRecords ?? {}),
            [levelId]: { defeated, bestTurns: defeated ? Math.min(prev?.bestTurns ?? turns, turns) : turns },
          },
        };
      })),

      incPkCount: () => set((s) => ({ progress: { ...s.progress, pkCount: s.progress.pkCount + 1 } })),
      incCreativeCount: () => set((s) => ({ progress: { ...s.progress, creativeCount: s.progress.creativeCount + 1 } })),

      // —— 设置路由：委托到 useSettingsStore，不再在主 store 维护 settings 状态 ——
      setSound: (v) => useSettingsStore.getState().setSound(v),
      setShowPinyin: (v) => useSettingsStore.getState().setShowPinyin(v),
      setParentPin: (pin) => useSettingsStore.getState().setParentPin(pin),
      recordPinFail: () => useSettingsStore.getState().recordPinFail(),
      recordPinSuccess: () => useSettingsStore.getState().recordPinSuccess(),
      clearPin: () => useSettingsStore.getState().clearPin(),
      setDailyLimit: (min) => useSettingsStore.getState().setDailyLimit(min),
      setEyeCare: (min) => useSettingsStore.getState().setEyeCare(min),
      setAiEnabled: (v) => {
        aiSetEnabled(v);
        useSettingsStore.getState().setAiEnabled(v);
      },
      setVoiceGuide: (v) => useSettingsStore.getState().setVoiceGuide(v),

      // —— 研究模式（CMML）——
      // 全部走 _applyProgress：progress 变更后统一跑 findNewBadges（F19 行为型徽章）
      recordResearchAction: (topicId, deltaSec = 0, opts) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const st = p.researchStats ?? { topicsExplored: [], exploreActions: 0, cardsRead: 0, sessionsCompleted: 0, exploreSeconds: 0 };
            return {
              ...p,
              researchStats: {
                ...st,
                topicsExplored: st.topicsExplored.includes(topicId) ? st.topicsExplored : [...st.topicsExplored, topicId],
                exploreActions: st.exploreActions + 1,
                exploreSeconds: st.exploreSeconds + deltaSec,
                cardsRead: st.cardsRead + (opts?.readCard ? 1 : 0),
              },
            };
          }),
        ),
      discoverCard: (kvId) =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            discoveries: p.discoveries.includes(kvId) ? p.discoveries : [...p.discoveries, kvId],
          })),
        ),
      removeDiscovery: (kvId) =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            discoveries: p.discoveries.filter((x) => x !== kvId),
          })),
        ),
      setResearchNote: (topicId, text) =>
        set((s) =>
          _applyProgress(s, (p) => ({
            ...p,
            researchNotes: { ...p.researchNotes, [topicId]: text },
          })),
        ),
      removeResearchNote: (topicId) =>
        set((s) =>
          _applyProgress(s, (p) => {
            const next = { ...p.researchNotes };
            delete next[topicId];
            return { ...p, researchNotes: next };
          }),
        ),
      completeResearchSession: () =>
        set((s) =>
          _applyProgress(s, (p) => {
            const st = p.researchStats ?? { topicsExplored: [], exploreActions: 0, cardsRead: 0, sessionsCompleted: 0, exploreSeconds: 0 };
            return { ...p, researchStats: { ...st, sessionsCompleted: st.sessionsCompleted + 1 } };
          }),
        ),
    }),
    {
      name: 'baby-learning-park-v1',
      version: 3,
      // 仅持久化 progress；settings 已由 useSettingsStore 单独持久化
      storage: createJSONStorage(() => throttledLocalStorage),
      // pendingBadges 是瞬时 UI 队列，不写入 localStorage
      partialize: (s) => ({ progress: s.progress }),
      // 恢复后把 AI 开关同步给服务层（client 是模块级单例，不读 store）
      onRehydrateStorage: () => (state) => {
        if (state?.progress) {
          // settings 从 useSettingsStore 独立读取，无需再同步
          const settings = useSettingsStore.getState().settings;
          aiSetEnabled(settings.aiEnabled !== false);
        }
      },
      merge: (persisted, current) => {
        const p = persisted as { progress?: Partial<Progress> } | undefined;
        return {
          ...current,
          // 与初始值做真正深合并（P2-8），保证老数据升级时新增嵌套字段回填默认值
          progress: deepMergeProgress(initialProgress, p?.progress ?? {}),
          pendingBadges: [],
        };
      },
    },
  ),
);

/** 选择器：便捷读取 */
export const useProgress = () => useStore((s) => s.progress);

/**
 * 兼容层：settings selector 委托到 useSettingsStore，
 * 避免进度 store 随 settings 变化而重渲染（核心加强 O）。
 */
export const useSettings = () => useSettingsStore((s) => s.settings);

/* ------------------------------------------------------------ */
/* 桥接 lib/speech → 全局 store（消除 lib→store 层倒置）          */
/* ------------------------------------------------------------ */
registerTtsBridge(
  (report) => useTtsStore.getState().setTtsState(report),
  () => {
    const s = useSettingsStore.getState().settings;
    return s.sound && s.voiceGuide;
  },
);
/** 可用星星（累计获得 - 已花费） */
export const useAvailableStars = () => useStore((s) => s.progress.stars - s.progress.spent);

/* ============================================================
 * 细粒度选择器（核心加强 O）：避免 useProgress() 全量订阅导致广域重渲染
 * ------------------------------------------------------------
 * 原 useProgress() 返回整个 progress 对象，任一字段变化（答一题、+1 星、
 * 30s tickTime）都会让所有订阅者重渲染。孩子连答时 55 个组件会全部刷新。
 *
 * 现按字段拆分细粒度 selector，组件只订阅真正用到的字段，重渲染范围收敛。
 * 仍保留 useProgress() 兼容旧代码，逐步迁移到细粒度 selector。
 * ============================================================ */

/** 星星数（累计获得） */
export const useStars = () => useStore((s) => s.progress.stars);
/** 已花费星星 */
export const useSpent = () => useStore((s) => s.progress.spent);
/** 徽章列表 */
export const useBadges = () => useStore((s) => s.progress.badges);
/** 徽章数量（不订阅整个数组，只看 length） */
export const useBadgeCount = () => useStore((s) => s.progress.badges.length);
/** 当前连胜天数 */
export const useStreak = () => useStore((s) => s.progress.streak);
/** 已解锁关卡 */
export const useUnlockedLevel = () => useStore((s) => s.progress.unlockedLevel);
/** 关卡星星映射 */
export const useLevelStars = () => useStore((s) => s.progress.levelStars);
/** 知识点掌握度（高频写，需独立订阅） */
export const useMastery = () => useStore((s) => s.progress.mastery);
/** 每日学习日志（用于学习伙伴心情、总题量统计） */
export const useDailyLog = () => useStore((s) => s.progress.dailyLog);
/** PK 次数 */
export const usePkCount = () => useStore((s) => s.progress.pkCount);
/** 创作次数 */
export const useCreativeCount = () => useStore((s) => s.progress.creativeCount);


// Standalone re-exports of instance methods so they can be imported as named exports
// Usage: import { incrementAiChatCount } from '@/store/useStore';
//        incrementAiChatCount();  // no hook needed
/** @deprecated use useStore.getState().incrementAiChatCount() instead */
export const incrementAiChatCount = () => useStore.getState().incrementAiChatCount();
/** @deprecated use useStore.getState().markExplained(id) instead */
export const markExplained = (id: string) => useStore.getState().markExplained(id);
