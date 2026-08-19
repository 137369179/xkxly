import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useDiscoveries, useResearchNotes, useStore } from '@/store/useStore';
import { navigate } from '@/lib/router';
import { speak } from '@/lib/speech';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { listContent, type AiContentItem } from '@/lib/ai/contentClient';
import { safeGetJSON } from '@/lib/safeStorage';
import { RESEARCH_TOPICS } from '@/lib/research/researchTopics';

/** 与 KnowledgeCardPanel 共用本地卡片缓存（离线兜底画廊匹配收藏） */
const CARD_CACHE_KEY = 'research-card-cache';

interface CardCacheItem {
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

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * F5 发现画廊（Sprint 3 · Epic F2）
 * ------------------------------------------------------------------
 * 回看孩子收藏的 AI 知识卡与本地研究笔记（UX 规格 §4.2）。
 * 数据源：
 *   - 收藏卡：Progress.discoveries（kvId 数组，独立 discoverCard action，不污染 practice）
 *   - 展示：listContent 拉 KV + 本地卡片缓存离线兜底（F5 离线可读）
 *   - 笔记：Progress.researchNotes（按主题）
 * 铁律：
 *   - 收藏/笔记读写全部走 _applyProgress 统一徽章检测（F19）
 *   - 画廊只展示行为量（收藏数/笔记数），不展示正确率（R8）
 */
export default function DiscoveryGallery() {
  const { t } = useTranslation();
  const discoveriesRaw = useDiscoveries();
  const researchNotes = useResearchNotes();
  const removeDiscovery = useStore((s) => s.removeDiscovery);
  const setResearchNote = useStore((s) => s.setResearchNote);
  const removeResearchNote = useStore((s) => s.removeResearchNote);

  const [items, setItems] = useState<AiContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const discoveries = useMemo(() => discoveriesRaw ?? [], [discoveriesRaw]);
  const noteEntries = useMemo(
    () => Object.entries(researchNotes ?? {}).filter(([, v]) => v?.trim()),
    [researchNotes],
  );

  // —— 拉取 KV 收藏卡（列表按 id 匹配 discoveries）——
  useEffect(() => {
    let alive = true;
    void listContent('all', 60).then((list) => {
      if (!alive) return;
      const set = new Set(discoveries);
      setItems(list.filter((i) => i && set.has(i.id)));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [discoveries]);

  // —— 离线兜底：本地卡片缓存中匹配收藏（KV 不可达时仍可读，F5）——
  const cachedDiscoveries = useMemo(() => {
    const set = new Set(discoveries);
    return readCardCache().filter((c) => c.kvId && set.has(c.kvId));
  }, [discoveries]);

  const handleSpeak = (text: string | string[], id: string) => {
    sfxTap();
    const body = typeof text === 'string' ? text : text.join('。');
    if (readingId === id) {
      setReadingId(null);
      return;
    }
    setReadingId(id);
    void speak(body, { lang: 'zh-CN', module: 'story' }).finally(() => setReadingId(null));
  };

  const handleUnfavorite = (kvId: string) => {
    sfxTap();
    removeDiscovery(kvId);
  };

  const startEditNote = (topicId: string, current: string) => {
    setEditingNote(topicId);
    setNoteDraft(current);
  };

  const saveNote = (topicId: string) => {
    sfxStar();
    setResearchNote(topicId, noteDraft.trim());
    setEditingNote(null);
  };

  const removeNote = (topicId: string) => {
    sfxTap();
    removeResearchNote(topicId);
  };

  const hasAnything = items.length > 0 || cachedDiscoveries.length > 0 || noteEntries.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="🗂️"
        title={t('research.gallery.title')}
        subtitle={t('research.gallery.subtitle')}
        tone="purple"
      />

      {/* 行为量总览（R8：只展示行为量，零正确率） */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border-4 border-white bg-gradient-to-br from-purple-100 to-pink-50 p-4 text-center shadow-fluffy">
          <div className="text-3xl">⭐</div>
          <div className="mt-1 text-2xl font-black tabular-nums text-candy-purple-deep">{discoveries.length}</div>
          <div className="mt-0.5 text-xs font-bold text-ink-soft">{t('research.gallery.savedCards')}</div>
        </div>
        <div className="rounded-3xl border-4 border-white bg-gradient-to-br from-amber-100 to-orange-50 p-4 text-center shadow-fluffy">
          <div className="text-3xl">📝</div>
          <div className="mt-1 text-2xl font-black tabular-nums text-candy-orange-deep">{noteEntries.length}</div>
          <div className="mt-0.5 text-xs font-bold text-ink-soft">{t('research.gallery.notes')}</div>
        </div>
      </div>

      {/* 收藏的知识卡 */}
      <Panel>
        <PanelTitle emoji="⭐" title={t('research.gallery.savedCards')} tone="pink" />
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="animate-bounce text-3xl">🗂️</span>
          </div>
        ) : items.length === 0 && cachedDiscoveries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="text-5xl">🔖</span>
            <p className="text-sm font-bold text-ink-soft">{t('research.gallery.emptyCards')}</p>
            <p className="text-xs font-bold text-ink-soft">{t('research.gallery.emptyCardsHint')}</p>
            <CandyButton tone="purple" size="md" onClick={() => navigate('research')}>
              {t('research.gallery.goResearch')}
            </CandyButton>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {/* KV 在线卡 */}
            {items.map((item, i) => (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                className="mb-3 overflow-hidden rounded-[1.8rem] border-4 border-white bg-gradient-to-br from-purple-100 via-pink-50 to-amber-100 shadow-fluffy"
              >
                <div className="flex items-start justify-between gap-3 px-5 pt-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-ink">{item.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {item.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                          #{tag}
                        </span>
                      ))}
                      <span className="text-[10px] font-bold text-ink-soft">· {formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={t('research.gallery.listen')}
                      onClick={() => handleSpeak(item.content, item.id)}
                      className={cn(
                        'no-select rounded-full px-3 py-2 text-lg shadow-sm transition-transform active:scale-90',
                        readingId === item.id ? 'bg-candy-purple-deep text-white' : 'bg-white text-candy-purple-deep',
                      )}
                    >
                      {readingId === item.id ? '🔊' : '🔈'}
                    </button>
                    <button
                      type="button"
                      aria-label={t('research.gallery.unfavorite')}
                      onClick={() => handleUnfavorite(item.id)}
                      className="no-select rounded-full bg-white px-2.5 py-2 text-base text-candy-pink-deep shadow-sm transition-transform active:scale-90"
                    >
                      ⭐
                    </button>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3">
                  {typeof item.content === 'string' ? (
                    <p className="whitespace-pre-line text-[15px] font-bold leading-relaxed text-ink">{item.content}</p>
                  ) : (
                    <ol className="space-y-2">
                      {item.content.map((line, li) => (
                        <li key={li} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ink">
                          <span className="mt-0.5 shrink-0 text-base">{['🌟', '✨', '🎈'][li % 3]}</span>
                          <span className="leading-relaxed">{line}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </motion.article>
            ))}
            {/* 离线缓存兜底卡（KV 不可达时仍显示，F5） */}
            {cachedDiscoveries
              .filter((c) => !items.some((i) => i.id === c.kvId))
              .map((c, i) => (
                <motion.article
                  key={c.kvId}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.4) }}
                  className="mb-3 overflow-hidden rounded-[1.8rem] border-4 border-white bg-gradient-to-br from-slate-50 to-purple-50 shadow-fluffy"
                >
                  <div className="flex items-start justify-between gap-3 px-5 pt-4">
                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-ink">{c.title}</h2>
                      <span className="text-[10px] font-bold text-ink-soft">{t('research.gallery.offlineTag')}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={t('research.gallery.listen')}
                        onClick={() => handleSpeak(c.content, c.kvId!)}
                        className={cn(
                          'no-select rounded-full px-3 py-2 text-lg shadow-sm transition-transform active:scale-90',
                          readingId === c.kvId ? 'bg-candy-purple-deep text-white' : 'bg-white text-candy-purple-deep',
                        )}
                      >
                        {readingId === c.kvId ? '🔊' : '🔈'}
                      </button>
                      <button
                        type="button"
                        aria-label={t('research.gallery.unfavorite')}
                        onClick={() => c.kvId && handleUnfavorite(c.kvId)}
                        className="no-select rounded-full bg-white px-2.5 py-2 text-base text-candy-pink-deep shadow-sm transition-transform active:scale-90"
                      >
                        ⭐
                      </button>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-3">
                    {typeof c.content === 'string' ? (
                      <p className="whitespace-pre-line text-[15px] font-bold leading-relaxed text-ink">{c.content}</p>
                    ) : (
                      <ol className="space-y-2">
                        {c.content.map((line, li) => (
                          <li key={li} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ink">
                            <span className="mt-0.5 shrink-0 text-base">{['🌟', '✨', '🎈'][li % 3]}</span>
                            <span className="leading-relaxed">{line}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </motion.article>
              ))}
          </AnimatePresence>
        )}
      </Panel>

      {/* 研究笔记（F6） */}
      <Panel>
        <PanelTitle emoji="📝" title={t('research.gallery.notes')} subtitle={t('research.gallery.notesHint')} tone="orange" />
        {noteEntries.length === 0 ? (
          <p className="py-6 text-center text-sm font-bold text-ink-soft">✨ {t('research.gallery.emptyNotes')}</p>
        ) : (
          <div className="space-y-3">
            {noteEntries.map(([topicId, text]) => {
              const topic = RESEARCH_TOPICS.find((x) => x.id === topicId);
              const isEditing = editingNote === topicId;
              return (
                <div key={topicId} className="rounded-2xl border-2 border-white bg-gradient-to-r from-amber-50 to-yellow-50 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-candy-orange-deep">
                      {topic?.emoji ?? '🔬'} {t(`research.topic.${topicId}.label`)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            aria-label={t('research.gallery.editNote')}
                            onClick={() => startEditNote(topicId, text)}
                            className="no-select rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink-soft shadow-sm transition-transform active:scale-90"
                          >
                            ✏️ {t('research.gallery.edit')}
                          </button>
                          <button
                            type="button"
                            aria-label={t('research.gallery.deleteNote')}
                            onClick={() => removeNote(topicId)}
                            className="no-select rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink-soft shadow-sm transition-transform active:scale-90"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        rows={2}
                        maxLength={120}
                        className="w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-amber-400"
                        aria-label={t('research.gallery.noteInput')}
                      />
                      <div className="flex gap-2">
                        <CandyButton tone="green" size="sm" onClick={() => saveNote(topicId)}>
                          {t('research.gallery.save')}
                        </CandyButton>
                        <CandyButton tone="orange" size="sm" variant="ghost" onClick={() => setEditingNote(null)}>
                          {t('research.gallery.cancel')}
                        </CandyButton>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-line text-sm font-bold leading-relaxed text-ink">{text}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {!hasAnything && timerRef.current == null && (
        <p className="text-center text-xs font-bold text-ink-soft">{t('research.gallery.emptyAll')}</p>
      )}
    </div>
  );
}
