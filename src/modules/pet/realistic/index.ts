/**
 * 写实猫 3D 组件包 (Realistic Cat 3D Package)
 * ------------------------------------------------------------
 * 统一导出入口，支持多种导入方式：
 *
 * // 方式一：默认导入（推荐）
 * import RealisticCat3D from '@/components/realistic-cat';
 *
 * // 方式二：命名导入
 * import { RealisticCat3D, RealisticCatScene } from '@/components/realistic-cat';
 *
 * // 方式三：按需导入子模块
 * import { createCatGeometry } from '@/modules/pet/realistic/CatGeometry';
 */

// 主组件
export { RealisticCat3D, default } from './RealisticCat3D';

// 场景渲染器
export { RealisticCatScene, detectDeviceCapability } from './CatScene';

// 几何体生成
export { createCatGeometry, updateCatColors, setFurDirtyLevel } from './CatGeometry';

// 动画系统
export {
  createProceduralAnimation,
  recommendAnimation,
  getAnimationsForExpression,
} from './CatAnimations';

// 类型定义
export type {
  CatBreed,
  CatExpression,
  CatAnimation,
  AccessoryType,
  CatAccessory,
  BreedConfig,
  RenderMode,
  DeviceCapability,
  CatState,
  RealisticCatProps,
} from './types';

// 常量配置
export { BREED_CONFIGS, CAT_ACCESSORIES } from './types';
