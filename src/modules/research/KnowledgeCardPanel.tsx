import { useCallback, useEffect, useRef, useState } from 'react';
import { CandyButton } from '@/components/ui/Button';
import { generateContent, listContent } from '@/lib/ai/contentClient';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import type { KnowledgeCard, ResearchTopic } from '@/lib/research/types';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 研究模式 · AI 知识卡面板（D4 / 主架构 §4.3 list-first 策略）
 * ------------------------------------------------------------------
 * 获取顺序（五级，任一命中即用，网络/生成故障为「一等公民路径」）：
 *   ① 会话草稿已有 ready 卡片 → 直接用（零网络）
 *   ② safeStorage 本地卡片缓存命中 cardMatchTags → 用（离线可用）
 *   ③ listContent(topic.aiContentType, 8) 按 tags/title 匹配 → source='kv'（免限速读）
 *   ④ generateContent(type, ageRange) → source='ai'（受限写），并写本地缓存
 *   ⑤ 全部失败 → CARD_FAILED（status='degraded'，回退静态兜底），仍可 START_QUIZ
 *
 * 降级矩阵（§2.3 五条全覆盖）：
 *   - cooldown → 显示「再等 N 秒」，按钮禁用
 *   - 429/502/断网 → degraded + 静态兜底文案，允许直接进小测
 *   - KV 不可用 → 卡片可读但 kvId 为 null → 隐藏收藏按钮
 *
 * 铁律：QUIZ 段永不依赖本面板（C2）；收藏仅当 kvId !== null（C1 护栏）。
 */

const CARD_CACHE_KEY = 'research-card-cache';

interface CardCacheItem {
  /** KV 键名（item:<type>:<id>）；离线兜底画廊按此匹配收藏 */
  kvId?: string;
  title: string;
  content: string | string[];
  tags: string[];
  ageRange?: string;
  type: string;
  cachedAt: number;
}

function readCardCache(): CardCacheItem[] {
  const raw = safeGetJSON<CardCacheItem[] | null>(CARD_CACHE_KEY, null);
  return Array.isArray(raw) ? raw : [];
}

function writeCardCache(items: CardCacheItem[]): void {
  try {
    safeSetJSON(CARD_CACHE_KEY, items.slice(0, 20)); // 只留最近 20 条，防膨胀
  } catch {
    /* safeStorage 内部已兜底，不抛 */
  }
}

interface KnowledgeCardPanelProps {
  topic: ResearchTopic;
  ageRange: string;
  /** 当前知识卡状态（来自 FSM session.knowledgeCard） */
  card: KnowledgeCard | null;
  /** FSM 事件派发 */
  onCardReady: (card: KnowledgeCard) => void;
  onCardFailed: (reason: 'cooldown' | 'rate_limited' | 'upstream' | 'offline') => void;
  onStartQuiz: () => void;
  onBackToExplore: () => void;
  /** 收藏（仅 kvId 非空时可用） */
  onFavorite: (kvId: string) => void;
}

