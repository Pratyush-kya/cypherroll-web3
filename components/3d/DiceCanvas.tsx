'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface DiceCanvasProps {
  isRolling: boolean;
  targetRoll?: number;
  lastRoll?: number | null;
  lastWon?: boolean | null;
}

let cachedDiceGltf: THREE.Group | null = null;

export default function DiceCanvas({ isRolling, targetRoll, lastRoll, lastWon }: DiceCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [modelSource, setModelSource] = useState<'blender' | 'procedural'>('procedural');

  // Deterministic dice phase without setState in requestAnimationFrame
  const dicePhase: 'IDLE' | 'KINETIC_TUMBLE' | 'JACKPOT_VICTORY' | 'RAID_OVERLOAD' =
    isRolling
      ? 'KINETIC_TUMBLE'
      : lastWon === true
      ? 'JACKPOT_VICTORY'
      : lastWon === false
      ? 'RAID_OVERLOAD'
      : 'IDLE';

  // Synchronize mutable refs for 60fps animation loop to prevent WebGL teardown
  const propsRef = useRef({ isRolling, targetRoll, lastRoll, lastWon });
  useEffect(() => {
    propsRef.current = { isRolling, targetRoll, lastRoll, lastWon };
  }, [isRolling, targetRoll, lastRoll, lastWon]);

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
      camera.position.set(0, 2.0, 4.8);
      camera.lookAt(0, 0, 0);

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

      // Studio Cyberpunk Lighting (Key: Gold Amber, Rim: Cyan, Fill: Violet)
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
      scene.add(ambientLight);

      const goldLight = new THREE.PointLight(0xffb800, 8, 16);
      goldLight.position.set(3.5, 4.0, 3.5);
      scene.add(goldLight);

      const purpleLight = new THREE.PointLight(0x8b5cf6, 8, 16);
      purpleLight.position.set(-3.5, -2.5, -3.0);
      scene.add(purpleLight);

      const statusLight = new THREE.PointLight(0x00f0ff, 6, 14);
      statusLight.position.set(0, 3.2, -2.2);
      scene.add(statusLight);

      // Victory Shockwave Ring
      const shockwaveGeo = new THREE.RingGeometry(0.5, 0.65, 32);
      const shockwaveMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
      shockwave.rotation.x = Math.PI / 4;
      scene.add(shockwave);

      // Master Dice Group
      const diceGroup = new THREE.Group();
      scene.add(diceGroup);

      // Procedural Fallback Mesh Group
      const proceduralGroup = new THREE.Group();
      diceGroup.add(proceduralGroup);

      const size = 1.8;
      const bodyGeo = new THREE.BoxGeometry(size, size, size, 4, 4, 4);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x070a12,
        metalness: 0.95,
        roughness: 0.14,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      proceduralGroup.add(bodyMesh);

      const edgesGeo = new THREE.EdgesGeometry(bodyGeo, 15);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      const wireframe = new THREE.LineSegments(edgesGeo, edgeMat);
      proceduralGroup.add(wireframe);

      const pipGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const pipMat = new THREE.MeshStandardMaterial({
        color: 0xffb800,
        emissive: 0xffb800,
        emissiveIntensity: 0.9,
        metalness: 0.90,
        roughness: 0.08,
      });

      const half = size / 2 + 0.02;
      const offset = 0.42;

      // Face 1: Front (+Z)
      const p1 = new THREE.Mesh(pipGeo, pipMat);
      p1.position.set(0, 0, half);
      proceduralGroup.add(p1);

      // Face 6: Back (-Z)
      [-offset, offset].forEach((x) => {
        [-offset, 0, offset].forEach((y) => {
          const p = new THREE.Mesh(pipGeo, pipMat);
          p.position.set(x, y, -half);
          proceduralGroup.add(p);
        });
      });

      // Face 2: Top (+Y)
      const p2a = new THREE.Mesh(pipGeo, pipMat);
      p2a.position.set(-offset, half, -offset);
      const p2b = new THREE.Mesh(pipGeo, pipMat);
      p2b.position.set(offset, half, offset);
      proceduralGroup.add(p2a, p2b);

      // Face 5: Bottom (-Y)
      [[-offset, -offset], [offset, -offset], [0, 0], [-offset, offset], [offset, offset]].forEach(([x, z]) => {
        const p = new THREE.Mesh(pipGeo, pipMat);
        p.position.set(x, -half, z);
        proceduralGroup.add(p);
      });

      // Face 3: Right (+X)
      [[-offset, -offset], [0, 0], [offset, offset]].forEach(([y, z]) => {
        const p = new THREE.Mesh(pipGeo, pipMat);
        p.position.set(half, y, z);
        proceduralGroup.add(p);
      });

      // Face 4: Left (-X)
      [[-offset, -offset], [offset, -offset], [-offset, offset], [offset, offset]].forEach(([y, z]) => {
        const p = new THREE.Mesh(pipGeo, pipMat);
        p.position.set(-half, y, z);
        proceduralGroup.add(p);
      });

      // Load Master Blender GLB Model
      const attachBlenderModel = (clonedScene: THREE.Group) => {
        // Scale adjustment for web
        clonedScene.scale.set(1.1, 1.1, 1.1);
        
        // Generate native WebGL materials
        const diceMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xcc0011, // Solid rich casino red
          metalness: 0.15,
          roughness: 0.10, // Glossy plastic/resin look
          clearcoat: 1.0,  // Glazed corners
          clearcoatRoughness: 0.2,
          sheen: 1.0,
          sheenColor: new THREE.Color(0xffd700), // Light gold glaze
        });
        
        const pipMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff, // Normal white dots (no extreme emissive/glaze)
          roughness: 0.5,
          metalness: 0.0
        });

        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            
            // Foolproof mesh identification
            if (m.name.includes("Cube")) {
                m.material = diceMaterial;
            } else if (m.name.includes("Cylinder")) {
                m.material = pipMaterial;
            }
          }
        });
        
        // Mathematically center the imported model to fix any rotation axis wobbling
        const box = new THREE.Box3().setFromObject(clonedScene);
        const center = box.getCenter(new THREE.Vector3());
        clonedScene.position.sub(center);

        diceGroup.remove(proceduralGroup);
        diceGroup.add(clonedScene);
        setModelSource('blender');
      };

      if (cachedDiceGltf) {
        attachBlenderModel(cachedDiceGltf.clone());
      } else {
        const loader = new GLTFLoader();
        loader.load(
          '/assets/3d/dice_v3.glb?v=' + Date.now(),
          (gltf) => {
            cachedDiceGltf = gltf.scene;
            attachBlenderModel(gltf.scene.clone());
          },
          undefined,
          (err) => console.warn('GLB dice fallback:', err)
        );
      }

      diceGroup.rotation.x = 0.45;
      diceGroup.rotation.y = 0.65;
      diceGroup.rotation.z = 0.15;

      let waveScale = 0.1;
      
      // Momentum variables for smooth transition
      let velocityX = 0.006;
      let velocityY = 0.009;
      let velocityZ = 0.004;

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        const { isRolling: curRolling, lastWon: curWon } = propsRef.current;

        // Determine target velocities based on mathematical game state
        let targetVx, targetVy, targetVz;

        if (curRolling) {
          targetVx = 0.35;
          targetVy = 0.42;
          targetVz = 0.25;

          edgeMat.color.setHex(0xffb800);
          statusLight.color.setHex(0xffb800);
          shockwaveMat.opacity = 0;
          waveScale = 0.1;
        } else {
          // Idle or Outcome states
          targetVx = curWon === true ? 0.003 : curWon === false ? 0.004 : 0.006;
          targetVy = curWon === true ? 0.004 : curWon === false ? 0.005 : 0.009;
          targetVz = curWon === true ? 0.001 : curWon === false ? 0.001 : 0.004;

          if (curWon === true) {
            edgeMat.color.setHex(0x10b981);
            statusLight.color.setHex(0x10b981);

            waveScale += 0.08;
            shockwave.scale.set(waveScale, waveScale, waveScale);
            shockwaveMat.opacity = Math.max(0, 1.0 - waveScale / 4.0);
          } else if (curWon === false) {
            edgeMat.color.setHex(0xef4444);
            statusLight.color.setHex(0xef4444);
            shockwaveMat.opacity = 0;
          } else {
            edgeMat.color.setHex(0x00f0ff);
            statusLight.color.setHex(0x00f0ff);
            shockwaveMat.opacity = 0;
          }
        }

        // Smooth linear interpolation (lerp) for natural physics transition
        velocityX += (targetVx - velocityX) * 0.05;
        velocityY += (targetVy - velocityY) * 0.05;
        velocityZ += (targetVz - velocityZ) * 0.05;

        diceGroup.rotation.x += velocityX;
        diceGroup.rotation.y += velocityY;
        diceGroup.rotation.z += velocityZ;

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

  // Tor Safe 2D Fallback
  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950/90 rounded-2xl border border-amber-500/20 p-6 text-center min-h-[260px] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(245,158,11,0.05)_50%,transparent_100%)] animate-pulse pointer-events-none" />

        <div className={`relative w-28 h-28 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center mb-4 ${
          isRolling
            ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.4)] rotate-45'
            : lastWon === true
            ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
            : lastWon === false
            ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
            : 'border-cyan-500/40 bg-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
        }`}>
          <div className="text-4xl font-mono font-black text-white">
            {isRolling ? '...' : typeof lastRoll === 'number' ? lastRoll.toFixed(2) : (targetRoll ?? 50.0).toFixed(0)}
          </div>
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-amber-400 rounded-sm" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-sm" />
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-sm" />
        </div>

        <div className="text-primary font-mono text-lg font-bold tracking-wider mb-1">
          {isRolling ? 'CRYPTOGRAPHIC ROLL IN PROGRESS...' : `TARGET: ${targetRoll ?? 50.0}`}
        </div>
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-emerald-500/30">
          Tor Stealth Mode • Phase: {dicePhase}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[260px]">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
