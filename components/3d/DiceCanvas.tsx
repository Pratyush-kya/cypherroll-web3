'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface DiceCanvasProps {
  isRolling: boolean;
  targetRoll?: number;
  lastRoll?: number | null;
  lastWon?: boolean | null;
}

export default function DiceCanvas({ isRolling, targetRoll, lastRoll, lastWon }: DiceCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

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
      camera.position.set(0, 2.2, 5.0);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      currentMount.appendChild(renderer.domElement);

      // Studio Cyberpunk Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);

      const goldLight = new THREE.PointLight(0xf59e0b, 6, 15);
      goldLight.position.set(3, 4, 3);
      scene.add(goldLight);

      const purpleLight = new THREE.PointLight(0xa855f7, 7, 15);
      purpleLight.position.set(-3, -2, -3);
      scene.add(purpleLight);

      const statusLight = new THREE.PointLight(0x06b6d4, 5, 12);
      statusLight.position.set(0, 3, -2);
      scene.add(statusLight);

      // Master Dice Group
      const diceGroup = new THREE.Group();
      scene.add(diceGroup);

      // 1. Obsidian Metallic Body (Beveled Cube Appearance)
      const size = 1.8;
      const bodyGeo = new THREE.BoxGeometry(size, size, size, 4, 4, 4);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f1d,
        metalness: 0.92,
        roughness: 0.18,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      diceGroup.add(bodyMesh);

      // 2. Glowing Neon Circuit Edges
      const edgesGeo = new THREE.EdgesGeometry(bodyGeo, 15);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        linewidth: 2,
        transparent: true,
        opacity: 0.7,
      });
      const wireframe = new THREE.LineSegments(edgesGeo, edgeMat);
      diceGroup.add(wireframe);

      // 3. Glowing Golden Pips (Embedded 3D Spheres on all 6 faces)
      const pipGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const pipMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
        metalness: 0.85,
        roughness: 0.1,
      });

      const half = size / 2 + 0.02;
      const offset = 0.42;

      // Face 1: Front (+Z) -> 1 pip
      const p1 = new THREE.Mesh(pipGeo, pipMat);
      p1.position.set(0, 0, half);
      diceGroup.add(p1);

      // Face 6: Back (-Z) -> 6 pips
      [-offset, offset].forEach((x) => {
        [-offset, 0, offset].forEach((y) => {
          const p = new THREE.Mesh(pipGeo, pipMat);
          p.position.set(x, y, -half);
          diceGroup.add(p);
        });
      });

      // Face 2: Top (+Y) -> 2 pips
      const p2a = new THREE.Mesh(pipGeo, pipMat);
      p2a.position.set(-offset, half, -offset);
      const p2b = new THREE.Mesh(pipGeo, pipMat);
      p2b.position.set(offset, half, offset);
      diceGroup.add(p2a, p2b);

      // Face 5: Bottom (-Y) -> 5 pips
      [[-offset, -offset], [offset, -offset], [0, 0], [-offset, offset], [offset, offset]].forEach(([x, z]) => {
        const p = new THREE.Mesh(pipGeo, pipMat);
        p.position.set(x, -half, z);
        diceGroup.add(p);
      });

      // Face 3: Right (+X) -> 3 pips
      [[-offset, -offset], [0, 0], [offset, offset]].forEach(([y, z]) => {
        const p = new THREE.Mesh(pipGeo, pipMat);
        p.position.set(half, y, z);
        diceGroup.add(p);
      });

      // Face 4: Left (-X) -> 4 pips
      [[-offset, -offset], [offset, -offset], [-offset, offset], [offset, offset]].forEach(([y, z]) => {
        const p = new THREE.Mesh(pipGeo, pipMat);
        p.position.set(-half, y, z);
        diceGroup.add(p);
      });

      // Initial Angled Isometric Presentation
      diceGroup.rotation.x = 0.45;
      diceGroup.rotation.y = 0.65;
      diceGroup.rotation.z = 0.15;

      let velX = 0.006;
      let velY = 0.009;
      let velZ = 0.004;

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        if (isRolling) {
          diceGroup.rotation.x += 0.24;
          diceGroup.rotation.y += 0.29;
          diceGroup.rotation.z += 0.19;
          edgeMat.color.setHex(0xf59e0b);
          statusLight.color.setHex(0xf59e0b);
        } else {
          // Smooth floating idle rotation
          diceGroup.rotation.x += velX;
          diceGroup.rotation.y += velY;
          diceGroup.rotation.z += velZ;

          // Reactive glow on win/loss outcome
          if (lastWon === true) {
            edgeMat.color.setHex(0x10b981);
            statusLight.color.setHex(0x10b981);
          } else if (lastWon === false) {
            edgeMat.color.setHex(0xef4444);
            statusLight.color.setHex(0xef4444);
          } else {
            edgeMat.color.setHex(0x00f0ff);
            statusLight.color.setHex(0x00f0ff);
          }
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
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [isRolling, lastWon]);

  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-6 text-center min-h-[240px]">
        <div className="text-5xl mb-3 animate-bounce">🎲</div>
        <div className="text-primary font-mono text-xl font-bold tracking-wider mb-1">
          {isRolling ? "Rolling..." : `Target: ${targetRoll ?? 50.00}`}
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          Tor Safe 2D Fallback Active
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[240px]">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-primary uppercase tracking-wider bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1.5 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
        <span>CypherDice 3D Engine (Zero-Latency)</span>
      </div>
    </div>
  );
}
