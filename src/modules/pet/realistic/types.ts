/**
 * 写实猫 3D 组件类型定义 (Realistic Cat 3D Type Definitions)
 * ------------------------------------------------------------
 * 猫咪品种、表情、动画状态、配件、渲染模式等核心类型
 */

/** 猫咪品种定义 */
export type CatBreed =
  | 'british_shorthair'   // 英短蓝猫（沉稳·语文喵）
  | 'siamese'             // 暹罗猫（聪明锐利·数学喵）
  | 'ginger'              // 橘猫（活泼·拼音喵）
  | 'ragdoll'             // 布偶猫（优雅·科学喵）
  | 'mainecoon'           // 缅因猫（威武·探险喵）
  | 'scottish_fold';      // 折耳猫（可爱·通用）

/** 表情状态 */
export type CatExpression =
  | 'happy'     // 开心（耳朵竖起，眼睛明亮，尾巴轻摇）
  | 'cute'      // 萌萌（歪头，吐舌，大眼睛）
  | 'thinking'  // 思考（歪头，一只耳下垂，眼神聚焦）
  | 'sleepy'    // 困倦（半闭眼，身体放松，呼吸缓慢）
  | 'love'      // 喜爱（爱心眼/眯眼，身体前倾蹭人）
  | 'excited'   // 兴奋（耳朵前倾，瞳孔放大，尾巴竖直抖动）
  | 'hungry'    // 饥饿（耷拉耳朵，眼神无光，蹭食盆动作）
  | 'dirty'     // 脏脏（毛发凌乱，材质粗糙度增加）
  | 'angry'     // 生气（耳朵后压，瞳孔收缩，炸毛）
  | 'scared'    // 害怕（飞机耳，身体蜷缩，瞳孔放大）；

/** 动画动作 */
export type CatAnimation =
  | 'idle_breathing'   // 待机呼吸（默认循环）
  | 'idle_sitting'     // 坐姿待机
  | 'walk_cycle'       // 四足行走循环
  | 'run_cycle'        // 奔跑循环
  | 'sit_lick'         // 坐下舔毛
  | 'stretch_yawn'     // 伸懒腰打哈欠
  | 'pounce_play'      // 扑击玩耍
  | 'roll_over'        // 翻肚皮打滚
  | 'beg_food'         // 蹭食盆乞食
  | 'groom_self'       // 自我梳理
  | 'tail_swish'       // 尾巴摆动
  | 'ear_twitch'       // 耳朵抖动
  | 'jump_pounce'      // 跳跃扑击
  | 'purr_vibrate'     // 咕噜震动（高频微颤）
  | 'fall_asleep'      // 入睡（渐慢呼吸→静止）；

/** 配件类型 */
export type AccessoryType = 'hat' | 'neck' | 'collar' | 'glasses';

/** 配件定义 */
export interface CatAccessory {
  id: string;
  name: string;
  emoji: string;
  type: AccessoryType;
  /** 3D 模型路径（可选，默认用几何体模拟） */
  modelPath?: string;
  /** 配件颜色 */
  color?: string;
}

/** 预设配件库 */
export const CAT_ACCESSORIES: Record<string, CatAccessory> = {
  crown: { id: 'crown', name: '学霸皇冠', emoji: '👑', type: 'hat', color: '#FFD700' },
  glasses: { id: 'glasses', name: '读书眼镜', emoji: '📚', type: 'glasses', color: '#333333' },
  bow: { id: 'bow', name: '粉色蝴蝶结', emoji: '🎀', type: 'neck', color: '#FF69B4' },
  tie: { id: 'tie', name: '绅士领结', emoji: '👔', type: 'collar', color: '#1a1a2e' },
  wizard_hat: { id: 'wizard_hat', name: '魔法师帽', emoji: '🧙', type: 'hat', color: '#4B0082' },
  flower_collar: { id: 'flower_collar', name: '花环项圈', emoji: '🌸', type: 'collar', color: '#FFB7C5' },
};

/** 猫咪品种配置 */
export interface BreedConfig {
  name: string;           // 中文名
  nameEn: string;         // 英文名
  primaryColor: string;   // 主色（十六进制）
  secondaryColor: string; // 辅色（肚皮、口鼻等）
  eyeColor: string;       // 眼睛颜色
  noseColor: string;      // 鼻子颜色
  pawPadColor: string;    // 肉垫颜色
  furLength: 'short' | 'medium' | 'long';
  bodyScale: number;      // 身体比例 (0.8-1.2)
  earShape: 'round' | 'pointed' | 'folded';
  tailLength: 'short' | 'normal' | 'long';
  personality: string;    // 性格描述
}

