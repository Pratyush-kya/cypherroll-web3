'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface CrashRocketCanvasProps {
  multiplier: number;
  isCrashed: boolean;
  gameState: 'IDLE' | 'STARTING' | 'FLYING' | 'CRASHED';
}

export default function CrashRocketCanvas({ multiplier, isCrashed, gameState }: CrashRocketCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    let starsGeo: THREE.BufferGeometry | null = null;
    let starsMat: THREE.PointsMaterial | null = null;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }

      const width = currentMount.clientWidth || 320;
      const height = currentMount.clientHeight || 260;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 1.6, 5.5);
      camera.lookAt(0, 0.5, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      currentMount.appendChild(renderer.domElement);

      // Dynamic Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambientLight);

      const purpleLight = new THREE.PointLight(0x8b5cf6, 6, 18);
      purpleLight.position.set(0, 2, 3);
      scene.add(purpleLight);

      const flameLight = new THREE.PointLight(0xf59e0b, 7, 10);
      flameLight.position.set(-1, -1, 0);
      scene.add(flameLight);

      const rocketGroup = new THREE.Group();
      scene.add(rocketGroup);

      // Load Real Blender GLB Asset
      const loader = new GLTFLoader();
      loader.load(
        '/assets/3d/rocket.glb',
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          model.scale.set(0.65, 0.65, 0.65);
          model.rotation.z = -Math.PI / 4;
          rocketGroup.add(model);
        },
        undefined,
        () => {
          const hullGeo = new THREE.ConeGeometry(0.4, 1.8, 16);
          const hullMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
          const hull = new THREE.Mesh(hullGeo, hullMat);
          hull.rotation.z = -Math.PI / 4;
          rocketGroup.add(hull);
        }
      );

      // Particle Stars
      starsGeo = new THREE.BufferGeometry();
      const starCount = 120;
      const starCoords = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starCoords[i] = (Math.random() - 0.5) * 12;
        starCoords[i + 1] = (Math.random() - 0.5) * 12;
        starCoords[i + 2] = (Math.random() - 0.5) * 6;
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
      starsMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.045 });
      const starField = new THREE.Points(starsGeo, starsMat);
      scene.add(starField);

      let clock = new THREE.Clock();

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();

        if (gameState === 'FLYING') {
          rocketGroup.position.y = Math.sin(elapsed * 5) * 0.18;
          rocketGroup.position.x = Math.cos(elapsed * 4) * 0.12;
          starField.position.x -= 0.04;
          if (starField.position.x < -4) starField.position.x = 4;
        } else if (gameState === 'CRASHED') {
          rocketGroup.rotation.z += 0.08;
          purpleLight.color.setHex(0xef4444);
        } else {
          rocketGroup.position.set(0, 0, 0);
          purpleLight.color.setHex(0x8b5cf6);
        }

        if (renderer) {
          renderer.render(scene, camera);
        }
      };

      animate();
    } catch (err) {
      console.warn('WebGL initialization prevented by browser security sandbox:', err);
      setHasWebGL(false);
      return;
    }

    return () => {
      cancelAnimationFrame(animationId);
      if (renderer && renderer.domElement && currentMount && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      if (starsGeo) starsGeo.dispose();
      if (starsMat) starsMat.dispose();
      if (renderer) renderer.dispose();
    };
  }, [gameState, isCrashed]);

  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-6 text-center">
        <div className="text-4xl mb-3 animate-pulse">🚀</div>
        <div className={`text-3xl font-heading font-black tracking-wider mb-2 ${
          gameState === 'CRASHED' ? 'text-rose-500' : 'text-primary'
        }`}>
          {gameState === 'CRASHED' ? 'CRASHED @ ' + multiplier.toFixed(2) + 'x' : `${multiplier.toFixed(2)}x`}
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          Tor Privacy Mode Active (2D Flight Fallback)
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[260px]">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-purple-300 uppercase tracking-wider bg-slate-900/90 px-2 py-0.5 rounded border border-purple-500/40 flex items-center gap-1.5 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-cta animate-ping"></span>
        <span>Blender Rocket Asset</span>
      </div>
    </div>
  );
}
