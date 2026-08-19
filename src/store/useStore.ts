import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Progress, MasteryItem } from '@/types';
import type { BackupPayload } from '@/lib/backup';
import { setAiEnabled as aiSetEnabled } from '@/lib/ai/client';
import { createInitialProgress } from '@/lib/progress';
import { useSettingsStore } from './useSettingsStore';
import { useTtsStore } from './useTtsStore';
import { registerTtsBridge } from '@/lib/speechCore';
import { createThrottledStorage } from './storeHelpers';

import { createBasicsSlice } from './storeSlices/basicsSlice';
import { createLearningSlice } from './storeSlices/learningSlice';
import { createEmotionSlice } from './storeSlices/emotionSlice';
import { createDailyQuestSlice } from './storeSlices/dailyQuestSlice';
import { createCatSlice } from './storeSlices/catSlice';
import { createCompanionSlice } from './storeSlices/companionSlice';
import { createStorybookSlice } from './storeSlices/storybookSlice';
import { createAdventureSlice } from './storeSlices/adventureSlice';
import { createSettingsSlice } from './storeSlices/settingsSlice';
import { createResearchSlice } from './storeSlices/researchSlice';

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

export interface StoreState {
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
 * 主 store：组合全部领域切片（slice-composer 模式）。
 * StoreState 接口为唯一真相源，各切片仅实现 Pick<StoreState, ...> 的子集，
 * 在此处通过展开算子合并；persist / 选择器 / TTS 桥接保持不动。
 */
export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      progress: initialProgress,
      pendingBadges: [],

