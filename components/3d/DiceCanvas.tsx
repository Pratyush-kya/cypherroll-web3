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

  const propsRef = useRef({ isRolling, targetRoll, lastRoll, lastWon });
  useEffect(() => {
    propsRef.current = { isRolling, targetRoll, lastRoll, lastWon };
  }, [isRolling, targetRoll, lastRoll, lastWon]);

  const dicePhase: 'IDLE' | 'KINETIC_TUMBLE' | 'JACKPOT_VICTORY' | 'RAID_OVERLOAD' =
    isRolling ? 'KINETIC_TUMBLE'
    : lastWon === true ? 'JACKPOT_VICTORY'
    : lastWon === false ? 'RAID_OVERLOAD'
    : 'IDLE';

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number = 0;
    let handleResize: (() => void) | null = null;

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) { setHasWebGL(false); return; }

      const width = currentMount.clientWidth || 340;
      const height = currentMount.clientHeight || 300;

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
      camera.position.set(0, 1.8, 5.5);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      currentMount.appendChild(renderer.domElement);

      // ── LIGHTING ──────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x0a0a1a, 2.0));

      const keyLight = new THREE.DirectionalLight(0xffd700, 3.5);
      keyLight.position.set(4, 6, 4);
      keyLight.castShadow = true;
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0x8b5cf6, 12, 18);
      rimLight.position.set(-4, 1, -3);
      scene.add(rimLight);

      const statusLight = new THREE.PointLight(0x00f0ff, 8, 14);
      statusLight.position.set(0, 3, -2);
      scene.add(statusLight);

      const fillLight = new THREE.PointLight(0xff6b00, 4, 10);
      fillLight.position.set(3, -1, 2);
      scene.add(fillLight);

      // ── GRID FLOOR ────────────────────────────────────────────
      const gridHelper = new THREE.GridHelper(20, 30, 0x1e293b, 0x0f172a);
      gridHelper.position.y = -1.8;
      scene.add(gridHelper);

      // Glow plane under dice
      const glowGeo = new THREE.CircleGeometry(1.6, 64);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
      });
      const glowPlane = new THREE.Mesh(glowGeo, glowMat);
      glowPlane.rotation.x = -Math.PI / 2;
      glowPlane.position.y = -1.79;
      scene.add(glowPlane);

      // ── DICE BODY ─────────────────────────────────────────────
      const diceGroup = new THREE.Group();
      scene.add(diceGroup);

      const size = 1.85;
      // Use RoundedBox approach via subdivided BoxGeometry + vertex displacement
      const bodyGeo = new THREE.BoxGeometry(size, size, size, 2, 2, 2);
      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: 0x060914,
        metalness: 0.92,
        roughness: 0.09,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 1.0,
        envMapIntensity: 0.8,
      });
      const diceMesh = new THREE.Mesh(bodyGeo, bodyMat);
      diceMesh.castShadow = true;
      diceGroup.add(diceMesh);

      // Glowing edges
      const edgesGeo = new THREE.EdgesGeometry(bodyGeo, 10);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
      const edges = new THREE.LineSegments(edgesGeo, edgeMat);
      diceGroup.add(edges);

      // ── PIPS ─────────────────────────────────────────────────
      const pipGeo = new THREE.SphereGeometry(0.11, 20, 20);
      const pipMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 1.2,
        metalness: 0.9,
        roughness: 0.05,
      });
      const h = size / 2 + 0.025;
      const o = 0.44;
      const pips: [number, number, number][] = [
        [0, 0, h],
        [-o, o, -h], [o, o, -h], [0, 0, -h], [-o, -o, -h], [o, -o, -h], [o, 0, -h],
        [-o, h, -o], [o, h, o],
        [-o, -h, -o], [o, -h, -o], [0, -h, 0], [-o, -h, o], [o, -h, o],
        [h, -o, -o], [h, 0, 0], [h, o, o],
        [-h, -o, -o], [-h, o, -o], [-h, -o, o], [-h, o, o],
      ];
      pips.forEach(([px, py, pz]) => {
        const pip = new THREE.Mesh(pipGeo, pipMat);
        pip.position.set(px, py, pz);
        diceGroup.add(pip);
      });

      // ── SHOCKWAVE RING ────────────────────────────────────────
      const ringGeo = new THREE.RingGeometry(0.6, 0.75, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -1.78;
      scene.add(ring);

      // ── FLOATING PARTICLES ────────────────────────────────────
      const PARTICLE_COUNT = 120;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const particleVelocities: { vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
        particleVelocities.push({
          vx: (Math.random() - 0.5) * 0.01,
          vy: Math.random() * 0.005 + 0.002,
          vz: (Math.random() - 0.5) * 0.01,
          life: Math.random(),
          maxLife: 0.8 + Math.random() * 0.8,
        });
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({ color: 0xffd700, size: 0.045, transparent: true, opacity: 0.55, sizeAttenuation: true });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // ── WIN BURST PARTICLES ───────────────────────────────────
      const BURST_COUNT = 80;
      const burstGeo = new THREE.BufferGeometry();
      const burstPositions = new Float32Array(BURST_COUNT * 3);
      burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
      const burstMat = new THREE.PointsMaterial({ color: 0x10b981, size: 0.07, transparent: true, opacity: 0 });
      const burst = new THREE.Points(burstGeo, burstMat);
      scene.add(burst);

      type BurstParticle = { vx: number; vy: number; vz: number; active: boolean };
      const burstVelocities: BurstParticle[] = Array.from({ length: BURST_COUNT }, () => ({ vx: 0, vy: 0, vz: 0, active: false }));
      let burstActive = false;

      const triggerBurst = (color: number) => {
        burstMat.color.setHex(color);
        burstMat.opacity = 1.0;
        burstActive = true;
        const bp = burstGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < BURST_COUNT; i++) {
          bp.setXYZ(i, 0, 0, 0);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const speed = 0.05 + Math.random() * 0.1;
          burstVelocities[i] = {
            vx: Math.sin(phi) * Math.cos(theta) * speed,
            vy: Math.sin(phi) * Math.sin(theta) * speed,
            vz: Math.cos(phi) * speed,
            active: true,
          };
        }
        bp.needsUpdate = true;
      };

      // ── ANIMATION VARIABLES ───────────────────────────────────
      let vx = 0.006, vy = 0.009, vz = 0.004;
      let waveScale = 0.1;
      let prevRolling = false;
      let prevWon: boolean | null = null;
      let t = 0;

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        t += 0.016;

        const { isRolling: rolling, lastWon: won } = propsRef.current;

        // Detect transitions for burst trigger
        if (!rolling && prevRolling) {
          if (won === true) triggerBurst(0x10b981);
          else if (won === false) triggerBurst(0xef4444);
        }
        prevRolling = rolling;

        // Target velocities
        let tvx: number, tvy: number, tvz: number;
        if (rolling) {
          tvx = 0.38; tvy = 0.45; tvz = 0.28;
          edgeMat.color.setHex(0xffb800);
          statusLight.color.setHex(0xffb800);
          glowMat.color.setHex(0xffb800);
          glowMat.opacity = 0.15;
          pipMat.emissive.setHex(0xffb800);
          pipMat.color.setHex(0xffb800);
          ringMat.opacity = 0;
          waveScale = 0.1;
          particleMat.color.setHex(0xffb800);
        } else if (won === true) {
          tvx = 0.003; tvy = 0.004; tvz = 0.001;
          edgeMat.color.setHex(0x10b981);
          statusLight.color.setHex(0x10b981);
          glowMat.color.setHex(0x10b981);
          glowMat.opacity = 0.18;
          pipMat.emissive.setHex(0x10b981);
          pipMat.color.setHex(0x10b981);
          waveScale += 0.06;
          ring.scale.set(waveScale, waveScale, waveScale);
          ringMat.opacity = Math.max(0, 1.0 - waveScale / 5.0);
          particleMat.color.setHex(0x10b981);
        } else if (won === false) {
          tvx = 0.004; tvy = 0.005; tvz = 0.001;
          edgeMat.color.setHex(0xef4444);
          statusLight.color.setHex(0xef4444);
          glowMat.color.setHex(0xef4444);
          glowMat.opacity = 0.1;
          pipMat.emissive.setHex(0xff4444);
          pipMat.color.setHex(0xff4444);
          ringMat.opacity = 0;
          particleMat.color.setHex(0xef4444);
        } else {
          tvx = 0.006; tvy = 0.009; tvz = 0.004;
          edgeMat.color.setHex(0x00f0ff);
          statusLight.color.setHex(0x00f0ff);
          glowMat.color.setHex(0x00f0ff);
          glowMat.opacity = 0.07;
          pipMat.emissive.setHex(0xffd700);
          pipMat.color.setHex(0xffd700);
          ringMat.opacity = 0;
          particleMat.color.setHex(0xffd700);
        }

        vx += (tvx - vx) * 0.06;
        vy += (tvy - vy) * 0.06;
        vz += (tvz - vz) * 0.06;

        diceGroup.rotation.x += vx;
        diceGroup.rotation.y += vy;
        diceGroup.rotation.z += vz;

        // Subtle hover bob
        diceGroup.position.y = Math.sin(t * 1.2) * 0.08;

        // Animate floating ambient particles
        const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const pv = particleVelocities[i];
          pv.life += 0.008;
          if (pv.life > pv.maxLife) {
            posAttr.setXYZ(i,
              (Math.random() - 0.5) * 8,
              -2.5,
              (Math.random() - 0.5) * 8
            );
            pv.life = 0;
          } else {
            posAttr.setXYZ(i,
              posAttr.getX(i) + pv.vx,
              posAttr.getY(i) + pv.vy,
              posAttr.getZ(i) + pv.vz,
            );
          }
        }
        posAttr.needsUpdate = true;

        // Animate burst particles
        if (burstActive) {
          const bp = burstGeo.attributes.position as THREE.BufferAttribute;
          let anyActive = false;
          for (let i = 0; i < BURST_COUNT; i++) {
            const bv = burstVelocities[i];
            if (bv.active) {
              bp.setXYZ(i, bp.getX(i) + bv.vx, bp.getY(i) + bv.vy, bp.getZ(i) + bv.vz);
              bv.vy -= 0.003; // gravity
              anyActive = true;
            }
          }
          bp.needsUpdate = true;
          burstMat.opacity = Math.max(0, burstMat.opacity - 0.018);
          if (burstMat.opacity <= 0) {
            burstActive = false;
            burstMat.opacity = 0;
          }
        }

        // Pulsing emissive intensity
        if (rolling) {
          pipMat.emissiveIntensity = 1.5 + Math.sin(t * 15) * 0.5;
        } else if (won === true) {
          pipMat.emissiveIntensity = 1.4 + Math.sin(t * 6) * 0.6;
        } else {
          pipMat.emissiveIntensity = 1.1 + Math.sin(t * 2) * 0.15;
        }

        renderer!.render(scene, camera);
      };

      animate();

      handleResize = () => {
        if (!currentMount || !renderer) return;
        const newW = currentMount.clientWidth || 340;
        const newH = currentMount.clientHeight || 300;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };
      window.addEventListener('resize', handleResize);

    } catch (err) {
      console.warn('WebGL init error:', err);
      setHasWebGL(false);
    }

    return () => {
      if (handleResize) window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (renderer && renderer.domElement && currentMount && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer?.dispose();
    };
  }, []);

  if (!hasWebGL) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950/90 rounded-2xl border border-cyan-500/20 p-6 text-center min-h-[300px]">
        <div className={`w-28 h-28 rounded-2xl border-2 flex items-center justify-center mb-4 transition-all ${
          isRolling ? 'border-amber-400 animate-spin' : lastWon === true ? 'border-emerald-400' : lastWon === false ? 'border-rose-500' : 'border-cyan-500/40'
        }`}>
          <div className="text-4xl font-mono font-black text-white">
            {isRolling ? '⚡' : typeof lastRoll === 'number' ? lastRoll.toFixed(2) : '🎲'}
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Phase: {dicePhase}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
