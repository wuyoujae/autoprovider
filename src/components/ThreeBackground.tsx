'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

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

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={[3, 0, -5]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#ffffff"
        wireframe
        transparent
        opacity={0.1}
      />
    </mesh>
  );
}

function NetworkLines() {
  const ref = useRef<THREE.Group>(null);
  
  const lines = useMemo(() => {
    const lineCount = 50;
    const lines = [];
    
    for (let i = 0; i < lineCount; i++) {
      const points = [];
      const startX = (Math.random() - 0.5) * 20;
      const startY = (Math.random() - 0.5) * 20;
      const startZ = (Math.random() - 0.5) * 20;
      
      const endX = (Math.random() - 0.5) * 20;
      const endY = (Math.random() - 0.5) * 20;
      const endZ = (Math.random() - 0.5) * 20;
      
      points.push(new THREE.Vector3(startX, startY, startZ));
      points.push(new THREE.Vector3(endX, endY, endZ));
      
      lines.push(points);
    }
    
    return lines;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={ref}>
      {lines.map((points, index) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={index}>
            <bufferGeometry attach="geometry" {...geometry} />
            <lineBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.05}
            />
          </line>
        );
      })}
    </group>
  );
}

export function ThreeBackground() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <StarField />
        <AnimatedSphere />
        <NetworkLines />
        
        {/* Additional geometric shapes */}
        <mesh position={[-3, 2, -3]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.08}
          />
        </mesh>
        
        <mesh position={[2, -2, -2]}>
          <octahedronGeometry args={[0.8]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.06}
          />
        </mesh>
      </Canvas>
    </div>
  );
}