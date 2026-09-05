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

  // Compute flight phase deterministically without setState in 60fps loop
  const flightPhase: 'LAUNCHPAD' | 'IGNITION' | 'ATMOSPHERIC' | 'STRATOSPHERE' | 'NEBULA_WARP' | 'SUPERNOVA' | 'DETONATION' =
    gameState === 'CRASHED'
      ? 'DETONATION'
      : gameState === 'STARTING'
      ? 'IGNITION'
      : gameState === 'FLYING'
      ? multiplier < 2.0
        ? 'ATMOSPHERIC'
        : multiplier < 5.0
        ? 'STRATOSPHERE'
        : multiplier < 15.0
        ? 'NEBULA_WARP'
        : 'SUPERNOVA'
      : 'LAUNCHPAD';

  // Synchronize mutable refs for 60fps animation loop to prevent WebGL context thrashing
  const stateRef = useRef({ multiplier, isCrashed, gameState });
  useEffect(() => {
    stateRef.current = { multiplier, isCrashed, gameState };
  }, [multiplier, isCrashed, gameState]);

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
      scene.background = new THREE.Color(0x05070e);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 1.4, 5.8);
      camera.lookAt(0, 0.2, 0);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      currentMount.appendChild(renderer.domElement);

      // Phase Studio Lights (Color-Morphing across flight tiers)
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
      scene.add(ambientLight);

      const keyLight = new THREE.PointLight(0xf59e0b, 8, 18);
      keyLight.position.set(3.0, 3.5, 3.5);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0x00f0ff, 7, 16);
      rimLight.position.set(-3.5, -1.0, 2.8);
      scene.add(rimLight);

      const thrusterLight = new THREE.PointLight(0xff4500, 10, 14);
      thrusterLight.position.set(-1.6, -1.0, 0);
      scene.add(thrusterLight);

      // 1. Launchpad Dock Ring (Direct from Blender cypherroll_showcase.blend)


      // 2. Master Rocket Group
      const rocketGroup = new THREE.Group();
      scene.add(rocketGroup);

      // Procedural Fallback Hull while GLTF loads
      const proceduralGroup = new THREE.Group();
      rocketGroup.add(proceduralGroup);

      const hullGeo = new THREE.CylinderGeometry(0.38, 0.44, 2.2, 24);
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x0e1424,
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
        emissiveIntensity: 0.8,
        metalness: 0.85,
        roughness: 0.12,
      });
      const noseMesh = new THREE.Mesh(noseGeo, noseMat);
      noseMesh.position.set(1.15, 1.15, 0);
      noseMesh.rotation.z = -Math.PI / 4;
      proceduralGroup.add(noseMesh);

      // 3. Blender Master GLTF Model Loader
      let blenderRocketRef: THREE.Group | null = null;

      const attachBlenderRocket = (clonedScene: THREE.Group) => {
        blenderRocketRef = clonedScene;
        clonedScene.scale.set(0.70, 0.70, 0.70);
        clonedScene.rotation.z = -Math.PI / 4;
        
        // Generate native WebGL materials to bypass HTML rendering issues
        const hullMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0.1,
          roughness: 0.1,
          clearcoat: 1.0
        });
        
        const finMaterial = new THREE.MeshStandardMaterial({
          color: 0x00ccff,
          metalness: 0.3,
          roughness: 0.2
        });
        
        const fireMaterial = new THREE.MeshStandardMaterial({
          color: 0xffff00,
          emissive: 0xffaa00,
          emissiveIntensity: 3.5,
          roughness: 0.8
        });

        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            
            // Assign materials based on Blender object names
            if (m.name.includes("Cube")) { // Fins
                m.material = finMaterial;
            } else if (m.name.includes("Sphere")) { // Fire thrust
                m.material = fireMaterial;
            } else { // Fuselage / Nose
                m.material = hullMaterial;
            }
          }
        });
        
        // Mathematically center the imported model to fix any rotation axis wobbling
        const box = new THREE.Box3().setFromObject(clonedScene);
        const center = box.getCenter(new THREE.Vector3());
        clonedScene.position.sub(center);

        rocketGroup.remove(proceduralGroup);
        rocketGroup.add(clonedScene);
        setModelSource('blender');
      };

      if (cachedRocketGltf) {
        attachBlenderRocket(cachedRocketGltf.clone());
      } else {
        const loader = new GLTFLoader();
        loader.load(
          '/assets/3d/rocket.glb?v=' + Date.now(),
          (gltf) => {
            cachedRocketGltf = gltf.scene;
            attachBlenderRocket(gltf.scene.clone());
          },
          undefined,
          (err) => console.warn('Rocket GLB stream fallback:', err)
        );
      }

      // 4. Dynamic Multi-Stage Thruster Plasma Flame
      const flameGeo = new THREE.ConeGeometry(0.26, 1.5, 24);
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xff4500,
        emissive: 0xff3300,
        emissiveIntensity: 3.5,
        transparent: true,
        opacity: 0.95,
      });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      flameMesh.position.set(-1.5, -1.5, 0);
      flameMesh.rotation.z = Math.PI * 0.75;
      rocketGroup.add(flameMesh);

      // Inner White-Hot Plasma Core
      const innerFlameGeo = new THREE.ConeGeometry(0.14, 0.9, 16);
      const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const innerFlameMesh = new THREE.Mesh(innerFlameGeo, innerFlameMat);
      innerFlameMesh.position.set(-1.3, -1.3, 0);
      innerFlameMesh.rotation.z = Math.PI * 0.75;
      rocketGroup.add(innerFlameMesh);

      // 5. Cosmic Starfield & Hyperspace Streaks
      const starCount = 180;
      const starCoords = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starCoords[i] = (Math.random() - 0.5) * 18;
        starCoords[i + 1] = (Math.random() - 0.5) * 14;
        starCoords[i + 2] = (Math.random() - 0.5) * 8;
      }
      const starsGeo = new THREE.BufferGeometry();
      starsGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
      const starsMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.05,
        transparent: true,
        opacity: 0.85,
      });
      const starField = new THREE.Points(starsGeo, starsMat);
      scene.add(starField);

      // 6. Detonation Shockwave Ring for Crash Phase
      const shockwaveGeo = new THREE.RingGeometry(0.2, 0.4, 32);
      const shockwaveMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
      });
      const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
      scene.add(shockwave);


      let time = 0;
      let shockwaveScale = 0.1;

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        time += 0.035;

        const { multiplier: curMult, gameState: curState } = stateRef.current;

        // PHASE 1: LAUNCHPAD PRE-FLIGHT (IDLE)
        if (curState === 'IDLE') {
          shockwaveMat.opacity = 0;

          // Dock ring breathing pulse
          const dockGlow = 2.0 + Math.sin(time * 3) * 1.0;

          // Subtle harmonic dock hover
          rocketGroup.position.set(0, -0.2 + Math.sin(time * 2) * 0.05, 0);
          rocketGroup.rotation.z = Math.sin(time) * 0.03;

          // Pilot thruster flame
          flameMesh.scale.set(0.35, 0.4, 0.35);
          flameMat.emissiveIntensity = 1.0;
          flameMat.color.setHex(0x00f0ff);
          flameMat.emissive.setHex(0x00f0ff);
          innerFlameMesh.scale.set(0.2, 0.2, 0.2);

          keyLight.color.setHex(0x00f0ff);
          rimLight.color.setHex(0x8b5cf6);
          thrusterLight.intensity = 2.0;
        }

        // PHASE 2: IGNITION COUNTDOWN (STARTING)
        else if (curState === 'STARTING') {

          // High-frequency mechanical engine shudder
          const jitterX = (Math.random() - 0.5) * 0.06;
          const jitterY = (Math.random() - 0.5) * 0.06;
          rocketGroup.position.set(jitterX, -0.2 + jitterY, 0);

          // Pre-ignition amber ignition flare

          flameMesh.scale.set(0.7, 0.8, 0.7);
          flameMat.emissiveIntensity = 4.0;
          flameMat.color.setHex(0xffb800);
          flameMat.emissive.setHex(0xff4500);

          keyLight.color.setHex(0xffb800);
          thrusterLight.color.setHex(0xff4500);
          thrusterLight.intensity = 8.0;

        }

        // PHASE 3: SUPERSONIC COSMIC FLIGHT (FLYING) - MULTI-TIER PALETTE VIDEO PROGRESSION
        else if (curState === 'FLYING') {
          shockwaveMat.opacity = 0;

          // Supersonic wobble & acceleration curve
          const wobble = Math.sin(time * 3.5) * 0.08;
          rocketGroup.position.x = Math.sin(time * 2.2) * 0.14;
          rocketGroup.position.y = Math.cos(time * 2.8) * 0.12 + Math.min(curMult * 0.05, 1.2);
          rocketGroup.rotation.z = wobble;

          // Dynamic Palette Tiers based on Multiplier Video Progression:
          // Tier 1: 1.00x - 2.00x (Atmospheric Ascent: Cyan & Violet)
          if (curMult < 2.0) {
            keyLight.color.setHex(0x00f0ff);
            rimLight.color.setHex(0x8b5cf6);
            thrusterLight.color.setHex(0x00f0ff);
            flameMat.color.setHex(0x00f0ff);
            flameMat.emissive.setHex(0x00f0ff);
            flameMesh.scale.set(1.1 + Math.sin(time * 15) * 0.2, 1.3, 1.1);
          }
          // Tier 2: 2.00x - 5.00x (Stratospheric Burn: 24K Imperial Gold & Amber)
          else if (curMult < 5.0) {
            keyLight.color.setHex(0xffb800);
            rimLight.color.setHex(0xff4500);
            thrusterLight.color.setHex(0xffb800);
            flameMat.color.setHex(0xffb800);
            flameMat.emissive.setHex(0xff4500);
            flameMesh.scale.set(1.4 + Math.sin(time * 20) * 0.25, 1.7, 1.4);
          }
          // Tier 3: 5.00x - 15.00x (Nebula Warp: Synthwave Magenta & Electric Blue)
          else if (curMult < 15.0) {
            keyLight.color.setHex(0xec4899);
            rimLight.color.setHex(0x3b82f6);
            thrusterLight.color.setHex(0xec4899);
            flameMat.color.setHex(0xec4899);
            flameMat.emissive.setHex(0x8b5cf6);
            flameMesh.scale.set(1.7 + Math.sin(time * 25) * 0.3, 2.1, 1.7);
          }
          // Tier 4: 15.00x+ (Supernova Hyperdrive: High-Voltage White Plasma Strobe)
          else {
            const strobe = Math.sin(time * 30) > 0 ? 0xffffff : 0xff4500;
            keyLight.color.setHex(strobe);
            rimLight.color.setHex(0x00f0ff);
            thrusterLight.color.setHex(0xffffff);
            flameMat.color.setHex(0xffffff);
            flameMat.emissive.setHex(0xffffff);
            flameMesh.scale.set(2.0 + Math.sin(time * 35) * 0.4, 2.6, 2.0);
            camera.position.x = (Math.random() - 0.5) * 0.04;
          }

          // Accelerating streaming starfield
          const speedMultiplier = Math.min(1.0 + curMult * 0.15, 3.5);
          const pos = starsGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < starCount * 3; i += 3) {
            pos[i] -= 0.10 * speedMultiplier;
            pos[i + 1] -= 0.10 * speedMultiplier;
            if (pos[i] < -9) pos[i] = 9;
            if (pos[i + 1] < -7) pos[i + 1] = 7;
          }
          starsGeo.attributes.position.needsUpdate = true;

        }

        // PHASE 4: DETONATION / HULL BREACH (CRASHED)
        else if (curState === 'CRASHED') {

          // Expanding explosive fireball shockwave
          shockwaveScale += 0.18;
          shockwave.scale.set(shockwaveScale, shockwaveScale, shockwaveScale);
          shockwave.position.copy(rocketGroup.position);
          shockwaveMat.opacity = Math.max(0, 1.0 - (shockwaveScale / 8.0));

          // Tumbling burned out debris
          rocketGroup.rotation.z += 0.12;
          rocketGroup.rotation.x += 0.08;
          rocketGroup.position.y -= 0.07;
          rocketGroup.position.x += 0.03;

          // Extinguish main engine
          flameMesh.scale.set(0.01, 0.01, 0.01);
          innerFlameMesh.scale.set(0.01, 0.01, 0.01);

          // Crimson Emergency Warning Strobe
          const strobeRed = Math.sin(time * 20) > 0 ? 0xef4444 : 0x450a0a;
          keyLight.color.setHex(strobeRed);
          rimLight.color.setHex(0xef4444);
          thrusterLight.intensity = 0.5;
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
      console.warn('WebGL sandbox:', err);
      setHasWebGL(false);
      return;
    }

    return () => {
      if (handleResize) window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (renderer && renderer.domElement && currentMount && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      if (renderer) renderer.dispose();
    };
  }, []);

  // Tor Safe High-Fidelity 2D Flight HUD
  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950/95 rounded-2xl border border-purple-500/20 p-6 text-center min-h-[260px] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(168,85,247,0.06)_50%,transparent_100%)] animate-pulse pointer-events-none" />
        <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-purple-500/40 flex items-center justify-center mb-3">
          <div className={`text-5xl transition-transform duration-300 ${
            gameState === 'FLYING' ? '-rotate-45 scale-110 animate-bounce' : gameState === 'CRASHED' ? 'rotate-90 opacity-50' : ''
          }`}>
            🚀
          </div>
          <span className="absolute inset-1.5 rounded-full border border-cyan-500/30 animate-spin" />
        </div>
        <div className={`text-4xl font-heading font-black tracking-wider mb-1 ${
          gameState === 'CRASHED' ? 'text-rose-500' : 'text-primary'
        }`}>
          {gameState === 'CRASHED' ? `CRASHED @ ${multiplier.toFixed(2)}x` : `${multiplier.toFixed(2)}x`}
        </div>
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-emerald-500/30">
          Tor Stealth Mode • Phase: {flightPhase}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
