import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MLMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useJarvis } from '@/state/store';
import { SOHO } from '@/scenes/astronomy';
import { ampBus } from '@/services/audio/ampBus';

// ══════════════════════════════════════════════════════════════
// NEON MANHATTAN · TACTICAL RECON MODE
// Base: heavily color-graded satellite + vector roads + neon 3D
// Overlay: volumetric beams, sonar ping, landmark callouts,
//          particle field, scan-wipe transitions, rgb split
// ══════════════════════════════════════════════════════════════

const STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    sat: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256, maxzoom: 19,
    },
    openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    labels: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
      ],
      tileSize: 256, maxzoom: 20,
    },
  },
  layers: [
    { id: 'sat-layer', type: 'raster', source: 'sat',
      paint: { 'raster-saturation': -0.4, 'raster-contrast': 0.25, 'raster-brightness-max': 0.85 } },

    { id: 'water-glow', source: 'openmaptiles', 'source-layer': 'water', type: 'fill', minzoom: 8,
      paint: { 'fill-color': '#052430', 'fill-opacity': 0.7 } },

    { id: 'parks', source: 'openmaptiles', 'source-layer': 'landuse', type: 'fill',
      filter: ['in', 'class', 'park', 'cemetery', 'garden'], minzoom: 12,
      paint: { 'fill-color': '#0a3a24', 'fill-opacity': 0.4 } },

    // Road tiers — all neon glow
    { id: 'road-minor', source: 'openmaptiles', 'source-layer': 'transportation',
      type: 'line', minzoom: 14, filter: ['in', 'class', 'minor', 'service'],
      paint: { 'line-color': '#6cf4ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.3, 18, 1.4],
        'line-opacity': 0.45, 'line-blur': 0.5 } },
    { id: 'road-secondary', source: 'openmaptiles', 'source-layer': 'transportation',
      type: 'line', minzoom: 12, filter: ['in', 'class', 'secondary', 'tertiary'],
      paint: { 'line-color': '#6cf4ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 18, 2.4],
        'line-opacity': 0.7, 'line-blur': 0.4 } },
    { id: 'road-primary', source: 'openmaptiles', 'source-layer': 'transportation',
      type: 'line', minzoom: 10, filter: ['in', 'class', 'primary', 'trunk'],
      paint: { 'line-color': '#a8f9ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 18, 3.6],
        'line-opacity': 0.9, 'line-blur': 0.3 } },
    { id: 'road-motorway', source: 'openmaptiles', 'source-layer': 'transportation',
      type: 'line', minzoom: 8, filter: ['==', 'class', 'motorway'],
      paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 18, 4.4],
        'line-opacity': 0.95, 'line-blur': 0.25 } },

    // Buildings — sharp neon gradient with rim highlight
    {
      id: 'buildings-3d', source: 'openmaptiles', 'source-layer': 'building',
      type: 'fill-extrusion', minzoom: 15,
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'], ['get', 'render_height'],
          0,   '#1a5868',
          40,  '#4acbd8',
          120, '#a8f9ff',
          250, '#d8feff',
          400, '#ffffff',
        ],
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'], 15, 0, 16, ['get', 'render_height'],
        ],
        'fill-extrusion-base': ['get', 'render_min_height'],
        'fill-extrusion-opacity': 0.9,
      },
    },

    // Subtle magenta accent on tallest structures
    {
      id: 'buildings-accent', source: 'openmaptiles', 'source-layer': 'building',
      type: 'fill-extrusion', minzoom: 15,
      filter: ['>', ['get', 'render_height'], 150],
      paint: {
        'fill-extrusion-color': '#ff6bc4',
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'], 15, 0, 16,
          ['*', ['get', 'render_height'], 1.02],
        ],
        'fill-extrusion-base': ['*', ['get', 'render_height'], 0.98],
        'fill-extrusion-opacity': 0.5,
      },
    },

    { id: 'labels-layer', type: 'raster', source: 'labels',
      paint: { 'raster-opacity': 0.68, 'raster-contrast': 0.3 } },
  ],
};

type Waypoint = {
  center: [number, number]; zoom: number; pitch: number; bearing: number;
  duration: number; label: string; code: string; elev: number;
};

const TOUR: Waypoint[] = [
  { center: [-74.0030, 40.7233], zoom: 16.2, pitch: 72, bearing:   0, duration: 6000, label: 'SOHO',            code: 'HQ-001', elev: 60 },
  { center: [-74.0089, 40.7074], zoom: 16.0, pitch: 74, bearing:  45, duration: 7000, label: 'TRIBECA',         code: 'SEC-014', elev: 80 },
  { center: [-74.0135, 40.7075], zoom: 15.6, pitch: 76, bearing: 115, duration: 7000, label: 'ONE WORLD TRADE', code: 'FIN-007', elev: 541 },
  { center: [-73.9903, 40.7484], zoom: 15.8, pitch: 76, bearing: 185, duration: 8000, label: 'EMPIRE STATE',    code: 'LND-042', elev: 443 },
  { center: [-73.9857, 40.7580], zoom: 15.6, pitch: 76, bearing: 240, duration: 7000, label: 'TIMES SQUARE',    code: 'COM-218', elev: 180 },
  { center: [-73.9680, 40.7829], zoom: 15.2, pitch: 72, bearing: 310, duration: 8000, label: 'CENTRAL PARK',    code: 'ENV-019', elev: 10 },
  { center: [-74.0030, 40.7233], zoom: 16.0, pitch: 72, bearing: 360, duration: 9000, label: 'SOHO · HOME',     code: 'HQ-001', elev: 60 },
];

type ScreenPos = { x: number; y: number; visible: boolean };

