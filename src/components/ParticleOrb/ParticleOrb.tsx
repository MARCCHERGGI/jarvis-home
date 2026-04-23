import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ampBus } from '@/services/audio/ampBus';
import { useJarvis } from '@/state/store';

/**
 * JARVIS Spirit — Consciousness Resonance Field.
 *
 * The orb is JARVIS's mind made visible. Its structure is permanent —
 * her cognitive architecture. Her speech sculpts the field in real time,
 * each phoneme literally shaping the surface.
 *
 * Permanent structure (visible even in silence):
 *   · sphere projection (the form)
 *   · iris / pupil (her attention point)
 *   · inner hex armature (cognitive lattice, visible through glass)
 *   · blueprint grid + equator (reference geometry)
 *   · fresnel shell (the body boundary)
 *
 * Voice-sculpted field (only when speaking):
 *   · band-split coupling — each frequency range drives a different layer:
 *       bass     → plasma bloom (body/vowel sustain)
 *       mid      → rotation + equator thickening
 *       high     → sibilant speckle (tiny bright motes)
 *   · great-circle speaking wave — 3D ring sweeps pole-to-pole on each
 *     syllable, riding around the sphere like a pulse through her body
 *   · iris dilates with amp (attention opens when she speaks)
 *   · axis nutation (the body reacts to each word)
 *
 * Every phoneme gives the sphere a unique signature because each class
 * of sound lives in different bands — sibilants pop speckle, vowels swell
 * plasma, consonants flick filaments, bass thumps radial bloom.
 *
 * Peaks are capped well below 1.0. Brightness is controlled — the detail
 * carries the visual, not the glare.
 */

const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0,.5,1,2);
  vec3 i=floor(v+dot(v,C.yyy)),x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz),l=1.-g,i1=min(g,l.zxy),i2=max(g,l.zxy);
  vec3 x1=x0-i1+C.xxx,x2=x0-i2+C.yyy,x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0,i1.z,i2.z,1))+i.y+vec4(0,i1.y,i2.y,1))+i.x+vec4(0,i1.x,i2.x,1));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z),x_=floor(j*ns.z),y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy,y=y_*ns.x+ns.yyyy,h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy),b1=vec4(x.zw,y.zw),s0=floor(b0)*2.+1.,s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0)),a0=b0.xzyw+s0.xzyw*sh.xxyy,a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x),p1=vec3(a0.zw,h.y),p2=vec3(a1.xy,h.z),p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

