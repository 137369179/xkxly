/**
 * 程序化猫咪几何体生成器 (Procedural Cat Geometry Generator)
 * ------------------------------------------------------------
 * 使用 Three.js BufferGeometry 构建写实风格的猫咪模型：
 * 1. 基于球体/椭球的解剖学正确形体
 * 2. 可变形的骨骼影响区域
 * 3. 支持不同品种的体型参数调整
 *
 * 注意：这是"程序化生成"的简化版本。
 * 生产环境建议使用 Meshy/Tripo AI 生成的 GLB 模型替换此模块。
 */

import * as THREE from 'three';
import type { CatBreed, BreedConfig } from './types';
import { BREED_CONFIGS } from './types';

/**
 * 创建完整的猫咪组合网格 (Create Full Cat Composite Mesh)
 * 返回一个包含所有身体部位的 Group，每个部位是独立的 Mesh 以支持独立动画
 */
export function createCatGeometry(breed: CatBreed = 'british_shorthair'): THREE.Group {
  const config = BREED_CONFIGS[breed]!!
  const group = new THREE.Group();
  group.name = 'Cat_Root';

  // 身体部位材质索引映射
  const materials = createBreedMaterials(config);

  // === 1. 头部 (Head) ===
  const headGeom = createHeadGeometry(config);
  const headMesh = new THREE.Mesh(headGeom, materials.fur);
  headMesh.name = 'Cat_Head';
  headMesh.position.set(0, config.bodyScale * 2.2, 0);
  group.add(headMesh);

  // === 2. 口鼻部 (Snout/Muzzle) ===
  const snoutGeom = new THREE.SphereGeometry(0.35 * config.bodyScale, 16, 12);
  snoutGeom.scale(1, 0.7, 0.8);
  const snoutMesh = new THREE.Mesh(snoutGeom, materials.fur);
  snoutMesh.name = 'Cat_Snout';
  snoutMesh.position.set(0, config.bodyScale * 2.0, config.bodyScale * 0.9);
  group.add(snoutMesh);

  // === 3. 耳朵 (Ears) ===
  const earConfig = config.earShape;
  const leftEar = createEarGeometry(earConfig, config.bodyScale, -1);
  leftEar.name = 'Cat_Ear_L';
  leftEar.position.set(-config.bodyScale * 0.7, config.bodyScale * 2.9, 0);
  group.add(leftEar);

  const rightEar = createEarGeometry(earConfig, config.bodyScale, 1);
  rightEar.name = 'Cat_Ear_R';
  rightEar.position.set(config.bodyScale * 0.7, config.bodyScale * 2.9, 0);
  group.add(rightEar);

  // === 4. 眼睛 (Eyes) ===
  const leftEye = createEyeGeometry(config.eyeColor);
  leftEye.name = 'Cat_Eye_L';
  leftEye.position.set(-config.bodyScale * 0.28, config.bodyScale * 2.3, config.bodyScale * 0.75);
  group.add(leftEye);

  const rightEye = createEyeGeometry(config.eyeColor);
  rightEye.name = 'Cat_Eye_R';
  rightEye.position.set(config.bodyScale * 0.28, config.bodyScale * 2.3, config.bodyScale * 0.75);
  group.add(rightEye);

  // === 5. 鼻子 (Nose) ===
  const noseGeom = new THREE.ConeGeometry(0.08, 0.12, 8);
  const noseMat = new THREE.MeshStandardMaterial({
    color: config.noseColor,
    roughness: 0.3,
    metalness: 0.0,
  });
  const noseMesh = new THREE.Mesh(noseGeom, noseMat);
  noseMesh.name = 'Cat_Nose';
  noseMesh.rotation.x = Math.PI / 2;
  noseMesh.position.set(0, config.bodyScale * 2.05, config.bodyScale * 1.15);
  group.add(noseMesh);

  // === 6. 身体 (Body/Torso) ===
  const bodyGeom = createBodyGeometry(config);
  const bodyMesh = new THREE.Mesh(bodyGeom, materials.fur);
  bodyMesh.name = 'Cat_Body';
  bodyMesh.position.set(0, config.bodyScale * 1.0, 0);
  group.add(bodyMesh);

  // === 7. 肚皮白斑 (Belly Patch) ===
  const bellyGeom = new THREE.SphereGeometry(config.bodyScale * 0.55, 16, 12);
  bellyGeom.scale(1, 0.6, 0.7);
  const bellyMesh = new THREE.Mesh(bellyGeom, materials.belly);
  bellyMesh.name = 'Cat_Belly';
  bellyMesh.position.set(0, config.bodyScale * 0.85, config.bodyScale * 0.15);
  group.add(bellyMesh);

  // === 8. 前腿 (Front Legs) ===
  const frontLeftLeg = createLegGeometry(config.bodyScale * 0.18, config.bodyScale * 0.6, config.pawPadColor);
  frontLeftLeg.name = 'Cat_Leg_FL';
  frontLeftLeg.position.set(-config.bodyScale * 0.45, config.bodyScale * 0.4, config.bodyScale * 0.3);
  group.add(frontLeftLeg);

  const frontRightLeg = createLegGeometry(config.bodyScale * 0.18, config.bodyScale * 0.6, config.pawPadColor);
  frontRightLeg.name = 'Cat_Leg_FR';
  frontRightLeg.position.set(config.bodyScale * 0.45, config.bodyScale * 0.4, config.bodyScale * 0.3);
  group.add(frontRightLeg);

  // === 9. 后腿 (Hind Legs) ===
  const hindLeftLeg = createLegGeometry(config.bodyScale * 0.22, config.bodyScale * 0.55, config.pawPadColor);
  hindLeftLeg.name = 'Cat_Leg_HL';
  hindLeftLeg.position.set(-config.bodyScale * 0.42, config.bodyScale * 0.35, -config.bodyScale * 0.35);
  hindLeftLeg.rotation.x = -0.3;
  group.add(hindLeftLeg);

  const hindRightLeg = createLegGeometry(config.bodyScale * 0.22, config.bodyScale * 0.55, config.pawPadColor);
  hindRightLeg.name = 'Cat_Leg_HR';
  hindRightLeg.position.set(config.bodyScale * 0.42, config.bodyScale * 0.35, -config.bodyScale * 0.35);
  hindRightLeg.rotation.x = -0.3;
  group.add(hindRightLeg);

  // === 10. 尾巴 (Tail) ===
  const tail = createTailGeometry(config.tailLength, config.bodyScale, config.primaryColor);
  tail.name = 'Cat_Tail';
  tail.position.set(0, config.bodyScale * 0.9, -config.bodyScale * 0.85);
  group.add(tail);

  return group;
}