export function ManhattanMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const tourTimerRef = useRef<number | null>(null);
  const phase = useJarvis((s) => s.phase);

  const [waypoint, setWaypoint] = useState<Waypoint>(TOUR[0]);
  const [landmarkPos, setLandmarkPos] = useState<Record<string, ScreenPos>>({});
  const [liveView, setLiveView] = useState({
    lng: SOHO.lon, lat: SOHO.lat, zoom: 11, pitch: 35, bearing: -10,
  });
  const [glitchKey, setGlitchKey] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current, style: STYLE,
      center: [SOHO.lon, SOHO.lat], zoom: 11, bearing: -10, pitch: 35,
      interactive: false, attributionControl: false, antialias: true,
      maxPitch: 85, fadeDuration: 0,
    });
    mapRef.current = map;

    map.on('load', () => {
      const el = document.createElement('div');
      el.className = 'jv-soho-marker';
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([SOHO.lon, SOHO.lat]).addTo(map);
    });

    // Throttled projection — run at 8fps max to keep React re-renders cheap.
    // The HUD children (beams, mesh, rings, UAV, sonar, mini-map) all depend on
    // these positions, so pushing them at 60fps cascades into a full re-render.
    let lastProjectTime = 0;
    map.on('render', () => {
      const now = performance.now();
      if (now - lastProjectTime < 125) return;
      lastProjectTime = now;

      const canvas = map.getContainer();
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const pos: Record<string, ScreenPos> = {};
      TOUR.forEach((wp) => {
        const p = map.project(wp.center);
        pos[wp.code] = {
          x: p.x, y: p.y,
          visible: p.x > -60 && p.x < w + 60 && p.y > -60 && p.y < h + 60,
        };
      });
      setLandmarkPos(pos);

      const c = map.getCenter();
      setLiveView({
        lng: c.lng, lat: c.lat,
        zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(),
      });
    });

    return () => {
      if (tourTimerRef.current !== null) clearTimeout(tourTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tourTimerRef.current !== null) {
      clearTimeout(tourTimerRef.current);
      tourTimerRef.current = null;
    }

    if (phase === 'descending') {
      map.easeTo({ center: [SOHO.lon, SOHO.lat], zoom: 14, bearing: -5, pitch: 55,
        duration: 3000, easing: easeInOutCubic });
    } else if (phase === 'briefing' || phase === 'ready') {
      map.easeTo({ center: [SOHO.lon, SOHO.lat], zoom: 16.2, bearing: 0, pitch: 72,
        duration: 2200, easing: easeInOutCubic });

      const startTour = () => {
        let i = 0;
        const next = () => {
          const wp = TOUR[i % TOUR.length];
          setWaypoint(wp);
          setGlitchKey(k => k + 1); // trigger scan wipe transition
          map.easeTo({
            center: wp.center, zoom: wp.zoom, pitch: wp.pitch, bearing: wp.bearing,
            duration: wp.duration, easing: (t) => t,
          });
          i++;
          tourTimerRef.current = window.setTimeout(next, wp.duration - 80);
        };
        tourTimerRef.current = window.setTimeout(next, 2400);
      };
      startTour();
    } else {
      map.easeTo({ center: [SOHO.lon, SOHO.lat], zoom: 11, bearing: -10, pitch: 35,
        duration: 800 });
    }
  }, [phase]);

  const visible = phase === 'descending' || phase === 'briefing' || phase === 'ready';
  const fullyVisible = phase === 'briefing' || phase === 'ready';

  // Voice-reactive CSS variable — ampBus writes at audio rate, we read every frame
  useEffect(() => {
    let raf = 0;
    const pump = () => {
      const a = Math.min(1, ampBus.amp * 2.2); // boost so small voice variations show
      document.documentElement.style.setProperty('--jv-amp', a.toFixed(3));
      raf = requestAnimationFrame(pump);
    };
    raf = requestAnimationFrame(pump);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity: visible ? (fullyVisible ? 1 : 0.35) : 0,
      visibility: visible ? 'visible' : 'hidden',
      transition: 'opacity 1400ms ease-in-out',
      pointerEvents: 'none',
    }}>
      {/* Map canvas with brief-spec neon grade */}
      <div ref={containerRef} style={{
        position: 'absolute', inset: 0,
        filter: fullyVisible
          ? 'contrast(1.4) saturate(1.2) brightness(0.88) hue-rotate(-8deg)'
          : 'contrast(1.2) saturate(0.8) brightness(0.9)',
        transition: 'filter var(--jv-cine, 1200ms) var(--jv-ease, cubic-bezier(0.22,1,0.36,1))',
      }} />

      {/* ── SURVEILLANCE CONNECTION MESH ── */}
      {fullyVisible && (
        <ConnectionMesh positions={landmarkPos} activeCode={waypoint.code} />
      )}

      {/* ── ROAD TRAFFIC PARTICLES ── */}
      {fullyVisible && <RoadTraffic />}

      {/* ── LANDMARK BEAMS + CALLOUTS ── */}
      {fullyVisible && (
        <LandmarkOverlay
          positions={landmarkPos}
          activeCode={waypoint.code}
        />
      )}

      {/* ── ORBITAL TARGET-LOCK RINGS (active landmark) ── */}
      {fullyVisible && landmarkPos[waypoint.code]?.visible && (
        <OrbitalRings
          key={waypoint.code + glitchKey}
          x={landmarkPos[waypoint.code].x}
          y={landmarkPos[waypoint.code].y}
        />
      )}

      {/* ── UAV DRONE TRACKER ── */}
      {fullyVisible && landmarkPos[waypoint.code]?.visible && (
        <UAVTracker
          x={landmarkPos[waypoint.code].x}
          y={landmarkPos[waypoint.code].y}
        />
      )}

      {/* ── SONAR PING FROM SOHO ── */}
      {fullyVisible && landmarkPos['HQ-001']?.visible && (
        <SonarPing x={landmarkPos['HQ-001'].x} y={landmarkPos['HQ-001'].y} />
      )}

      {/* ── SCAN WIPE ON TOUR CHANGE ── */}
      {fullyVisible && <ScanWipe key={glitchKey} />}

      {/* ── CINEMATIC COLOR GRADE LAYERS ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,8,20,0.45) 0%, rgba(0,8,20,0.02) 40%, rgba(0,4,12,0.78) 100%)',
        mixBlendMode: 'multiply', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,4,10,0.95) 100%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,107,196,0.06), transparent 30%, transparent 70%, rgba(108,244,255,0.08))',
        mixBlendMode: 'screen', pointerEvents: 'none',
      }} />

      {/* ── RGB CHROMATIC ABERRATION ON EDGES ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(255,50,120,0.08) 100%)',
        mixBlendMode: 'screen',
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(60,220,255,0.08) 100%)',
        mixBlendMode: 'screen',
        transform: 'translate(2px, 0)',
      }} />

      {/* ── FILM GRAIN ── */}
      <div className="jv-film-grain" />

      {/* ── HORIZONTAL PAN SCAN BAR ── */}
      {fullyVisible && <div className="jv-pan-scan" />}

      {/* ── MATRIX DATA RAIN ── */}
      {fullyVisible && <MatrixRain />}

      {/* ── CITY COMMAND BAR ── */}
      {fullyVisible && <CityCommandBar waypoint={waypoint} />}

      {/* ── MINI-MAP SECTOR OVERVIEW ── */}
      {fullyVisible && <MiniMap activeCode={waypoint.code} />}

      {/* ── THREAT ZONE HEAT PATCHES ── */}
      {fullyVisible && <ThreatZones positions={landmarkPos} />}

      {/* ── HUD OVERLAY ── */}
      {fullyVisible && <ManhattanHUD waypoint={waypoint} live={liveView} />}

      {/* ── BOOT-UP ACQUIRE SEQUENCE ── */}
      {fullyVisible && <AcquireSequence />}

      <style>{manhattanCss}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LANDMARK OVERLAY — volumetric beams + floating callouts
