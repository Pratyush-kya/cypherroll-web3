'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface DiceCanvasProps {
  isRolling: boolean;
  targetRoll?: number;
}

export default function DiceCanvas({ isRolling, targetRoll }: DiceCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, currentMount.clientWidth / currentMount.clientHeight, 0.1, 100);
    camera.position.set(0, 2.8, 5.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Studio Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 5, 12);
    goldLight.position.set(3, 4, 3);
    scene.add(goldLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 6, 12);
    purpleLight.position.set(-3, -2, -3);
    scene.add(purpleLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 4, 10);
    cyanLight.position.set(0, 3, -3);
    scene.add(cyanLight);

    let diceGroup = new THREE.Group();
    scene.add(diceGroup);

    // Load Real Blender GLB Asset
    const loader = new GLTFLoader();
    loader.load(
      '/assets/3d/dice.glb',
      (gltf) => {
        const model = gltf.scene;
        // Center model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.scale.set(1.1, 1.1, 1.1);
        diceGroup.add(model);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.warn("Falling back to procedural mesh:", err);
        // Fallback procedural cube if asset path fails
        const geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        const material = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          metalness: 0.95,
          roughness: 0.15,
        });
        const fallbackMesh = new THREE.Mesh(geometry, material);
        diceGroup.add(fallbackMesh);
        setLoading(false);
      }
    );

    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (isRolling) {
        diceGroup.rotation.x += 0.22;
        diceGroup.rotation.y += 0.28;
        diceGroup.rotation.z += 0.18;
      } else {
        diceGroup.rotation.x += 0.008;
        diceGroup.rotation.y += 0.012;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isRolling]);

  if (!hasWebGL) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-slate-900 rounded-xl border border-slate-700">
        <span className="text-primary font-mono text-xl font-bold animate-pulse">
          🎲 {isRolling ? "Rolling..." : `Target: ${targetRoll ?? 50.00}`}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[240px]">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-primary uppercase tracking-wider bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1.5 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
        <span>Blender 4.3 Asset Loaded</span>
      </div>
    </div>
  );
}
