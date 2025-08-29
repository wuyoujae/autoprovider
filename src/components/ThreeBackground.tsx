'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// 动态摄像机控制器 - 实现开场运镜动画
function CameraController() {
  const { camera } = useThree();
  const [animationPhase, setAnimationPhase] = useState(0);
  const startTime = useRef<number | null>(null);
  
  useFrame((state) => {
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    
    // 第一阶段：环形节点巡览 (0-6秒) - 适中的时间，舒缓不晕
    if (elapsed < 6 && animationPhase === 0) {
      const progress = elapsed / 6;
      const currentNodeAngle = progress * Math.PI * 2;
      
      // 摄像机围绕节点移动 - 减小距离让节点显示更大
      const cameraRadius = 3.2; // 进一步减小距离，提高清晰度
      const cameraX = Math.cos(currentNodeAngle) * cameraRadius;
      const cameraZ = Math.sin(currentNodeAngle) * cameraRadius;
      const cameraY = 0.5 + Math.sin(progress * Math.PI * 12) * 0.15; // 12个波动对应6秒，减小幅度
      
      camera.position.set(cameraX, cameraY, cameraZ);
      
      // 看向当前节点 - 确保准确对准
      const targetX = Math.cos(currentNodeAngle) * 4;
      const targetZ = Math.sin(currentNodeAngle) * 4;
      camera.lookAt(targetX, 0, targetZ);
      
    } 
    // 第二阶段：聚焦到中心核心 (6-8秒)
    else if (elapsed >= 6 && elapsed < 8 && animationPhase <= 1) {
      setAnimationPhase(1);
      const progress = (elapsed - 6) / 2; // 2秒过渡
      const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOut
      
      // 从当前位置移动到核心前方 - 调整目标位置确保居中
      const startPos = camera.position.clone();
      const targetPos = new THREE.Vector3(0, 0.5, 2.5); // 调整Y和Z位置，确保更好的居中视角
      
      camera.position.lerpVectors(startPos, targetPos, easeProgress);
      camera.lookAt(0, 0, 0); // 看向场景中心，确保核心居中显示
      
    }
    // 第三阶段：向上攀升到最终位置 (8-10秒)
    else if (elapsed >= 8 && elapsed < 10 && animationPhase <= 2) {
      setAnimationPhase(2);
      const progress = (elapsed - 8) / 2; // 2秒攀升
      const easeProgress = 1 - Math.pow(1 - progress, 2); // easeOut
      
      // 从核心前方攀升到最终环绕位置 - 确保与第四阶段位置完全一致
      const startPos = new THREE.Vector3(0, 0.5, 2.5);
      const finalPos = new THREE.Vector3(0, 2, 8); // 最终位置
      
      camera.position.lerpVectors(startPos, finalPos, easeProgress);
      
      // 逐渐调整视角到俯视角度 - 确保与第四阶段视角完全一致
      const lookTarget = new THREE.Vector3(0, -0.5 * easeProgress, 0); // 调整目标点确保居中
      camera.lookAt(lookTarget);
      
    }
    // 第四阶段：保持环绕运行状态 (10秒后)
    else if (elapsed >= 10 && animationPhase <= 3) {
      setAnimationPhase(3);
      // 确保与第三阶段结束时的位置和视角完全一致
      camera.position.set(0, 2, 8);
      camera.lookAt(0, -0.5, 0); // 与第三阶段结束时的视角保持一致
    }
  });

  return null;
}

// 延迟启动的组件包装器
function DelayedComponent({ delay, children }: { delay: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const startTime = useRef<number | null>(null);
  
  useFrame((state) => {
    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }
    
    if (state.clock.elapsedTime - startTime.current >= delay && !visible) {
      setVisible(true);
    }
  });
  
  return visible ? <>{children}</> : null;
}

function StarField() {
  const ref = useRef<THREE.Points>(null);
  
  // Generate random star positions
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(5000 * 3);
    const colors = new Float32Array(5000 * 3);
    
    for (let i = 0; i < 5000; i++) {
      // Random positions in a sphere
      const r = Math.random() * 25 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Random colors (white to blue)
      const intensity = Math.random() * 0.5 + 0.5;
      colors[i * 3] = intensity; // R
      colors[i * 3 + 1] = intensity; // G
      colors[i * 3 + 2] = 1; // B
    }
    
    return [positions, colors];
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.05;
      ref.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <Points ref={ref} positions={positions} colors={colors}>
      <PointMaterial
        transparent
        vertexColors
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
}

// 自动化核心处理器 - 代表系统的核心AI大脑
function AutomationCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // 稳定的核心旋转，象征持续运行
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      // 轻微的脉动效果，象征AI的思考
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <dodecahedronGeometry args={[1.2, 0]} />
      <meshBasicMaterial
        color="#ffffff"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

// 自动化工作节点 - 代表分布式的自动化任务执行单元
function AutomationNodes() {
  const groupRef = useRef<THREE.Group>(null);
  
  const nodes = useMemo(() => {
    const nodePositions = [];
    const radius = 4;
    const nodeCount = 8;
    
    // 定义不同的几何体类型
    const geometryTypes = [
      'cube',       // 立方体
      'sphere',     // 球体
      'pyramid',    // 四面体
      'octahedron', // 八面体
      'cylinder',   // 圆柱体
      'cone',       // 圆锥体
      'torus',      // 环形
      'diamond'     // 菱形（双锥）
    ];
    
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      nodePositions.push({ 
        x, 
        y: 0, 
        z, 
        delay: i * 0.2,
        geometryType: geometryTypes[i % geometryTypes.length]
      });
    }
    
    return nodePositions;
  }, []);
  
  useFrame((state) => {
    if (groupRef.current) {
      // 整个节点系统缓慢旋转，象征协调一致的自动化
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, index) => (
        <AutomationNode 
          key={index} 
          position={node} 
          delay={node.delay} 
          geometryType={node.geometryType}
        />
      ))}
    </group>
  );
}

