'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface MinesCanvasProps {
  gameActive: boolean;
  revealedTiles: number[];
  minePositions: number[];
  onTileClick: (index: number) => void;
}

export default function MinesCanvas({ gameActive, revealedTiles, minePositions, onTileClick }: MinesCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    let handleResize: (() => void) | null = null;
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();

    const tiles: { mesh: THREE.Mesh; index: number; isRevealed: boolean }[] = [];

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

      // Adjust camera for a straight down view or slightly tilted
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, -2, 6);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      currentMount.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);

      const statusLight = new THREE.PointLight(0x00f0ff, 4, 10);
      statusLight.position.set(0, 0, 3);
      scene.add(statusLight);

      // Create 5x5 grid
      const gridGroup = new THREE.Group();
      scene.add(gridGroup);

      const tileSize = 0.8;
      const gap = 0.1;
      const offset = (5 * tileSize + 4 * gap) / 2 - tileSize / 2;

      const tileGeo = new THREE.BoxGeometry(tileSize, tileSize, 0.1);
      
      const defaultMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.5 });
      const gemMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.5 });
      const mineMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.8 });

      for (let i = 0; i < 25; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;

        const tileMesh = new THREE.Mesh(tileGeo, defaultMat.clone());
        tileMesh.position.set(col * (tileSize + gap) - offset, -row * (tileSize + gap) + offset, 0);
        
        // Add edge
        const edgesGeo = new THREE.EdgesGeometry(tileGeo);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x334155 });
        const edge = new THREE.LineSegments(edgesGeo, edgeMat);
        tileMesh.add(edge);

        // Store metadata
        (tileMesh as any).userData = { index: i };
        
        gridGroup.add(tileMesh);
        tiles.push({ mesh: tileMesh, index: i, isRevealed: false });
      }
      
      gridGroup.position.set(0, 0, 0);
      gridGroup.rotation.x = 0.2; // Slight tilt

      // Handle Clicks
      const onClick = (event: MouseEvent) => {
        if (!gameActive) return;
        
        const rect = renderer!.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(gridGroup.children);

        if (intersects.length > 0) {
          let object = intersects[0].object;
          if (object.type === 'LineSegments') {
            object = object.parent as THREE.Mesh;
          }
          const index = object.userData.index;
          if (index !== undefined && !revealedTiles.includes(index)) {
            onTileClick(index);
          }
        }
      };

      currentMount.addEventListener('click', onClick);

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // Update tile materials based on state
        tiles.forEach(tile => {
          const isRevealed = revealedTiles.includes(tile.index) || (!gameActive && minePositions.includes(tile.index));
          
          if (isRevealed && !tile.isRevealed) {
            tile.isRevealed = true;
            // Flip animation start (simplified)
            tile.mesh.rotation.x = Math.PI;
            
            if (minePositions.includes(tile.index)) {
               (tile.mesh.material as THREE.MeshStandardMaterial).color.setHex(0xef4444);
               (tile.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xef4444);
               statusLight.color.setHex(0xef4444);
            } else {
               (tile.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x10b981);
               (tile.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x10b981);
            }
          }
          
          // Smooth rotation back to 0
          if (tile.mesh.rotation.x > 0) {
             tile.mesh.rotation.x *= 0.8;
          }
        });

        if (renderer) renderer.render(scene, camera);
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
      
      // Cleanup
      return () => {
        currentMount.removeEventListener('click', onClick);
        if (handleResize) window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
        if (renderer && renderer.domElement && currentMount && currentMount.contains(renderer.domElement)) {
          currentMount.removeChild(renderer.domElement);
        }
        if (renderer) renderer.dispose();
      };
    } catch (err) {
      console.warn('WebGL sandbox:', err);
      setHasWebGL(false);
      return;
    }
  }, [gameActive, revealedTiles, minePositions, onTileClick]);

  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950/90 rounded-2xl border border-slate-800 p-6">
        <div className="grid grid-cols-5 gap-2 w-full max-w-[280px]">
          {Array.from({ length: 25 }).map((_, i) => {
            const isRevealed = revealedTiles.includes(i) || (!gameActive && minePositions.includes(i));
            const isMine = minePositions.includes(i);
            
            return (
              <button
                key={i}
                disabled={!gameActive || isRevealed}
                onClick={() => onTileClick(i)}
                className={`aspect-square rounded-md flex items-center justify-center font-bold transition-all ${
                  !isRevealed
                    ? 'bg-slate-800 hover:bg-slate-700 cursor-pointer'
                    : isMine
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50'
                    : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50'
                }`}
              >
                {isRevealed && (isMine ? 'M' : 'G')}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />
    </div>
  );
}
