import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ParticleShaderMaterial } from './ParticleShader';
import { GestureState, ParticleShape } from '../types';

interface SceneProps {
  gestureRef: React.MutableRefObject<GestureState>;
  shape: ParticleShape;
  color: string;
}

const Particles = ({ gestureRef, shape, color }: SceneProps) => {
  const count = 5000;
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, randoms, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const baseColorObj = new THREE.Color(color);
    // Brighter ornament colors for better pop
    const ornamentColors = [
        new THREE.Color('#ff0033'), // Deep Red
        new THREE.Color('#ffcc00'), // Rich Gold
        new THREE.Color('#00ffff'), // Cyan
        new THREE.Color('#ffffff'), // White
        new THREE.Color('#ff00ff'), // Magenta
    ];

    if (shape === 'tree') {
      for (let i = 0; i < count; i++) {
        // Standard cone distribution
        // CLIPPED HEIGHT: Avoid exact top tip (y=5, radius=0) to prevent black spot singularity
        const y = Math.random() * 9.5 - 5; // -5 to 4.5
        // Radius calculation
        const radius = (5 - y) * 0.45;
        const angle = i * 0.5; // Spiral
        const r = radius * Math.sqrt(Math.random());
        
        positions[i * 3] = r * Math.cos(angle);
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = r * Math.sin(angle);

        // Ornament Logic
        // Slightly reduced probability to avoid clutter, kept distinctive size
        const isSurface = r > radius * 0.8; 
        if (isSurface && Math.random() < 0.08) {
            const ornamentColor = ornamentColors[Math.floor(Math.random() * ornamentColors.length)];
            colors[i * 3] = ornamentColor.r;
            colors[i * 3 + 1] = ornamentColor.g;
            colors[i * 3 + 2] = ornamentColor.b;
            sizes[i] = Math.random() * 1.5 + 2.5; // Large ornaments
        } else {
            colors[i * 3] = baseColorObj.r;
            colors[i * 3 + 1] = baseColorObj.g;
            colors[i * 3 + 2] = baseColorObj.b;
            // Scale leaf size by height slightly to avoid clustering at top
            const heightFactor = (y + 5) / 10; 
            sizes[i] = (Math.random() * 0.6 + 0.4) * (1.0 - heightFactor * 0.3); 
        }
      }
    } else if (shape === 'sphere') {
      for (let i = 0; i < count; i++) {
        const r = 4 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        colors[i * 3] = baseColorObj.r;
        colors[i * 3 + 1] = baseColorObj.g;
        colors[i * 3 + 2] = baseColorObj.b;
        sizes[i] = Math.random() * 0.8 + 0.5;
      }
    } else if (shape === 'star') {
        for (let i = 0; i < count; i++) {
            const r = Math.pow(Math.random(), 2) * 6;
             const theta = Math.random() * 2 * Math.PI;
             const phi = Math.acos(2 * Math.random() - 1);
             positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
             positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
             positions[i * 3 + 2] = r * Math.cos(phi);
             
             if (Math.random() > 0.8) {
                 positions[i * 3] *= 2.5; 
             }
             
             colors[i * 3] = baseColorObj.r;
             colors[i * 3 + 1] = baseColorObj.g;
             colors[i * 3 + 2] = baseColorObj.b;
             sizes[i] = Math.random() * 0.8 + 0.5;
        }
    } else if (shape === 'flower') {
         for (let i = 0; i < count; i++) {
             const u = Math.random() * Math.PI * 2;
             const v = Math.random() * Math.PI;
             const r = 3 + Math.sin(5 * u) * Math.sin(5 * v);
             
             positions[i * 3] = r * Math.sin(v) * Math.cos(u);
             positions[i * 3 + 1] = r * Math.cos(v);
             positions[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);

             colors[i * 3] = baseColorObj.r;
             colors[i * 3 + 1] = baseColorObj.g;
             colors[i * 3 + 2] = baseColorObj.b;
             sizes[i] = Math.random() * 0.8 + 0.5;
         }
    }

    for (let i = 0; i < count; i++) {
      randoms[i] = Math.random();
      randoms[i+1] = Math.random();
      randoms[i+2] = Math.random();
    }

    return { positions, randoms, sizes, colors };
  }, [shape, color]);

  useFrame((state) => {
    const { clock } = state;
    const { collapseFactor, rotationX, pinchDistance } = gestureRef.current;

    if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
        materialRef.current.uniforms.uCollapse.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uCollapse.value, collapseFactor, 0.1);
        materialRef.current.uniforms.uPinch.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uPinch.value, pinchDistance, 0.1);
    }

    if (meshRef.current) {
        const targetRot = rotationX * 1.5;
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot, 0.05);
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length / 3}
          array={randoms}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <primitive object={ParticleShaderMaterial} ref={materialRef} attach="material" />
    </points>
  );
};

export const Experience = (props: SceneProps) => {
  return (
    <Canvas camera={{ position: [0, 0, 14], fov: 40 }} className="w-full h-full">
      <color attach="background" args={['#010101']} />
      
      <Particles {...props} />
      
      <EffectComposer disableNormalPass>
        {/* 
           Bloom Logic Update:
           - Threshold: Increased to 0.65 (was 0.25). This ensures only the very bright core and ornaments glow,
             preventing the "washed out" fog effect on the green leaves.
           - Intensity: 1.0 makes the glow pop where it exists.
           - Smoothing: 0.9 provides a high quality falloff.
        */}
        <Bloom 
            luminanceThreshold={0.65} 
            mipmapBlur 
            intensity={1.0} 
            radius={0.4} 
            luminanceSmoothing={0.9}
        />
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.3} darkness={0.6} />
      </EffectComposer>
      
      <ambientLight intensity={0.5} />
    </Canvas>
  );
};