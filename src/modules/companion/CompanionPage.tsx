/**
 * i18nT('companion.pageTitle') · 儿童版 AI 陪伴学习伙伴 v2
 * ------------------------------------------------------------------
 * 第 20 轮（加强版）：
 * 1. 主题库扩充：20 → 30 个（10 分类 × 3 主题，每主题含难度星级+场景标签）
 * 2. Progress 持久化：explainedTopics 讲解历史 + companionChatCount 聊天计数
 * 3. 讲解进度感知：已讲过主题显示 ✓，顶部进度条"今天讲了 X/30"
 * 4. 每日智能推荐：时段/学习内容推荐最合适的主题
 * 5. 讲解音频朗读：「i18nT('companion.listen')」调用语音 API 朗读讲解内容
 * 6. 主题元数据显示：难度星级（⭐/⭐⭐/⭐⭐⭐）+ 场景标签 chips
 * 7. CatCompanion 升级：useEffect 依赖修复 + 表情跟随增强
 *
 * 设计原则：AI 挂了永远有本地兜底；主题全预置合规；进度持久化成就感知
 */
import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { AiPanel } from '@/components/ai/AiPanel';
import { AiChat } from '@/components/ai/AiChat';
import { useAiStream } from '@/lib/ai/useAi';
import { companionChatTask, companionExplainTask, masteryCue } from '@/lib/ai/tasks';
// S2 Companion 2.0 新增组件
import { EmotionPop } from '@/modules/companion/EmotionPop';
import { StudyBuddyMode } from '@/modules/companion/StudyBuddyMode';
import { DailyQuestBoard } from '@/modules/companion/DailyQuestBoard';
import { ExplainFollowUp } from '@/modules/companion/ExplainFollowUp';
import { SocialEmotionGame } from './components/SocialEmotionGame';
import {
  COMPANION_CATEGORIES,
  type CompanionTopic,
} from '@/data/companionTopics';
import {
  todayExplainedCount,
  isTopicExplainedToday,
  incrementChatCount,
  todayChatCount,
} from '@/lib/companion/storeCompanion';
import { useStore } from '@/store/useStore';
import { useTtsStore } from '@/store/useTtsStore';
import { dateKey } from '@/lib/dailyPlan';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak, stopSpeaking } from '@/lib/speech';
import { TONE_STYLE } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';

const QUICK_QUESTIONS = [
  '夸夸我今天很棒',
  '给我讲个故事',
  '教我数到 20',
  '为什么要刷牙？',
  '恐龙是怎么不见的？',
  '大海里有什么？',
];

/** 根据时段推荐最合适的主题（启发式，无外部依赖） */
function recommendTopic(): CompanionTopic | null {
  let targetCat: string;
  const h = new Date().getHours();
  // 早上 → 语言类（古诗/拼音）；中午 → 科学类；下午 → 数学/认知；晚上 → 安全/情感
  if (h >= 6 && h < 11) targetCat = 'morning';
  else if (h >= 11 && h < 14) targetCat = 'science';
  else if (h >= 14 && h < 18) targetCat = 'numbers';
  else targetCat = 'safety';

  const catIdMap: Record<string, string> = {
    morning: 'poems',
    lunch: 'science',
    afternoon: 'numbers',
    evening: 'safety',
  };
  const catId = catIdMap[targetCat];
  const cat = COMPANION_CATEGORIES.find((c) => c.id === catId);
  if (!cat || cat.topics.length === 0) return null;
  return cat.topics[0]!;
}

const RECOMMENDED = recommendTopic();

/** 难度星级渲染 */
function DifficultyStars({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <span className="text-yellow-400" aria-label={`难度 ${stars} 星`}>
      {'★'.repeat(stars)}
      {'☆'.repeat(3 - stars)}
    </span>
  );
}

type CompanionTab = 'explain' | 'social' | 'buddy' | 'quests' | 'followup';