// 单个自动化节点组件
function AutomationNode({ position, delay, geometryType }: { 
  position: any; 
  delay: number; 
  geometryType: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // 独立的工作节拍，象征各自的自动化任务
      const workCycle = Math.sin(state.clock.elapsedTime * 1.5 + delay) * 0.5 + 0.5;
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.05 + workCycle * 0.1;
      
      // 轻微的上下浮动
      meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime + delay) * 0.3;
      
      // 根据几何体类型添加不同的旋转效果
      if (geometryType === 'cube' || geometryType === 'diamond') {
        meshRef.current.rotation.x = state.clock.elapsedTime * 0.3 + delay;
        meshRef.current.rotation.z = state.clock.elapsedTime * 0.2 + delay;
      } else if (geometryType === 'cylinder' || geometryType === 'cone') {
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.4 + delay;
      } else {
        meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 + delay;
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 + delay;
      }
    }
  });

  // 根据几何体类型渲染不同的几何体
  const renderGeometry = () => {
    const size = 0.35;
    
    switch (geometryType) {
      case 'cube':
        return <boxGeometry args={[size, size, size]} />;
      case 'sphere':
        return <sphereGeometry args={[size * 0.8, 16, 12]} />;
      case 'pyramid':
        return <tetrahedronGeometry args={[size]} />;
      case 'octahedron':
        return <octahedronGeometry args={[size]} />;
      case 'cylinder':
        return <cylinderGeometry args={[size * 0.6, size * 0.6, size * 1.2, 8]} />;
      case 'cone':
        return <coneGeometry args={[size * 0.8, size * 1.2, 6]} />;
      case 'torus':
        return <torusGeometry args={[size * 0.8, size * 0.3, 8, 16]} />;
      case 'diamond':
        return <octahedronGeometry args={[size]} />;
      default:
        return <icosahedronGeometry args={[size, 0]} />;
    }
  };

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      {renderGeometry()}
      <meshBasicMaterial
        color="#ffffff"
        wireframe
        transparent
        opacity={0.08}
      />
    </mesh>
  );
}

// 简化的数据流连接线 - 只保留从中心到各节点的连接
function DataFlowLines() {
  const groupRef = useRef<THREE.Group>(null);
  
  const connections = useMemo(() => {
    const lines = [];
    const radius = 4;
    const nodeCount = 8;
    
    // 只创建从中心到各节点的连接线，去掉节点间的网格连接
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const points = [
        new THREE.Vector3(0, 0, 0), // 中心核心位置更正为原点
        new THREE.Vector3(x, 0, z)   // 外围节点位置
      ];
      
      lines.push({ points, delay: i * 0.15 });
    }
    
    return lines;
  }, []);

  return (
    <group ref={groupRef}>
      {connections.map((connection, index) => (
        <DataFlow key={index} points={connection.points} delay={connection.delay} />
      ))}
    </group>
  );
}

// 单条数据流线组件
function DataFlow({ points, delay }: { points: THREE.Vector3[]; delay: number }) {
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  
  useFrame((state) => {
    if (materialRef.current) {
      // 数据流脉动效果，象征信息传输
      const pulse = Math.sin(state.clock.elapsedTime * 2 + delay) * 0.5 + 0.5;
      materialRef.current.opacity = 0.03 + pulse * 0.08;
    }
  });

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  return (
    <line>
      <bufferGeometry attach="geometry" {...geometry} />
      <lineBasicMaterial
        ref={materialRef}
        color="#ffffff"
        transparent
        opacity={0.06}
      />
    </line>
  );
}

export function ThreeBackground() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [3.2, 0.5, 0], fov: 75 }} // 调整初始位置对应新的摄像机距离和高度
        style={{ background: 'transparent' }}
      >
        {/* 摄像机控制器 - 实现运镜动画 */}
        <CameraController />
        
        {/* 立即显示的元素 */}
        <StarField />
        <AutomationCore />
        <AutomationNodes />
        
        {/* 延迟显示的元素 - 在核心聚焦后出现 */}
        <DelayedComponent delay={6.5}>
          <DataFlowLines />
        </DelayedComponent>
        
        {/* 环境装饰元素 - 在最终阶段显示 */}
        <DelayedComponent delay={9}>
          <mesh position={[-6, 3, -8]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshBasicMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={0.04}
            />
          </mesh>
          
          <mesh position={[6, -3, -8]}>
            <octahedronGeometry args={[0.4]} />
            <meshBasicMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={0.04}
            />
          </mesh>
          
          <mesh position={[0, 5, -12]} rotation={[Math.PI / 6, Math.PI / 4, 0]}>
            <tetrahedronGeometry args={[0.6]} />
            <meshBasicMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={0.03}
            />
          </mesh>
          
          <mesh position={[0, -5, -12]} rotation={[-Math.PI / 6, -Math.PI / 4, 0]}>
            <icosahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={0.03}
            />
          </mesh>
        </DelayedComponent>
      </Canvas>
    </div>
  );
}