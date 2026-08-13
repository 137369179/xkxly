# 写实猫 3D 组件系统 · 技术文档

## 📋 概述

本项目为「宝贝学习乐园」新增了**写实风格 3D 猫咪渲染组件系统**，用于替换原有的 SVG/CSS 羊毛毡风格猫咪。该系统基于 **Three.js + React Three Fiber + Drei** 构建，支持：

- 🐱 **6 种真实猫品种**（英短蓝猫、暹罗、橘猫、布偶、缅因、折耳）
- 😺 **10 种表情状态**（开心/萌萌/思考/困倦/喜爱/兴奋/饥饿/脏脏/生气/害怕）
- 🎬 **15 种骨骼动画**（呼吸/行走/舔毛/伸懒腰/扑击/打滚/咕噜等）
- 👑 **6 种 3D 配饰**（皇冠/眼镜/蝴蝶结/领结/魔法帽/花环）
- 💡 **4 种 HDRI 光照场景**（暖阳日光/梦幻粉紫/荧光夜空/室内暖光）
- 📱 **自适应渲染**（完整 PBR → 优化版 → CSS/SVG 降级）

---

## 📁 文件结构

```
src/components/realistic-cat/
├── types.ts                    # 类型定义（品种/表情/动画/配件/渲染模式）
├── CatGeometry.ts             # 程序化猫咪几何体生成器
├── CatAnimations.ts           # 动画状态机 + 关键帧动画
├── CatScene.tsx               # Three.js 场景渲染器（光照/阴影/环境）
├── RealisticCat3D.tsx          # 主组件（对外 API）
├── RealisticCatHousePage.tsx   # 完整养育页面（含状态管理/互动）
├── index.ts                   # 统一导出
└── README.md                  # 本文件
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install three @react-three/fiber @react-three/drei @types/three
```

### 2. 基础使用

```tsx
import { RealisticCat3D } from '@/components/realistic-cat';

function MyPage() {
  return (
    <RealisticCat3D
      size={400}
      breed="british_shorthair"  // 英短蓝猫
      expression="happy"         // 开心表情
      hat="crown"                // 戴皇冠
      envLighting="sunlight"     // 暖阳光照
      autoRotate                 // 自动旋转展示
      onPet={() => console.log('摸了猫！')}
    />
  );
}
```

### 3. 完整养育页面

```tsx
import RealisticCatHousePage from '@/components/realistic-cat/RealisticCatHousePage';

// 在路由中使用
<Route path="/realistic-cat-house" element={<RealisticCatHousePage />} />
```

---

## 🔧 组件 API

### RealisticCat3D Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | `number` | `200` | 显示尺寸（像素） |
| `breed` | `CatBreed` | `'british_shorthair'` | 猫咪品种 |
| `expression` | `CatExpression` | `'happy'` | 当前表情 |
| `hat` | `string` | - | 头部配饰 ID |
| `neck` | `string` | - | 颈部配饰 ID |
| `envLighting` | `'sunlight'\|'nebula'\|'starry'\|'indoor_warm'` | `'indoor_warm'` | 光照场景 |
| `autoRotate` | `boolean` | `false` | 是否自动旋转 |
| `showControls` | `boolean` | `true` | 显示动画控制面板 |
| `onPet` | `() => void` | - | 点击抚摸回调 |
| `onAnimationChange` | `(anim: CatAnimation) => void` | - | 动画切换回调 |
| `forceRenderMode` | `RenderMode` | - | 强制渲染模式 |
| `className` | `string` | `''` | 自定义类名 |

### CatBreed 品种枚举

| 值 | 中文名 | 特征 |
|------|--------|------|
| `british_shorthair` | 英短蓝猫 | 圆脸、蓝灰色毛、沉稳温和 |
| `siamese` | 暹罗猫 | 重点色、蓝眼、聪明机敏 |
| `ginger` | 橘猫 | 橙色胖体型、活泼好奇 |
| `ragdoll` | 布偶猫 | 长毛蓝眼、温顺优雅 |
| `mainecoon` | 缅因猫 | 大型长毛、威武勇敢 |
| `scottish_fold` | 折耳猫 | 折耳、安静甜美 |

---

## 🏗️ 架构设计

### 渲染管线

```
用户交互
  ↓
RealisticCat3D (主组件)
  ↓
设备能力检测 (detectDeviceCapability)
  ├── 高端 GPU → full_3d (PBR + 阴影 + HDRI)
  ├── 中端 GPU → optimized_3d (减少面数)
  └── 低端/无 WebGL → css_fallback (SVG 降级视图)
  ↓
CatScene (Three.js Canvas)
  ├── SceneLighting (4种光照预设)
  ├── CatModel (程序化几何体 + 材质)
  ├── GroundPlane (接触阴影)
  └── OrbitControls (相机交互)
```

### 动画系统

```
CatState (养成数据)
  ↓
recommendAnimation() (状态机推荐)
  ↓
createProceduralAnimation() (关键帧生成)
  ↓
AnimationMixer.play() (Three.js 混合播放)
  ↓
平滑过渡 (fadeIn/fadeOut 交叉淡入淡出)
```