const TABS: { id: CompanionTab; emoji: string; label: string }[] = [
  { id: 'explain', emoji: '📖', label: '讲一讲' },
  { id: 'social', emoji: '🎭', label: '社交情感' },
  { id: 'buddy', emoji: '🎯', label: '学习搭子' },
  { id: 'quests', emoji: '📋', label: '今日任务' },
  { id: 'followup', emoji: '🤔', label: '知识追问' },
];

export default function CompanionPage() {
  const [activeTab, setActiveTab] = useState<CompanionTab>('explain');
  const [catId, setCatId] = useState(COMPANION_CATEGORIES[0]!.id);
  const [topic, setTopic] = useState<CompanionTopic | null>(null);
  const [, setRecitingTopic] = useState<CompanionTopic | null>(null);
  const [followUpTopic, setFollowUpTopic] = useState<CompanionTopic | null>(null);
  const explain = useAiStream();
  const store = useStore();
  const openVoiceModal = useTtsStore((s) => s.openVoiceModal);

  const { t: i18nT } = useTranslation();
  const p = store.progress;
  const explainedCount = todayExplainedCount(p);
  const totalTopics = COMPANION_CATEGORIES.reduce((s, c) => s + c.topics.length, 0);
  const progressPct = Math.round((explainedCount / totalTopics) * 100);

  const cat = COMPANION_CATEGORIES.find((c) => c.id === catId) ?? COMPANION_CATEGORIES[0]!;
  const mood = explain.status === 'thinking' ? 'thinking' : explain.status === 'streaming' ? 'talking' : 'idle';
  const hour = new Date().getHours();
  const greetingKey =
    hour < 11 ? 'greetingMorning' : hour < 14 ? 'greetingLunch' : hour < 18 ? 'greetingAfternoon' : 'greetingEvening';
  const greeting = i18nT(`companion.${greetingKey}`);
  const toneStyle = TONE_STYLE.purple;

  // 选主题讲解：打点 + 标记已讲过
  const pickTopic = useCallback(
    (tp: CompanionTopic) => {
      sfxTap();
      setTopic(tp);
      explain.run(companionExplainTask(tp));
      // 持久化：标记已讲解（下次显示 ✓）
      useStore.getState().markExplained(tp.id);
    },
    [explain, store]
  );

  // 语音朗读：讲解完成后点按钮朗读
  const handleRecite = useCallback(
    (tp: CompanionTopic) => {
      const text =
        explain.status === 'done' && explain.text.trim()
          ? explain.text.trim()
          : tp.fallback;
      sfxCorrect();
      stopSpeaking();
      speak(text, { lang: 'zh-CN', rate: 0.9 });
      setRecitingTopic(tp);
    },
    [explain]
  );

  const itemsToday = p.dailyLog[dateKey()]?.items ?? 0;
  const chatCountToday = todayChatCount(p);
  const streak = p.streak;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      {/* S2: 情绪陪伴全局弹层 */}
      <EmotionPop />

      <PageHeader
        emoji="🌟"
        title={i18nT('companion.pageTitle')}
        subtitle={i18nT('companion.subtitle')}
      />

      {/* ── i18nT('companion.send')候卡 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 rounded-[2rem] border-4 border-white bg-gradient-to-br from-candy-purple-soft to-candy-pink-soft p-5 shadow-pop"
      >
        <AiAvatar size={72} mood={mood} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-ink">
            {i18nT('companion.greetingSuffix', { greeting })}
          </h2>
          <p className="mt-1 text-sm font-bold text-ink-soft">
            {streak > 0 ? i18nT('companion.streakDays', { count: streak }) : i18nT('common.loading')}
            {itemsToday > 0 && ` ${i18nT('companion.itemsToday', { count: itemsToday })}`}
            {chatCountToday > 0 && ` ${i18nT('companion.chatCountToday', { count: chatCountToday })}`}
          </p>
          <p className="mt-1 text-sm font-bold" style={{ color: toneStyle?.deep }}>
            🌟 {i18nT('companion.aiPartner')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { sfxTap(); openVoiceModal(); }}
          aria-label="打开语音对话，跟小茜说话"
          className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border-2 border-white bg-gradient-to-b from-candy-purple to-candy-blue px-3 py-2.5 text-white shadow-md transition-transform active:scale-95"
        >
          <span className="text-2xl leading-none">🎤</span>
          <span className="text-xs font-extrabold whitespace-nowrap">语音对话</span>
        </button>
      </motion.div>

      {/* ── 今日进度 ── */}
      {explainedCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3"
        >
          <span className="text-2xl">📚</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex justify-between text-xs font-bold text-purple-700">
              <span>{i18nT('companion.progressTitle', { count: explainedCount, total: totalTopics })}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-purple-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 每日推荐 ── */}
      {RECOMMENDED && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 rounded-2xl border-4 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 shadow-pop"
        >
          <span className="text-3xl">💡</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-yellow-700">✨ 小茜今日推荐</div>
            <div className="mt-0.5 text-base font-extrabold text-orange-800">
              {RECOMMENDED.emoji} {RECOMMENDED.label}
              <span className="ml-2 text-xs font-bold text-orange-500">
                <DifficultyStars stars={RECOMMENDED.stars} />
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {RECOMMENDED.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => pickTopic(RECOMMENDED)}
            className="shrink-0 rounded-full bg-yellow-400 px-4 py-2.5 text-sm font-extrabold text-orange-900 shadow active:translate-y-[2px]"
          >
            听小茜讲 →
          </button>
        </motion.div>
      )}

      {/* ── S2 Tab 导航 ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          const tabTone = TONE_STYLE[
            tab.id === 'explain' ? 'purple' :
            tab.id === 'buddy' ? 'blue' :
            tab.id === 'quests' ? 'green' : 'pink'
          ]!;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                sfxTap();
                setActiveTab(tab.id);
              }}
              className={`min-h-[44px] shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition active:translate-y-[2px] ${
                active ? 'text-white shadow' : 'border-2 bg-white'
              }`}
              style={
                active
                  ? { background: tabTone.main, borderColor: tabTone.main }
                  : { borderColor: `${tabTone.main}55`, color: tabTone.deep }
              }
            >
              {tab.emoji} {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 小茜讲一讲（讲解 Tab） ── */}
      {activeTab === 'explain' && (
      <Panel>
        <PanelTitle
          emoji="📖"
          title="小茜讲一讲"
          subtitle={i18nT('companion.explainSubtitle')}
          tone="purple"
        />

        {/* 分类 chips */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {COMPANION_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                sfxTap();
                setCatId(c.id);
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-extrabold transition active:translate-y-[2px] ${
                c.id === catId ? 'text-white shadow' : 'border-2 bg-white'
              }`}
              style={
                c.id === catId
                  ? { background: toneStyle?.main, borderColor: toneStyle?.main }
                  : { borderColor: toneStyle?.soft, color: toneStyle?.deep }
              }
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* 主题网格 */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cat.topics.map((tp) => {
            const done = isTopicExplainedToday(p, tp.id);
            return (
              <button
                key={tp.id}
                type="button"
                onClick={() => pickTopic(tp)}
                className={`flex flex-col gap-1 rounded-2xl border-2 bg-white px-3 py-2.5 text-left transition active:translate-y-[2px] ${
                  done ? 'border-green-200 bg-green-50' : ''
                }`}
                style={{ borderColor: done ? undefined : toneStyle?.soft }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{tp.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                    {tp.label}
                  </span>
                  {done && <span className="text-green-500">✓</span>}
                </div>
                <div className="flex items-center gap-1">
                  <DifficultyStars stars={tp.stars} />
                  <div className="ml-auto flex gap-0.5">
                    {tp.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 讲解卡片 */}
        <AnimatePresence mode="wait">
          {topic && explain.status !== 'idle' && (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <AiAvatar size={30} mood={mood} />
                <span className="text-sm font-extrabold" style={{ color: toneStyle?.deep }}>
                  小茜讲 {topic.emoji} {topic.label}
                </span>
                <DifficultyStars stars={topic.stars} />
              </div>

              {explain.status === 'thinking' ? (
                <div
                  className="rounded-2xl px-4 py-3 text-sm font-bold"
                  style={{ background: toneStyle?.soft, color: toneStyle?.deep }}
                >
                  {i18nT('companion.thinking')}
                </div>
              ) : (
                <AiPanel
                  state={explain}
                  tone="purple"
                  compact={false}
                  showActions={false}
                />
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {/* 再讲一遍 */}
                <button
                  type="button"
                  onClick={() => explain.run(companionExplainTask(topic))}
                  className="rounded-full border-2 bg-white px-3 py-1.5 text-xs font-extrabold transition active:translate-y-[2px]"
                  style={{ borderColor: toneStyle?.main, color: toneStyle?.deep }}
                >
                  {i18nT('companion.retry')}
                </button>
                {/* 听小茜讲（语音朗读） */}
                <button
                  type="button"
                  onClick={() => handleRecite(topic)}
                  className="rounded-full border-2 bg-white px-3 py-1.5 text-xs font-extrabold transition active:translate-y-[2px]"
                  style={{ borderColor: toneStyle?.main, color: toneStyle?.deep }}
                >
                  {i18nT('companion.listen')}
                </button>
                {/* i18nT('companion.changeTopic') */}
                <button
                  type="button"
                  onClick={() => {
                    setTopic(null);
                    explain.reset();
                    stopSpeaking();
                    setRecitingTopic(null);
                  }}
                  className="rounded-full border-2 bg-white px-3 py-1.5 text-xs font-extrabold transition active:translate-y-[2px]"
                  style={{ borderColor: toneStyle?.main, color: toneStyle?.deep }}
                >
                  {i18nT('companion.changeTopic')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>
      )}

      {/* ── 学习搭子 Tab ── */}
      {activeTab === 'buddy' && <StudyBuddyMode />}

      {/* ── 今日任务 Tab ── */}
      {activeTab === 'quests' && <DailyQuestBoard />}

      {/* ── 知识追问 Tab ── */}
      {activeTab === 'followup' && (
        followUpTopic ? (
          <ExplainFollowUp
            topicTitle={followUpTopic.label}
            explainText={explain.text}
            onDone={() => setFollowUpTopic(null)}
          />
        ) : (
          <Panel>
            <PanelTitle
              emoji="🤔"
              title="知识追问"
              subtitle="先选一个主题，小茜来考考你！"
              tone="pink"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COMPANION_CATEGORIES.flatMap((c) => c.topics).map((tp) => (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setFollowUpTopic(tp);
                    // 如果有讲解缓存就用缓存文本，否则触发讲解
                    if (!explain.text || explain.task?.scene !== 'companion.explain') {
                      explain.run(companionExplainTask(tp));
                    }
                  }}
                  className="flex flex-col gap-1 rounded-2xl border-2 bg-white px-3 py-2.5 text-left transition active:translate-y-[2px]"
                  style={{ borderColor: TONE_STYLE.pink.soft }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{tp.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                      {tp.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        )
      )}

      {/* ── 社交与情感互动（宝宝巴士五大领域模块） ── */}
      {activeTab === 'social' && <SocialEmotionGame />}

      {/* ── 和小茜聊天（常驻底部） ── */}
      <Panel>
        <PanelTitle
          emoji="💬"
          title="和小茜聊天"
          subtitle={i18nT('companion.chatSubtitle')}
          tone="pink"
        />
        <AiChat
          buildTask={(q, history) =>
            companionChatTask(q ?? '', history, masteryCue(useStore.getState().progress, 4))
          }
          quickQuestions={QUICK_QUESTIONS}
          tone="purple"
          placeholder={i18nT('companion.placeholder')}
          onDone={() => {
            // 聊天成功 → 增加聊天计数
            useStore.setState((s) => ({
              progress: incrementChatCount(s.progress),
            }));
          }}
        />
      </Panel>
    </div>
  );
}
