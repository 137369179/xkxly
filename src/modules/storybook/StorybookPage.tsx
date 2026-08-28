import { useState, useCallback, useEffect } from 'react';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { Panel, PageHeader } from '@/components/ui/Card';
import { stopSpeaking } from '@/lib/speech';
import { triggerHaptic } from '@/lib/sfx';
import { StorybookCreator } from './StorybookCreator';
import { StorybookShelf } from './StorybookShelf';
import { StorybookReader } from './StorybookReader';
import { StoryLibrarySection } from './StoryLibrarySection';
import { GradedBooksSection } from './components/GradedBooksSection';
import type { StoryBookData } from '@/lib/ai/prompts';
import type { StorybookTheme, StorybookStyle } from './types';
import { useTranslation } from '@/i18n/useTranslation';

export type StoryTab = 'graded' | 'create' | 'shelf' | 'library';

interface StorybookPageProps {
  defaultTab?: StoryTab;
}

const TAB_META = [
  { id: 'graded' as StoryTab, label: '🌟 洪恩分级阅读', emoji: '🌟' },
  { id: 'create' as StoryTab, labelKey: 'storybookPage.createTab', emoji: '✨' },
  { id: 'shelf' as StoryTab, labelKey: 'storybookPage.shelfTab', emoji: '📚' },
  { id: 'library' as StoryTab, labelKey: 'storylib.title', emoji: '🏰' },
];

export default function StorybookPage({ defaultTab = 'graded' }: StorybookPageProps) {
  const { t } = useTranslation();
  const tabItems: TabItem<StoryTab>[] = TAB_META.map((it) => ({
    id: it.id,
    label: it.label ?? (it.id === 'library' ? (t('storylib.title') || '故事分馆') : it.labelKey ? t(it.labelKey) : it.id),
    emoji: it.emoji,
  }));
  const [tab, setTab] = useState<StoryTab>(defaultTab);
  const [readingBook, setReadingBook] = useState<{
    book: StoryBookData;
    theme: StorybookTheme;
    style: StorybookStyle;
    character: string;
  } | null>(null);

  const handleTabChange = useCallback((t: StoryTab) => {
    stopSpeaking();
    triggerHaptic(20);
    setTab(t);
  }, []);

  // 全局键盘快捷键响应 (1-4 切换专区)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (readingBook) return;
      if (e.key === '1') {
        e.preventDefault();
        handleTabChange('graded');
      } else if (e.key === '2') {
        e.preventDefault();
        handleTabChange('create');
      } else if (e.key === '3') {
        e.preventDefault();
        handleTabChange('shelf');
      } else if (e.key === '4') {
        e.preventDefault();
        handleTabChange('library');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTabChange, readingBook]);

  // 切到阅读器
  const handleCreated = useCallback(
    (book: StoryBookData, theme: StorybookTheme, style: StorybookStyle, character: string) => {
      setReadingBook({ book, theme, style, character });
    },
    [],
  );

  // 阅读器关闭
  const handleReaderClose = useCallback(() => {
    setReadingBook(null);
    setTab('shelf');
  }, []);

  // 如果正在阅读，直接全屏展示
  if (readingBook) {
    return (
      <StorybookReader
        book={readingBook.book}
        theme={readingBook.theme}
        style={readingBook.style}
        character={readingBook.character}
        onClose={handleReaderClose}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        iconType="storybook"
        title="📖 奇妙故事岛"
        subtitle="洪恩分级自集字阅读 · AI 绘本个性化创作 · 经典绘本书架 · 故事分馆"
        tone="pink"
      />

      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-pink-900 font-bold bg-pink-50/90 px-3 py-1 rounded-xl border border-pink-200">
          ⌨️ 键盘快捷操作：数字 1-4 切换专区 (分级阅读/AI创作/绘本书架/故事分馆)
        </span>
      </div>

      <div>
        <Tabs items={tabItems} value={tab} onChange={handleTabChange} tone="pink" />

        {tab === 'graded' && (
          <Panel>
            <GradedBooksSection />
          </Panel>
        )}

        {tab === 'create' && (
          <Panel>
            <StorybookCreator onCreated={handleCreated} />
          </Panel>
        )}

        {tab === 'shelf' && (
          <Panel>
            <StorybookShelf />
          </Panel>
        )}

        {tab === 'library' && (
          <Panel>
            <StoryLibrarySection />
          </Panel>
        )}
      </div>
    </div>
  );
}
