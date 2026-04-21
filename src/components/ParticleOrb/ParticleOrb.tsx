import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ampBus } from '@/services/audio/ampBus';
import { useJarvis } from '@/state/store';

/**
 * JARVIS Spirit — voice-locked orb.
 *
 * STRICT RULE: every visible motion is driven by the live voice amplitude.
 *   - No idle sin-wave breathing
 *   - No time-based drift
 *   - No amplitude floor when silent
 *   - Noise time only ticks while voice is flowing (so the orb is LITERALLY
 *     frozen between words, and explodes into motion during speech)
 *
 * When Alice is silent → the orb is a still, dim disc.
 * When Alice speaks   → the orb ripples, breathes, brightens, shimmers.
 *
 * You can tell it's voice-driven because it stops moving the instant the
 * voice pauses. No ambiguity, no fake life.
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
    const internalSize = Math.round(size * 0.65);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
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
        uNoiseTime: { value: 0 },   // accumulates ONLY while voice flows
        uAmp:       { value: 0 },   // live voice amplitude (0..1)
        uMorph:     { value: 0 },   // wake fade-in (0..1)
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv * 2.0 - 1.0;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: SNOISE + /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uNoiseTime;
        uniform float uAmp;
        uniform float uMorph;

        void main() {
          vec2 p = vUv;
          float d = length(p);
          float angle = atan(p.y, p.x);

          // ── Voice amplitude is THE ONLY motor ──────────────────────
          // v = 0 means frozen. v = 1 means maximum life.
          float v = uAmp;

          // Noise evolves only while voice is flowing. uNoiseTime is
          // integrated amp × dt, so it literally doesn't advance between words.
          float tn = uNoiseTime;

          vec3 nCoord1 = vec3(cos(angle) * 1.6, sin(angle) * 1.6, tn);
          vec3 nCoord2 = vec3(cos(angle) * 3.4, sin(angle) * 3.4, tn * 1.4);
          float n1 = snoise(nCoord1);
          float n2 = snoise(nCoord2) * 0.4;
          float ripple = (n1 + n2) * (v * 0.09);   // ripple amplitude = voice

          // Radius — base size + voice-driven breath. No idle pulse.
          float baseRadius  = 0.56;
          float voiceBreath = v * 0.075;
          float radius = (baseRadius + voiceBreath + ripple) * uMorph;

          // Soft SDF shading
          float core    = smoothstep(radius, radius * 0.55, d);
          float glow    = smoothstep(radius * 1.9, radius * 0.9, d);
          float edgeRim = smoothstep(radius * 1.05, radius * 0.85, d)
                        - smoothstep(radius * 0.98, radius * 0.80, d);
          edgeRim = clamp(edgeRim, 0.0, 1.0);

          // ── Color: DIM when silent, BRIGHT when voice ──
          vec3 silentCore = vec3(0.03, 0.10, 0.24);
          vec3 silentMid  = vec3(0.10, 0.28, 0.55);
          vec3 activeCore = vec3(0.02, 0.18, 0.55);
          vec3 activeMid  = vec3(0.22, 0.62, 1.00);
          vec3 brightCy   = vec3(0.72, 0.95, 1.00);
          vec3 iriPink    = vec3(1.00, 0.65, 0.95);

          // Blend silent ↔ active palette by voice amplitude
          vec3 coreCol = mix(silentCore, activeCore, v);
          vec3 midCol  = mix(silentMid,  activeMid,  v);

          float radialT = clamp(d / max(radius, 0.0001), 0.0, 1.0);
          vec3 color = mix(coreCol, midCol, pow(radialT, 1.4));
          color      = mix(color, brightCy, pow(radialT, 6.0) * v);

          // Iridescent rim — only appears with voice (hueShift uses uNoiseTime)
          float hueShift = 0.5 + 0.5 * sin(angle * 2.0 + tn + ripple * 2.0);
          vec3 iri = mix(brightCy, iriPink, hueShift * 0.65);
          color = mix(color, iri, edgeRim * 0.55 * v);

          // Voice-driven brightness lift + peak-white rim flash
          color += activeMid * v * 0.45;
          color = mix(color, vec3(1.0), v * 0.35 * edgeRim);

          // Inner shimmer — voice gated, noise-time driven
          float shimmer = snoise(vec3(p * 2.0, tn * 0.6)) * 0.2 * v;
          color += vec3(0.3, 0.6, 1.0) * shimmer * core;

          // Alpha — visible at rest but dimmer, full-opacity during voice
          float baseAlpha = core * 0.55 + glow * 0.20 + edgeRim * 0.25;
          float voiceAlpha = (core * 0.30 + glow * 0.18 + edgeRim * 0.35) * v;
          float alpha = clamp(baseAlpha + voiceAlpha, 0.0, 1.0) * uMorph;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);

    // Render loop
    let raf = 0;
    const clock = new THREE.Clock();
    let morphTarget = 0;
    let morphCurrent = 0;
    let smoothAmp = 0;
    let noiseTime = 0;

    const tick = () => {
      const dt = clock.getDelta();
      const phase = phaseRef.current;

      // ── VOICE IS THE ONLY MOTOR ──────────────────────────────────
      // rawAmp = 0 when not speaking (no floor, no idle).
      // Tight smoothing — fast attack so words land instantly,
      // moderate release so you still see the tail of each syllable.
      const rawAmp = ampBus.active ? ampBus.amp : 0;
      smoothAmp += (rawAmp - smoothAmp) * (rawAmp > smoothAmp ? 0.55 : 0.35);

      // Noise time only advances while voice is flowing. When silent,
      // the orb is literally frozen. This is the STRICTEST voice-coupling.
      noiseTime += dt * smoothAmp * 2.0;

      morphTarget = phase === 'sleep' ? 0 : 1;
      const morphSpeed = morphTarget > morphCurrent ? 0.028 : 0.034;
      morphCurrent += (morphTarget - morphCurrent) * morphSpeed;
      morphCurrent = Math.max(0, Math.min(1, morphCurrent));

      mat.uniforms.uNoiseTime.value = noiseTime;
      mat.uniforms.uAmp.value       = smoothAmp;
      mat.uniforms.uMorph.value     = morphCurrent;

      if (morphCurrent > 0.001) {
        renderer.render(scene, camera);
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
        filter: 'drop-shadow(0 0 32px rgba(108,180,255,0.5)) drop-shadow(0 0 80px rgba(70,120,255,0.3))',
      }}
    />
  );
}
