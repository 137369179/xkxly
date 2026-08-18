/**
 * 写实猫 3D 场景渲染器 (Realistic Cat 3D Scene Renderer)
 * ------------------------------------------------------------
 * 基于 @react-three/fiber + @react-three/drei 的完整场景：
 * 1. PBR 光照系统（环境光 + 方向光 + 补光）
 * 2. HDRI 环境贴图（四种光照场景）
 * 3. OrbitControls 交互控制
 * 4. 后处理（可选：景深、泛光）
 * 5. 自适应质量（设备检测 → 渲染参数调整）
 */

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, ContactShadows, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import type { CatBreed, CatExpression, RenderMode, DeviceCapability } from './types';
import { createCatGeometry, setFurDirtyLevel } from './CatGeometry';
import { useTranslation } from '@/i18n/useTranslation';
// ========== 子组件 ==========

/** 加载进度指示器 */
function Loader() {
  const { progress } = useProgress();
  const { t: tr } = useTranslation();
  return (
    <Html center>
      <div style={{
        width: 120,
        height: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <svg viewBox="0 0 50 50" width={48} height={48}>
          <circle cx="25" cy="25" r="20" fill="none" stroke="#FF85A1" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${progress * 1.13} 113`} />
        </svg>
        <span style={{ fontSize: 12, color: '#FF69B4', fontWeight: 700 }}>
          {tr('cat.loading3d', { pct: Math.round(progress) })}
        </span>
      </div>
    </Html>
  );
}

/** 猫咪模型实例 (Cat Model Instance) */
interface CatModelProps {
  breed: CatBreed;
  expression: CatExpression;
  cleanliness: number;
  autoRotate?: boolean;
}
function CatModel({ breed, expression, cleanliness, autoRotate }: CatModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 创建猫咪几何体（仅一次）
  const catGroup = useMemo(() => createCatGeometry(breed), [breed]);

  // 呼吸动画时间
  const breathTime = useRef(0);

  // 每帧更新
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    breathTime.current += delta;

    // 自动旋转展示
    if (autoRotate) {
      groupRef.current.rotation.y += delta * 0.3;
    }

    // 表情驱动的微动画
    switch (expression) {
      case 'sleepy':
        // 缓慢呼吸，身体轻微起伏
        groupRef.current.position.y = Math.sin(breathTime.current * 1.5) * 0.02;
        break;
      case 'excited':
        // 高频微颤
        groupRef.current.position.y = Math.sin(breathTime.current * 10) * 0.01;
        break;
      case 'love':
        // 身体前倾
        groupRef.current.rotation.z = Math.sin(breathTime.current * 2) * 0.03;
        break;
      default:
        // 默认呼吸
        groupRef.current.scale.y = 1 + Math.sin(breathTime.current * 2) * 0.015;
        break;
    }
  });

  // 清洁度变化时更新毛发材质
  useEffect(() => {
    setFurDirtyLevel(catGroup, cleanliness);
  }, [cleanliness]);

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      <primitive object={catGroup} />
    </group>
  );
}

/** 场景光照 (Scene Lighting) */
interface SceneLightingProps {
  envLighting: 'sunlight' | 'nebula' | 'starry' | 'indoor_warm';
}
function SceneLighting({ envLighting }: SceneLightingProps) {
  // 根据光照场景调整光照参数
  const config = useMemo(() => {
    switch (envLighting) {
      case 'sunlight':
        return {
          ambient: 0.45, ambientColor: '#FFF8E7',
          dirIntensity: 1.4, dirColor: '#FFE4B5',
          dirPos: [5, 8, 4] as [number, number, number],
          envPreset: 'sunset' as const,
          shadow: true,
        };
      case 'nebula':
        return {
          ambient: 0.55, ambientColor: '#F0E6FF',
          dirIntensity: 0.9, dirColor: '#E6CCFF',
          dirPos: [-3, 6, 5] as [number, number, number],
          envPreset: 'night' as const,
          shadow: false,
        };
      case 'starry':
        return {
          ambient: 0.25, ambientColor: '#1a1a3e',
          dirIntensity: 0.3, dirColor: '#6699FF',
          dirPos: [2, 4, 8] as [number, number, number],
          envPreset: 'night' as const,
          shadow: false,
        };
      case 'indoor_warm':
      default:
        return {
          ambient: 0.65, ambientColor: '#FFF5E6',
          dirIntensity: 0.7, dirColor: '#FFDAB9',
          dirPos: [3, 5, 3] as [number, number, number],
          envPreset: 'apartment' as const,
          shadow: true,
        };
    }
  }, [envLighting]);

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={config.ambient} color={config.ambientColor} />

      {/* 主方向光（模拟太阳/灯光） */}
      <directionalLight
        position={config.dirPos}
        intensity={config.dirIntensity}
        color={config.dirColor}
        castShadow={config.shadow}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      {/* 补光（填充阴影区域） */}
      <pointLight position={[-3, 2, -2]} intensity={0.3} color="#FFFFFF" />
      <pointLight position={[2, -1, 3]} intensity={0.15} color="#FFC0CB" />

      {/* 半球光（天空色 + 地面色） */}
      <hemisphereLight
        args={['#dcecfa', '#8B4513', 0.3]}
      />
    </>
  );
}

/** 地面与阴影 (Ground & Shadows) */
function GroundPlane() {
  return (
    <>
      {/* 接收阴影的地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, 0]} receiveShadow>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.95} metalness={0.0} transparent opacity={0.6} />
      </mesh>

      {/* 接触阴影 */}
      <ContactShadows
        position={[0, -0.81, 0]}
        opacity={0.5}
        scale={2.5}
        blur={2.5}
        far={1.5}
        color="#333333"
      />
    </>
  );
}

// ========== 设备能力检测 ==========

/**
 * 检测设备 GPU 能力以选择合适的渲染模式
 */
export function detectDeviceCapability(): DeviceCapability {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

  if (!gl) {
    return {
      renderMode: 'css_fallback' as RenderMode,
      webgl2: false,
      maxTextureSize: 0,
      gpuTier: 'low',
      supportsInstancing: false,
      supportsFloatTextures: false,
    };
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : 'unknown';

  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const isWebGL2 = !!canvas.getContext('webgl2');

  // 根据 GPU 型号判断层级
  const rendererLower = renderer.toLowerCase();
  let gpuTier: 'low' | 'medium' | 'high' = 'low';

  if (
    rendererLower.includes('apple m') ||
    rendererLower.includes('nvidia') ||
    rendererLower.includes('radeon') ||
    rendererLower.includes('apple gpu')
  ) {
    gpuTier = 'high';
  } else if (
    rendererLower.includes('intel') &&
    (rendererLower.includes('iris') || rendererLower.includes('uhd'))
  ) {
    gpuTier = 'medium';
  }

  let renderMode: RenderMode = 'optimized_3d';
  if (gpuTier === 'high' && maxTexSize >= 8192 && isWebGL2) {
    renderMode = 'full_3d';
  } else if (!isWebGL2 || maxTexSize < 4096) {
    renderMode = 'css_fallback';
  }

  return {
    renderMode,
    webgl2: isWebGL2,
    maxTextureSize: maxTexSize,
    gpuTier,
    supportsInstancing: isWebGL2,
    supportsFloatTextures: isWebGL2 && gl.getExtension('OES_texture_float') !== null,
  };
}

// ========== 主组件 ==========

export interface RealisticCatSceneProps {
  /** 猫咪品种 */
  breed?: CatBreed;
  /** 表情 */
  expression?: CatExpression;
  /** 头部配饰 */
  hat?: string;
  /** 颈部配饰 */
  neck?: string;
  /** 光照场景 */
  envLighting?: 'sunlight' | 'nebula' | 'starry' | 'indoor_warm';
  /** 自动旋转 */
  autoRotate?: boolean;
  /** 显示控制面板 */
  showControls?: boolean;
  /** 清洁度 (0-100) */
  cleanliness?: number;
  /** 点击回调 */
  onPet?: () => void;
  /** 强制渲染模式 */
  forceRenderMode?: RenderMode;
  /** 容器样式 */
  className?: string;
  /** 容器尺寸 */
  size?: number;
}

/**
 * 写实猫 3D 场景主组件
 *
 * 使用方式:
 * ```tsx
 * <RealisticCatScene
 *   breed="british_shorthair"
 *   expression="happy"
 *   envLighting="sunlight"
 *   autoRotate
 *   onPet={() => { // 抚摸反馈 }}
 *   size={400}
 * />
 * ```
 */
export function RealisticCatScene({
  breed = 'british_shorthair',
  expression = 'happy',
  envLighting = 'indoor_warm',
  autoRotate = false,
  showControls = true,
  cleanliness = 90,
  onPet,
  forceRenderMode,
  className = '',
  size = 400,
}: RealisticCatSceneProps) {
  const { t: tr } = useTranslation();
  const [deviceCap, setDeviceCap] = useState<DeviceCapability | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    try {
      const cap = detectDeviceCapability();
      setDeviceCap(cap);
      if (forceRenderMode) {
        cap.renderMode = forceRenderMode;
      }
      if (cap.renderMode === 'css_fallback') {
        setUseFallback(true);
      }
    } catch {
      setUseFallback(true);
    }
  }, [forceRenderMode]);

  const handleClick = useCallback(() => {
    onPet?.();
  }, [onPet]);

  // CSS/SVG 降级方案
  if (useFallback || deviceCap?.renderMode === 'css_fallback') {
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        onClick={handleClick}
      >
        <FallbackCatView breed={breed} expression={expression} size={size} />
        {showControls && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-pink-500 bg-white/80 px-2 py-0.5 rounded-full">
            💡 {tr('cat.fallbackMode')}
          </div>
        )}
      </div>
    );
  }

  // 完整 Three.js 场景
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Canvas
        shadows={deviceCap?.gpuTier !== 'low'}
        camera={{ position: [0, 1.2, 4.5], fov: 40 }}
        gl={{
          antialias: deviceCap?.gpuTier !== 'low',
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={deviceCap?.gpuTier === 'low' ? 1 : Math.min(window.devicePixelRatio, 2)}
        onClick={handleClick}
        style={{ background: 'transparent' }}
      >
        <Loader />

        {/* 光照 */}
        <SceneLighting envLighting={envLighting} />

        {/*
          程序化环境光（室内暖调）。
          注意：这里刻意不使用 <Environment preset="..." />——drei 的 preset 会从
          raw.githack.com 拉取 *.hdr，既违反本站严格 CSP（connect-src 'self'），
          又让离线 PWA 与国内网络下的 3D 页面直接加载失败。改用 Lightformer 在本地
          实时烘一张 256px 立方环境贴图，零外部请求且只渲染一帧，开销可忽略。
        */}
        <Environment resolution={256} frames={1} environmentIntensity={0.6}>
          {/* 顶部主光：模拟天花板灯带 */}
          <Lightformer
            intensity={2.2}
            color="#fff6ea"
            rotation-x={Math.PI / 2}
            position={[0, 5, -2]}
            scale={[12, 12, 1]}
          />
          {/* 左侧冷补光：模拟窗户 */}
          <Lightformer
            intensity={1.1}
            color="#e6f0ff"
            rotation-y={Math.PI / 2}
            position={[-6, 1.5, 0]}
            scale={[10, 4, 1]}
          />
          {/* 右侧暖补光：模拟墙面反弹 */}
          <Lightformer
            intensity={0.9}
            color="#ffe9d2"
            rotation-y={-Math.PI / 2}
            position={[6, 1.5, 0]}
            scale={[10, 4, 1]}
          />
          {/* 环形高光：给毛发和眼睛一点点晶莹感 */}
          <Lightformer
            form="ring"
            intensity={1.4}
            color="#ffffff"
            position={[2.5, 3, 3]}
            scale={2.2}
          />
        </Environment>

        {/* 猫咪模型 */}
        <CatModel
          breed={breed}
          expression={expression}
          cleanliness={cleanliness}
          autoRotate={autoRotate}
        />

        {/* 地面阴影 */}
        <GroundPlane />

        {/* 相机控制器 */}
        {showControls && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={2}
            maxDistance={8}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.2}
            autoRotate={autoRotate}
            autoRotateSpeed={1.5}
            target={[0, 0.5, 0]}
          />
        )}
      </Canvas>

      {/* 设备信息调试（开发模式） */}
      {import.meta.env.DEV && deviceCap && (
        <div className="absolute top-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">
          GPU: {deviceCap.gpuTier} | Mode: {deviceCap.renderMode} | WebGL2: {deviceCap.webgl2 ? '✓' : '✗'}
        </div>
      )}
    </div>
  );
}

// ========== 降级方案组件 ==========

/** CSS/SVG 降级视图 */
function FallbackCatView({
  breed,
  expression,
  size,
}: {
  breed: CatBreed;
  expression: CatExpression;
  size: number;
}) {
  const colors = useMemo(() => {
    const map: Record<CatBreed, { primary: string; secondary: string; eye: string }> = {
      british_shorthair: { primary: '#5D8AA8', secondary: '#F5F5DC', eye: '#FFA500' },
      siamese: { primary: '#F5F5DC', secondary: '#D2B48C', eye: '#00CED1' },
      ginger: { primary: '#FF8C00', secondary: '#FFEFD5', eye: '#32CD32' },
      ragdoll: { primary: '#E6E6FA', secondary: '#FFFFFF', eye: '#4169E1' },
      mainecoon: { primary: '#8B4513', secondary: '#D2691E', eye: '#228B22' },
      scottish_fold: { primary: '#FFC0CB', secondary: '#FFF0F5', eye: '#8B008B' },
    };
    return map[breed];
  }, [breed]);

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fb-body" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="55%" stopColor={colors.primary} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.primary} />
        </radialGradient>
        <radialGradient id="fb-eye" cx="40%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor={colors.eye} />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
      </defs>

      {/* 阴影 */}
      <ellipse cx="100" cy="182" rx="60" ry="14" fill="#000000" opacity="0.15" />

      {/* 尾巴 */}
      <path d="M150 140 Q185 115 175 85 Q165 68 152 78"
        stroke={colors.primary} strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.85" />

      {/* 身体 */}
      <ellipse cx="100" cy="135" rx="52" ry="42" fill="url(#fb-body)" />
      <ellipse cx="100" cy="142" rx="32" ry="26" fill={colors.secondary} opacity="0.92" />

      {/* 后腿 */}
      <ellipse cx="68" cy="170" rx="14" ry="10" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" />
      <ellipse cx="132" cy="170" rx="14" ry="10" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" />

      {/* 前腿 */}
      <ellipse cx="72" cy="168" rx="12" ry="9" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" />
      <ellipse cx="128" cy="168" rx="12" ry="9" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" />

      {/* 肉垫 */}
      <circle cx="68" cy="170" r="4" fill="#ff5c7a" opacity="0.7" />
      <circle cx="132" cy="170" r="4" fill="#ff5c7a" opacity="0.7" />

      {/* 耳朵 */}
      <path d="M50 62 L22 20 Q42 22 68 42 Z" fill={colors.primary} opacity="0.85" />
      <path d="M49 56 L32 28 Q44 30 62 44 Z" fill="#FFB6C1" opacity="0.6" />
      <path d="M150 62 L178 20 Q158 22 132 42 Z" fill={colors.primary} opacity="0.85" />
      <path d="M151 56 L168 28 Q156 30 138 44 Z" fill="#FFB6C1" opacity="0.6" />

      {/* 头 */}
      <ellipse cx="100" cy="86" rx="54" ry="44" fill="url(#fb-body)" />

      {/* 高光 */}
      <ellipse cx="82" cy="66" rx="28" ry="16" fill="#FFFFFF" opacity="0.25" />

      {/* 腮红 */}
      <ellipse cx="52" cy="98" rx="10" ry="6" fill="#FF3366" opacity="0.25" />
      <ellipse cx="148" cy="98" rx="10" ry="6" fill="#FF3366" opacity="0.25" />

      {/* 眼睛 */}
      {expression === 'love' ? (
        <>
          <text x="52" y="96" fontSize="24">😻</text>
          <text x="118" y="96" fontSize="24">😻</text>
        </>
      ) : expression === 'sleepy' ? (
        <>
          <path d="M56 88 Q66 94 76 88" stroke="#333" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M124 88 Q134 94 144 88" stroke="#333" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="68" cy="86" r="12" fill="url(#fb-eye)" />
          <circle cx="64" cy="82" r="3.5" fill="#FFFFFF" />
          <circle cx="132" cy="86" r="12" fill="url(#fb-eye)" />
          <circle cx="128" cy="82" r="3.5" fill="#FFFFFF" />
        </>
      )}

      {/* 鼻子 */}
      <polygon points="97,96 103,96 100,101" fill="#FF70A6" />

      {/* 嘴 */}
      <path d="M93 104 Q96 109 100 104 Q104 109 108 104" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* 胡须 */}
      <g stroke="#CCC" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <line x1="44" y1="92" x2="18" y2="88" /><line x1="42" y1="100" x2="16" y2="100" /><line x1="44" y1="108" x2="20" y2="112" />
        <line x1="156" y1="92" x2="182" y2="88" /><line x1="158" y1="100" x2="184" y2="100" /><line x1="156" y1="108" x2="180" y2="112" />
      </g>

      {/* 表情文字标注 */}
      <text x="100" y="196" textAnchor="middle" fontSize="9" fill="#999" fontFamily="system-ui">
        {breed.replace('_', ' ')} · {expression}
      </text>
    </svg>
  );
}

export default RealisticCatScene;
