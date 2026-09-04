'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

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
      camera.position.set(0, 1.4, 5.8);
      camera.lookAt(0, 0.2, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      currentMount.appendChild(renderer.domElement);

      // Studio Cyberpunk Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const purpleLight = new THREE.PointLight(0xa855f7, 7, 16);
      purpleLight.position.set(2, 3, 3);
      scene.add(purpleLight);

      const cyanLight = new THREE.PointLight(0x06b6d4, 5, 14);
      cyanLight.position.set(-3, -1, 2);
      scene.add(cyanLight);

      const thrusterLight = new THREE.PointLight(0xf59e0b, 8, 12);
      thrusterLight.position.set(-1.6, -1.0, 0);
      scene.add(thrusterLight);

      // Master Rocket Group
      const rocketGroup = new THREE.Group();
      scene.add(rocketGroup);

      // 1. Titanium Hull Fuselage
      const hullGeo = new THREE.CylinderGeometry(0.38, 0.44, 2.2, 24);
      const hullMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.94,
        roughness: 0.16,
      });
      const hullMesh = new THREE.Mesh(hullGeo, hullMat);
      hullMesh.rotation.z = -Math.PI / 4;
      rocketGroup.add(hullMesh);

      // 2. Aerodynamic Cockpit Nose
      const noseGeo = new THREE.ConeGeometry(0.38, 1.1, 24);
      const noseMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.6,
        metalness: 0.85,
        roughness: 0.1,
      });
      const noseMesh = new THREE.Mesh(noseGeo, noseMat);
      // Position at front tip along 45 degree angle
      noseMesh.position.set(1.15, 1.15, 0);
      noseMesh.rotation.z = -Math.PI / 4;
      rocketGroup.add(noseMesh);

      // 3. Swept Delta Stabilizer Wings
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(-0.8, -0.6);
      wingShape.lineTo(-0.4, 0.4);
      wingShape.closePath();

      const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.05, bevelEnabled: false });
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25,
      });

      const wingLeft = new THREE.Mesh(wingExtrude, wingMat);
      wingLeft.position.set(-0.2, -0.2, 0.35);
      wingLeft.rotation.x = Math.PI / 2;
      rocketGroup.add(wingLeft);

      const wingRight = new THREE.Mesh(wingExtrude, wingMat);
      wingRight.position.set(-0.2, -0.2, -0.35);
      wingRight.rotation.x = -Math.PI / 2;
      rocketGroup.add(wingRight);

      // 4. Dual Thruster Nozzles
      const nozzleGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.4, 16);
      const nozzleMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.98,
        roughness: 0.1,
      });
      const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat);
      nozzleMesh.position.set(-0.95, -0.95, 0);
      nozzleMesh.rotation.z = -Math.PI / 4;
      rocketGroup.add(nozzleMesh);

      // 5. Dynamic Animated Thruster Flame
      const flameGeo = new THREE.ConeGeometry(0.24, 1.2, 16);
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf97316,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.9,
      });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      flameMesh.position.set(-1.6, -1.6, 0);
      flameMesh.rotation.z = Math.PI * 0.75;
      rocketGroup.add(flameMesh);

      // 6. Particle Starfield
      const starCount = 140;
      const starCoords = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starCoords[i] = (Math.random() - 0.5) * 14;
        starCoords[i + 1] = (Math.random() - 0.5) * 12;
        starCoords[i + 2] = (Math.random() - 0.5) * 6;
      }
      const starsGeo = new THREE.BufferGeometry();
      starsGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
      const starsMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.045,
        transparent: true,
        opacity: 0.75,
      });
      const starField = new THREE.Points(starsGeo, starsMat);
      scene.add(starField);

      // 7. Particle Exhaust Sparks
      const sparkCount = 30;
      const sparkCoords = new Float32Array(sparkCount * 3);
      for (let i = 0; i < sparkCount * 3; i += 3) {
        sparkCoords[i] = -1.6 - Math.random() * 2;
        sparkCoords[i + 1] = -1.6 - Math.random() * 2;
        sparkCoords[i + 2] = (Math.random() - 0.5) * 0.4;
      }
      const sparksGeo = new THREE.BufferGeometry();
      sparksGeo.setAttribute('position', new THREE.BufferAttribute(sparkCoords, 3));
      const sparksMat = new THREE.PointsMaterial({
        color: 0xf59e0b,
        size: 0.08,
        transparent: true,
        opacity: 0.85,
      });
      const sparkField = new THREE.Points(sparksGeo, sparksMat);
      scene.add(sparkField);

      let clock = new THREE.Clock();

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();

        if (gameState === 'FLYING') {
          // Dynamic bank and throttle
          const flameScale = 1.0 + Math.sin(elapsed * 25) * 0.18 + Math.min(multiplier * 0.05, 1.2);
          flameMesh.scale.set(flameScale, flameScale * 1.3, flameScale);
          flameMesh.visible = true;
          thrusterLight.intensity = 8 + Math.sin(elapsed * 20) * 3;
          purpleLight.color.setHex(0xa855f7);

          // Flight turbulence
          rocketGroup.position.y = Math.sin(elapsed * 6) * 0.14;
          rocketGroup.position.x = Math.cos(elapsed * 5) * 0.08;
          rocketGroup.rotation.z = Math.sin(elapsed * 3) * 0.05;

          // Starfield and spark stream speed
          const speed = Math.min(0.04 + (multiplier - 1) * 0.005, 0.25);
          starField.position.x -= speed;
          starField.position.y -= speed;
          if (starField.position.x < -6) {
            starField.position.x = 6;
            starField.position.y = 6;
          }

          sparkField.position.x -= speed * 1.5;
          sparkField.position.y -= speed * 1.5;
          if (sparkField.position.x < -3) {
            sparkField.position.x = 0;
            sparkField.position.y = 0;
          }
        } else if (gameState === 'CRASHED') {
          // Emergency tumble & red alarm
          rocketGroup.rotation.z += 0.12;
          rocketGroup.rotation.x += 0.08;
          flameMesh.visible = false;
          purpleLight.color.setHex(0xef4444);
          thrusterLight.color.setHex(0xef4444);
          thrusterLight.intensity = 10;
        } else {
          // STARTING / IDLE: Gentle hovering on launch pad
          rocketGroup.position.y = Math.sin(elapsed * 2) * 0.06;
          rocketGroup.position.x = 0;
          rocketGroup.rotation.z = 0;
          flameMesh.scale.set(0.6, 0.6, 0.6);
          flameMesh.visible = true;
          thrusterLight.intensity = 4;
          purpleLight.color.setHex(0xa855f7);
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

  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-6 text-center min-h-[260px]">
        <div className="text-5xl mb-3 animate-pulse">🚀</div>
        <div className={`text-4xl font-heading font-black tracking-wider mb-2 ${
          gameState === 'CRASHED' ? 'text-rose-500' : 'text-primary'
        }`}>
          {gameState === 'CRASHED' ? 'CRASHED @ ' + multiplier.toFixed(2) + 'x' : `${multiplier.toFixed(2)}x`}
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          Tor Safe 2D Flight Mode Active
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[260px]">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-purple-300 uppercase tracking-wider bg-slate-900/90 px-2 py-0.5 rounded border border-purple-500/40 flex items-center gap-1.5 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-cta animate-ping"></span>
        <span>CypherRocket 3D Engine (Sub-50ms Flight)</span>
      </div>
    </div>
  );
}
