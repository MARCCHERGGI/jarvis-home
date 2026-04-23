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

// Use Vite's BASE_URL so paths work under both dev (/ base) and prod
// (file:// with ./ base). Hardcoded /textures/... was resolving to
// filesystem root under file://, causing every texture to 404 silently
// and leaving the dark-blue placeholder material visible.
const B = import.meta.env.BASE_URL;
const TEX = {
  day:    `${B}textures/earth-day.jpg`,
  night:  `${B}textures/earth-night.jpg`,
  water:  `${B}textures/earth-water.png`,
  topo:   `${B}textures/earth-topology.png`,
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
    // 16x16 sphere (was 32x32) is plenty — the vertex density doesn't
    // matter, only the fragment shader. Fragment-side we gate `visible`
    // per-phase in the tick loop so the fullscreen fbm pass is zero-cost
    // during the Earth→JARVIS dive. That single gate is the single
    // largest foundational perf lever for the wake transition.
    const nebulaGeom = new THREE.SphereGeometry(900, 16, 16);
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
          // 2 octaves (was 5) — fullscreen fbm was the largest per-frame
          // fragment cost. The haze is "barely visible" anyway, the
          // extra octaves were invisible.
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 2; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
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
      // 96x96 = ~18k tris (was 128x128 = 32k tris, originally 256x256 = 131k).
      // Vertex shader cost scales linearly with tris — 44% cheaper than 128x128
      // for the descent tween with no visible silhouette change at orbital distance.
      const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 96, 96), earthMat);
      earthSpin.add(earth);
      (earthTilt as any).__earthMat = earthMat;
    });

    // Atmosphere — 48x48 (was 96x96), additive-blended haze doesn't need detail.
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: { uSunDir: { value: sun } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const atmos = new THREE.Mesh(new THREE.SphereGeometry(ATMOS_R, 32, 32), atmosMat);
    scene.add(atmos);

    // Stars
    const starGeom = new THREE.BufferGeometry();
    const N = 300;  // heavy perf cut — invisible diff at typical viewing distance
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

    // ══ PHYSICS-BASED TRAJECTORY ══
    //
    // One continuous motion from orbital rest → NYC arrival. No phase-
    // boundary restart (that was the source of velocity hitches). Phase
    // only gates WHEN to start; the camera follows a single curve that
    // runs to completion.
    //
    // Direction: spherical slerp from sleep-gaze to NYC-gaze (great arc).
    // Radius:    gravity-friction curve (smoothstep) — slow orbital
    //            release, accelerate through free-fall, decelerate into
    //            atmospheric braking. Feels like a real re-entry.
    // FOV:       dolly-zoom (42 → 52 peak at mid-dive → 28 final). The
    //            widen-then-tighten gives kinetic speed perception
    //            without actually moving faster.
    const SLEEP_POS = new THREE.Vector3(0, 0.25, 4.8);
    const SLEEP_FOV = 42;
    const ARRIVAL_R = 1.055;                // just above atmosphere (1.025)
    const ARRIVAL_FOV = 28;
    const FOV_PEAK = 52;
    const WAKE_DURATION = 1050;             // total trajectory time (ms) — snappier feels less laggy
    const FOV_PEAK_AT = 0.42;               // s at which FOV widens to peak

    const SLEEP_DIR = SLEEP_POS.clone().normalize();
    const ARRIVAL_POS = nycFinalWorldDir.clone().multiplyScalar(ARRIVAL_R);
    const ARRIVAL_DIR = nycFinalWorldDir.clone();

    // Pre-compute the slerp constants so the per-frame cost is just two
    // sins + a scalar lerp (no acos).
    const arcDot = Math.max(-1, Math.min(1, SLEEP_DIR.dot(ARRIVAL_DIR)));
    const arcTheta = Math.acos(arcDot);
    const arcSinTheta = Math.sin(arcTheta);

    const smoothstep = (x: number) => {
      const t = Math.max(0, Math.min(1, x));
      return t * t * (3 - 2 * t);
    };
    const smootherstep = (x: number) => {
      const t = Math.max(0, Math.min(1, x));
      return t * t * t * (t * (t * 6 - 15) + 10);
    };

    const trajectoryAt = (s: number, out: THREE.Vector3): number => {
      // Direction — great-arc slerp, eased with smootherstep (long-tail settle)
      const ts = smootherstep(s);
      let dx: number, dy: number, dz: number;
      if (arcTheta < 0.001) {
        dx = SLEEP_DIR.x + (ARRIVAL_DIR.x - SLEEP_DIR.x) * ts;
        dy = SLEEP_DIR.y + (ARRIVAL_DIR.y - SLEEP_DIR.y) * ts;
        dz = SLEEP_DIR.z + (ARRIVAL_DIR.z - SLEEP_DIR.z) * ts;
      } else {
        const w1 = Math.sin((1 - ts) * arcTheta) / arcSinTheta;
        const w2 = Math.sin(ts * arcTheta) / arcSinTheta;
        dx = w1 * SLEEP_DIR.x + w2 * ARRIVAL_DIR.x;
        dy = w1 * SLEEP_DIR.y + w2 * ARRIVAL_DIR.y;
        dz = w1 * SLEEP_DIR.z + w2 * ARRIVAL_DIR.z;
      }
      // Radius — gravity-friction profile: smoothstep over s
      const tr = smoothstep(s);
      const r = SLEEP_POS.length() + (ARRIVAL_R - SLEEP_POS.length()) * tr;
      out.set(dx * r, dy * r, dz * r);
      // Return the normalized cruise velocity (0..1, peaks around mid) —
      // used to modulate decorative work.
      return 4 * s * (1 - s);
    };

    // Dolly-zoom FOV curve. Widens for apparent speed through descent,
    // then tightens to focus on arrival.
    const fovAt = (s: number): number => {
      if (s <= FOV_PEAK_AT) {
        const u = smoothstep(s / FOV_PEAK_AT);
        return SLEEP_FOV + (FOV_PEAK - SLEEP_FOV) * u;
      }
      const u = smoothstep((s - FOV_PEAK_AT) / (1 - FOV_PEAK_AT));
      return FOV_PEAK + (ARRIVAL_FOV - FOV_PEAK) * u;
    };

    // Render loop
    const clock = new THREE.Clock();
    let raf = 0;
    let lastPhase = useJarvis.getState().phase;
    let wakeStartTime = 0;     // 0 = trajectory inactive
    let sleepReturnTime = 0;   // 0 = not returning to sleep
    let sleepReturnFrom = { pos: SLEEP_POS.clone(), fov: SLEEP_FOV };

    const ease = (x: number) => {
      const t = Math.max(0, Math.min(1, x));
      return 1 - Math.pow(1 - t, 3.3);
    };

    const tmpPos = new THREE.Vector3();

    // ══ SLEEP-PHASE FRAME THROTTLE ══
    // Earth rotates at <1°/s during sleep. 30fps looks identical to 60fps
    // for that motion. Throttling during sleep halves the WebGL+Three.js
    // per-frame cost while Marco is just staring at the globe — which is
    // his default state. During wake (dive trajectory), we run full 60fps
    // for camera smoothness.
    let lastRenderT = 0;
    const SLEEP_FRAME_MS = 33;   // 30fps
    const ACTIVE_FRAME_MS = 8;   // 120fps cap (lets high-refresh displays breathe)

    const tick = () => {
      const dt = clock.getDelta();
      const t  = clock.getElapsedTime();
      const cur = useJarvis.getState().phase;

      // Once Earth has dissolved, skip all work. The raf continues
      // so R-to-sleep resumes instantly, but we touch nothing.
      if ((cur === 'briefing' || cur === 'ready') && earthTilt.scale.x < 0.005) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // ══ FOUNDATIONAL WAKE-LAG FIX ══
      // Per-frame visibility gates. The nebula sphere is a 900-unit
      // BackSide mesh — it renders as a fullscreen fragment pass every
      // frame with fbm noise. During the dive the camera is inside a
      // fullscreen Earth + atmos render; the nebula is fully occluded
      // but still pays its fragment bill. Hiding it during wake cuts
      // the single largest per-pixel cost off the dive entirely.
      // Satellite rings are also invisible during the dive — kill them too.
      const isSleep = cur === 'sleep';
      if (nebula.visible !== isSleep) nebula.visible = isSleep;
      // Satellite rings/bodies: hide off-sleep. Cheap (4 draw calls saved).
      for (let i = 0; i < sats.length; i++) {
        const plane = sats[i].pivot.parent;
        if (plane && plane.visible !== isSleep) plane.visible = isSleep;
      }
      // Stars: fade out immediately on wake. Let the points object stay
      // but hide it entirely once opacity hits zero to skip the draw call.
      stars.visible = isSleep || starsMat.opacity > 0.02;

      // ── Phase transition detection ──
      if (cur !== lastPhase) {
        if (cur !== 'sleep' && wakeStartTime === 0) {
          // First non-sleep phase → start the wake trajectory. Begin
          // Earth rotation in parallel so NYC arrives on +Z by the
          // time the camera does.
          wakeStartTime = performance.now();
          sleepReturnTime = 0;
          const curAngle = earthSpin.rotation.y;
          const delta = normalizeAngleDelta(spinTargetAngle - (curAngle % (2 * Math.PI)));
          rotTween = {
            from: curAngle,
            to: curAngle + delta,
            t0: wakeStartTime,
            duration: WAKE_DURATION * 0.72,
          };
        } else if (cur === 'sleep') {
          // R pressed → glide back to orbital rest
          sleepReturnTime = performance.now();
          sleepReturnFrom = { pos: camera.position.clone(), fov: camera.fov };
          wakeStartTime = 0;
          rotTween = null;
        }
        lastPhase = cur;
      }

      // ── Earth rotation ──
      if (rotTween) {
        const p = Math.min(1, (performance.now() - rotTween.t0) / rotTween.duration);
        earthSpin.rotation.y = rotTween.from + (rotTween.to - rotTween.from) * smootherstep(p);
        if (p >= 1) rotTween = null;
      } else if (cur === 'sleep') {
        earthSpin.rotation.y += (2 * Math.PI / (86164 / TIME_SCALE_EARTH)) * dt;
      }

      // ── Camera: unified trajectory ──
      let velocity = 0;
      if (wakeStartTime > 0) {
        const elapsed = performance.now() - wakeStartTime;
        const s = Math.min(1, elapsed / WAKE_DURATION);
        velocity = trajectoryAt(s, tmpPos);
        camera.position.copy(tmpPos);
        camera.fov = fovAt(s);
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
      } else if (sleepReturnTime > 0) {
        const p = Math.min(1, (performance.now() - sleepReturnTime) / 800);
        const k = ease(p);
        camera.position.lerpVectors(sleepReturnFrom.pos, SLEEP_POS, k);
        camera.fov = sleepReturnFrom.fov + (SLEEP_FOV - sleepReturnFrom.fov) * k;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
        if (p >= 1) sleepReturnTime = 0;
      }

      // ── Decorative work (skip during wake for budget headroom) ──
      if (cur === 'sleep') {
        sats.forEach((s) => { s.pivot.rotation.y += s.speed * dt * (TIME_SCALE_SAT / 250); });
        starsMat.opacity = 0.85 + Math.sin(t * 1.8) * 0.07;
        stars.rotation.y += dt * 0.003;
        nebulaMat.uniforms.uTime.value = t;
        sunMat.uniforms.uTime.value = t;
        sunMesh.lookAt(camera.position);
      } else {
        // During wake — fade stars/sats/nebula out quickly, then stop touching them.
        const fade = Math.max(0, 1 - velocity * 2 - (wakeStartTime > 0 ?
          Math.min(1, (performance.now() - wakeStartTime) / 400) : 0));
        starsMat.opacity = 0.85 * fade;
        if (fade > 0.02) {
          // Only keep satellites/nebula alive for the first ~400ms of wake
          sats.forEach((s) => { s.pivot.rotation.y += s.speed * dt * (TIME_SCALE_SAT / 250); });
          nebulaMat.uniforms.uTime.value = t;
        }
      }

      // ── Earth dissolution ──
      // Earth stays at full scale during the dive (you see it rushing up).
      // Only dissolves once the map takes over in briefing.
      // Dissolve is FAST (0.055) so the concurrent-render window with the
      // orb emergence is short — that overlap was the peak lag spike.
      const targetScale = (cur === 'briefing' || cur === 'ready') ? 0.0 : 1.0;
      const currentScale = earthTilt.scale.x;
      const scaleSpeed = targetScale > currentScale ? 0.035 : 0.055;
      const newScale = currentScale + (targetScale - currentScale) * scaleSpeed;
      earthTilt.scale.setScalar(newScale);
      atmos.scale.setScalar(newScale);

      // Frame-pace: sleep = 30fps, wake/dissolve = full speed.
      const nowMs = performance.now();
      const isSleepIdle = cur === 'sleep' && sleepReturnTime === 0 && wakeStartTime === 0;
      const frameBudget = isSleepIdle ? SLEEP_FRAME_MS : ACTIVE_FRAME_MS;
      if (nowMs - lastRenderT >= frameBudget) {
        renderer.render(scene, camera);
        lastRenderT = nowMs;
      }
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

  // Canvas only fades once the map/orb has taken over. During waking and
  // descending the Earth must stay fully visible — the user is diving
  // through it. Fade only kicks in at briefing, fast, so no lingering ghost.
  const fading = phase === 'briefing' || phase === 'ready';

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute', inset: 0,
        opacity: fading ? 0 : 1,
        transition: 'opacity 650ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity',
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
