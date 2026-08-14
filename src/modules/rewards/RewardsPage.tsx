import GrowthMuseumPage from '@/modules/growth/GrowthMuseumPage';

/**
 * 奖励中心页面（向前兼容包装器）
 * 已统一收拢至「成长荣誉馆 - 星愿百宝箱」Tab。
 */
export default function RewardsPage() {
  return <GrowthMuseumPage initialTab="stickers" />;
}