// ========== 内部几何构建函数 ==========

function createBreedMaterials(config: BreedConfig) {
  const furMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.primaryColor),
    roughness: 0.85,    // 毛发高粗糙度 = 漫反射为主
    metalness: 0.0,
    flatShading: false,
  });

  const bellyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.secondaryColor),
    roughness: 0.9,
    metalness: 0.0,
  });

  return { fur: furMaterial, belly: bellyMaterial };
}

function createHeadGeometry(config: BreedConfig): THREE.BufferGeometry {
  // 使用椭球作为基础头部形状
  const geom = new THREE.SphereGeometry(config.bodyScale * 0.65, 24, 18);
  // 轻微压扁使其更像猫头（宽度 > 高度 > 深度）
  geom.scale(1.0, 0.88, 0.92);
  return geom;
}

function createEarGeometry(
  shape: BreedConfig['earShape'],
  scale: number,
  side: -1 | 1
): THREE.Mesh {
  let geom: THREE.BufferGeometry;

  if (shape === 'folded') {
    // 折耳：压扁的圆盘状
    geom = new THREE.SphereGeometry(scale * 0.25, 12, 8);
    geom.scale(1, 0.3, 0.8);
  } else if (shape === 'pointed') {
    // 尖耳：锥形
    geom = new THREE.ConeGeometry(scale * 0.22, scale * 0.45, 8);
  } else {
    // 圆耳：圆润的三角锥
    geom = new THREE.SphereGeometry(scale * 0.28, 12, 10);
    geom.scale(0.8, 1.1, 0.5);
  }

  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.z = side * 0.3; // 外撇角度
  return mesh;
}

function createEyeGeometry(color: string): THREE.Mesh {
  const group = new THREE.Group();

  // 巩膜（白色部分）
  const scleraGeom = new THREE.SphereGeometry(0.14, 16, 12);
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.1,
    metalness: 0.0,
  });
  const sclera = new THREE.Mesh(scleraGeom, scleraMat);
  group.add(sclera);

  // 虹膜（彩色部分）
  const irisGeom = new THREE.SphereGeometry(0.11, 16, 12);
  const irisMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.15,
    metalness: 0.1,
  });
  const iris = new THREE.Mesh(irisGeom, irisMat);
  iris.position.z = 0.06;
  group.add(iris);

  // 瞳孔（竖缝形，猫的特征！）
  const pupilGeom = new THREE.CylinderGeometry(0.02, 0.015, 0.08, 8);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const pupil = new THREE.Mesh(pupilGeom, pupilMat);
  pupil.rotation.x = Math.PI / 2;
  pupil.position.z = 0.11;
  group.add(pupil);

  // 高光点
  const highlightGeom = new THREE.SphereGeometry(0.03, 8, 6);
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const highlight = new THREE.Mesh(highlightGeom, highlightMat);
  highlight.position.set(0.04, 0.04, 0.13);
  group.add(highlight);

  return group as unknown as THREE.Mesh;
}

