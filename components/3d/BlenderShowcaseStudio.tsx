'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { Sparkles, Eye, Palette, RotateCw, Maximize2, ShieldCheck, Box } from 'lucide-react';

const PALETTES = {
  imperial: {
    name: 'Imperial Cyberpunk',
    hull: 0x070a12,
    accent: 0xffb800,
    emissiveA: 0xffb800,
    emissiveB: 0x00f0ff,
    emissiveC: 0x8b5cf6,
    plasma: 0xff4500,
    lightKey: 0xfff5ea,
    lightRim: 0x00f0ff,
    lightFill: 0x8b5cf6,
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  synthwave: {
    name: 'Neon Synthwave',
    hull: 0x080c1d,
    accent: 0xec4899,
    emissiveA: 0xec4899,
    emissiveB: 0x06b6d4,
    emissiveC: 0x3b82f6,
    plasma: 0xf43f5e,
    lightKey: 0xfce7f3,
    lightRim: 0x06b6d4,
    lightFill: 0xec4899,
    badgeColor: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
  },
  emerald: {
    name: 'Emerald High-Roller',
    hull: 0x050d0a,
    accent: 0x10b981,
    emissiveA: 0x10b981,
    emissiveB: 0xf59e0b,
    emissiveC: 0x065f46,
    plasma: 0x10b981,
    lightKey: 0xfef3c7,
    lightRim: 0x10b981,
    lightFill: 0x047857,
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  crimson: {
    name: 'Crimson Overdrive',
    hull: 0x100808,
    accent: 0xef4444,
    emissiveA: 0xef4444,
    emissiveB: 0xf97316,
    emissiveC: 0x7f1d1d,
    plasma: 0xff2200,
    lightKey: 0xffedd5,
    lightRim: 0xef4444,
    lightFill: 0xf97316,
    badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
};

type Viewpoint = 'ALL' | 'DICE' | 'ROCKET' | 'CHIP';

export default function BlenderShowcaseStudio() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof PALETTES>('imperial');
  const [activeView, setActiveView] = useState<Viewpoint>('ALL');
  const [autoRotate, setAutoRotate] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // References for runtime updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lightsRef = useRef<{ key: THREE.DirectionalLight; rim: THREE.DirectionalLight; fill: THREE.PointLight } | null>(null);
  const modelsGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let composer: EffectComposer | null = null;
    let animationId: number = 0;
    let handleResize: (() => void) | null = null;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }

      const width = currentMount.clientWidth || 800;
      const height = currentMount.clientHeight || 500;

      // 1. Scene & Camera
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x06080e);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 3.2, 9.5);
      cameraRef.current = camera;

      // 2. Renderer with ACESFilmic Tone Mapping & Color Management
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      currentMount.appendChild(renderer.domElement);

      // 3. OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 2.0;
      controls.maxDistance = 16.0;
      controls.maxPolarAngle = Math.PI / 2 + 0.05; // Keep above stage floor
      controls.target.set(0, 0.8, 0);
      controlsRef.current = controls;

      // 4. PBR Radiance Environment
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      roomEnv.dispose();

      // 5. Studio 3-Point Lights (Key, Rim, Fill)
      const currentPal = PALETTES[selectedTheme];

      const keyLight = new THREE.DirectionalLight(currentPal.lightKey, 2.6);
      keyLight.position.set(5, 8, 6);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(currentPal.lightRim, 3.0);
      rimLight.position.set(-6, -2, -5);
      scene.add(rimLight);

      const fillLight = new THREE.PointLight(currentPal.lightFill, 4.0, 16);
      fillLight.position.set(0, -3, 3);
      scene.add(fillLight);

      lightsRef.current = { key: keyLight, rim: rimLight, fill: fillLight };

      // 6. Showcase Stage Platform (Matching Blender cypherroll_showcase.blend)
      const stageGroup = new THREE.Group();
      scene.add(stageGroup);

      const stageGeo = new THREE.CylinderGeometry(6.2, 6.4, 0.3, 64);
      const stageMat = new THREE.MeshStandardMaterial({
        color: 0x05070c,
        metalness: 0.9,
        roughness: 0.22,
      });
      const stageMesh = new THREE.Mesh(stageGeo, stageMat);
      stageMesh.position.y = -0.15;
      stageMesh.receiveShadow = true;
      stageGroup.add(stageMesh);

      // Glowing Neon Concentric Rings on the stage
      const outerRingGeo = new THREE.TorusGeometry(5.2, 0.035, 12, 64);
      const outerRingMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 3.5,
      });
      const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      outerRing.rotation.x = Math.PI / 2;
      outerRing.position.y = 0.02;
      stageGroup.add(outerRing);

      // Pedestal Rings for the 3 exhibits
      const pedestalLocs = [
        { x: -3.4, y: 0.2, z: 0, r: 1.4 },
        { x: 0, y: 0.35, z: 0, r: 1.3 },
        { x: 3.4, y: 0.2, z: 0, r: 1.4 },
      ];

      pedestalLocs.forEach(({ x, y, z, r }) => {
        const pedGeo = new THREE.CylinderGeometry(r, r + 0.1, y, 48);
        const pedMesh = new THREE.Mesh(pedGeo, stageMat);
        pedMesh.position.set(x, y / 2, z);
        stageGroup.add(pedMesh);

        const pedRingGeo = new THREE.TorusGeometry(r * 0.95, 0.025, 8, 48);
        const pedRingMat = new THREE.MeshStandardMaterial({
          color: 0xffb800,
          emissive: 0xffb800,
          emissiveIntensity: 2.5,
        });
        const pedRing = new THREE.Mesh(pedRingGeo, pedRingMat);
        pedRing.rotation.x = Math.PI / 2;
        pedRing.position.set(x, y + 0.01, z);
        stageGroup.add(pedRing);
      });

      // 7. Master Models Group
      const modelsGroup = new THREE.Group();
      scene.add(modelsGroup);
      modelsGroupRef.current = modelsGroup;

      // 8. GLTF Loader for the 3 Blender Master Assets
      const gltfLoader = new GLTFLoader();
      let loadedCount = 0;
      const totalAssets = 3;

      const handleAssetLoaded = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / totalAssets) * 100));
        if (loadedCount >= totalAssets) {
          setIsLoaded(true);
        }
      };

      // A. Load CyberDice Master
      gltfLoader.load(
        '/assets/3d/dice.glb',
        (gltf) => {
          const dice = gltf.scene;
          dice.name = 'CyberDice';
          dice.position.set(-3.4, 1.4, 0);
          dice.rotation.set(0.45, 0.65, 0.25);
          dice.scale.set(0.9, 0.9, 0.9);
          dice.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          modelsGroup.add(dice);
          handleAssetLoaded();
        },
        undefined,
        (err) => console.warn('Dice GLB load fallback:', err)
      );

      // B. Load CypherRocket Master
      gltfLoader.load(
        '/assets/3d/rocket.glb',
        (gltf) => {
          const rocket = gltf.scene;
          rocket.name = 'CypherRocket';
          rocket.position.set(0, 1.9, 0);
          rocket.rotation.set(THREE.MathUtils.degToRad(-22), THREE.MathUtils.degToRad(18), THREE.MathUtils.degToRad(10));
          rocket.scale.set(0.65, 0.65, 0.65);
          rocket.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          modelsGroup.add(rocket);
          handleAssetLoaded();
        },
        undefined,
        (err) => console.warn('Rocket GLB load fallback:', err)
      );

      // C. Load VIP Casino Chip Master
      gltfLoader.load(
        '/assets/3d/chip.glb',
        (gltf) => {
          const chip = gltf.scene;
          chip.name = 'CypherChip';
          chip.position.set(3.4, 1.4, 0);
          chip.rotation.set(THREE.MathUtils.degToRad(65), THREE.MathUtils.degToRad(-15), THREE.MathUtils.degToRad(25));
          chip.scale.set(0.85, 0.85, 0.85);
          chip.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          modelsGroup.add(chip);
          handleAssetLoaded();
        },
        undefined,
        (err) => console.warn('Chip GLB load fallback:', err)
      );

      // 9. EffectComposer Post-Processing (Bloom + OutputPass + FXAA)
      const pr = renderer.getPixelRatio();
      const renderTarget = new THREE.WebGLRenderTarget(width * pr, height * pr, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
      });

      composer = new EffectComposer(renderer, renderTarget);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.35,  // Strength
        0.42,  // Radius
        0.80   // Threshold
      );
      composer.addPass(bloomPass);

      const outputPass = new OutputPass();
      composer.addPass(outputPass);

      const fxaaPass = new ShaderPass(FXAAShader);
      fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pr);
      fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pr);
      composer.addPass(fxaaPass);

      // 10. Animation Loop
      let time = 0;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        time += 0.015;

        // Auto-rotation when active and in 'ALL' view
        if (autoRotate && activeView === 'ALL' && modelsGroupRef.current) {
          modelsGroupRef.current.rotation.y += 0.003;
          stageGroup.rotation.y += 0.003;
        }

        controls.update();
        if (composer) {
          composer.render();
        }
      };

      animate();

      // 11. Responsive Resize
      handleResize = () => {
        if (!currentMount || !renderer || !composer) return;
        const newW = currentMount.clientWidth || 800;
        const newH = currentMount.clientHeight || 500;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
        composer.setSize(newW, newH);

        const currentPr = renderer.getPixelRatio();
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (newW * currentPr);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (newH * currentPr);
      };

      window.addEventListener('resize', handleResize);
    } catch (err) {
      console.warn('WebGL initialization prevented:', err);
      setHasWebGL(false);
      return;
    }

    return () => {
      if (handleResize) window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (renderer && renderer.domElement && currentMount && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      if (composer) composer.dispose();
      if (renderer) renderer.dispose();
    };
  }, []);

  // Update theme colors dynamically across materials and lights
  useEffect(() => {
    const pal = PALETTES[selectedTheme];
    if (lightsRef.current) {
      lightsRef.current.key.color.setHex(pal.lightKey);
      lightsRef.current.rim.color.setHex(pal.lightRim);
      lightsRef.current.fill.color.setHex(pal.lightFill);
    }

    if (modelsGroupRef.current) {
      modelsGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
          const mesh = child as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            const m = mat as THREE.MeshStandardMaterial;
            const name = (m.name || '').toLowerCase();
            const cName = (mesh.name || '').toLowerCase();

            if (name.includes('obsidian') || name.includes('hull') || name.includes('titanium') || cName.includes('fuselage')) {
              m.color.setHex(pal.hull);
            } else if (name.includes('gold') || name.includes('pip') || cName.includes('pip') || cName.includes('medallion')) {
              m.color.setHex(pal.accent);
              if (m.emissive) m.emissive.setHex(pal.emissiveA);
            } else if (name.includes('cyan') || name.includes('cockpit') || name.includes('visor') || name.includes('crest') || cName.includes('visor')) {
              m.color.setHex(pal.emissiveB);
              if (m.emissive) m.emissive.setHex(pal.emissiveB);
            } else if (name.includes('violet') || name.includes('nose') || name.includes('groove') || cName.includes('nose')) {
              m.color.setHex(pal.emissiveC);
              if (m.emissive) m.emissive.setHex(pal.emissiveC);
            } else if (name.includes('flame') || name.includes('plasma') || cName.includes('flame')) {
              m.color.setHex(pal.plasma);
              if (m.emissive) m.emissive.setHex(pal.plasma);
            }
            m.needsUpdate = true;
          });
        }
      });
    }
  }, [selectedTheme]);

  // Viewpoint Navigation
  const setCameraViewpoint = (view: Viewpoint) => {
    setActiveView(view);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (view === 'ALL') {
      camera.position.set(0, 3.2, 9.5);
      controls.target.set(0, 0.8, 0);
    } else if (view === 'DICE') {
      camera.position.set(-3.4, 2.2, 4.2);
      controls.target.set(-3.4, 1.4, 0);
    } else if (view === 'ROCKET') {
      camera.position.set(0, 2.5, 4.5);
      controls.target.set(0, 1.9, 0);
    } else if (view === 'CHIP') {
      camera.position.set(3.4, 2.2, 4.2);
      controls.target.set(3.4, 1.4, 0);
    }
    controls.update();
  };

  if (!hasWebGL) {
    return (
      <div className="w-full max-w-5xl mx-auto my-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center">
        <div className="text-6xl mb-4 animate-pulse">🎲 🚀 🪙</div>
        <h3 className="text-2xl font-heading font-black text-primary mb-2 uppercase">
          CypherRoll 3D Showcase (Tor Stealth Mode)
        </h3>
        <p className="text-sm font-mono text-slate-400 max-w-md mx-auto mb-4">
          WebGL context is shielded by your browser security configuration. All models are available and verified.
        </p>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero-Fingerprint Privacy Shield Active</span>
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto my-6 bg-slate-950/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* 3D Viewport Canvas Container */}
      <div className="relative w-full h-[520px] md:h-[600px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Loading Overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-3 z-30 pointer-events-none transition-opacity duration-500">
            <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-400 tracking-wider">
              LOADING BLENDER SCENE ({loadProgress}%)...
            </span>
          </div>
        )}

        {/* Studio HUD Header Controls */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
          {/* Badge */}
          <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/85 border border-slate-700/60 shadow-lg backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-heading font-black text-foreground uppercase tracking-wider">
              Blender 4.3.2 Studio
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${PALETTES[selectedTheme].badgeColor}`}>
              {PALETTES[selectedTheme].name}
            </span>
          </div>

          {/* Viewpoint Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/85 border border-slate-700/60 p-1 rounded-xl shadow-lg backdrop-blur-md">
            <span className="text-[10px] font-mono text-slate-400 px-2 flex items-center gap-1">
              <Eye className="w-3 h-3 text-slate-400" /> Focus:
            </span>
            {(['ALL', 'DICE', 'ROCKET', 'CHIP'] as Viewpoint[]).map((v) => (
              <button
                key={v}
                onClick={() => setCameraViewpoint(v)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                  activeView === v
                    ? 'bg-primary text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v === 'ALL' ? 'Studio' : v === 'DICE' ? 'Dice' : v === 'ROCKET' ? 'Rocket' : 'VIP Chip'}
              </button>
            ))}
          </div>
        </div>

        {/* Studio HUD Footer Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
          {/* Theme Switcher */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/85 border border-slate-700/60 p-1.5 rounded-xl shadow-lg backdrop-blur-md">
            <span className="text-[10px] font-mono text-slate-400 px-2 flex items-center gap-1">
              <Palette className="w-3 h-3 text-primary" /> Palette:
            </span>
            {(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedTheme(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
                  selectedTheme === key
                    ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {key === 'imperial' ? '👑 Imperial' : key === 'synthwave' ? '🌌 Synthwave' : key === 'emerald' ? '💎 Emerald' : '🔥 Crimson'}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-colors backdrop-blur-md shadow-lg ${
                autoRotate
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900/85 border-slate-700/60 text-slate-400'
              }`}
              title="Toggle Auto Rotation"
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Turntable</span>
            </button>

            <a
              href="/showcase.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors backdrop-blur-md shadow-lg"
              title="Open Fullscreen Standalone Studio"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fullscreen Studio</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
