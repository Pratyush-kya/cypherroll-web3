'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface CrashRocketCanvasProps {
  multiplier: number;
  isCrashed: boolean;
  gameState: 'IDLE' | 'STARTING' | 'FLYING' | 'CRASHED';
}

let cachedRocketGltf: THREE.Group | null = null;

export default function CrashRocketCanvas({ multiplier, isCrashed, gameState }: CrashRocketCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [modelSource, setModelSource] = useState<'blender' | 'procedural'>('procedural');

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

      const width = currentMount.clientWidth || 340;
      const height = currentMount.clientHeight || 260;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 1.2, 5.5);
      camera.lookAt(0, 0.1, 0);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      currentMount.appendChild(renderer.domElement);

      // Studio Cyberpunk Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const purpleLight = new THREE.PointLight(0xa855f7, 8, 16);
      purpleLight.position.set(2.5, 3.2, 3.0);
      scene.add(purpleLight);

      const cyanLight = new THREE.PointLight(0x06b6d4, 6, 14);
      cyanLight.position.set(-3.0, -1.0, 2.5);
      scene.add(cyanLight);

      const thrusterLight = new THREE.PointLight(0xf59e0b, 9, 12);
      thrusterLight.position.set(-1.6, -1.0, 0);
      scene.add(thrusterLight);

      // Master Rocket Group
      const rocketGroup = new THREE.Group();
      scene.add(rocketGroup);

      // Procedural Fallback Hull
      const proceduralGroup = new THREE.Group();
      rocketGroup.add(proceduralGroup);

      const hullGeo = new THREE.CylinderGeometry(0.38, 0.44, 2.2, 24);
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.94,
        roughness: 0.16,
      });
      const hullMesh = new THREE.Mesh(hullGeo, hullMat);
      hullMesh.rotation.z = -Math.PI / 4;
      proceduralGroup.add(hullMesh);

      const noseGeo = new THREE.ConeGeometry(0.38, 1.1, 24);
      const noseMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.6,
        metalness: 0.85,
        roughness: 0.1,
      });
      const noseMesh = new THREE.Mesh(noseGeo, noseMat);
      noseMesh.position.set(1.15, 1.15, 0);
      noseMesh.rotation.z = -Math.PI / 4;
      proceduralGroup.add(noseMesh);

      // Load Master Blender GLB Model
      const attachBlenderRocket = (clonedScene: THREE.Group) => {
        clonedScene.scale.set(0.55, 0.55, 0.55);
        clonedScene.rotation.z = -Math.PI / 4;
        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        rocketGroup.remove(proceduralGroup);
        rocketGroup.add(clonedScene);
        setModelSource('blender');
      };

      if (cachedRocketGltf) {
        attachBlenderRocket(cachedRocketGltf.clone());
      } else {
        const loader = new GLTFLoader();
        loader.load(
          '/assets/3d/rocket.glb',
          (gltf) => {
            cachedRocketGltf = gltf.scene;
            attachBlenderRocket(gltf.scene.clone());
          },
          undefined,
          (err) => {
            console.warn('GLB rocket asset fallback to procedural engine:', err);
          }
        );
      }

      // Dynamic Animated Thruster Flame
      const flameGeo = new THREE.ConeGeometry(0.25, 1.4, 16);
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf97316,
        emissiveIntensity: 2.8,
        transparent: true,
        opacity: 0.9,
      });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      flameMesh.position.set(-1.45, -1.45, 0);
      flameMesh.rotation.z = Math.PI * 0.75;
      rocketGroup.add(flameMesh);

      // Particle Starfield
      const starCount = 150;
      const starCoords = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starCoords[i] = (Math.random() - 0.5) * 16;
        starCoords[i + 1] = (Math.random() - 0.5) * 12;
        starCoords[i + 2] = (Math.random() - 0.5) * 6;
      }
      const starsGeo = new THREE.BufferGeometry();
      starsGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
      const starsMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.05,
        transparent: true,
        opacity: 0.8,
      });
      const starField = new THREE.Points(starsGeo, starsMat);
      scene.add(starField);

      // Particle Exhaust Sparks
      const sparkCount = 60;
      const sparkPositions = new Float32Array(sparkCount * 3);
      const sparkSpeeds: { vx: number; vy: number; life: number }[] = [];
      for (let i = 0; i < sparkCount; i++) {
        sparkPositions[i * 3] = -1.5;
        sparkPositions[i * 3 + 1] = -1.5;
        sparkPositions[i * 3 + 2] = 0;
        sparkSpeeds.push({
          vx: -(Math.random() * 0.08 + 0.04),
          vy: -(Math.random() * 0.08 + 0.04),
          life: Math.random(),
        });
      }
      const sparksGeo = new THREE.BufferGeometry();
      sparksGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
      const sparksMat = new THREE.PointsMaterial({
        color: 0xf59e0b,
        size: 0.08,
        transparent: true,
        opacity: 0.9,
      });
      const sparkField = new THREE.Points(sparksGeo, sparksMat);
      scene.add(sparkField);

      let time = 0;

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        time += 0.04;

        if (gameState === 'FLYING') {
          // Dynamic cosmic wobble & ascent acceleration
          rocketGroup.position.x = Math.sin(time * 2) * 0.12;
          rocketGroup.position.y = Math.cos(time * 3) * 0.14 + (Math.min(multiplier, 10) * 0.04);
          rocketGroup.rotation.z = Math.sin(time * 2.5) * 0.08;

          // Expanding energetic thruster flame
          const flameScale = 1.0 + Math.sin(time * 15) * 0.25;
          flameMesh.scale.set(flameScale, flameScale * 1.3, flameScale);
          flameMat.emissiveIntensity = 3.5 + Math.sin(time * 20) * 1.5;
          thrusterLight.intensity = 10 + Math.sin(time * 20) * 4;

          // Streaming starfield
          const pos = starsGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < starCount * 3; i += 3) {
            pos[i] -= 0.08;
            pos[i + 1] -= 0.08;
            if (pos[i] < -8) pos[i] = 8;
            if (pos[i + 1] < -6) pos[i + 1] = 6;
          }
          starsGeo.attributes.position.needsUpdate = true;

          // Exhaust spark trails
          const spk = sparksGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < sparkCount; i++) {
            sparkSpeeds[i].life -= 0.025;
            if (sparkSpeeds[i].life <= 0) {
              spk[i * 3] = rocketGroup.position.x - 1.2;
              spk[i * 3 + 1] = rocketGroup.position.y - 1.2;
              spk[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
              sparkSpeeds[i].life = 1.0;
            } else {
              spk[i * 3] += sparkSpeeds[i].vx;
              spk[i * 3 + 1] += sparkSpeeds[i].vy;
            }
          }
          sparksGeo.attributes.position.needsUpdate = true;
        } else if (gameState === 'CRASHED') {
          // Crash tumble & extinguished engine
          rocketGroup.rotation.z += 0.08;
          rocketGroup.position.y -= 0.06;
          flameMesh.scale.set(0.01, 0.01, 0.01);
          flameMat.emissiveIntensity = 0;
          thrusterLight.intensity = 0.5;
        } else {
          // Idle floating hover
          rocketGroup.position.set(0, Math.sin(time * 1.5) * 0.08, 0);
          rocketGroup.rotation.z = Math.sin(time) * 0.04;
          flameMesh.scale.set(0.6, 0.6, 0.6);
          flameMat.emissiveIntensity = 1.2;
          thrusterLight.intensity = 4;
        }

        if (renderer) {
          renderer.render(scene, camera);
        }
      };

      animate();

      handleResize = () => {
        if (!currentMount || !renderer) return;
        const newW = currentMount.clientWidth || 340;
        const newH = currentMount.clientHeight || 260;
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
      if (renderer) renderer.dispose();
    };
  }, [gameState, isCrashed, multiplier]);

  // Tor Safe High-Fidelity Holographic Flight Vector HUD
  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950/90 rounded-2xl border border-purple-500/20 p-6 text-center min-h-[260px] relative overflow-hidden">
        {/* Holographic scanning radar grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(168,85,247,0.05)_50%,transparent_100%)] animate-pulse pointer-events-none" />

        <div className="relative w-32 h-32 rounded-full border-2 border-dashed border-purple-500/40 flex items-center justify-center mb-3">
          <div className={`text-5xl transition-transform duration-300 ${
            gameState === 'FLYING' ? '-rotate-45 scale-110 animate-bounce' : gameState === 'CRASHED' ? 'rotate-90 opacity-50' : ''
          }`}>
            🚀
          </div>
          <span className="absolute inset-2 rounded-full border border-cyan-500/30 animate-spin" />
        </div>

        <div className={`text-4xl font-heading font-black tracking-wider mb-2 ${
          gameState === 'CRASHED' ? 'text-rose-500' : 'text-primary'
        }`}>
          {gameState === 'CRASHED' ? `CRASHED @ ${multiplier.toFixed(2)}x` : `${multiplier.toFixed(2)}x`}
        </div>

        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Tor Stealth Flight HUD Active (Zero Fingerprint)
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[260px]">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-purple-300 uppercase tracking-wider bg-slate-900/90 px-2.5 py-1 rounded border border-purple-500/40 flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-cta animate-ping"></span>
        <span>
          {modelSource === 'blender'
            ? 'CypherRocket 3D (Blender Master Asset)'
            : 'CypherRocket 3D Engine (Sub-50ms Flight)'}
        </span>
      </div>
    </div>
  );
}