export function KnowledgeCardPanel({
  topic,
  ageRange,
  card,
  onCardReady,
  onCardFailed,
  onStartQuiz,
  onBackToExplore,
  onFavorite,
}: KnowledgeCardPanelProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [readingId, setReadingId] = useState<string | null>(null);
  const busyRef = useRef(false);

  /** 从静态兜底构造 degraded 卡（§2.3 场景③④⑤共用） */
  const buildFallback = useCallback((): KnowledgeCard => {
    return {
      kvId: null,
      title: t(`research.fallbackFacts.${topic.id}.title`),
      body: t(`research.fallbackFacts.${topic.id}.body`),
      source: 'fallback',
      revealed: 1,
      status: 'degraded',
      createdAt: Date.now(),
    };
  }, [topic.id, t]);

  /** 触发知识卡获取（§4.3 五级顺序） */
  const fetchCard = useCallback(async () => {
    if (busyRef.current || loading) return;
    busyRef.current = true;
    setLoading(true);

    // ② 本地缓存命中（离线可用）
    const cached = readCardCache().find(
      (c) => c.tags.some((tag) => topic.cardMatchTags.includes(tag)),
    );
    if (cached) {
      onCardReady({
        kvId: cached.kvId ?? null, // 本地缓存优先回填 kvId（收藏）；无则不允许收藏（§2.3 场景④）
        title: cached.title,
        body: cached.content,
        source: 'kv',
        revealed: 1,
        status: 'ready',
        createdAt: Date.now(),
      });
      busyRef.current = false;
      setLoading(false);
      return;
    }

    // ③ listContent（免限速读路径）
    try {
      const items = await listContent(topic.aiContentType, 8);
      const hit = items.find(
        (i) => i.tags?.some((tag) => topic.cardMatchTags.includes(tag)) || topic.cardMatchTags.some((tag) => (i.title || '').includes(tag)),
      );
      if (hit) {
        onCardReady({
          kvId: hit.id,
          title: hit.title,
          body: hit.content,
          source: 'kv',
          revealed: 1,
          status: 'ready',
          createdAt: Date.now(),
        });
        busyRef.current = false;
        setLoading(false);
        return;
      }
    } catch {
      /* 继续走 generate */
    }

    // ④ generateContent（受限写路径；Sprint 4-A：explainer + 主题 hint → 研究主题专属讲解卡）
    const gen = await generateContent(topic.aiContentType, ageRange, topic.explainerHint);
    if (gen.ok && gen.item) {
      const item = gen.item;
      writeCardCache([
        { kvId: item.id, title: item.title, content: item.content, tags: item.tags ?? [], ageRange, type: topic.aiContentType, cachedAt: Date.now() },
        ...readCardCache(),
      ]);
      onCardReady({
        kvId: item.id,
        title: item.title,
        body: item.content,
        source: 'ai',
        revealed: 1,
        status: 'ready',
        createdAt: Date.now(),
      });
    } else if (gen.cooldown) {
      setCooldown(gen.cooldown);
      onCardFailed('cooldown');
    } else {
      // ⑤ 429 / 502 / 断网 → degraded + 静态兜底（闭环不断）
      const reason = gen.error?.includes('频繁') ? 'rate_limited' : 'upstream';
      onCardFailed(reason);
      onCardReady(buildFallback());
    }

    busyRef.current = false;
    setLoading(false);
  }, [topic, ageRange, onCardReady, onCardFailed, buildFallback, loading]);

  // 首次挂载自动获取（FSM 已置 loading 占位）
  useEffect(() => {
    if (card?.status === 'loading') {
      void fetchCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cooldown 倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0, cooldown]);

  const bodyText = typeof card?.body === 'string' ? card.body : Array.isArray(card?.body) ? card.body.join('\n') : '';
  const isReady = (card?.status === 'ready' || card?.status === 'degraded');
  // Sprint 4-B：explainer 卡 content 数组最后一项为「延伸小问题」（以 ? 结尾或第 4+ 项）→ 独立展示引导好奇
  const bodyList = Array.isArray(card?.body) ? card.body : [];
  const hasAsk = bodyList.length >= 4;
  const knowledgeLines = hasAsk ? bodyList.slice(0, -1) : bodyList;
  const askLine = hasAsk ? bodyList[bodyList.length - 1] : '';

  const handleSpeak = () => {
    if (!bodyText) return;
    sfxTap();
    if (readingId === 'card') {
      setReadingId(null);
      return;
    }
    setReadingId('card');
    void speak(bodyText, { lang: 'zh-CN', module: 'story' }).finally(() => setReadingId(null));
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold text-ink">{card?.title || t('research.card.title')}</h3>
        {isReady && bodyText && (
          <button
            type="button"
            aria-label={t('research.card.listen')}
            onClick={handleSpeak}
            className={cn(
              'no-select shrink-0 rounded-full px-3 py-2 text-lg shadow-sm transition-transform active:scale-90',
              readingId === 'card' ? 'bg-candy-purple-deep text-white' : 'bg-white text-candy-purple-deep',
            )}
          >
            {readingId === 'card' ? '🔊' : '🔈'}
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-ink-soft">{t('research.card.loading')}</p>}

      {cooldown > 0 && (
        <p className="text-sm font-semibold text-ink-soft">
          {t('research.card.cooldown', { n: String(cooldown) })}
        </p>
      )}

      {isReady && bodyText && (
        <>
          {typeof card?.body === 'string' ? (
            <p className="whitespace-pre-line leading-relaxed text-ink">{card.body}</p>
          ) : (
            <div className="space-y-2">
              {knowledgeLines.map((line, i) => (
                <p key={i} className="flex items-start gap-2 rounded-xl bg-purple-50/70 px-3 py-2 leading-relaxed text-ink">
                  <span className="mt-0.5 shrink-0">{['🌟', '✨', '🎈'][i % 3]}</span>
                  <span>{line}</span>
                </p>
              ))}
              {askLine && (
                <div className="mt-1 rounded-xl border-2 border-dashed border-candy-purple-deep/40 bg-purple-50 px-3 py-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-candy-purple-deep">
                    {t('research.card.askTitle')}
                  </p>
                  <p className="mt-0.5 flex items-start gap-2 text-sm font-bold leading-relaxed text-ink">
                    <span className="shrink-0">💡</span>
                    <span>{askLine}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {card?.status === 'degraded' && (
        <p className="text-sm text-ink-soft/80">{t('research.card.degradedHint')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {card?.kvId != null && isReady && (
          <CandyButton tone="pink" size="md" onClick={() => onFavorite(card.kvId!)}>
            {t('research.card.favorite')}
          </CandyButton>
        )}
        {isReady && (
          <CandyButton tone="purple" size="lg" onClick={onStartQuiz}>
            {t('research.card.startQuiz')}
          </CandyButton>
        )}
        <CandyButton tone="green" size="md" variant="ghost" onClick={onBackToExplore}>
          {t('research.card.backToExplore')}
        </CandyButton>
      </div>
    </div>
  );
}
