/**
 * 🪐 太阳系 3D 场景 (React Three Fiber)
 * ------------------------------------------------------------
 * 懒加载组件，仅在进入太空 Tab 时加载
 * 太阳 + 8 大行星 + 轨道 + 星空
 */
import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { PLANETS, type PlanetItem } from '@/data/space';

interface Planet3DProps {
  onSelect: (planet: PlanetItem) => void;
}

/** 太阳 */
function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += 0.002 * delta * 60;
  });
  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#FDB813" />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={3} distance={100} decay={0.5} />
      {/* 太阳发光 */}
      <mesh>
        <sphereGeometry args={[2.8, 16, 16]} />
        <meshBasicMaterial color="#FDB813" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

/** 轨道线 */
function OrbitLine({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
    </line>
  );
}

/** 行星 */
function Planet({ data, onSelect }: { data: PlanetItem; onSelect: (p: PlanetItem) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (groupRef.current) {
      angleRef.current += data.model3D.orbitSpeed * delta * 60;
      groupRef.current.rotation.y = angleRef.current;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += data.model3D.rotationSpeed * delta * 60;
    }
  });

  return (
    <group>
      <OrbitLine radius={data.model3D.orbitRadius} />
      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          position={[data.model3D.orbitRadius, 0, 0]}
          onClick={(e) => { e.stopPropagation(); onSelect(data); }}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[data.model3D.radius, 32, 32]} />
          <meshStandardMaterial
            color={data.model3D.color}
            emissive={hovered ? data.model3D.color : '#000000'}
            emissiveIntensity={hovered ? 0.3 : 0}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        {/* 土星光环 */}
        {data.model3D.hasRing && (
          <mesh position={[data.model3D.orbitRadius, 0, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
            <ringGeometry args={[data.model3D.radius * 1.4, data.model3D.radius * 2.2, 32]} />
            <meshBasicMaterial color="#FAD5A5" side={THREE.DoubleSide} transparent opacity={0.7} />
          </mesh>
        )}
        {/* 行星标签 */}
        {hovered && (
          <mesh position={[data.model3D.orbitRadius, data.model3D.radius + 0.5, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** 月球（绕地球） */
function Moon({ onSelect }: { onSelect: (p: PlanetItem) => void }) {
  const moonData = PLANETS.find(p => p.id === 'moon')!;
  const groupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  useFrame((_, delta) => {
    if (groupRef.current) {
      angleRef.current += 0.02 * delta * 60;
      groupRef.current.rotation.y = angleRef.current;
    }
  });

  return (
    <group>
      <group ref={groupRef}>
        <mesh
          position={[1.2, 0, 0]}
          onClick={(e) => { e.stopPropagation(); onSelect(moonData); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#C0C0C0" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function _Planet3D({ onSelect }: Planet3DProps) {
  const planetsWithOrbit = PLANETS.filter(p => p.bodyType === 'planet');

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 15, 25], fov: 50 }}
      onPointerMissed={() => {}}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.3} />
      <Sun />
      {planetsWithOrbit.map(planet => (
        <Planet key={planet.id} data={planet} onSelect={onSelect} />
      ))}
      <Moon onSelect={onSelect} />
      <Stars radius={80} depth={50} count={2000} factor={4} fade speed={0.5} />
      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={60}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  );
}

export default _Planet3D;
