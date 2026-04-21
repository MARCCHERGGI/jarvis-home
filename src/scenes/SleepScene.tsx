import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useJarvis } from '@/state/store';
import { sunDirection, latLonToVec3, SOHO } from './astronomy';
import {
  earthVertex, earthFragment,
  atmosphereVertex, atmosphereFragment,
} from './earthShaders';

const TEX = {
  day:    '/textures/earth-day.jpg',
  night:  '/textures/earth-night.jpg',
  water:  '/textures/earth-water.png',
  topo:   '/textures/earth-topology.png',
};

const EARTH_R = 1.0;
const ATMOS_R = 1.025;

const TIME_SCALE_EARTH = 720;
const TIME_SCALE_SAT = 90;

export function SleepScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const phase = useJarvis((s) => s.phase);

  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000002);

    const camera = new THREE.PerspectiveCamera(
      42, mount.clientWidth / mount.clientHeight, 0.001, 3000
    );
    camera.position.set(0, 0.25, 4.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    // Cap DPR at 1 — 4x fewer fragment shader invocations per frame vs DPR=2,
    // the earth textures are high-res enough that it stays crisp.
    renderer.setPixelRatio(1);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Post-processing DISABLED — bloom+output passes were costing ~40% of
    // the frame budget when Marco isn't even looking at them. The orb owns
    // the spirit now; Earth is just a pretty backdrop during sleep.

    // ══ NEBULA BACKDROP ══ Extremely subtle — barely visible cosmic haze
    const nebulaGeom = new THREE.SphereGeometry(900, 32, 32);
    const nebulaMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform float uTime;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
        float noise(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                         mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                         mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
        }
        float fbm(vec3 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
          return v;
        }
        void main() {
          vec3 dir = normalize(vPos);
          float n1 = fbm(dir * 3.0 + vec3(uTime * 0.003, 0, 0));
          // Barely-there deep-space haze
          float density = smoothstep(0.65, 0.9, n1) * 0.18;
          vec3 color = vec3(0.04, 0.06, 0.15);   // very dark navy
          gl_FragColor = vec4(color * density, 1.0);
        }
      `,
    });
    const nebula = new THREE.Mesh(nebulaGeom, nebulaMat);
    scene.add(nebula);

    // Sun mesh placeholder — will be created after `sun` is declared below
    let sunMat: THREE.ShaderMaterial;
    let sunMesh: THREE.Mesh;
    let sunGeom: THREE.PlaneGeometry;

    // Groups
    const earthTilt = new THREE.Group();
    earthTilt.rotation.z = THREE.MathUtils.degToRad(23.44);
    scene.add(earthTilt);
    const earthSpin = new THREE.Group();
    earthTilt.add(earthSpin);

    // Sun + lighting
    const sun = sunDirection(new Date());
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.copy(sun).multiplyScalar(100);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x0a1020, 0.06));

    // ══ SUN BILLBOARD WITH CORONA ══ Visible bright sun with radiating rays
    sunMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vec2 uv = vUv - 0.5;
          float d = length(uv);
          float core = smoothstep(0.08, 0.0, d);
          float corona = exp(-d * d * 20.0);
          float angle = atan(uv.y, uv.x);
          float rays = sin(angle * 8.0 + uTime * 0.3) * 0.5 + 0.5;
          rays = pow(rays, 3.0) * exp(-d * 8.0);
          vec3 color = vec3(1.0, 0.95, 0.85) * core
                     + vec3(1.0, 0.8, 0.5) * corona * 0.6
                     + vec3(1.0, 0.85, 0.6) * rays * 0.4;
          float alpha = clamp(core + corona * 0.7 + rays * 0.4, 0.0, 1.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    // Sun removed from the view — directional light still illuminates the Earth.
    // The giant sun billboard was too loud. We keep the sunLight for shading,
    // but no visible sun disc on screen.
    sunGeom = new THREE.PlaneGeometry(1, 1);
    sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.visible = false;
    scene.add(sunMesh);

    // Placeholder blue Earth while textures load
    const placeholderMat = new THREE.MeshBasicMaterial({ color: 0x0a1a35 });
    const placeholder = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 64, 64), placeholderMat);
    earthSpin.add(placeholder);

    const loader = new THREE.TextureLoader();
    Promise.all([
      loadTex(loader, TEX.day),
      loadTex(loader, TEX.night),
      loadTex(loader, TEX.water, true),
      loadTex(loader, TEX.topo, true),
    ]).then(([dayT, nightT, waterT, topoT]) => {
      earthSpin.remove(placeholder);
      placeholderMat.dispose();

      const earthMat = new THREE.ShaderMaterial({
        vertexShader: earthVertex,
        fragmentShader: earthFragment,
        uniforms: {
          uDay:    { value: dayT },
          uNight:  { value: nightT },
          uSpec:   { value: waterT },
          uTopo:   { value: topoT },
          uSunDir: { value: sun },
        },
      });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 256, 256), earthMat);
      earthSpin.add(earth);
      (earthTilt as any).__earthMat = earthMat;
    });

    // Atmosphere
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: { uSunDir: { value: sun } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const atmos = new THREE.Mesh(new THREE.SphereGeometry(ATMOS_R, 96, 96), atmosMat);
    scene.add(atmos);

    // Stars
    const starGeom = new THREE.BufferGeometry();
    const N = 1200;  // further reduced for perf — invisible diff visually
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 300 + Math.random() * 350;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i*3+0] = r * Math.sin(ph) * Math.cos(th);
      pos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
      pos[i*3+2] = r * Math.cos(ph);
      const t = Math.pow(Math.random(), 5);
      col[i*3+0] = 0.7 + 0.3 * t;
      col[i*3+1] = 0.8 + 0.2 * t;
      col[i*3+2] = 1.0;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 1.0, sizeAttenuation: true, transparent: true, opacity: 0.9,
      vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const stars = new THREE.Points(starGeom, starsMat);
    scene.add(stars);

    // Satellites
    type Sat = { pivot: THREE.Object3D; speed: number };
    const sats: Sat[] = [];
    const SAT_DEFS = [
      { alt: 0.055, incl: 51.6, speed: 1.4, color: 0xaeffff, ringOpacity: 0.18 },
      { alt: 0.150, incl: 55.0, speed: 0.8, color: 0x9efacc, ringOpacity: 0.10 },
      { alt: 0.320, incl: 2.0, speed: 0.35, color: 0xffd89c, ringOpacity: 0.08 },
      { alt: 0.040, incl: 97.8, speed: 1.5, color: 0xaeffff, ringOpacity: 0.16 },
    ];
    SAT_DEFS.forEach((def) => {
      const plane = new THREE.Object3D();
      plane.rotation.x = THREE.MathUtils.degToRad(def.incl);
      plane.rotation.z = Math.random() * Math.PI * 2;
      scene.add(plane);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(EARTH_R + def.alt - 0.0008, EARTH_R + def.alt + 0.0008, 128),
        new THREE.MeshBasicMaterial({
          color: def.color, transparent: true, opacity: def.ringOpacity,
          side: THREE.DoubleSide, depthWrite: false,
        })
      );
      plane.add(ring);
      const orbiter = new THREE.Object3D();
      plane.add(orbiter);
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.007, 12, 12),
        new THREE.MeshBasicMaterial({ color: def.color })
      );
      body.position.set(EARTH_R + def.alt, 0, 0);
      orbiter.add(body);
      sats.push({ pivot: orbiter, speed: def.speed });
    });

    // --- Earth rotation to bring NYC to the camera-facing side ---
    // Precompute NYC after axial tilt (fixed because tilt is a constant).
    const nycLocal = latLonToVec3(SOHO.lat, SOHO.lon, 1);
    const nycTilted = nycLocal.clone().applyQuaternion(earthTilt.quaternion);
    // Final world direction once NYC is on the +Z meridian (ignoring tilt on xz).
    const nycFinalWorldDir = new THREE.Vector3(
      0,
      nycTilted.y,
      Math.hypot(nycTilted.x, nycTilted.z)
    ).normalize();
    // Target earthSpin.y so NYC world position has x=0, z>0.
    const spinTargetAngle = Math.atan2(-nycTilted.x, nycTilted.z);

    // Rotation tween state
    let rotTween: { from: number; to: number; t0: number; duration: number } | null = null;

    const normalizeAngleDelta = (delta: number) => {
      while (delta >  Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      return delta;
    };

    // Camera targeting — uses nycFinalWorldDir so the camera dives toward
    // where NYC will be after the rotation completes, not where it currently is.
    const getCamTarget = () => {
      const p = useJarvis.getState().phase;
      switch (p) {
        case 'sleep':
          return { pos: new THREE.Vector3(0, 0.25, 4.8), fov: 42, duration: 1800 };
        case 'waking':
          // America comes into view as Earth rotates; camera zooms straight in
          return { pos: new THREE.Vector3(0, 0.25, 2.2), fov: 38, duration: 2400 };
        case 'descending':
          // Camera tracks toward NYC's final world position, diving closer
          return { pos: nycFinalWorldDir.clone().multiplyScalar(1.32), fov: 30, duration: 3000 };
        case 'briefing':
        case 'ready':
        default:
          return { pos: nycFinalWorldDir.clone().multiplyScalar(1.065), fov: 24, duration: 1600 };
      }
    };

    // Render loop
    const clock = new THREE.Clock();
    let raf = 0;
    let camFrom = { pos: camera.position.clone(), fov: camera.fov };
    let camTarget = getCamTarget();
    let camT0 = performance.now();
    let lastPhase = useJarvis.getState().phase;

    const ease = (x: number) => x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2, 3)/2;

    const tick = () => {
      const dt = clock.getDelta();
      const t  = clock.getElapsedTime();
      const cur = useJarvis.getState().phase;

      // Skip the heavy composer+bloom render once Earth has fully disintegrated.
      // Panels + orb own the screen during briefing/ready. Huge GPU saving.
      if ((cur === 'briefing' || cur === 'ready') && earthTilt.scale.x < 0.005) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // Phase transitions
      if (cur !== lastPhase) {
        camFrom = { pos: camera.position.clone(), fov: camera.fov };
        camTarget = getCamTarget();
        camT0 = performance.now();

        if (cur === 'waking' && lastPhase === 'sleep') {
          // SPACE pressed — start Earth rotation to bring NYC to +Z over ~5.4s
          // (spans waking 2.4s + descending 3s).
          const cur_angle = earthSpin.rotation.y;
          const delta = normalizeAngleDelta(spinTargetAngle - (cur_angle % (2 * Math.PI)));
          rotTween = {
            from: cur_angle,
            to: cur_angle + delta,
            t0: performance.now(),
            duration: 5400,
          };
        } else if (cur === 'sleep') {
          // R pressed — clear tween, restart idle rotation
          rotTween = null;
        }

        lastPhase = cur;
      }

      // Apply Earth rotation
      if (rotTween) {
        const p = Math.min(1, (performance.now() - rotTween.t0) / rotTween.duration);
        const k = ease(p);
        earthSpin.rotation.y = rotTween.from + (rotTween.to - rotTween.from) * k;
        if (p >= 1) rotTween = null;
      } else if (cur === 'sleep') {
        earthSpin.rotation.y += (2 * Math.PI / (86164 / TIME_SCALE_EARTH)) * dt;
      }

      // Satellites
      sats.forEach((s) => { s.pivot.rotation.y += s.speed * dt * (TIME_SCALE_SAT / 250); });

      // Stars twinkle
      starsMat.opacity = 0.85 + Math.sin(t * 1.8) * 0.07;
      stars.rotation.y += dt * 0.003;

      // Camera tween
      const p = Math.min(1, (performance.now() - camT0) / camTarget.duration);
      const k = ease(p);
      camera.position.lerpVectors(camFrom.pos, camTarget.pos, k);
      camera.fov = camFrom.fov + (camTarget.fov - camFrom.fov) * k;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);

      // Drive nebula + sun animations
      nebulaMat.uniforms.uTime.value = t;
      sunMat.uniforms.uTime.value = t;
      sunMesh.lookAt(camera.position);

      // ── EARTH DISSOLUTION ──
      // As particles emerge, Earth visibly shrinks + spins faster (disintegrates).
      const targetScale = cur === 'sleep' ? 1.0 : 0.0;
      const currentScale = earthTilt.scale.x;
      const scaleSpeed = targetScale > currentScale ? 0.025 : 0.015;
      const newScale = currentScale + (targetScale - currentScale) * scaleSpeed;
      earthTilt.scale.setScalar(newScale);
      atmos.scale.setScalar(newScale);
      // Spin-up effect: rotate faster as Earth disintegrates
      if (cur !== 'sleep' && newScale > 0.02) {
        earthSpin.rotation.y += (1 - newScale) * 0.03;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      atmosMat.dispose();
      starGeom.dispose();
      starsMat.dispose();
      nebulaGeom.dispose();
      nebulaMat.dispose();
      sunGeom.dispose();
      sunMat.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {}, [phase]);

  // Earth fades out when particles take over during wake
  const fading = phase !== 'sleep';

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute', inset: 0,
        opacity: fading ? 0 : 1,
        transition: 'opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    />
  );
}

function loadTex(loader: THREE.TextureLoader, url: string, linear = false): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (t) => {
        t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.wrapS = THREE.RepeatWrapping;
        resolve(t);
      },
      undefined,
      (e) => reject(e)
    );
  });
}
