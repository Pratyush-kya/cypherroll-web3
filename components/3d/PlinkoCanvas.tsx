'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface PlinkoCanvasProps {
  isDropping: boolean;
  rows: number;
  path?: number[] | null;
  slot?: number | null;
  multiplier?: number | null;
}

export default function PlinkoCanvas({ isDropping, rows, path, slot, multiplier }: PlinkoCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  // Synchronize mutable refs for 60fps animation loop
  const propsRef = useRef({ isDropping, rows, path, slot, multiplier });
  useEffect(() => {
    propsRef.current = { isDropping, rows, path, slot, multiplier };
  }, [isDropping, rows, path, slot, multiplier]);

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
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);
      
      const pointLight = new THREE.PointLight(0x00f0ff, 5, 30);
      pointLight.position.set(0, 5, 5);
      scene.add(pointLight);

      const purpleLight = new THREE.PointLight(0x8b5cf6, 6, 30);
      purpleLight.position.set(0, -10, 5);
      scene.add(purpleLight);

      // Group for board
      const boardGroup = new THREE.Group();
      scene.add(boardGroup);

      // Materials
      const pegMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.8,
        roughness: 0.2,
      });

      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xffb800,
        emissive: 0xffb800,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.1,
      });

      // Peg geometry
      const pegGeo = new THREE.SphereGeometry(0.15, 16, 16);
      
      // Build Pegs
      const spacing = 1.2;
      const startY = (rows * spacing) / 2;
      
      for (let r = 0; r < rows; r++) {
        const pegsInRow = r + 3; // Start with 3 pegs at top
        const rowWidth = (pegsInRow - 1) * spacing;
        const startX = -rowWidth / 2;
        
        for (let c = 0; c < pegsInRow; c++) {
          const peg = new THREE.Mesh(pegGeo, pegMat);
          peg.position.set(startX + c * spacing, startY - r * spacing, 0);
          boardGroup.add(peg);
        }
      }

      // Slots
      const slotGeo = new THREE.BoxGeometry(1.0, 0.5, 0.5);
      const slotsCount = rows + 1;
      const slotsWidth = (slotsCount - 1) * spacing;
      const slotStartX = -slotsWidth / 2;
      const slotY = startY - rows * spacing - 1;

      for (let s = 0; s < slotsCount; s++) {
        // Color based on edge proximity (green for edges, gray for center)
        const distance = Math.abs(s - rows / 2) / (rows / 2);
        const slotColor = new THREE.Color().lerpColors(
          new THREE.Color(0x334155),
          new THREE.Color(0x10b981),
          distance
        );
        
        const sMat = new THREE.MeshStandardMaterial({
          color: slotColor,
          metalness: 0.5,
          roughness: 0.5,
        });
        const slotMesh = new THREE.Mesh(slotGeo, sMat);
        slotMesh.position.set(slotStartX + s * spacing, slotY, 0);
        boardGroup.add(slotMesh);
      }

      // Ball
      const ballGeo = new THREE.SphereGeometry(0.3, 32, 32);
      const ball = new THREE.Mesh(ballGeo, ballMat);
      
      // Start position
      const initialBallY = startY + 1.5;
      ball.position.set(0, initialBallY, 0);
      ball.visible = false;
      boardGroup.add(ball);

      // Particles
      const particleCount = 20;
      const particles = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffb800, transparent: true, opacity: 0.6 }),
        particleCount
      );
      const dummy = new THREE.Object3D();
      for(let i=0; i<particleCount; i++) {
        dummy.position.set(0, -100, 0);
        dummy.updateMatrix();
        particles.setMatrixAt(i, dummy.matrix);
      }
      boardGroup.add(particles);

      let animTime = 0;
      let isAnimating = false;
      let particleIndex = 0;

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        const { isDropping: curDropping, rows: curRows, path: curPath } = propsRef.current;

        if (curDropping && curPath && curPath.length === curRows) {
          if (!isAnimating) {
            isAnimating = true;
            animTime = 0;
            ball.position.set(0, initialBallY, 0);
            ball.visible = true;
          }

          animTime += 0.05; // speed
          
          // Calculate ball position
          const totalTime = curRows;
          if (animTime <= totalTime) {
            const step = Math.floor(animTime);
            const t = animTime - step; // 0 to 1 fraction
            
            // Calculate current start and end points for this step
            let currentX = 0;
            let currentY = startY + 1.5; // Initial drop
            
            // Reconstruct path to current step
            for (let i = 0; i < step; i++) {
              currentX += curPath[i] === 1 ? spacing/2 : -spacing/2;
              currentY -= spacing;
            }
            
            let nextX = currentX;
            let nextY = currentY - spacing;
            
            if (step < curRows) {
              nextX = currentX + (curPath[step] === 1 ? spacing/2 : -spacing/2);
            } else {
              nextY = currentY - 2; // Drop into slot
            }
            
            // Parabola bounce
            const bounceY = Math.sin(t * Math.PI) * 0.5;
            
            ball.position.x = THREE.MathUtils.lerp(currentX, nextX, t);
            ball.position.y = THREE.MathUtils.lerp(currentY, nextY, t) + (step < curRows ? bounceY : 0);
            
            // Update particles
            particleIndex = (particleIndex + 1) % particleCount;
            dummy.position.copy(ball.position);
            // Add a tiny bit of random scatter
            dummy.position.x += (Math.random() - 0.5) * 0.2;
            dummy.position.y += (Math.random() - 0.5) * 0.2;
            dummy.updateMatrix();
            particles.setMatrixAt(particleIndex, dummy.matrix);
            particles.instanceMatrix.needsUpdate = true;
            
          } else {
            // Reached end
            isAnimating = false;
          }
        } else if (!curDropping && !isAnimating) {
           ball.visible = false;
           // Hide particles
           for(let i=0; i<particleCount; i++) {
             dummy.position.set(0, -100, 0);
             dummy.updateMatrix();
             particles.setMatrixAt(i, dummy.matrix);
           }
           particles.instanceMatrix.needsUpdate = true;
        }

        // Slow board rotation for coolness
        boardGroup.rotation.y = Math.sin(Date.now() * 0.0005) * 0.05;

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
  }, [rows]); // Re-init if rows change

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
