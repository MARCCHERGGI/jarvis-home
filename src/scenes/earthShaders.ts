// Photoreal Earth shaders — tuned for realism.
//   - Deep blacks on night side, only city lights show
//   - Sharp terminator (~8°)
//   - Clouds as genuine alpha layer, minimal color bleed
//   - Pinpoint ocean sun-glint (pow 120)
//   - Normal perturbation from topology map for terrain relief
//   - Restrained atmosphere: blue rim only, no sunward whiteout

export const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewPos;

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vViewPos = (viewMatrix * wp).xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const earthFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uSpec;      // white = water
  uniform sampler2D uTopo;      // grayscale elevation
  uniform vec3  uSunDir;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  // Sample topology for cheap normal perturbation
  vec3 perturbNormal(vec2 uv, vec3 N) {
    vec2 du = vec2(1.0/4096.0, 0.0);
    vec2 dv = vec2(0.0, 1.0/2048.0);
    float hL = texture2D(uTopo, uv - du).r;
    float hR = texture2D(uTopo, uv + du).r;
    float hD = texture2D(uTopo, uv - dv).r;
    float hU = texture2D(uTopo, uv + dv).r;
    vec3 grad = vec3(hR - hL, hU - hD, 0.03);
    // Tangent-ish perturbation — rough but reads as 3D terrain under grazing light
    return normalize(N + grad * 0.6);
  }

  void main() {
    vec3 baseN = normalize(vNormal);
    vec3 N = perturbNormal(vUv, baseN);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float sunDot = dot(N, uSunDir);

    // Sharp-ish terminator (7° half-width)
    float daylight = smoothstep(-0.05, 0.10, sunDot);

    vec3 day   = texture2D(uDay,    vUv).rgb;
    vec3 night = texture2D(uNight,  vUv).rgb;
    float water  = texture2D(uSpec,  vUv).r;

    // Deepen oceans — where water mask is white, darken blue for that true-Pacific look
    vec3 oceanDeep = vec3(0.01, 0.04, 0.09);
    day = mix(day, oceanDeep + day * 0.45, water * 0.55);

    // DAY: strong sun, dark ambient; high saturation for vivid continents
    vec3 dayLit = day * (0.04 + 1.45 * daylight);
    float luma = dot(dayLit, vec3(0.299, 0.587, 0.114));
    dayLit = mix(vec3(luma), dayLit, 1.55); // +55% saturation

    // NIGHT: pure black base, city lights only
    vec3 nightLit = night * 3.8 * (1.0 - daylight);

    vec3 color = dayLit + nightLit;

    // Pinpoint ocean sun-glint (tight highlight only over water)
    vec3 R = reflect(-uSunDir, baseN);
    float specHL = pow(max(dot(V, R), 0.0), 140.0) * water * daylight;
    color += vec3(1.0, 0.96, 0.82) * specHL * 3.2;

    // Fresnel rim — blue, restrained, only lit side
    float rim = pow(1.0 - max(dot(V, baseN), 0.0), 3.2);
    color += vec3(0.22, 0.42, 0.85) * rim * daylight * 0.32;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ATMOSPHERE ----------------------------------------------------------------
// Thin blue limb only. No sunward whiteout.

export const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const atmosphereFragment = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float NdotV  = max(dot(N, V), 0.0);
    float sunDot = dot(N, uSunDir);

    // Falls off sharply from limb — thin atmosphere, not a halo
    float atmos = pow(1.0 - NdotV, 3.5);

    // Twilight color shift: dusky at terminator, deep night on unlit limb
    float sunLit = smoothstep(-0.35, 0.25, sunDot);
    vec3 atmColor = mix(
      vec3(0.01, 0.02, 0.06),  // night limb
      vec3(0.20, 0.45, 0.90),  // day limb — blue, not white
      sunLit
    );

    float alpha = atmos * (0.15 + 0.55 * sunLit);
    gl_FragColor = vec4(atmColor * atmos * 1.1, alpha);
  }
`;
