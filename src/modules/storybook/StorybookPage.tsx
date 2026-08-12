import { useState, useCallback } from 'react';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { stopSpeaking } from '@/lib/speech';
import { StorybookCreator } from './StorybookCreator';
import { StorybookShelf } from './StorybookShelf';
import { StorybookReader } from './StorybookReader';
import type { StoryBookData } from '@/lib/ai/prompts';
import type { StorybookTheme, StorybookStyle } from './types';

type Tab = 'create' | 'shelf';

const TAB_ITEMS: TabItem<Tab>[] = [
  { id: 'create', label: '创作', emoji: '✨' },
  { id: 'shelf', label: '书架', emoji: '📚' },
];

export default function StorybookPage() {
  const [tab, setTab] = useState<Tab>('create');
  const [readingBook, setReadingBook] = useState<{
    book: StoryBookData;
    theme: StorybookTheme;
    style: StorybookStyle;
    character: string;
  } | null>(null);

  const handleTabChange = useCallback((t: Tab) => {
    stopSpeaking();
    setTab(t);
  }, []);

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
    // 关闭后回到书架 tab（如果已保存的话），否则回到创作
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
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6">
      <PanelTitle
        emoji="📚"
        title="AI 绘本工坊"
        subtitle="选主题、选风格，小智帮你创作专属绘本"
        tone="purple"
      />

      <div className="mt-4">
        <Tabs items={TAB_ITEMS} value={tab} onChange={handleTabChange} tone="purple" />

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
      </div>
    </div>
  );
}
