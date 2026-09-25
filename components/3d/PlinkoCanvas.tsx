'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sounds } from '@/lib/sound-effects';

export interface PlinkoDropPayload {
  id: string;
  path: number[];
  slot: number;
  multiplier: number;
}

interface PlinkoCanvasProps {
  rows: number;
  activeDrop?: PlinkoDropPayload | null;
  onBallLanded?: (slot: number, multiplier: number) => void;
  // Legacy compatibility props
  isDropping?: boolean;
  path?: number[] | null;
  slot?: number | null;
  multiplier?: number | null;
}

interface ActiveBall {
  id: string;
  path: number[];
  slot: number;
  multiplier: number;
  animTime: number;
  lastStep: number;
  mesh: THREE.Mesh;
}

export default function PlinkoCanvas({
  rows,
  activeDrop,
  onBallLanded,
  isDropping,
  path,
  slot,
  multiplier,
}: PlinkoCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  // Synchronize mutable refs for 60fps animation loop
  const propsRef = useRef({
    rows,
    activeDrop,
    onBallLanded,
    isDropping,
    path,
    slot,
    multiplier,
  });

  useEffect(() => {
    propsRef.current = {
      rows,
      activeDrop,
      onBallLanded,
      isDropping,
      path,
      slot,
      multiplier,
    };
  }, [rows, activeDrop, onBallLanded, isDropping, path, slot, multiplier]);

  // Queue of drop events to process in the animation loop
  const pendingDropsRef = useRef<PlinkoDropPayload[]>([]);
  const lastProcessedIdRef = useRef<string | null>(null);

  // Watch for activeDrop changes
  useEffect(() => {
    if (activeDrop && activeDrop.id !== lastProcessedIdRef.current) {
      lastProcessedIdRef.current = activeDrop.id;
      pendingDropsRef.current.push(activeDrop);
    }
  }, [activeDrop]);

  // Legacy single drop watcher
  useEffect(() => {
    if (isDropping && path && path.length === rows) {
      const dropId = `legacy_${Date.now()}`;
      if (lastProcessedIdRef.current !== dropId) {
        lastProcessedIdRef.current = dropId;
        pendingDropsRef.current.push({
          id: dropId,
          path,
          slot: slot || 0,
          multiplier: multiplier || 0,
        });
      }
    }
  }, [isDropping, path, rows, slot, multiplier]);

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
      const height = currentMount.clientHeight || 400;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05070e);

      // Adjust camera distance based on rows
      const cameraZ = rows === 16 ? 24 : rows === 12 ? 18 : 14;
      const cameraY = rows === 16 ? -2 : rows === 12 ? -1 : 0;
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, cameraY, cameraZ);
      camera.lookAt(0, cameraY, 0);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      currentMount.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);

      const cyanLight = new THREE.PointLight(0x00f0ff, 5, 30);
      cyanLight.position.set(0, 6, 6);
      scene.add(cyanLight);

      const purpleLight = new THREE.PointLight(0xa855f7, 6, 30);
      purpleLight.position.set(0, -10, 6);
      scene.add(purpleLight);

      // Group for board
      const boardGroup = new THREE.Group();
      scene.add(boardGroup);

      // Materials
      const pegMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.2,
      });

      const ballGeo = new THREE.SphereGeometry(0.28, 24, 24);
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.7,
        metalness: 0.4,
        roughness: 0.1,
      });

      // Peg geometry
      const pegGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const spacing = 1.2;
      const startY = (rows * spacing) / 2;

      // Build Pegs
      for (let r = 0; r < rows; r++) {
        const pegsInRow = r + 3;
        const rowWidth = (pegsInRow - 1) * spacing;
        const startX = -rowWidth / 2;

        for (let c = 0; c < pegsInRow; c++) {
          const peg = new THREE.Mesh(pegGeo, pegMat);
          peg.position.set(startX + c * spacing, startY - r * spacing, 0);
          boardGroup.add(peg);
        }
      }

      // Slot meshes for landing animations
      const slotMeshes: THREE.Mesh[] = [];
      const slotGeo = new THREE.BoxGeometry(1.0, 0.5, 0.5);
      const slotsCount = rows + 1;
      const slotsWidth = (slotsCount - 1) * spacing;
      const slotStartX = -slotsWidth / 2;
      const slotY = startY - rows * spacing - 1;

      for (let s = 0; s < slotsCount; s++) {
        const distance = Math.abs(s - rows / 2) / (rows / 2);
        const slotColor = new THREE.Color().lerpColors(
          new THREE.Color(0x1e293b),
          new THREE.Color(0x10b981),
          distance
        );

        const sMat = new THREE.MeshStandardMaterial({
          color: slotColor,
          metalness: 0.5,
          roughness: 0.4,
        });
        const slotMesh = new THREE.Mesh(slotGeo, sMat);
        slotMesh.position.set(slotStartX + s * spacing, slotY, 0);
        boardGroup.add(slotMesh);
        slotMeshes.push(slotMesh);
      }

      // Array of active balls currently cascading
      const activeBalls: ActiveBall[] = [];

      const spawnBall = (drop: PlinkoDropPayload) => {
        const mesh = new THREE.Mesh(ballGeo, ballMat.clone());
        mesh.position.set(0, startY + 1.5, 0);
        boardGroup.add(mesh);

        activeBalls.push({
          id: drop.id,
          path: drop.path,
          slot: drop.slot,
          multiplier: drop.multiplier,
          animTime: 0,
          lastStep: -1,
          mesh,
        });
      };

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // Process any pending drops
        while (pendingDropsRef.current.length > 0) {
          const drop = pendingDropsRef.current.shift();
          if (drop && drop.path && drop.path.length === rows) {
            spawnBall(drop);
          }
        }

        // Animate all active balls
        for (let b = activeBalls.length - 1; b >= 0; b--) {
          const ball = activeBalls[b];
          ball.animTime += 0.055; // Smooth drop speed

          const step = Math.floor(ball.animTime);

          // Trigger peg bounce sound and subtle vibration
          if (step > ball.lastStep && step <= rows) {
            ball.lastStep = step;
            sounds.playPegBounce(step);
          }

          if (ball.animTime <= rows) {
            const t = ball.animTime - step;

            let currentX = 0;
            let currentY = startY + 1.5;

            for (let i = 0; i < step; i++) {
              currentX += ball.path[i] === 1 ? spacing / 2 : -spacing / 2;
              currentY -= spacing;
            }

            let nextX = currentX;
            let nextY = currentY - spacing;

            if (step < rows) {
              nextX = currentX + (ball.path[step] === 1 ? spacing / 2 : -spacing / 2);
            } else {
              nextY = currentY - 2;
            }

            // Parabolic peg bounce arc
            const bounceY = Math.sin(t * Math.PI) * 0.45;
            ball.mesh.position.x = THREE.MathUtils.lerp(currentX, nextX, t);
            ball.mesh.position.y = THREE.MathUtils.lerp(currentY, nextY, t) + bounceY;
          } else {
            // Ball reached slot!
            const landedSlot = ball.slot;
            const landedMult = ball.multiplier;

            // Flash the landing slot
            if (slotMeshes[landedSlot]) {
              const originalColor = (slotMeshes[landedSlot].material as THREE.MeshStandardMaterial).color.clone();
              (slotMeshes[landedSlot].material as THREE.MeshStandardMaterial).emissive.setHex(0x10b981);
              (slotMeshes[landedSlot].material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;

              setTimeout(() => {
                if (slotMeshes[landedSlot]) {
                  (slotMeshes[landedSlot].material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
                  (slotMeshes[landedSlot].material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
                }
              }, 220);
            }

            // Play win sound if profitable
            if (landedMult >= 1.5) {
              sounds.playCashout();
            } else {
              sounds.playClick(350);
            }

            // Notify parent
            if (propsRef.current.onBallLanded) {
              propsRef.current.onBallLanded(landedSlot, landedMult);
            }

            // Clean up ball mesh
            boardGroup.remove(ball.mesh);
            (ball.mesh.material as THREE.Material).dispose();
            activeBalls.splice(b, 1);
          }
        }

        // Ambient board sway
        boardGroup.rotation.y = Math.sin(Date.now() * 0.0006) * 0.04;

        if (renderer) {
          renderer.render(scene, camera);
        }
      };

      animate();

      handleResize = () => {
        if (!currentMount || !renderer) return;
        const newW = currentMount.clientWidth || 340;
        const newH = currentMount.clientHeight || 400;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };

      window.addEventListener('resize', handleResize);
    } catch (err) {
      console.warn('WebGL sandbox error:', err);
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
  }, [rows]);

  // Tor Safe 2D Fallback
  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950/90 rounded-2xl border border-emerald-500/20 p-6 text-center min-h-[400px] relative overflow-hidden">
        <div className="text-primary font-mono text-lg font-bold tracking-wider mb-1">
          {isDropping ? 'DROPPING...' : `MULTIPLIER: ${multiplier || '-'}`}
        </div>
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-emerald-500/30">
          Tor Stealth Mode • {rows} Rows
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
