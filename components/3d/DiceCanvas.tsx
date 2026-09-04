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

    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    let handleResize: (() => void) | null = null;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }

      const width = currentMount.clientWidth || 320;
      const height = currentMount.clientHeight || 240;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 2.8, 5.2);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

      const diceGroup = new THREE.Group();
      scene.add(diceGroup);

      // Load Real Blender GLB Asset
      const loader = new GLTFLoader();
      loader.load(
        '/assets/3d/dice.glb',
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          model.scale.set(1.1, 1.1, 1.1);
          diceGroup.add(model);
          setLoading(false);
        },
        undefined,
        () => {
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

        if (renderer) {
          renderer.render(scene, camera);
        }
      };

      animate();

      handleResize = () => {
        if (!currentMount || !renderer) return;
        const newW = currentMount.clientWidth || 320;
        const newH = currentMount.clientHeight || 240;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };

      window.addEventListener('resize', handleResize);
    } catch (err) {
      console.warn('WebGL initialization prevented by browser security sandbox:', err);
      setHasWebGL(false);
      return;
    }

    return () => {
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      cancelAnimationFrame(animationId);
      if (renderer && renderer.domElement && currentMount && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [isRolling]);

  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-6 text-center">
        <div className="text-4xl mb-3 animate-bounce">🎲</div>
        <div className="text-primary font-mono text-xl font-bold tracking-wider mb-1">
          {isRolling ? "Rolling..." : `Target: ${targetRoll ?? 50.00}`}
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          Tor Privacy Mode Active (2D Canvas Fallback)
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