// ══════════════════════════════════════════════════════════════

function LandmarkOverlay({ positions, activeCode }: {
  positions: Record<string, ScreenPos>;
  activeCode: string;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {TOUR.filter((t, i) => TOUR.findIndex(x => x.code === t.code) === i).map((wp) => {
        const pos = positions[wp.code];
        if (!pos || !pos.visible) return null;
        const active = wp.code === activeCode;
        return (
          <LandmarkBeam key={wp.code} wp={wp} pos={pos} active={active} />
        );
      })}
    </div>
  );
}

function LandmarkBeam({ wp, pos, active }: { wp: Waypoint; pos: ScreenPos; active: boolean }) {
  const beamH = Math.min(pos.y, 260);
  const color = active ? '#6cf4ff' : 'rgba(108,244,255,0.55)';
  return (
    <>
      {/* Volumetric beam rising from building */}
      <div style={{
        position: 'absolute',
        left: pos.x - 14,
        top: pos.y - beamH,
        width: 28,
        height: beamH,
        background: `linear-gradient(180deg,
          transparent 0%,
          ${active ? 'rgba(108,244,255,0.12)' : 'rgba(108,244,255,0.05)'} 50%,
          ${active ? 'rgba(108,244,255,0.45)' : 'rgba(108,244,255,0.18)'} 100%)`,
        filter: `blur(${active ? 3 : 2}px)`,
        pointerEvents: 'none',
        transition: 'opacity 400ms',
      }} />
      {/* Inner core beam */}
      <div style={{
        position: 'absolute',
        left: pos.x - 1,
        top: pos.y - beamH,
        width: 2,
        height: beamH,
        background: `linear-gradient(180deg, transparent 0%, ${color} 100%)`,
        boxShadow: active ? `0 0 8px ${color}, 0 0 16px ${color}` : `0 0 4px ${color}`,
        opacity: active ? 1 : 0.6,
      }} />
      {/* Base pulse ring */}
      <div style={{
        position: 'absolute',
        left: pos.x - 18, top: pos.y - 18,
        width: 36, height: 36,
        border: `1.5px solid ${color}`,
        borderRadius: '50%',
        filter: `drop-shadow(0 0 6px ${color})`,
        animation: active ? 'jv-ping 1.8s ease-out infinite' : 'jv-ping 3s ease-out infinite',
      }} />
      {/* Diamond pip at center */}
      <div style={{
        position: 'absolute',
        left: pos.x - 4, top: pos.y - 4,
        width: 8, height: 8,
        background: color,
        transform: 'rotate(45deg)',
        boxShadow: active
          ? `0 0 10px ${color}, 0 0 20px ${color}`
          : `0 0 6px ${color}`,
      }} />
      {/* Callout — only on active landmark */}
      {active && (
        <div style={{
          position: 'absolute',
          left: pos.x + 28,
          top: pos.y - beamH - 4,
          animation: 'jv-callout-in 500ms ease-out',
        }}>
          {/* connection line */}
          <svg width="36" height="18" style={{
            position: 'absolute', left: -36, top: 10, pointerEvents: 'none',
          }}>
            <line x1="0" y1="18" x2="36" y2="0" stroke={color} strokeWidth="1"
              style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
            <circle cx="0" cy="18" r="2" fill={color} />
          </svg>
          <div style={{
            padding: '5px 10px',
            background: 'linear-gradient(180deg, rgba(8,16,30,0.9), rgba(3,8,18,0.95))',
            border: `1px solid ${color}`,
            borderLeft: `3px solid ${color}`,
            backdropFilter: 'blur(8px)',
            fontFamily: 'var(--mono), monospace',
            fontSize: 9, letterSpacing: '0.22em',
            color: '#fff', textShadow: `0 0 4px ${color}`,
            boxShadow: `0 0 20px ${color}40`,
            whiteSpace: 'nowrap',
          }}>
            <div style={{ color, fontSize: 10, marginBottom: 2 }}>◉ {wp.label}</div>
            <div style={{ color: 'rgba(108,244,255,0.6)', fontSize: 8 }}>
              {wp.code} · ELEV {wp.elev}M
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// SONAR PING — expanding rings from SoHo
// ══════════════════════════════════════════════════════════════

function SonarPing({ x, y }: { x: number; y: number }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      pointerEvents: 'none', zIndex: 2,
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', left: 0, top: 0,
          width: 0, height: 0,
          border: '1.5px solid rgba(127,255,155,0.6)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          animation: `jv-sonar 4.5s ease-out infinite`,
          animationDelay: `${i * 1.5}s`,
          boxShadow: `0 0 calc(8px + var(--jv-amp, 0) * 20px) rgba(127,255,155, calc(0.4 + var(--jv-amp, 0) * 0.6))`,
        }} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SCAN WIPE — full-screen glitch transition on tour change
// ══════════════════════════════════════════════════════════════

function ScanWipe() {
  return (
    <>
      <div className="jv-scan-wipe" />
      <div className="jv-scan-flash" />
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// HUD OVERLAY — tactical chrome
// ══════════════════════════════════════════════════════════════

function ManhattanHUD({ waypoint, live }: {
  waypoint: Waypoint;
  live: { lng: number; lat: number; zoom: number; pitch: number; bearing: number };
}) {
  const lat = `${Math.abs(live.lat).toFixed(4)}° ${live.lat >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(live.lng).toFixed(4)}° ${live.lng < 0 ? 'W' : 'E'}`;
  const alt = Math.round(1500 + (20 - live.zoom) * -90);
  const pitchDeg = Math.round(live.pitch);
  const bearingDeg = Math.round((live.bearing + 360) % 360);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
      fontFamily: 'var(--mono), ui-monospace, monospace', color: '#6cf4ff' }}>

      {/* TOP-LEFT: TACTICAL BADGE */}
      <div style={{
        position: 'absolute', top: 24, left: 28,
        padding: '8px 12px',
        background: 'linear-gradient(180deg, rgba(8,16,30,0.82), rgba(3,8,18,0.95))',
        border: '1px solid rgba(108,244,255,0.35)',
        borderLeft: '3px solid #6cf4ff',
        backdropFilter: 'blur(12px)',
        fontSize: 9, letterSpacing: '0.25em',
        boxShadow: '0 0 30px rgba(108,244,255,0.25), inset 0 0 40px -10px rgba(108,244,255,0.25)',
      }}>
        <div style={{ color: '#7fff9b', textShadow: '0 0 4px #7fff9b', marginBottom: 4,
          display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, background: '#7fff9b', borderRadius: '50%',
            boxShadow: '0 0 6px #7fff9b', animation: 'jv-blink 2s infinite' }} />
          TRACKING · LIVE
        </div>
        <div style={{ color: '#fff', fontSize: 11, letterSpacing: '0.18em',
          textShadow: '0 0 6px #6cf4ff', marginBottom: 2 }}>
          {waypoint.label}
        </div>
        <div style={{ color: 'rgba(108,244,255,0.6)', fontSize: 8 }}>
          {waypoint.code} · MANHATTAN · NYC
        </div>
      </div>

      {/* TOP-RIGHT: COORDINATE READOUT */}
      <div style={{
        position: 'absolute', top: 24, right: 28,
        padding: '8px 12px',
        background: 'linear-gradient(180deg, rgba(8,16,30,0.82), rgba(3,8,18,0.95))',
        border: '1px solid rgba(108,244,255,0.35)',
        borderRight: '3px solid #6cf4ff',
        backdropFilter: 'blur(12px)',
        fontSize: 9, letterSpacing: '0.18em',
        boxShadow: '0 0 30px rgba(108,244,255,0.25)',
        minWidth: 170,
      }}>
        <Row label="LAT" value={lat} />
        <Row label="LON" value={lng} />
        <Row label="ALT" value={`${alt} M`} />
        <Row label="PCH" value={`${pitchDeg}°`} />
        <Row label="BRG" value={`${String(bearingDeg).padStart(3, '0')}°`} />
      </div>

      {/* BOTTOM-LEFT: TOUR BAR */}
      <div style={{
        position: 'absolute', bottom: 28, left: 28,
        padding: '8px 14px',
        background: 'linear-gradient(90deg, rgba(8,16,30,0.9), rgba(8,16,30,0.5))',
        border: '1px solid rgba(108,244,255,0.35)',
        borderLeft: '3px solid #ffb86c',
        fontSize: 9, letterSpacing: '0.22em',
      }}>
        <div style={{ color: '#ffb86c', textShadow: '0 0 4px #ffb86c', marginBottom: 4 }}>
          ◎ CINEMATIC TOUR · {TOUR.findIndex(t => t.code === waypoint.code) + 1} / {TOUR.length}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TOUR.map((t, i) => (
            <span key={i} style={{
              width: 18, height: 3,
              background: t.code === waypoint.code ? '#6cf4ff' : 'rgba(108,244,255,0.2)',
              boxShadow: t.code === waypoint.code ? '0 0 8px #6cf4ff' : 'none',
              transition: 'all 300ms',
            }} />
          ))}
        </div>
      </div>

      {/* BOTTOM-RIGHT: COMPASS ROSE */}
      <div style={{ position: 'absolute', bottom: 28, right: 28, width: 90, height: 90 }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="42" fill="rgba(8,16,30,0.6)"
            stroke="rgba(108,244,255,0.45)" strokeWidth="1" />
          <circle cx="45" cy="45" r="36" fill="none"
            stroke="rgba(108,244,255,0.2)" strokeWidth="0.5" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 - 90) * Math.PI / 180;
            const long = i % 9 === 0;
            const r1 = long ? 32 : 35, r2 = 40;
            return (
              <line key={i}
                x1={45 + r1 * Math.cos(a)} y1={45 + r1 * Math.sin(a)}
                x2={45 + r2 * Math.cos(a)} y2={45 + r2 * Math.sin(a)}
                stroke="#6cf4ff" strokeWidth={long ? 1.2 : 0.5}
                opacity={long ? 0.95 : 0.5} />
            );
          })}
          <text x="45" y="14" textAnchor="middle" fill="#fff" fontSize="8"
            style={{ letterSpacing: '0.1em' }}>N</text>
          <text x="80" y="48" textAnchor="middle" fill="rgba(108,244,255,0.7)" fontSize="7">E</text>
          <text x="45" y="85" textAnchor="middle" fill="rgba(108,244,255,0.7)" fontSize="7">S</text>
          <text x="10" y="48" textAnchor="middle" fill="rgba(108,244,255,0.7)" fontSize="7">W</text>
          <g transform={`rotate(${bearingDeg} 45 45)`}
            style={{ transition: 'transform 600ms cubic-bezier(0.2,0.8,0.2,1)' }}>
            <polygon points="45,15 48,48 45,51 42,48" fill="#6cf4ff"
              style={{ filter: 'drop-shadow(0 0 4px #6cf4ff)' }} />
            <polygon points="45,75 48,48 45,45 42,48" fill="rgba(255,91,107,0.8)"
              style={{ filter: 'drop-shadow(0 0 3px #ff5b6b)' }} />
          </g>
          <circle cx="45" cy="45" r="2" fill="#fff" />
        </svg>
        <div style={{
          position: 'absolute', bottom: -16, left: 0, right: 0,
          textAlign: 'center', fontSize: 7.5, letterSpacing: '0.3em',
          color: 'rgba(108,244,255,0.6)',
        }}>{String(bearingDeg).padStart(3, '0')}° BRG</div>
      </div>

      {/* CENTER MASSIVE RADAR SWEEP */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 520, height: 520,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', opacity: 0.5,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `conic-gradient(from 0deg,
            transparent 0deg,
            rgba(108,244,255,0.25) 25deg,
            rgba(108,244,255,0.02) 90deg,
            transparent 180deg)`,
          borderRadius: '50%',
          animation: 'jv-radar-spin 6s linear infinite',
          mixBlendMode: 'screen',
        }} />
      </div>

      {/* CORNER FRAME BRACKETS */}
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
        <span key={i} style={{
          position: 'absolute',
          [x ? 'right' : 'left']: 10,
          [y ? 'bottom' : 'top']: 10,
          width: 28, height: 28,
          borderTop: y ? 'none' : '1.5px solid rgba(108,244,255,0.8)',
          borderBottom: y ? '1.5px solid rgba(108,244,255,0.8)' : 'none',
          borderLeft: x ? 'none' : '1.5px solid rgba(108,244,255,0.8)',
          borderRight: x ? '1.5px solid rgba(108,244,255,0.8)' : 'none',
          filter: 'drop-shadow(0 0 6px #6cf4ff)',
        }} />
      ))}

      {/* LEFT DATA STREAM */}
      <div style={{
        position: 'absolute', left: 14, top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        transformOrigin: 'center',
        fontSize: 7.5, letterSpacing: '0.35em',
        color: 'rgba(108,244,255,0.5)', whiteSpace: 'nowrap',
      }}>
        JARVIS.SCOPE · MANHATTAN.RECON · CH-07-OMEGA
      </div>

      {/* RIGHT DATA STREAM */}
      <div style={{
        position: 'absolute', right: 14, top: '50%',
        transform: 'translateY(-50%) rotate(90deg)',
        transformOrigin: 'center',
        fontSize: 7.5, letterSpacing: '0.35em',
        color: 'rgba(108,244,255,0.5)', whiteSpace: 'nowrap',
      }}>
        ZOOM.{live.zoom.toFixed(1)} · FRAME.LOCK · OBS-{String(Math.floor(Date.now() / 100) % 10000).padStart(4, '0')}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
      <span style={{ color: 'rgba(108,244,255,0.6)', width: 28 }}>{label}</span>
      <span style={{ color: '#fff', textShadow: '0 0 4px rgba(108,244,255,0.6)' }}>{value}</span>
    </div>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ══════════════════════════════════════════════════════════════
// CONNECTION MESH — surveillance network lines between landmarks
// ══════════════════════════════════════════════════════════════

function ConnectionMesh({ positions, activeCode }: {
  positions: Record<string, ScreenPos>;
  activeCode: string;
}) {
  const unique = TOUR.filter((t, i) => TOUR.findIndex(x => x.code === t.code) === i);
  const edges: { from: ScreenPos; to: ScreenPos; active: boolean; dist: number }[] = [];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = positions[unique[i].code];
      const b = positions[unique[j].code];
      if (!a?.visible || !b?.visible) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      const active = unique[i].code === activeCode || unique[j].code === activeCode;
      edges.push({ from: a, to: b, active, dist });
    }
  }
  return (
    <svg style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      width: '100%', height: '100%', overflow: 'visible',
    }}>
      <defs>
        <linearGradient id="mesh-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#6cf4ff" stopOpacity="0.0" />
          <stop offset="50%" stopColor="#6cf4ff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6cf4ff" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {edges.map((e, i) => (
        <g key={i}>
          <line
            x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
            stroke={e.active ? '#6cf4ff' : 'rgba(108,244,255,0.18)'}
            strokeWidth={e.active ? 1.1 : 0.5}
            strokeDasharray={e.active ? '4 4' : '2 6'}
            style={{
              filter: e.active ? 'drop-shadow(0 0 3px #6cf4ff)' : 'none',
              animation: e.active ? 'jv-mesh-flow 1.4s linear infinite' : undefined,
            }}
          />
        </g>
      ))}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// ORBITAL RINGS — 3-axis holographic target-lock around active
// ══════════════════════════════════════════════════════════════

function OrbitalRings({ x, y }: { x: number; y: number }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: 0, height: 0, pointerEvents: 'none',
      animation: 'jv-ring-appear 500ms ease-out',
    }}>
      {/* Ring 1 — horizontal (flattened ellipse) */}
      <div style={{
        position: 'absolute',
        left: -110, top: -22,
        width: 220, height: 44,
        border: '1.5px solid rgba(108,244,255,0.7)',
        borderRadius: '50%',
        boxShadow: `
          0 0 calc(12px + var(--jv-amp, 0) * 24px) rgba(108,244,255, calc(0.4 + var(--jv-amp, 0) * 0.5)),
          inset 0 0 calc(12px + var(--jv-amp, 0) * 18px) rgba(108,244,255, calc(0.2 + var(--jv-amp, 0) * 0.4))`,
        animation: 'jv-ring-h 5s linear infinite',
        transformStyle: 'preserve-3d',
      }} />
      {/* Ring 2 — tilted left */}
      <div style={{
        position: 'absolute',
        left: -90, top: -90,
        width: 180, height: 180,
        border: '1px solid rgba(108,244,255,0.55)',
        borderRadius: '50%',
        boxShadow: '0 0 10px rgba(108,244,255,0.4)',
        animation: 'jv-ring-a 8s linear infinite',
      }} />
      {/* Ring 3 — tilted right */}
      <div style={{
        position: 'absolute',
        left: -70, top: -70,
        width: 140, height: 140,
        border: '1px dashed rgba(255,107,196,0.5)',
        borderRadius: '50%',
        boxShadow: '0 0 8px rgba(255,107,196,0.4)',
        animation: 'jv-ring-b 6s linear infinite reverse',
      }} />
      {/* Lock crosshair */}
      <svg width="140" height="140" style={{
        position: 'absolute', left: -70, top: -70,
        pointerEvents: 'none',
      }}>
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([xx, yy], i) => (
          <g key={i} transform={`translate(${xx ? 134 : 6} ${yy ? 134 : 6}) rotate(${xx * 90 + yy * 180 - (xx === 0 && yy === 0 ? 0 : 0)})`}>
            <path d={xx && yy ? 'M 0 0 L -14 0 M 0 0 L 0 -14'
              : xx && !yy ? 'M 0 0 L -14 0 M 0 0 L 0 14'
              : !xx && yy ? 'M 0 0 L 14 0 M 0 0 L 0 -14'
              : 'M 0 0 L 14 0 M 0 0 L 0 14'}
              stroke="#6cf4ff" strokeWidth="1.4"
              style={{ filter: 'drop-shadow(0 0 3px #6cf4ff)' }} />
          </g>
        ))}
      </svg>
      {/* Rotating tick ring */}
      <svg width="240" height="240" style={{
        position: 'absolute', left: -120, top: -120,
        animation: 'jv-ring-rotate 12s linear infinite',
        pointerEvents: 'none',
      }} viewBox="0 0 240 240">
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i * 15) * Math.PI / 180;
          const r1 = 110, r2 = i % 6 === 0 ? 100 : 105;
          return (
            <line key={i}
              x1={120 + r1 * Math.cos(a)} y1={120 + r1 * Math.sin(a)}
              x2={120 + r2 * Math.cos(a)} y2={120 + r2 * Math.sin(a)}
              stroke="#6cf4ff" strokeWidth={i % 6 === 0 ? 1.3 : 0.5}
              opacity={i % 6 === 0 ? 0.95 : 0.45} />
          );
        })}
      </svg>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// UAV TRACKER — drone dot orbiting active landmark with trail
// ══════════════════════════════════════════════════════════════

function UAVTracker({ x, y }: { x: number; y: number }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: 0, height: 0, pointerEvents: 'none',
      animation: 'jv-uav-orbit 5s linear infinite',
    }}>
      <div style={{
        position: 'absolute', left: 160, top: 0,
      }}>
        <div style={{
          width: 6, height: 6,
          background: '#ffb86c',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          boxShadow: '0 0 8px #ffb86c, 0 0 16px #ffb86c',
        }} />
        <div style={{
          position: 'absolute', left: 8, top: -6,
          fontFamily: 'var(--mono), monospace', fontSize: 7,
          color: '#ffb86c', letterSpacing: '0.22em',
          textShadow: '0 0 4px #ffb86c',
          whiteSpace: 'nowrap',
        }}>UAV-07</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CITY COMMAND BAR — top-center tactical header
// ══════════════════════════════════════════════════════════════

function CityCommandBar({ waypoint }: { waypoint: Waypoint }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: 'absolute', top: 14, left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 0,
      fontFamily: 'var(--mono), monospace',
      fontSize: 9, letterSpacing: '0.28em',
      background: 'linear-gradient(180deg, rgba(8,16,30,0.88), rgba(3,8,18,0.95))',
      border: '1px solid rgba(108,244,255,0.35)',
      borderTop: '2px solid #6cf4ff',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 0 40px rgba(108,244,255,0.2), inset 0 0 30px -10px rgba(108,244,255,0.15)',
      pointerEvents: 'none',
    }}>
      <Cell c="#6cf4ff" bold>◆ NYC · SECTOR MAN-01</Cell>
      <Cell>POP · 1.6M</Cell>
      <Cell>WX · 42°F CLEAR</Cell>
      <Cell c="#ffb86c">ACTIVE · {waypoint.code}</Cell>
      <Cell c="#7fff9b" bold>{time}</Cell>
      <Cell c="#7fff9b" bold>● ONLINE</Cell>
    </div>
  );
}

function Cell({ children, c = 'rgba(108,244,255,0.7)', bold = false }: {
  children: React.ReactNode; c?: string; bold?: boolean;
}) {
  return (
    <span style={{
      padding: '6px 14px',
      borderRight: '1px solid rgba(108,244,255,0.18)',
      color: c,
      fontWeight: bold ? 600 : 400,
      textShadow: bold ? `0 0 5px ${c}` : 'none',
    }}>{children}</span>
  );
}

// ══════════════════════════════════════════════════════════════
// MATRIX RAIN — cascading glyphs on right edge
// ══════════════════════════════════════════════════════════════

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = 160;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const glyphs = '01<>/|{}[]#@$*+-=ABCDEF0123456789';
    const fontSize = 12;
    const cols = Math.floor(160 / fontSize);
    const drops: number[] = Array.from({ length: cols }, () => Math.random() * -40);

    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      // 15fps — matrix rain shouldn't be doing 60
      if (t - last >= 66) {
        last = t;
        ctx.fillStyle = 'rgba(0,4,12,0.14)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${fontSize}px ui-monospace, monospace`;
        ctx.shadowBlur = 0;
        for (let i = 0; i < cols; i++) {
          const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          ctx.fillStyle = Math.random() < 0.03 ? '#ffffff' : 'rgba(108,244,255,0.75)';
          ctx.fillText(ch, x, y);
          if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 1;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw(0);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', right: 0, top: 0,
      width: 160, height: '100%',
      pointerEvents: 'none',
      opacity: 0.35,
      mixBlendMode: 'screen',
      maskImage: 'linear-gradient(90deg, transparent 0%, black 70%)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 70%)',
    }} />
  );
}

