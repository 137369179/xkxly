/**
 * CyberMasterCat3D — 兼容包装层
 * 实际渲染委托给 FlatCat2D（统一风格二维动画猫咪）
 * 所有调用方接口不变，零改动
 */
import {
  FlatCat2D,
  type FlatCatColor,
  type PetTouchZone,
  type PetExpressionCategory,
  type PetActionCategory,
} from './FlatCat2D';

export interface CyberMasterCat3DProps {
  size?: number;
  action?: PetActionCategory;
  expression?: PetExpressionCategory;
  hat?: string;
  neck?: string;
  envLighting?: 'sunlight' | 'nebula' | 'starry';
  onPet?: (e: React.MouseEvent) => void;
  onInteractZone?: (zone: PetTouchZone, e: React.MouseEvent) => void;
  interactive?: boolean;
  className?: string;
}

/** envLighting → FlatCat2D 颜色方案映射 */
const lightingToColor: Record<string, FlatCatColor> = {
  sunlight: 'sunny-orange',
  nebula: 'candy-pink',
  starry: 'lavender',
};

export function CyberMasterCat3D({
  size = 220,
  action = 'idle',
  expression = 'happy',
  hat = 'crown',
  neck,
  envLighting = 'nebula',
  onPet,
  onInteractZone,
  interactive = true,
  className = '',
}: CyberMasterCat3DProps) {
  return (
    <FlatCat2D
      size={size}
      action={action}
      expression={expression}
      hat={hat}
      neck={neck}
      envLighting={envLighting}
      color={lightingToColor[envLighting] ?? 'candy-pink'}
      onPet={onPet}
      onInteractZone={onInteractZone}
      interactive={interactive}
      className={className}
    />
  );
}