### 与现有系统集成

```typescript
// 从 Zustand store 读取养成数据
const fishCount = useStore((s) => s.progress.fishCount);
const catAffection = useStore((s) => s.progress.catAffection);

// 状态 → 动画映射
const animationMap = {
  fullness < 30: 'beg_food',
  cleanliness < 30: 'groom_self',
  affection > 80: 'roll_over',
  energy < 20: 'fall_asleep',
};

// 状态 → 材质变化
setFurDirtyLevel(catGroup, 100 - cleanliness); // 脏污度影响 roughness
```

---

## 🎨 自定义扩展

### 添加新品种

```typescript
// 1. 在 types.ts 的 CatBreed 中添加新值
type CatBreed = ... | 'persian';

// 2. 在 BREED_CONFIGS 中添加配置
persian: {
  name: '波斯猫',
  primaryColor: '#FFFFFF',
  secondaryColor: '#FFF0F5',
  eyeColor: '#00CED1',
  // ...
},

// 3. CatGeometry 会自动使用新配置生成几何体
```

### 添加新动画

```typescript
// 在 CatAnimations.ts 中添加新的 case
case 'new_animation':
  clip = createNewAnimation(); // 返回 THREE.AnimationClip
  break;

// 创建 AnimationClip 的要点：
// - 使用 NumberKeyframeTrack 定义属性变化
// - 轨迹名称匹配 Mesh 的 .name 属性
// - 使用 InterpolateSmooth 实现平滑插值
```

### 替换为 GLTF 外部模型

```tsx
// 使用 @react-three/drei 的 useGLTF 加载外部模型
import { useGLTF } from '@react-three/drei';

function ExternalCatModel({ url }: { url: string }) {
  const { scene, animations } = useGLTF(url);
  return <primitive object={scene} />;
}
```

推荐的外部模型来源：
- **Meshy AI**: https://www.meshy.ai （图生3D，带纹理）
- **Tripo AI**: AI 生成 3D 模型
- **Sketchfab**: 搜索 "realistic cat rigged"

---

## ⚡ 性能优化

### 已实施的优化

1. **设备自适应渲染**：根据 GPU 能力自动选择渲染质量
2. **DPR 限制**：低端设备强制 DPR=1，高端设备最大 2
3. **按需加载**：Three.js 通过动态 import 实现代码分割
4. **材质复用**：同品种共享 Material 实例
5. **动画缓存**：AnimationClip 只创建一次并缓存

### 推荐的生产优化

1. **使用 GLTF 二进制格式**：比 JSON 格式小 60%
2. **压缩纹理**：使用 KTX2/BasisU 压缩贴图
3. **实例化渲染**：多只猫时使用 InstancedMesh
4. **LOD 系统**：远距离使用低面数模型
5. **WebGPU 支持**：未来可迁移到 WebGPU 渲染器

---

## 🐛 常见问题

### Q: 页面空白，看不到猫？
A: 检查浏览器是否支持 WebGL2。打开 F12 控制台查看错误信息。低端设备会自动降级到 SVG 视图。

### Q: npm install 失败？
A: Three.js 生态包较大，建议使用淘宝镜像：
```bash
npm install --registry=https://registry.npmmirror.com three @react-three/fiber @react-three/drei
```

### Q: 如何替换为自己的 3D 猫模型？
A: 将 GLB/GLTF 文件放入 `public/models/cat.glb`，然后修改 `CatScene.tsx` 中的模型加载逻辑。

### Q: 移动端性能差？
A: 组件会自动检测设备能力并降级。也可手动设置 `forceRenderMode="css_fallback"` 强制使用 SVG 降级。

---

## 📊 技术栈依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `three` | ^0.170.x | 3D 引擎核心 |
| `@react-three/fiber` | ^8.x | React Three.js 绑定 |
| `@react-three/drei` | ^9.x | 有用的 Three.js 辅助组件 |
| `@types/three` | ^0.170.x | TypeScript 类型定义 |

---

## 🔄 升级路径（从旧版本迁移）

### 替换现有组件

```diff
- import { CyberMasterCat3D } from '@/components/CyberMasterCat3D';
+ import { RealisticCat3D } from '@/components/realistic-cat';

- <CyberMasterCat3D size={220} expression="happy" />
+ <RealisticCat3D size={220} breed="british_shorthair" expression="happy" />
```

### Props 兼容性

`RealisticCat3D` 的核心 Props（size/expression/hat/neck/onPet）与原有 `CyberMasterCat3D` 保持兼容，可以无缝替换。新增的 `breed` 和 `envLighting` 为可选参数。

---

## 📜 更新日志

### v1.0.0 (2026-08-09)
- ✅ 初始版本发布
- ✅ 6 种猫咪品种
- ✅ 10 种表情 + 15 种动画
- ✅ 4 种光照场景
- ✅ 设备自适应渲染
- ✅ CSS/SVG 降级方案
- ✅ 完整养育页面
- ✅ 与现有 Zustand Store 对接

---

*本文档由 Tabbit AI 助手自动生成*
*最后更新：2026-08-09*
