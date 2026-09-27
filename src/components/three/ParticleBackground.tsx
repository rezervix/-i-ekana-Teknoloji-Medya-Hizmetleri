"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Inner component: particle field with mouse repulsion
function Particles() {
  const meshRef = useRef<THREE.Points>(null!);
  const mouseRef = useRef({ x: 0, y: 0 });
  const { size } = useThree();

  const COUNT = 7000;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);

    const electricBlue = new THREE.Color("#0EA5E9");
    const white = new THREE.Color("#ffffff");
    const violet = new THREE.Color("#7C3AED");

    for (let i = 0; i < COUNT; i++) {
      // Spread particles across a wide field
      pos[i * 3 + 0] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;

      // Mix between electric blue, white, and violet
      const t = Math.random();
      const c =
        t < 0.6
          ? electricBlue.clone().lerp(white, Math.random() * 0.4)
          : violet.clone().lerp(electricBlue, Math.random() * 0.5);

      col[i * 3 + 0] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  const originalPositions = useMemo(() => new Float32Array(positions), [positions]);

  // Track mouse in normalized device coords
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const geometry = meshRef.current.geometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const mx = mouseRef.current.x * 10;
    const my = mouseRef.current.y * 6;
    const repelRadius = 2.5;
    const repelStrength = 3;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
      const ox = originalPositions[ix];
      const oy = originalPositions[iy];

      const dx = arr[ix] - mx;
      const dy = arr[iy] - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < repelRadius) {
        // Repel from mouse
        const force = (repelRadius - dist) / repelRadius;
        arr[ix] += (dx / dist) * force * repelStrength * delta;
        arr[iy] += (dy / dist) * force * repelStrength * delta;
      } else {
        // Return to original position (spring)
        arr[ix] += (ox - arr[ix]) * 0.04;
        arr[iy] += (oy - arr[iy]) * 0.04;
      }

      // Slow drift on Z axis
      arr[iz] = originalPositions[iz] + Math.sin(state.clock.elapsedTime * 0.2 + i * 0.01) * 0.3;
    }

    posAttr.needsUpdate = true;

    // Slow auto-rotation
    meshRef.current.rotation.y += delta * 0.03;
    meshRef.current.rotation.x += delta * 0.01;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function ParticleBackground() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      gl={{ antialias: false, alpha: true }}
    >
      <Particles />
    </Canvas>
  );
}