export function ParticleOrb({ size = 520 }: { size?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(useJarvis.getState().phase);

  useEffect(() => {
    const unsub = useJarvis.subscribe((s) => { phaseRef.current = s.phase; });
    return unsub;
  }, []);

  useEffect(() => {
    const mount = mountRef.current!;
    // 0.48× internal — aggressive cut for steady-state perf. Orb displays
    // at scale 0.52 so visible diameter ≈ 0.52 × size, internal = 0.48 ×
    // size: the canvas is *smaller* than the final display, so CSS
    // scales it up a touch (1.08×). Softens detail fractionally; saves
    // ~40% more fragment work vs 0.58.
    const internalSize = Math.round(size * 0.48);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(internalSize, internalSize);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = `${size}px`;
    renderer.domElement.style.height = `${size}px`;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uNoiseTime: { value: 0 },
        uAmp:       { value: 0 },
        uAmpFast:   { value: 0 },
        uBandLow:   { value: 0 },   // bass/vowel body (bands 0)
        uBandMid:   { value: 0 },   // speech mid (bands 1-2)
        uBandHigh:  { value: 0 },   // sibilant/hi (bands 3-7)
        uWaveSeed:  { value: 0 },   // per-syllable random seed for wave axis
        uMomentum:  { value: 0 },   // cumulative voice integral (axis drift)
        uMorph:     { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv * 2.0 - 1.0;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: SNOISE + /* glsl */ `
        precision mediump float;
        varying vec2 vUv;
        uniform float uNoiseTime;
        uniform float uAmp;
        uniform float uAmpFast;
        uniform float uBandLow;
        uniform float uBandMid;
        uniform float uBandHigh;
        uniform float uWaveSeed;
        uniform float uMomentum;
        uniform float uMorph;

        mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

        // Deterministic hash — stable per uWaveSeed so the wave axis
        // is consistent across a single syllable, different between them.
        vec3 hashAxis(float s) {
          float a = fract(sin(s * 12.9898) * 43758.5453);
          float b = fract(sin(s * 78.233)  * 43758.5453);
          // Uniform direction on sphere
          float th = a * 6.2831853;
          float ph = acos(2.0 * b - 1.0);
          return vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th));
        }

        void main() {
          vec2 p = vUv;
          float r = length(p);
          if (r > 1.02) discard;

          // ── SPHERE PROJECTION ──
          float z2 = max(0.0, 1.0 - r * r);
          float z  = sqrt(z2);
          vec3 N   = vec3(p.x, p.y, z);

          // ── ROTATION + NUTATION + CUMULATIVE DRIFT ──
          // Base voice-locked rotation + per-word axis wobble (nutation)
          // + very slow cumulative drift so the orb "settles" into a
          // different orientation after each conversation.
          float wob = uAmp * 0.18;
          float ry = uNoiseTime * 0.60 + sin(uNoiseTime * 3.3) * wob + uMomentum * 0.12;
          float rx = uNoiseTime * 0.26 + cos(uNoiseTime * 4.1) * wob * 0.7 + uMomentum * 0.05;
          vec3 rN = N;
          rN.xz = rot2(ry) * rN.xz;
          rN.yz = rot2(rx) * rN.yz;

          float lon = atan(rN.x, rN.z);
          float lat = asin(clamp(rN.y, -1.0, 1.0));

          // ── LAYER A: deep volumetric plasma (bass-band coupled) ──
          // Low band swells the plasma on vowel sustain.
          vec3 deepCoord = rN * 1.8;
          float deep1 = snoise(deepCoord + vec3(uNoiseTime * 0.35, 0.0, 0.0));
          float deep2 = snoise(deepCoord * 2.1 + vec3(0.0, uNoiseTime * 0.42, 0.0)) * 0.5;
          float deepPlasma = clamp((deep1 + deep2) * 0.6 + 0.5, 0.0, 1.0);
          deepPlasma *= 0.7 + uBandLow * 0.9;

          // ── LAYER B: surface plasma (mid-band coupled) ──
          vec3 surfCoord = rN * 3.6;
          float surf = snoise(surfCoord + vec3(uNoiseTime * 1.15, 0.0, 0.0));
          float surfPlasma = smoothstep(-0.2, 0.7, surf) * uAmp;

          // ── LAYER C: blueprint grid ──
          float meridMajor = pow(abs(sin(lon * 6.0)), 56.0);
          float meridMinor = pow(abs(sin(lon * 18.0)), 80.0) * 0.35;
          float latMajor   = pow(abs(sin(lat * 5.0)), 44.0);
          float latMinor   = pow(abs(sin(lat * 14.0)), 80.0) * 0.28;
          float grid = max(meridMajor, max(meridMinor, max(latMajor * 0.85, latMinor)));
          grid *= pow(z, 0.4);

          // ── LAYER C2: equator band — mid-band + momentum driven ──
          float equatorThickness = 0.012 + uBandMid * 0.035;
          float equator = 1.0 - smoothstep(0.0, equatorThickness, abs(lat));
          equator *= pow(z, 0.35);

          // ── LAYER C3: polar cap rings ──
          float polarMask = smoothstep(0.78, 0.92, abs(rN.y));
          float polarRings = pow(abs(sin(abs(rN.y) * 38.0)), 60.0) * polarMask;

          // ── LAYER D: fresnel glass edge ──
          float fresnel = pow(1.0 - z, 2.4);

          // ── LAYER E: razor outline shell ──
          float shell = smoothstep(0.965, 0.995, r) * (1.0 - smoothstep(0.995, 1.015, r));

          // ── LAYER F: voice filaments ──
          float filament = 0.0;
          if (uAmp > 0.03) {
            float fw1 = sin(lon * 3.0 + lat * 2.0 + uNoiseTime * 3.4)
                      * sin(lat * 5.0 - uNoiseTime * 2.1);
            float fw2 = sin(lon * 7.0 - lat * 4.5 - uNoiseTime * 5.2)
                      * cos(lat * 3.0 + uNoiseTime * 3.8);
            float fw  = max(smoothstep(0.82, 1.0, fw1), smoothstep(0.88, 1.0, fw2) * 0.75);
            filament = fw * uAmpFast;
          }

          // ── LAYER G: hex plates ──
          vec2 hx = vec2(lon * 4.2, lat * 4.4);
          hx.x += step(1.0, mod(hx.y, 2.0)) * 0.5;
          vec2 hxF = fract(hx) - 0.5;
          float hxD = max(abs(hxF.x), abs(hxF.y) * 1.1547);
          float hex = smoothstep(0.42, 0.46, hxD) * pow(z, 0.55) * 0.5;

          // ── LAYER H: GREAT-CIRCLE SPEAKING WAVE ── (unique)
          // A plane slices the sphere. The ring is the intersection of
          // that plane with the surface. The plane sweeps pole-to-pole
          // (its offset cycles -1..+1) while its axis is chosen per
          // syllable (uWaveSeed) — so every word writes a different arc
          // across JARVIS's body. True 3D, not a flat radial sonar.
          vec3 waveAxis = hashAxis(uWaveSeed);
          float axisDot = dot(rN, waveAxis);
          float sweep   = sin(uNoiseTime * 4.0);      // -1..+1
          float ringPos = abs(axisDot - sweep);
          float wave1 = 1.0 - smoothstep(0.0, 0.025, ringPos);
          // Secondary perpendicular wave for cross-pattern
          vec3 waveAxis2 = hashAxis(uWaveSeed + 0.37);
          float axisDot2 = dot(rN, waveAxis2);
          float ringPos2 = abs(axisDot2 - cos(uNoiseTime * 3.5));
          float wave2 = (1.0 - smoothstep(0.0, 0.025, ringPos2)) * 0.7;
          float speakWave = (wave1 + wave2) * uAmpFast * (0.7 + uBandMid * 0.6);
          speakWave *= pow(z, 0.3);                   // fade at silhouette

          // ── LAYER I: SIBILANT SPECKLE ── (high-band coupled)
          // Tiny bright motes that pop across the surface. Driven by
          // high-frequency band, so "s" / "sh" / "t" trigger a shimmer
          // of dust that vowels don't. Uniquely spoken-sound-coupled.
          float speckleN = snoise(rN * 14.0 + vec3(uNoiseTime * 6.0, 0.0, 0.0));
          float speckle = smoothstep(0.55, 0.85, speckleN);
          speckle *= uBandHigh * pow(z, 0.5);

          // ── LAYER J: IRIS / PUPIL ── (meaning anchor)
          // Central dark pupil with soft falloff. Dilates with amp:
          //   silent → tight focused pupil (attention at rest)
          //   loud   → iris opens (active perception)
          float pupilR  = 0.10 + uAmp * 0.07;
          float irisR   = 0.26 + uAmp * 0.05;
          float pupil   = 1.0 - smoothstep(pupilR * 0.6, pupilR, r);
          float iris    = smoothstep(irisR, pupilR, r) * (1.0 - pupil);
          float irisBlades = pow(abs(sin(atan(p.y, p.x) * 14.0)), 4.0) * iris * 0.4;

          // ── LAYER K: INNER ARMATURE ── (structural depth)
          // Dim hex struts deeper inside the sphere than the surface
          // hex plates — reads as a cognitive lattice under the glass.
          // Uses a rotated normal at a different depth factor for
          // parallax (implies it's further "in" than the surface).
          vec3 armN = rN;
          armN.xz = rot2(-0.4) * armN.xz;
          float armLon = atan(armN.x, armN.z);
          float armLat = asin(clamp(armN.y, -1.0, 1.0));
          float armHexX = armLon * 2.6;
          float armHexY = armLat * 2.6;
          armHexX += step(1.0, mod(armHexY, 2.0)) * 0.5;
          vec2 armF = fract(vec2(armHexX, armHexY)) - 0.5;
          float armD = max(abs(armF.x), abs(armF.y) * 1.1547);
          float armature = smoothstep(0.42, 0.47, armD) * pow(z, 1.4) * 0.35;

          // ── PALETTE ── peaks capped below 1.0
          vec3 voidCol  = vec3(0.010, 0.025, 0.095);
          vec3 plasma   = vec3(0.040, 0.155, 0.410);
          vec3 cyan     = vec3(0.210, 0.520, 0.880);
          vec3 frost    = vec3(0.620, 0.870, 1.000);
          vec3 lineCol  = vec3(0.200, 0.500, 0.850);
          vec3 arcCol   = vec3(0.400, 0.800, 1.000);
          vec3 warmLow  = vec3(0.320, 0.420, 0.780);  // subtle warm-shift for bass
          vec3 speckC   = vec3(0.700, 0.900, 1.000);

          // Depth-based base (voice-breathing exponent, momentum shift)
          float breath = 0.55 - uAmp * 0.18 + sin(uNoiseTime * 7.0) * 0.06 * uAmp;
          vec3 col = mix(voidCol, plasma, pow(z, breath));

          // Low-band warms the plasma body (bass presence)
          col = mix(col, warmLow, uBandLow * 0.18);

          col = mix(col, cyan,    deepPlasma * 0.32);
          col = mix(col, cyan,    surfPlasma * 0.42);

          // Armature darkens through the glass (adds interior depth)
          col -= vec3(0.020, 0.030, 0.050) * armature;

          col = mix(col, lineCol, grid       * 0.55);
          col = mix(col, lineCol, equator    * 0.75);
          col = mix(col, lineCol, polarRings * 0.45);
          col -= vec3(0.015, 0.025, 0.040) * hex;

          col = mix(col, frost,   fresnel    * 0.48);
          col += frost  * shell     * 0.45;
          col += arcCol * filament  * 0.55;
          col += arcCol * speakWave * 0.60;
          col += speckC * speckle   * 0.55;    // sibilants pop white-cyan

          // Iris — subtle darkening at center, blades (iris-lines)
          col *= (1.0 - pupil * 0.85);
          col *= (1.0 - iris * 0.25);
          col += vec3(0.20, 0.45, 0.78) * irisBlades;

          // ── ALPHA (hollow-glass feel) ──
          float alpha = 0.18
                      + fresnel    * 0.60
                      + deepPlasma * 0.22
                      + grid       * 0.45
                      + equator    * 0.55
                      + polarRings * 0.35
                      + surfPlasma * 0.30
                      + shell      * 0.75
                      + filament   * 0.50
                      + speakWave  * 0.55
                      + speckle    * 0.35
                      + hex        * 0.10
                      + armature   * 0.12
                      + iris       * 0.15
                      + pupil      * 0.35;
          alpha = clamp(alpha, 0.0, 1.0);

          col   *= uMorph;
          alpha *= uMorph;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);

    // ── Voice state ──
    let raf = 0;
    const clock = new THREE.Clock();
    let morphTarget = 0, morphCurrent = 0;
    let smoothAmp = 0;
    let fastAmp = 0;
    let bandLow = 0, bandMid = 0, bandHigh = 0;
    let noiseTime = 0;
    let momentum = 0;
    let waveSeed = 1.0;
    let prevFastAmp = 0;
    let silenceTimer = 0;
    // Frame throttle — when the orb is idle (morph stable + no voice),
    // render at 30fps instead of 60fps. User sees no diff (nothing moves)
    // but fragment-shader cost halves for the whole silent duration.
    let lastRenderT = 0;
    const IDLE_FRAME_MS = 33;   // ~30fps when idle
    const ACTIVE_FRAME_MS = 16; // ~60fps when speaking / animating

    const tick = () => {
      const dt = clock.getDelta();
      const phase = phaseRef.current;

      const rawAmp = ampBus.active ? ampBus.amp : 0;
      smoothAmp += (rawAmp - smoothAmp) * (rawAmp > smoothAmp ? 0.55 : 0.35);
      fastAmp   += (rawAmp - fastAmp)   * (rawAmp > fastAmp   ? 0.85 : 0.25);

      // ── Band smoothing ──
      // bands[0] → low (bass/vowel sustain)
      // bands[1..2] → mid (speech body)
      // bands[3..7] → high (sibilants/consonants)
      const bands = ampBus.bands;
      const rawLow  = ampBus.active ? bands[0] : 0;
      const rawMid  = ampBus.active ? ((bands[1] + bands[2]) * 0.5) : 0;
      let hiSum = 0;
      for (let i = 3; i < 8; i++) hiSum += bands[i];
      const rawHigh = ampBus.active ? (hiSum / 5) : 0;
      bandLow  += (rawLow  - bandLow)  * (rawLow  > bandLow  ? 0.50 : 0.30);
      bandMid  += (rawMid  - bandMid)  * (rawMid  > bandMid  ? 0.55 : 0.32);
      bandHigh += (rawHigh - bandHigh) * (rawHigh > bandHigh ? 0.80 : 0.28);

      // ── Per-syllable wave axis picker ──
      // Detect a sharp amp rise (fastAmp jumping) and a silence gap
      // preceding it — marks a new syllable onset. Each syllable gets
      // a fresh wave axis so every word writes a different arc.
      const dAmp = fastAmp - prevFastAmp;
      prevFastAmp = fastAmp;
      silenceTimer = rawAmp < 0.05 ? silenceTimer + dt : 0;
      if (dAmp > 0.10 && smoothAmp > 0.15 && silenceTimer === 0) {
        waveSeed = Math.random() * 1000 + 1;
      }

      // Noise time integrates voice × dt. Frozen between words.
      noiseTime += dt * smoothAmp * 2.3;
      // Momentum is a smaller-rate integration that persists — drives
      // cumulative axis drift across the whole briefing.
      momentum += dt * smoothAmp * 0.08;

      morphTarget = (phase === 'sleep' || phase === 'waking') ? 0 : 1;
      const morphSpeed = morphTarget > morphCurrent ? 0.028 : 0.034;
      morphCurrent += (morphTarget - morphCurrent) * morphSpeed;
      morphCurrent = Math.max(0, Math.min(1, morphCurrent));

      mat.uniforms.uNoiseTime.value = noiseTime;
      mat.uniforms.uAmp.value       = smoothAmp;
      mat.uniforms.uAmpFast.value   = fastAmp;
      mat.uniforms.uBandLow.value   = bandLow;
      mat.uniforms.uBandMid.value   = bandMid;
      mat.uniforms.uBandHigh.value  = bandHigh;
      mat.uniforms.uWaveSeed.value  = waveSeed;
      mat.uniforms.uMomentum.value  = momentum;
      mat.uniforms.uMorph.value     = morphCurrent;

      // Throttle — only render if enough time has passed. Active when
      // speaking or mid-morph, idle otherwise. During sleep/waking the
      // orb is at opacity:0 (invisible) so we skip rendering entirely —
      // the whole Three.js pipeline goes dark until it's actually needed.
      const nowMs = performance.now();
      const invisible = phase === 'sleep' || phase === 'waking';
      const isAnimating = smoothAmp > 0.015
        || Math.abs(morphCurrent - morphTarget) > 0.002
        || fastAmp > 0.015;
      const frameBudget = isAnimating ? ACTIVE_FRAME_MS : IDLE_FRAME_MS;
      if (!invisible && morphCurrent > 0.001 && nowMs - lastRenderT >= frameBudget) {
        renderer.render(scene, camera);
        lastRenderT = nowMs;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      mat.dispose();
      (quad.geometry as THREE.BufferGeometry).dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      style={{
        width: size, height: size, position: 'relative',
        background: 'transparent',
        // drop-shadow filter removed — it forced a full raster pass every
        // frame the orb canvas updated (30-60Hz while speaking). Visual
        // diff is a slight reduction in the outer atmospheric glow; the
        // orb's internal fresnel + shell carry the presence.
      }}
    />
  );
}
