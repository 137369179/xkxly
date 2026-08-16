import StorybookPage from '@/modules/storybook/StorybookPage';

/**
 * 故事馆页面（已与绘本工坊合并为统一「奇妙故事岛」）
 * 保持向前兼容，默认进入「故事分馆」Tab
 */
export default function StoryLibraryPage() {
  return <StorybookPage defaultTab="library" />;
}
