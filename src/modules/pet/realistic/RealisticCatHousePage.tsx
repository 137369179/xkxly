import CatHousePage from '../CatHousePage';

/**
 * 写实猫 3D 页面（向前兼容包装器）
 * 已与「养猫乐园」统一合一，支持 2D/3D 无缝切换与全套宠物经济。
 */
export default function RealisticCatHousePage() {
  return <CatHousePage initialRealisticMode={true} />;
}
