/**
 * 路由级轻量骨架屏（P1-7）
 * ------------------------------------------------------------------
 * 取代路由切换时的全屏居中 Loading：
 *  - 用与典型页面一致的内容骨架（页头 + 卡片网格 + 长条）占位，
 *    布局稳定、无大块跳动，降低 CLS 与感知延迟；
 *  - 使用 Tailwind animate-pulse 微光，无额外 JS/动画开销；
 *  - 仅作用于内容区（TopBar / Sidebar / BottomTabs 在 Suspense 外，不受影响）。
 */
export function RouteSkeleton() {
  return (
    <div role="status" aria-label="页面加载中" className="space-y-5 py-2" aria-live="polite">
      {/* 页头骨架：图标 + 标题两行 */}
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-candy-purple/15" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded-full bg-candy-purple/20" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-candy-purple/10" />
        </div>
      </div>

      {/* 卡片网格骨架：占满内容区，模拟课程/游戏卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`card-${i}`}
            className="aspect-square animate-pulse rounded-[1.4rem] border-2 border-white bg-candy-pink/15"
          />
        ))}
      </div>

      {/* 长条骨架：模拟大按钮 / 面板 */}
      <div className="h-20 animate-pulse rounded-3xl border-2 border-white bg-candy-blue/15" />
      <div className="h-24 animate-pulse rounded-3xl border-2 border-white bg-candy-green/15" />
    </div>
  );
}