// ══════════════════════════════════════════════════════════════
// ROAD TRAFFIC — canvas particles drifting on grid with blur trails
// ══════════════════════════════════════════════════════════════

function RoadTraffic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Car = { x: number; y: number; vx: number; vy: number; color: string; life: number };
    const spawn = (): Car => {
      // Manhattan grid: avenues (N/S) or streets (E/W)
      const horizontal = Math.random() < 0.5;
      const hot = Math.random() < 0.18;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: horizontal ? (Math.random() < 0.5 ? 1.8 : -1.8) : (Math.random() - 0.5) * 0.3,
        vy: horizontal ? (Math.random() - 0.5) * 0.3 : (Math.random() < 0.5 ? 1.6 : -1.6),
        color: hot ? '#ff6bc4' : '#a8f9ff',
        life: Math.random() * 160 + 80,
      };
    };

    const cars: Car[] = Array.from({ length: 28 }, spawn);
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      // 30fps is plenty — saves half the composition work
      if (t - last >= 33) {
        last = t;
        ctx.fillStyle = 'rgba(0,4,12,0.22)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < cars.length; i++) {
          const c = cars[i];
          c.x += c.vx;
          c.y += c.vy;
          c.life--;
          if (c.life <= 0 || c.x < -20 || c.x > canvas.width + 20 || c.y < -20 || c.y > canvas.height + 20) {
            cars[i] = spawn();
            continue;
          }
          ctx.beginPath();
          ctx.arc(c.x, c.y, 1.3, 0, Math.PI * 2);
          ctx.fillStyle = c.color;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick(0);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      opacity: 0.55, mixBlendMode: 'screen',
    }} />
  );
}

