/**
 * 星星小屋（RewardStation）—— 星星经济的容器层
 * ----------------------------------------------------------------------------
 * 把 R161 的 `useRewardEconomy`（持久化）接到 R162 的两个可视化组件
 * （`StarBank` 星星银行 / `CapsuleMachine` 扭蛋机）上，构成孩子实际能用的界面。
 *
 * 这是闭环的收口处：R160 造了引擎、R161 造了持久化，但两者在 UI 上零消费 ——
 * 孩子既看不见攒了多少星星，也无法兑换或抽扭蛋。本组件让引擎产出第一次真正
 * 出现在孩子面前。
 *
 * **本轮在此抓到一个真实缺陷：**
 *   `rewardEconomy.drawCapsule()` 的 `seed` 默认值是 `1`（为单测可复现而设），
 *   `useRewardEconomy.drawCapsule(seed?)` 原样透传。也就是说容器若直接调用
 *   `api.drawCapsule()` 不传种子，**每一次都会抽到同一件奖品** —— 扭蛋机在
 *   生产环境会退化成「永远开出同一个东西」。
 *   修法：容器层注入种子来源（默认 `Date.now()`），并对外暴露 `seedSource`
 *   入参以便单测确定性驱动。不改动底层纯函数的默认行为，保持既有单测不变。
 *
 * 接入方式（三核心练习组件脱离 WIP 后，一行即可挂上）：
 *   <RewardStation open={open} onClose={() => setOpen(false)} masteredCount={n} />
 *
 * 约束：不触碰三核心学习逻辑；关闭态不渲染内容（零常驻开销）；键盘与读屏可达。
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CAPSULE_PRIZES, REWARD_CATALOG } from '@/game/rewardEconomy';
import { useUnifiedStars } from '@/game/useUnifiedStars';
import { CapsuleMachine } from './CapsuleMachine';
import { StarBank } from './StarBank';

type TabKey = 'bank' | 'capsule';

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'bank', label: '⭐ 星星银行' },
  { key: 'capsule', label: '🎁 扭蛋机' },
];

export interface RewardStationProps {
  /** 是否展开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 已掌握内容量（字 / 词 / 题），驱动奖励淡出阶段；不传视为 0 */
  masteredCount?: number;
  /**
   * 扭蛋随机种子来源。默认 `Date.now()` —— 见文件头缺陷说明：不传种子会
   * 让扭蛋永远开出同一件奖品。单测可注入固定序列以获得确定性。
   */
  seedSource?: () => number;
  /** 是否需要压低动效（无障碍 / 家长护眼场景） */
  reducedMotion?: boolean;
  className?: string;
}

/**
 * 星星小屋浮层：银行 / 扭蛋双页签，桥接持久化层。
 */
export function RewardStation({
  open,
  onClose,
  masteredCount = 0,
  seedSource,
  reducedMotion = false,
  className,
}: RewardStationProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<TabKey>('bank');

  // 统一星星出口：余额对齐成长荣誉馆（store 为真源），
  // 收入双写、支出双写、账本偏离由统一层自动校平。
  const economy = useUnifiedStars({ masteredCount });
  const seedOf = useCallback(
    () => (seedSource ? seedSource() : Date.now()),
    [seedSource],
  );

  // Escape 关闭 + 打开时把焦点移入面板（键盘 / 读屏用户不会迷失在背景里）
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="reward-station-backdrop"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#fdfbff] p-4 shadow-2xl outline-none${className ? ` ${className}` : ''}`}
        data-testid="reward-station"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-extrabold text-[#8f5bff]">
            🏠 星星小屋
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1ecfa] text-lg font-extrabold text-[#8f5bff] active:translate-y-[1px] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#8f5bff]/50"
            aria-label="关闭星星小屋"
            data-testid="reward-station-close"
          >
            ✕
          </button>
        </div>

        {/* 页签 */}
        <div className="mb-3 flex gap-2" role="tablist" aria-label="星星小屋">
          {TABS.map((item) => {
            const selected = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.key)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-extrabold transition-transform active:translate-y-[1px] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#8f5bff]/50${
                  selected ? ' bg-[#8f5bff] text-white shadow-[0_3px_0_#6a4fd0]' : ' bg-[#f1ecfa] text-[#8f5bff]'
                }`}
                data-testid={`reward-station-tab-${item.key}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 存储降级提示：仍可正常学习，只是进度不跨会话保留 —— 说清后果，不制造恐慌 */}
        {economy.degraded && (
          <p
            className="mb-3 rounded-2xl bg-[hsl(38_95%_92%)] p-2.5 text-xs leading-relaxed font-bold text-[#9a6b00]"
            role="status"
            aria-live="polite"
            data-testid="reward-station-degraded"
          >
            现在还能正常学习和玩扭蛋，只是这次攒的星星可能没法保存到下次打开。换一个浏览器窗口试试看吧！
          </p>
        )}

        {/* 账本校平告知：诚实告诉孩子余额为什么变了，增强数字可信度（R162 研究依据） */}
        {economy.notice && (
          <p
            className="mb-3 rounded-2xl bg-[hsl(205_90%_93%)] p-2.5 text-xs leading-relaxed font-bold text-[#16607f]"
            role="status"
            aria-live="polite"
            data-testid="reward-station-notice"
          >
            {economy.notice.message}
          </p>
        )}

        {/* 每日上限：认可式收尾，不是限制式提示（沿用持久化层的文案原则） */}
        {economy.earnedToday >= economy.dailyCap && (
          <p
            className="mb-3 rounded-2xl bg-[hsl(160_70%_92%)] p-2.5 text-xs font-bold text-[#2f7d63]"
            role="status"
            aria-live="polite"
            data-testid="reward-station-dailycap"
          >
            🌟 今天收集的星星够多啦！明天再来，还有更多惊喜等着你。
          </p>
        )}

        {tab === 'bank' ? (
          <StarBank
            balance={economy.available}
            earnedToday={economy.earnedToday}
            goal={economy.goal}
            catalog={REWARD_CATALOG}
            owned={economy.owned}
            onUnlock={economy.unlock}
            reducedMotion={reducedMotion}
          />
        ) : (
          <CapsuleMachine
            balance={economy.available}
            cost={REWARD_CATALOG[0].cost}
            pity={economy.pity}
            pityRemaining={economy.pityRemaining}
            odds={economy.odds}
            stats={economy.stats}
            collection={economy.collection}
            prizes={CAPSULE_PRIZES}
            onDraw={() => economy.draw(seedOf())}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
    </div>
  );
}

export default RewardStation;