function createBodyGeometry(config: BreedConfig): THREE.BufferGeometry {
  // 使用胶囊/椭球混合作为身体
  const geom = new THREE.SphereGeometry(config.bodyScale * 0.7, 24, 16);
  // 拉长为椭圆形身体
  geom.scale(1.0, 0.82, 1.25);
  return geom;
}

function createLegGeometry(radius: number, height: number, padColor: string): THREE.Group {
  const legGroup = new THREE.Group();

  // 腿主体
  const legGeom = new THREE.CapsuleGeometry(radius, height, 8, 12);
  const legMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });
  const legMesh = new THREE.Mesh(legGeom, legMat);
  legMesh.position.y = -height / 2 - radius;
  legGroup.add(legMesh);

  // 肉垫（脚底）
  const padGeom = new THREE.CircleGeometry(radius * 0.8, 12);
  const padMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(padColor),
    roughness: 0.4,
    metalness: 0.0,
  });
  const padMesh = new THREE.Mesh(padGeom, padMat);
  padMesh.rotation.x = -Math.PI / 2;
  padMesh.position.y = -height - radius * 2 + 0.01;
  legGroup.add(padMesh);

  // 小肉垫（趾垫）
  const toePositions = [
    [-radius * 0.4, -height - radius * 2 + 0.02, -radius * 0.3],
    [radius * 0.4, -height - radius * 2 + 0.02, -radius * 0.3],
    [0, -height - radius * 2 + 0.02, -radius * 0.5],
  ];
  toePositions.forEach((pos) => {
    const toeGeom = new THREE.CircleGeometry(radius * 0.25, 8);
    const toeMesh = new THREE.Mesh(toeGeom, padMat);
    toeMesh.rotation.x = -Math.PI / 2;
    toeMesh.position.set(pos[0]!, pos[1]!, pos[2]!);
    legGroup.add(toeMesh);
  });

  return legGroup;
}

function createTailGeometry(
  length: 'short' | 'normal' | 'long',
  bodyScale: number,
  color: string
): THREE.Group {
  const tailGroup = new THREE.Group();

  const lengthMultiplier = length === 'short' ? 0.8 : length === 'long' ? 1.3 : 1.0;
  const segments = 6;

  // 用一系列逐渐变小的球体模拟尾巴曲线
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const segRadius = bodyScale * (0.15 - t * 0.09); // 逐渐变细
    const segGeom = new THREE.SphereGeometry(segRadius, 10, 8);
    const segMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.85,
      metalness: 0.0,
    });
    const segMesh = new THREE.Mesh(segGeom, segMat);

    // 弯曲曲线位置
    const angle = t * Math.PI * 0.6; // 向上弯曲约 54 度
    const dist = t * bodyScale * lengthMultiplier * 1.2;
    segMesh.position.set(
      Math.sin(angle) * dist * 0.3,
      Math.cos(angle) * dist * 0.4,
      -dist
    );

    segMesh.name = `Cat_Tail_Seg_${i}`;
    tailGroup.add(segMesh);
  }

  return tailGroup;
}

/**
 * 更新猫咪材质颜色（用于品种切换或染色功能）
 */
export function updateCatColors(
  catGroup: THREE.Group,
  config: BreedConfig
): void {
  catGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      const name = child.name;

      if (name.includes('Body') || name.includes('Head') || name.includes('Snout') ||
          name.includes('Ear') || name.includes('Tail')) {
        child.material.color.set(config.primaryColor);
      } else if (name.includes('Belly')) {
        child.material.color.set(config.secondaryColor);
      }
    }
  });
}

/**
 * 设置毛发脏污程度（清洁度低时调用）
 * @param dirtyLevel 0=干净, 100=非常脏
 */
export function setFurDirtyLevel(catGroup: THREE.Group, dirtyLevel: number): void {
  const clampedDirty = Math.max(0, Math.min(100, dirtyLevel));
  // dirtyLevel 越高 → roughness 越高（毛发看起来更暗淡、更脏）
  const extraRoughness = clampedDirty / 100 * 0.12;

  catGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      if (child.name.includes('Body') || child.name.includes('Head') || child.name.includes('Tail')) {
        child.material.roughness = 0.85 + extraRoughness;
      }
    }
  });
}