// ══════════════════════════════════════════════════════════════
// ACQUIRE SEQUENCE — boot-up typing text, fades after 2.2s
// ══════════════════════════════════════════════════════════════

function AcquireSequence() {
  const [line, setLine] = useState(0);
  const [done, setDone] = useState(false);
  const lines = [
    '▸ SATELLITE LINK · ESTABLISHED',
    '▸ ACQUIRING TARGET · MAN-01 · NYC',
    '▸ RECON CHANNEL · OMEGA-07 · ONLINE',
    '▸ SIGNAL LOCK · ✓',
  ];
  useEffect(() => {
    const timers: number[] = [];
    lines.forEach((_, i) => {
      timers.push(window.setTimeout(() => setLine(i + 1), 180 + i * 280));
    });
    timers.push(window.setTimeout(() => setDone(true), 2400));
    return () => timers.forEach(clearTimeout);
  }, []);
  if (done) return null;
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      fontFamily: 'var(--mono), monospace',
      fontSize: 11, letterSpacing: '0.3em',
      color: '#6cf4ff',
      textShadow: '0 0 6px #6cf4ff, 0 0 12px #6cf4ff',
      padding: '14px 22px',
      background: 'rgba(0,4,12,0.55)',
      border: '1px solid rgba(108,244,255,0.35)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 0 40px rgba(108,244,255,0.25)',
      zIndex: 30,
      pointerEvents: 'none',
      animation: 'jv-acquire-fade 2.4s ease-out forwards',
    }}>
      {lines.slice(0, line).map((l, i) => (
        <div key={i} style={{
          marginBottom: 4,
          animation: 'jv-glitch-in 260ms ease-out',
        }}>{l}</div>
      ))}
      {line < lines.length && (
        <span style={{
          display: 'inline-block',
          width: 8, height: 12,
          background: '#6cf4ff',
          animation: 'jv-blink 0.4s infinite',
          verticalAlign: 'middle',
        }} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MINI-MAP — sector overview, top-right corner
// ══════════════════════════════════════════════════════════════

function MiniMap({ activeCode }: { activeCode: string }) {
  // Manhattan's bounding box roughly: lng [-74.02, -73.92], lat [40.70, 40.80]
  // We map each waypoint to 0..1 local coords.
  const minLng = -74.02, maxLng = -73.92;
  const minLat = 40.70,  maxLat = 40.80;
  const W = 130, H = 160;

  const toXY = (lng: number, lat: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * W;
    const y = H - ((lat - minLat) / (maxLat - minLat)) * H; // flip
    return { x, y };
  };

  return (
    <div style={{
      position: 'absolute', top: 80, right: 28,
      width: W + 18, padding: 8,
      background: 'linear-gradient(180deg, rgba(8,16,30,0.9), rgba(3,8,18,0.95))',
      border: '1px solid rgba(108,244,255,0.35)',
      borderRight: '3px solid #6cf4ff',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 0 20px rgba(108,244,255,0.2)',
      fontFamily: 'var(--mono), monospace',
      color: '#6cf4ff', zIndex: 15,
      pointerEvents: 'none',
    }}>
      <div style={{
        fontSize: 7.5, letterSpacing: '0.25em',
        color: 'rgba(108,244,255,0.7)', marginBottom: 6,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>◈ SECTOR MAP</span>
        <span style={{ color: '#7fff9b', textShadow: '0 0 3px #7fff9b' }}>LIVE</span>
      </div>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          <pattern id="mini-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none"
              stroke="rgba(108,244,255,0.12)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="mini-glow">
            <stop offset="0%"  stopColor="rgba(108,244,255,0.4)" />
            <stop offset="100%" stopColor="rgba(108,244,255,0)" />
          </radialGradient>
        </defs>

        <rect width={W} height={H} fill="rgba(0,8,16,0.7)" />
        <rect width={W} height={H} fill="url(#mini-grid)" />

        {/* Hudson/East river bands */}
        <rect x="0"        y="0" width="8" height={H} fill="#052430" opacity="0.7" />
        <rect x={W - 10}   y="0" width="10" height={H} fill="#052430" opacity="0.7" />

        {/* connection lines between waypoints */}
        {TOUR.filter((t, i) => TOUR.findIndex(x => x.code === t.code) === i).map((a, i, arr) =>
          arr.slice(i + 1).map((b, j) => {
            const p1 = toXY(a.center[0], a.center[1]);
            const p2 = toXY(b.center[0], b.center[1]);
            return (
              <line key={`${a.code}-${b.code}-${j}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="rgba(108,244,255,0.25)" strokeWidth="0.5"
                strokeDasharray="2 3" />
            );
          })
        )}

        {/* waypoint pips */}
        {TOUR.filter((t, i) => TOUR.findIndex(x => x.code === t.code) === i).map((wp) => {
          const { x, y } = toXY(wp.center[0], wp.center[1]);
          const active = wp.code === activeCode;
          return (
            <g key={wp.code}>
              {active && (
                <>
                  <circle cx={x} cy={y} r="10" fill="url(#mini-glow)" />
                  <circle cx={x} cy={y} r="6" fill="none"
                    stroke="#6cf4ff" strokeWidth="1">
                    <animate attributeName="r" from="4" to="11"
                      dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="1" to="0"
                      dur="1.4s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
              <circle cx={x} cy={y} r={active ? 3 : 2}
                fill={active ? '#6cf4ff' : 'rgba(108,244,255,0.6)'}
                style={{ filter: active ? 'drop-shadow(0 0 4px #6cf4ff)' : 'none' }} />
            </g>
          );
        })}

        {/* scanning line */}
        <line x1="0" x2={W} stroke="#6cf4ff" strokeWidth="0.5" opacity="0.6"
          style={{ filter: 'drop-shadow(0 0 3px #6cf4ff)' }}>
          <animate attributeName="y1" from="0" to={H} dur="4s" repeatCount="indefinite" />
          <animate attributeName="y2" from="0" to={H} dur="4s" repeatCount="indefinite" />
        </line>
      </svg>

      <div style={{
        fontSize: 7, letterSpacing: '0.2em',
        color: 'rgba(108,244,255,0.55)', marginTop: 4,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>7 NODES</span>
        <span>SCAN T+04</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// THREAT ZONES — faint red heat patches anchored to landmarks
// ══════════════════════════════════════════════════════════════

function ThreatZones({ positions }: { positions: Record<string, ScreenPos> }) {
  // Place soft red blooms on 2 landmarks — suggesting activity hotspots
  const zones = ['FIN-007', 'COM-218']; // WTC + Times Square
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
      mixBlendMode: 'screen', zIndex: 1 }}>
      {zones.map(code => {
        const p = positions[code];
        if (!p?.visible) return null;
        return (
          <div key={code} style={{
            position: 'absolute',
            left: p.x - 120, top: p.y - 120,
            width: 240, height: 240,
            background: 'radial-gradient(circle, rgba(255,107,107,0.25) 0%, rgba(255,91,107,0.08) 40%, transparent 70%)',
            animation: 'jv-threat-pulse 3.5s ease-in-out infinite',
            filter: 'blur(6px)',
          }} />
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════════════

const manhattanCss = `
  .maplibregl-canvas { outline: none !important; }

  .jv-soho-marker {
    width: 14px; height: 14px; border-radius: 50%;
    background: #7fff9b;
    box-shadow: 0 0 0 3px rgba(127,255,155,0.35), 0 0 22px rgba(127,255,155,0.9);
  }
  .jv-soho-marker::before {
    content: ''; position: absolute; inset: -14px;
    border-radius: 50%;
    border: 1.5px solid rgba(127,255,155,0.85);
    animation: jv-soho-pulse 2.4s ease-out infinite;
  }
  .jv-soho-marker::after {
    content: ''; position: absolute; inset: -28px;
    border-radius: 50%;
    border: 1px solid rgba(127,255,155,0.55);
    animation: jv-soho-pulse 2.4s ease-out infinite 0.7s;
  }
  @keyframes jv-soho-pulse {
    0%   { transform: scale(0.3); opacity: 0.9; }
    100% { transform: scale(1.7); opacity: 0; }
  }

  .jv-film-grain {
    position: absolute; inset: 0; pointer-events: none;
    opacity: 0.07;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.6'/></svg>");
    mix-blend-mode: overlay;
  }

  @keyframes jv-ping {
    0%   { transform: scale(0.3); opacity: 1; }
    100% { transform: scale(2.8); opacity: 0; }
  }

  @keyframes jv-sonar {
    0%   { width: 0; height: 0; opacity: 0.9; border-color: rgba(127,255,155,0.9); }
    100% { width: 800px; height: 800px; opacity: 0; border-color: rgba(127,255,155,0); }
  }

  @keyframes jv-callout-in {
    0%   { opacity: 0; transform: translate(-10px, 6px); filter: blur(4px); }
    100% { opacity: 1; transform: translate(0, 0);       filter: blur(0);   }
  }

  @keyframes jv-radar-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @keyframes jv-scan-wipe {
    0%   { transform: translateY(-100%); opacity: 0; }
    8%   { opacity: 0.9; }
    50%  { opacity: 1; }
    100% { transform: translateY(100vh); opacity: 0; }
  }
  .jv-scan-wipe {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(180deg,
      transparent 0%,
      rgba(108,244,255,0.05) 30%,
      rgba(108,244,255,0.35) 48%,
      rgba(255,255,255,0.6) 50%,
      rgba(108,244,255,0.35) 52%,
      rgba(108,244,255,0.05) 70%,
      transparent 100%);
    height: 180px;
    animation: jv-scan-wipe 1.2s ease-out 1;
    mix-blend-mode: screen;
  }

  @keyframes jv-scan-flash {
    0%, 100% { opacity: 0; }
    8%       { opacity: 0.15; }
    14%      { opacity: 0; }
  }
  .jv-scan-flash {
    position: absolute; inset: 0; pointer-events: none;
    background: rgba(200,253,255,0.4);
    animation: jv-scan-flash 0.6s ease-out 1;
    mix-blend-mode: screen;
  }

  @keyframes jv-pan-scan-anim {
    0%   { transform: translateX(-100%); opacity: 0; }
    20%  { opacity: 0.7; }
    80%  { opacity: 0.7; }
    100% { transform: translateX(100vw); opacity: 0; }
  }

  @keyframes jv-mesh-flow {
    from { stroke-dashoffset: 0; }
    to   { stroke-dashoffset: -16; }
  }

  @keyframes jv-ring-appear {
    0%   { opacity: 0; transform: scale(0.4); filter: blur(6px); }
    100% { opacity: 1; transform: scale(1);   filter: blur(0);   }
  }

  @keyframes jv-ring-rotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @keyframes jv-ring-h {
    0%   { transform: perspective(400px) rotateX(75deg) rotateZ(0deg); }
    100% { transform: perspective(400px) rotateX(75deg) rotateZ(360deg); }
  }

  @keyframes jv-ring-a {
    0%   { transform: perspective(400px) rotateX(60deg) rotateY(0deg); }
    100% { transform: perspective(400px) rotateX(60deg) rotateY(360deg); }
  }

  @keyframes jv-ring-b {
    0%   { transform: perspective(400px) rotateY(60deg) rotateX(0deg); }
    100% { transform: perspective(400px) rotateY(60deg) rotateX(360deg); }
  }

  @keyframes jv-uav-orbit {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .jv-pan-scan {
    position: absolute;
    top: 0; bottom: 0; left: 0;
    width: 200px;
    pointer-events: none;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(108,244,255,0.04) 45%,
      rgba(200,253,255,0.12) 50%,
      rgba(108,244,255,0.04) 55%,
      transparent 100%);
    animation: jv-pan-scan-anim 14s linear infinite;
    mix-blend-mode: screen;
  }

  @keyframes jv-threat-pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.12); }
  }

  @keyframes jv-acquire-fade {
    0%, 75%  { opacity: 1; }
    100%     { opacity: 0; filter: blur(4px); }
  }

  @keyframes jv-glitch-in {
    0%   { opacity: 0; transform: translateX(-4px); filter: blur(2px); }
    40%  { opacity: 0.8; transform: translateX(2px); filter: blur(0); }
    100% { opacity: 1; transform: translateX(0);    filter: blur(0); }
  }

  /* ── VOICE-REACTIVE ──
     --jv-amp (0..1) is pushed each frame from ampBus.amp */
  .jv-soho-marker {
    transform: scale(calc(1 + var(--jv-amp, 0) * 0.35));
    transition: transform 60ms linear;
  }
`;