/** 品种配置表 */
export const BREED_CONFIGS: Record<CatBreed, BreedConfig> = {
  british_shorthair: {
    name: '英短蓝猫',
    nameEn: 'British Shorthair',
    primaryColor: '#5D8AA8',
    secondaryColor: '#F5F5DC',
    eyeColor: '#FFA500',
    noseColor: '#FFB6C1',
    pawPadColor: '#FF6B6B',
    furLength: 'short',
    bodyScale: 1.05,
    earShape: 'round',
    tailLength: 'short',
    personality: '沉稳温和，适合陪伴学习',
  },
  siamese: {
    name: '暹罗猫',
    nameEn: 'Siamese',
    primaryColor: '#F5F5DC',
    secondaryColor: '#D2B48C',
    eyeColor: '#00CED1',
    noseColor: '#DEB887',
    pawPadColor: '#CD853F',
    furLength: 'short',
    bodyScale: 0.95,
    earShape: 'pointed',
    tailLength: 'long',
    personality: '聪明机敏，逻辑思维强',
  },
  ginger: {
    name: '橘猫',
    nameEn: 'Ginger Cat',
    primaryColor: '#FF8C00',
    secondaryColor: '#FFEFD5',
    eyeColor: '#32CD32',
    noseColor: '#FFA07A',
    pawPadColor: '#FF6347',
    furLength: 'short',
    bodyScale: 1.15,
    earShape: 'round',
    tailLength: 'normal',
    personality: '活泼好动，充满好奇心',
  },
  ragdoll: {
    name: '布偶猫',
    nameEn: 'Ragdoll',
    primaryColor: '#E6E6FA',
    secondaryColor: '#FFFFFF',
    eyeColor: '#4169E1',
    noseColor: '#FFC0CB',
    pawPadColor: '#DDA0DD',
    furLength: 'long',
    bodyScale: 1.1,
    earShape: 'round',
    tailLength: 'long',
    personality: '温顺优雅，善解人意',
  },
  mainecoon: {
    name: '缅因猫',
    nameEn: 'Maine Coon',
    primaryColor: '#8B4513',
    secondaryColor: '#D2691E',
    eyeColor: '#228B22',
    noseColor: '#CD853F',
    pawPadColor: '#8B0000',
    furLength: 'long',
    bodyScale: 1.2,
    earShape: 'pointed',
    tailLength: 'long',
    personality: '威武勇敢，喜欢探险',
  },
  scottish_fold: {
    name: '折耳猫',
    nameEn: 'Scottish Fold',
    primaryColor: '#FFC0CB',
    secondaryColor: '#FFF0F5',
    eyeColor: '#8B008B',
    noseColor: '#FFB6C1',
    pawPadColor: '#DB7093',
    furLength: 'short',
    bodyScale: 0.9,
    earShape: 'folded',
    tailLength: 'normal',
    personality: '安静甜美，惹人怜爱',
  },
};

/** 渲染模式 */
export type RenderMode =
  | 'full_3d'          // 完整 Three.js PBR 渲染（桌面端首选）
  | 'optimized_3d'     // 优化版 3D（减少面数和光影计算）
  | 'css_fallback'     // CSS/SVG 降级方案（低端设备）
  | 'splat';           // 高斯溅射（实验性，需 GPU 支持）

/** 设备能力检测结果 */
export interface DeviceCapability {
  renderMode: RenderMode;
  webgl2: boolean;
  maxTextureSize: number;
  gpuTier: 'low' | 'medium' | 'high';
  supportsInstancing: boolean;
  supportsFloatTextures: boolean;
}

/** 猫咪完整状态（与现有养成系统对接） */
export interface CatState {
  breed: CatBreed;
  expression: CatExpression;
  currentAnimation: CatAnimation;
  accessories: {
    hat?: string;
    neck?: string;
    collar?: string;
    glasses?: string;
  };
  /** 养成系统数值（0-100） */
  stats: {
    affection: number;   // 亲密度
    fullness: number;    // 饱腹度
    cleanliness: number; // 清洁度
    energy: number;      // 活力值
  };
  /** 光照场景 */
  envLighting: 'sunlight' | 'nebula' | 'starry' | 'indoor_warm';
}

/** 组件 Props */
export interface RealisticCatProps {
  /** 显示尺寸（像素） */
  size?: number;
  /** 猫咪品种 */
  breed?: CatBreed;
  /** 当前表情 */
  expression?: CatExpression;
  /** 头部配饰 ID */
  hat?: string;
  /** 颈部配饰 ID */
  neck?: string;
  /** 光照环境 */
  envLighting?: CatState['envLighting'];
  /** 是否自动旋转展示 */
  autoRotate?: boolean;
  /** 是否显示交互提示 */
  showControls?: boolean;
  /** 点击回调 */
  onPet?: () => void;
  /** 动画切换回调 */
  onAnimationChange?: (anim: CatAnimation) => void;
  /** 自定义类名 */
  className?: string;
  /** 渲染模式（可选，默认自动检测） */
  forceRenderMode?: RenderMode;
}
