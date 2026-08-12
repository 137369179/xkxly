/**
 * 写实猫 3D 主组件 (Realistic Cat 3D - Public API)
 * ------------------------------------------------------------
 * 对外暴露的统一入口，封装了完整的 3D 渲染管线：
 * 1. 自动设备能力检测 → 选择渲染模式
 * 2. 与现有 CatCompanion / CatHousePage 的 Props 接口兼容
 * 3. 支持渐进式加载（低多边形占位 → 高精度模型）
 * 4. 内置交互反馈（点击抚摸、动画切换）
 *
 * 使用方式（替换现有 CyberMasterCat3D）：
 * ```tsx
 * import { RealisticCat3D } from '@/components/realistic-cat';
 *
 * <RealisticCat3D
 *   size={220}
 *   breed="british_shorthair"
 *   expression="happy"
 *   hat="crown"
 *   envLighting="sunlight"
 *   onPet={handlePet}
 * />
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  CatBreed,
  CatExpression,
  CatAnimation,
  RealisticCatProps,
} from './types';
import { BREED_CONFIGS } from './types';
import { getAnimationsForExpression } from './CatAnimations';
import { RealisticCatScene } from './CatScene';

/** 默认 Props 值 */
const DEFAULT_PROPS = {
  size: 200,
  breed: 'british_shorthair' as CatBreed,
  expression: 'happy' as CatExpression,
  envLighting: 'indoor_warm' as const,
  autoRotate: false,
  showControls: true,
};

/**
 * 写实猫 3D 组件 (RealisticCat3D)
 *
 * 完整功能列表：
 * - 🐱 6 种猫咪品种（英短/暹罗/橘猫/布偶/缅因/折耳）
 * - 😺 10 种表情状态
 * - 🎬 15 种骨骼动画
 * - 👑 6 种配饰（皇冠/眼镜/蝴蝶结/领结/魔法帽/花环）
 * - 💡 4 种光照场景（暖阳/梦幻粉紫/荧光夜空/室内暖光）
 * - 📱 自适应渲染（完整3D / 优化3D / CSS降级）
 */
export function RealisticCat3D({
  size = DEFAULT_PROPS.size,
  breed = DEFAULT_PROPS.breed,
  expression = DEFAULT_PROPS.expression,
  hat,
  neck,
  envLighting = DEFAULT_PROPS.envLighting,
  autoRotate = DEFAULT_PROPS.autoRotate,
  showControls = DEFAULT_PROPS.showControls,
  onPet,
  onAnimationChange,
  className = '',
  forceRenderMode,
}: RealisticCatProps) {
  // 内部状态
  const [currentAnimation, setCurrentAnimation] = useState<CatAnimation>('idle_breathing');
  const [isInteracting, setIsInteracting] = useState(false);
  const [cleanliness] = useState(90); // 模拟清洁度

  // 获取当前品种配置
  const breedConfig = useMemo(() => BREED_CONFIGS[breed], [breed]);

  // 获取可用动画列表
  const availableAnimations = useMemo(
    () => getAnimationsForExpression(expression),
    [expression]
  );

  /** 处理点击抚摸 */
  const handlePet = useCallback(() => {
    setIsInteracting(true);
    onPet?.();

    // 切换到咕噜动画
    setCurrentAnimation('purr_vibrate');
    onAnimationChange?.('purr_vibrate');

    // 1.5秒后恢复默认动画
    setTimeout(() => {
      setIsInteracting(false);
      setCurrentAnimation('idle_breathing');
      onAnimationChange?.('idle_breathing');
    }, 1500);
  }, [onPet, onAnimationChange]);

  /** 手动切换动画 */
  const handleSwitchAnimation = useCallback(
    (anim: CatAnimation) => {
      setCurrentAnimation(anim);
      onAnimationChange?.(anim);

      // 非循环动画在播放完毕后自动回到 idle
      const nonLoopingAnims: CatAnimation[] = [
        'stretch_yawn',
        'jump_pounce',
        'roll_over',
        'sit_lick',
      ];
      if (nonLoopingAnims.includes(anim)) {
        const durations: Record<string, number> = {
          stretch_yawn: 3500,
          jump_pounce: 1200,
          roll_over: 3000,
          sit_lick: 4000,
        };
        setTimeout(() => {
          setCurrentAnimation('idle_breathing');
          onAnimationChange?.('idle_breathing');
        }, durations[anim] || 3000);
      }
    },
    [onAnimationChange]
  );

  return (
    <div className={`realistic-cat-3d-wrapper ${className}`}>
      {/* 3D 场景 */}
      <RealisticCatScene
        breed={breed}
        expression={expression}
        hat={hat}
        neck={neck}
        envLighting={envLighting}
        autoRotate={autoRotate && !isInteracting}
        showControls={showControls}
        cleanliness={cleanliness}
        onPet={handlePet}
        forceRenderMode={forceRenderMode}
        size={size}
      />

      {/* 动画控制面板（可选显示） */}
      {showControls && availableAnimations.length > 1 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {availableAnimations.map((anim) => (
            <button
              key={anim}
              onClick={() => handleSwitchAnimation(anim)}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                currentAnimation === anim
                  ? 'bg-pink-500 text-white border-pink-600 shadow-sm'
                  : 'bg-white text-pink-900 border-pink-200 hover:bg-pink-50'
              }`}
            >
              {ANIMATION_LABELS[anim] || anim}
            </button>
          ))}
        </div>
      )}

      {/* 品种信息标签 */}
      <div className="mt-1 text-center">
        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          🐱 {breedConfig.name} · {breedConfig.personality}
        </span>
      </div>
    </div>
  );
}

/** 动画名称中文标签映射 */
const ANIMATION_LABELS: Record<string, string> = {
  idle_breathing: '🌬️ 呼吸',
  idle_sitting: '🪑 坐姿',
  walk_cycle: '🚶 行走',
  run_cycle: '🏃 奔跑',
  sit_lick: '👅 舔毛',
  stretch_yawn: '🤸 伸懒腰',
  pounce_play: '🎯 扑击',
  roll_over: '🔄 打滚',
  beg_food: '🍽️ 讨食',
  groom_self: '🧹 梳理',
  tail_swish: '🌊 摇尾',
  ear_twitch: '👂 抖耳',
  jump_pounce: '⬆️ 跳跃',
  purr_vibrate: '💗 咕噜',
  fall_asleep: '💤 入睡',
};

// ========== 快捷导出 ==========

export { RealisticCatScene } from './CatScene';
export { detectDeviceCapability } from './CatScene';
export { createCatGeometry, updateCatColors, setFurDirtyLevel } from './CatGeometry';
export {
  createProceduralAnimation,
  recommendAnimation,
  getAnimationsForExpression,
} from './CatAnimations';
export type {
  CatBreed,
  CatExpression,
  CatAnimation,
  CatAccessory,
  BreedConfig,
  RenderMode,
  DeviceCapability,
  CatState,
  RealisticCatProps,
} from './types';
export { BREED_CONFIGS, CAT_ACCESSORIES } from './types';

export default RealisticCat3D;
