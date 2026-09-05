'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let cachedChipGltf: THREE.Group | null = null;

export default function CasinoChipCanvas({ className = '' }: { className?: string }) {
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

      const width = currentMount.clientWidth || 180;
      const height = currentMount.clientHeight || 180;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0, 4.2);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      currentMount.appendChild(renderer.domElement);

      // Studio Lighting for High-End Metallic Coin
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);

      const goldLight = new THREE.PointLight(0xf59e0b, 8, 12);
      goldLight.position.set(2, 2, 3);
      scene.add(goldLight);

      const cyanLight = new THREE.PointLight(0x06b6d4, 6, 12);
      cyanLight.position.set(-2, -2, 2);
      scene.add(cyanLight);

      const chipGroup = new THREE.Group();
      scene.add(chipGroup);

      // Procedural Coin Base while loading GLTF
      const proceduralCoin = new THREE.Group();
      chipGroup.add(proceduralCoin);

      const cylinderGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32);
      const cylinderMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f1d,
        metalness: 0.95,
        roughness: 0.15,
      });
      const coinBody = new THREE.Mesh(cylinderGeo, cylinderMat);
      coinBody.rotation.x = Math.PI / 2;
      proceduralCoin.add(coinBody);

      const ringGeo = new THREE.TorusGeometry(0.85, 0.05, 16, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.8,
        metalness: 0.8,
      });
      const coinRing = new THREE.Mesh(ringGeo, ringMat);
      proceduralCoin.add(coinRing);

      // Load Master Blender GLB Model
      const attachBlenderChip = (clonedScene: THREE.Group) => {
        clonedScene.scale.set(0.9, 0.9, 0.9);
        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        chipGroup.remove(proceduralCoin);
        chipGroup.add(clonedScene);
      };

      if (cachedChipGltf) {
        attachBlenderChip(cachedChipGltf.clone());
      } else {
        const loader = new GLTFLoader();
        loader.load(
          '/assets/3d/chip.glb',
          (gltf) => {
            cachedChipGltf = gltf.scene;
            attachBlenderChip(gltf.scene.clone());
          },
          undefined,
          (err) => {
            console.warn('GLB chip asset fallback to procedural mesh:', err);
          }
        );
      }

      chipGroup.rotation.x = 0.45;
      chipGroup.rotation.y = 0.2;

      let time = 0;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        time += 0.015;

        chipGroup.rotation.y += 0.018;
        chipGroup.rotation.x = 0.45 + Math.sin(time) * 0.1;

        if (renderer) {
          renderer.render(scene, camera);
        }
      };

      animate();

      handleResize = () => {
        if (!currentMount || !renderer) return;
        const newW = currentMount.clientWidth || 180;
        const newH = currentMount.clientHeight || 180;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };

      window.addEventListener('resize', handleResize);
    } catch (err) {
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
  }, []);

  if (!hasWebGL) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 rounded-full border-2 border-amber-400 bg-amber-500/10 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse">
          🪙
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