      ...createBasicsSlice(set, get),
      ...createLearningSlice(set, get),
      ...createEmotionSlice(set, get),
      ...createDailyQuestSlice(set, get),
      ...createCatSlice(set, get),
      ...createCompanionSlice(set, get),
      ...createStorybookSlice(set, get),
      ...createAdventureSlice(set, get),
      ...createSettingsSlice(set, get),
      ...createResearchSlice(set, get),
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

/**
 * @deprecated 请改用细粒度 selector（useStars / useMastery / useDailyLog / useBadges /
 * usePoemMark 等）。全仓唯一保留使用点是 ParentBackupSection —— 备份导出需要完整
 * 序列化整个 progress，无法拆分字段。其余组件均已迁移，勿新增使用。
 */
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
/**
 * 单知识点掌握度（P1-2）：只订阅指定 skill 的 mastery 项。
 * 任意 skill 的 practice 都会重建整个 mastery 对象，导致 useMastery 全量
 * 消费者重渲染；改用本选择器后，仅当该 skill 变化时才重渲染调用组件。
 * 例：useSkillMastery(question.skill)
 */
export const useSkillMastery = (skill: string) =>
  useStore((s) => s.progress.mastery[skill]);
/** 每日学习日志（用于学习伙伴心情、总题量统计） */
export const useDailyLog = () => useStore((s) => s.progress.dailyLog);
/** 徽章解锁时间戳映射 */
export const useBadgeDates = () => useStore((s) => s.progress.badgeDates);
/** 贴纸列表 */
export const useStickers = () => useStore((s) => s.progress.stickers);
/** 错题本列表 */
export const useWrongBook = () => useStore((s) => s.progress.wrongBook);
/** 错题本清除/累计历史 */
export const useWrongHistory = () => useStore((s) => s.progress.wrongHistory);
/** 已听字母列表 */
export const useLettersHeard = () => useStore((s) => s.progress.lettersHeard);
/**
 * 徽章计量器字段投影（badge.meter 读取的字段全集，见 src/data/badges.ts）：
 * 徽章页只订阅这些字段，30s dailyLog tick / 养宠状态等变化不再触发徽章页重渲染。
 * 传给 badge.meter 时需 `as Progress` 断言（meter 声明为 Progress 全量入参）。
 */
export const useBadgeMetricProgress = () =>
  useStore(
    useShallow(
      (s): Pick<
        Progress,
        | 'lettersHeard'
        | 'matchGamesWon'
        | 'poemsRead'
        | 'numbersHeard'
        | 'mathCorrect'
        | 'countCorrect'
        | 'logicCorrect'
        | 'levelStars'
        | 'stars'
        | 'streak'
        | 'mastery'
        | 'pkCount'
        | 'poemRecite'
        | 'speedCorrect'
        | 'wrongHistory'
        | 'wrongBook'
        | 'ownedEquipment'
        | 'researchStats'
        | 'researchNotes'
      > => ({
        lettersHeard: s.progress.lettersHeard,
        matchGamesWon: s.progress.matchGamesWon,
        poemsRead: s.progress.poemsRead,
        numbersHeard: s.progress.numbersHeard,
        mathCorrect: s.progress.mathCorrect,
        countCorrect: s.progress.countCorrect,
        logicCorrect: s.progress.logicCorrect,
        levelStars: s.progress.levelStars,
        stars: s.progress.stars,
        streak: s.progress.streak,
        mastery: s.progress.mastery,
        pkCount: s.progress.pkCount,
        poemRecite: s.progress.poemRecite,
        speedCorrect: s.progress.speedCorrect,
        wrongHistory: s.progress.wrongHistory,
        wrongBook: s.progress.wrongBook,
        ownedEquipment: s.progress.ownedEquipment,
        researchStats: s.progress.researchStats,
        researchNotes: s.progress.researchNotes,
      }),
    ),
  );
/** 已读古诗 id 列表 */
export const usePoemsRead = () => useStore((s) => s.progress.poemsRead);
/** 古诗收藏 id 列表 */
export const usePoemFavorites = () => useStore((s) => s.progress.poemFavorites);
/** 单首诗是否收藏（布尔，仅在收藏状态变化时重渲染） */
export const usePoemFavorite = (id: string) =>
  useStore((s) => s.progress.poemFavorites.includes(id));
/** 难点标记整块（列表/统计场景，页面级订阅） */
export const usePoemMarks = () => useStore((s) => s.progress.poemMarks);
/** 单首诗难点标记（仅该诗变化时重渲染） */
export const usePoemMark = (id: string) => useStore((s) => s.progress.poemMarks[id]);
/** 鉴赏笔记整块 */
export const usePoemNotes = () => useStore((s) => s.progress.poemNotes);
/** 单首诗鉴赏笔记（仅该诗笔记变化时重渲染） */
export const usePoemNote = (id: string) => useStore((s) => s.progress.poemNotes[id] ?? '');
/** 背诵记录整块 */
export const usePoemRecite = () => useStore((s) => s.progress.poemRecite);
/** 单首诗背诵记录（仅该诗背诵变化时重渲染） */
export const usePoemReciteStat = (id: string) => useStore((s) => s.progress.poemRecite[id]);
/** 古诗知识点掌握度（仅投影 poem: 前缀，避免整块 mastery 变化触发） */
export const usePoemMastery = () =>
  useStore(
    useShallow((s): Record<string, MasteryItem> => {
      const out: Record<string, MasteryItem> = {};
      for (const [k, v] of Object.entries(s.progress.mastery)) {
        if (k.startsWith('poem:')) out[k] = v;
      }
      return out;
    }),
  );
/** 已听数字列表 */
export const useNumbersHeard = () => useStore((s) => s.progress.numbersHeard);
/** 每日成长快照（家长报告趋势） */
export const useGrowth = () => useStore((s) => s.progress.growth);
/** 研究模式：发现收藏/笔记/行为统计 */
export const useResearchStats = () => useStore((s) => s.progress.researchStats);
export const useDiscoveries = () => useStore((s) => s.progress.discoveries);
export const useResearchNotes = () => useStore((s) => s.progress.researchNotes);
/** PK 次数 */
export const usePkCount = () => useStore((s) => s.progress.pkCount);
/** 创作次数 */
export const useCreativeCount = () => useStore((s) => s.progress.creativeCount);
/** 小智陪伴对话历史（explained_ 与 chatCount_ 混合键） */
export const useChatHistory = () => useStore((s) => s.progress.chatHistory);
/** 当日课程完成日期 */
export const useLessonDate = () => useStore((s) => s.progress.lessonDate);
/** 当日课程进行步骤 */
export const useLessonStep = () => useStore((s) => s.progress.lessonStep);


// Standalone re-exports of instance methods so they can be imported as named exports
// Usage: import { incrementAiChatCount } from '@/store/useStore';
//        incrementAiChatCount();  // no hook needed
/** @deprecated use useStore.getState().incrementAiChatCount() instead */
export const incrementAiChatCount = () => useStore.getState().incrementAiChatCount();
/** @deprecated use useStore.getState().markExplained(id) instead */
export const markExplained = (id: string) => useStore.getState().markExplained(id);
