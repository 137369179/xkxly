import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { useProfilesStore } from '@/store/useProfilesStore';
import { speak } from '@/lib/speech';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { generateContent, listContent, type AiContentItem, type AiContentType } from '@/lib/ai/contentClient';

const TYPES: { id: AiContentType; emoji: string; titleKey: string }[] = [
  { id: 'story', emoji: '🌙', titleKey: 'content.tab.story' },
  { id: 'riddle', emoji: '🤔', titleKey: 'content.tab.riddle' },
  { id: 'science', emoji: '🔬', titleKey: 'content.tab.science' },
];

const TYPE_META: Record<AiContentType, { tone: string; bg: string }> = {
  story: { tone: 'text-candy-purple-deep', bg: 'from-purple-50 to-pink-50' },
  riddle: { tone: 'text-candy-orange-deep', bg: 'from-amber-50 to-yellow-50' },
  science: { tone: 'text-candy-blue-deep', bg: 'from-sky-50 to-cyan-50' },
  explainer: { tone: 'text-candy-blue-deep', bg: 'from-sky-50 to-cyan-50' },
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ContentStationPage() {
  const { t } = useTranslation();
  const tickTime = useStore((s) => s.tickTime);
  const ageRange = useProfilesStore((s) => s.meta[s.activeProfileId]?.ageRange ?? '7-8');
  const [tab, setTab] = useState<AiContentType>('story');
  const [items, setItems] = useState<AiContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [readingId, setReadingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (type: AiContentType | 'all') => {
    setLoading(true);
    const list = await listContent(type, 8);
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load('all');
  }, [load]);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown > 0]);

  const handleGenerate = async () => {
    sfxStar();
    setGenError('');
    setGenerating(true);
    const res = await generateContent(tab, ageRange);
    setGenerating(false);
    if (res.cooldown) {
      setCooldown(res.cooldown);
      return;
    }
    if (!res.ok) {
      setGenError(res.error || t('content.genFail'));
      return;
    }
    if (res.item) {
      setItems((prev) => [res.item!, ...prev.filter((i) => i.id !== res.item!.id)]);
    }
  };

  const handleSpeak = (item: AiContentItem) => {
    sfxTap();
    const text =
      typeof item.content === 'string'
        ? item.content
        : item.content.join('。');
    if (readingId === item.id) {
      setReadingId(null);
      return;
    }
    setReadingId(item.id);
    void speak(text, { lang: 'zh-CN', module: 'story' }).finally(() => setReadingId(null));
    tickTime(5);
  };

  const visible = tab === 'story' ? items.filter((i) => i.type === 'story')
    : tab === 'riddle' ? items.filter((i) => i.type === 'riddle')
    : items.filter((i) => i.type === 'science');

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="📡"
        title={t('content.title')}
        subtitle={t('content.subtitle')}
        tone="purple"
      />

      {/* 类型切换 */}
      <div className="flex gap-2">
        {TYPES.map((ty) => (
          <button
            key={ty.id}
            type="button"
            onClick={() => {
              sfxTap();
              setTab(ty.id);
            }}
            className={cn(
              'no-select flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 text-sm font-extrabold shadow-sm transition-transform active:scale-95',
              tab === ty.id
                ? 'border-pink-400 bg-gradient-to-r from-pink-500 to-rose-400 text-white'
                : 'border-pink-200 bg-white text-ink-soft',
            )}
          >
            <span className="text-lg">{ty.emoji}</span>
            {t(ty.titleKey)}
          </button>
        ))}
      </div>

      {/* 生成区 */}
      <div className="rounded-[1.8rem] border-4 border-white bg-gradient-to-r from-purple-100 via-pink-50 to-amber-100 p-4 text-center shadow-fluffy">
        <p className="mb-3 text-sm font-extrabold text-ink-soft">
          {t('content.genHint')}
        </p>
        <CandyButton
          tone="purple"
          size="lg"
          onClick={() => void handleGenerate()}
          disabled={generating || cooldown > 0}
        >
          {generating ? `✨ ${t('content.generating')}` : cooldown > 0 ? `⏳ ${cooldown}s` : `✨ ${t('content.generate')}`}
        </CandyButton>
        {genError && <p className="mt-2 text-xs font-bold text-candy-orange-deep">{genError}</p>}
      </div>

      {/* 内容列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="animate-bounce text-3xl">📡</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-5xl">{TYPES.find((x) => x.id === tab)?.emoji}</span>
            <p className="text-sm font-bold text-ink-soft">{t('content.empty')}</p>
            <p className="text-xs font-bold text-ink-soft">{t('content.emptyHint')}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visible.map((item, i) => (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                className={cn(
                  'overflow-hidden rounded-[1.8rem] border-4 border-white bg-gradient-to-br shadow-fluffy',
                  TYPE_META[item.type]?.bg ?? 'from-white to-pink-50',
                )}
              >
                <div className="flex items-start justify-between gap-3 px-5 pt-4">
                  <div>
                    <h2 className="text-lg font-black text-ink">{item.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {item.tags?.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-ink-soft">
                          #{tag}
                        </span>
                      ))}
                      <span className="text-xs font-bold text-ink-soft">· {formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={t('content.listen')}
                    onClick={() => handleSpeak(item)}
                    className={cn(
                      'no-select shrink-0 rounded-full px-3 py-2 text-lg shadow-sm transition-transform active:scale-90',
                      readingId === item.id ? 'bg-candy-purple-deep text-white' : 'bg-white text-candy-purple-deep',
                    )}
                  >
                    {readingId === item.id ? '🔊' : '🔈'}
                  </button>
                </div>

                <div className="px-5 pb-5 pt-3">
                  {typeof item.content === 'string' ? (
                    <p className="whitespace-pre-line text-[15px] font-bold leading-relaxed text-ink">
                      {item.content}
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {item.content.map((line, li) => (
                        <li
                          key={li}
                          className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ink"
                        >
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
      </div>
    </div>
  );
}
