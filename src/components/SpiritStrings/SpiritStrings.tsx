import { useEffect, useRef, useState } from 'react';
import { useJarvis } from '@/state/store';

// ──────────────────────────────────────────────────────────────
// Spirit Strings — DELIVERY tethers.
//
// Every time a panel is revealed (`revealedPanels` gains a key), a
// bright cyan tether shoots from the JARVIS orb to that panel's
// target position. The string *draws itself on* across 420ms, pulses
// briefly with a spark at the tip, then fades over ~300ms.
//
// Because BootSequence fires reveals sequentially, the strings come
// out one after another — never all at once, never messy.
//
// Visual language: JARVIS is reaching out and placing each panel.
// ──────────────────────────────────────────────────────────────

type Target = { x: number; y: number };

const MINI_VERTICES: Record<string, number> = {
  gpt:     0,
  gemini:  60,
  x:       120,
  tiktok:  180,
  youtube: 240,
  grok:    300,
};

// 4 content panels at corners — (hSide 0=left/1=right, vSide 0=top/1=bottom)
const BRIEFING_CORNERS: Record<string, [number, number]> = {
  social:   [0, 0],  // left,  top
  trading:  [1, 0],  // right, top
  bitcoin:  [0, 1],  // left,  bottom
  schedule: [1, 1],  // right, bottom (replaces the old music position)
};

// Hexagon radii must match MiniLLMPanels.tsx
const HEX_RX = 340;
const HEX_RY = 280;
// Briefing panel geometry (PANEL_WIDTH=320, height ≈ 260)
const BRIEF_HALF_W = 160;
const BRIEF_HALF_H = 130;

function targetFor(key: string, vw: number, vh: number): Target | null {
  if (key in MINI_VERTICES) {
    const cx = vw / 2;
    const cy = vh / 2;
    const rad = (MINI_VERTICES[key] * Math.PI) / 180;
    return { x: cx + Math.sin(rad) * HEX_RX, y: cy + -Math.cos(rad) * HEX_RY };
  }
  if (key in BRIEFING_CORNERS) {
    const [hSide, vSide] = BRIEFING_CORNERS[key];
    return {
      x: hSide === 0 ? 36 + BRIEF_HALF_W : vw - 36 - BRIEF_HALF_W,
      y: vSide === 0 ? 120 + BRIEF_HALF_H : vh - 48 - BRIEF_HALF_H,
    };
  }
  // Minimized music — thin strip at top-center.
  if (key === 'music') {
    return { x: vw / 2, y: 14 + 22 };
  }
  return null;
}

type Delivery = {
  key: string;
  target: Target;
  startT: number;
  curveAmp: number;
};

const SVG_NS = 'http://www.w3.org/2000/svg';

// Lifecycle (ms)
const DRAW_MS = 420;   // string extends from orb to target
const HOLD_MS = 350;   // string fully drawn, pulsing
const FADE_MS = 320;   // string fades to nothing
const TOTAL_MS = DRAW_MS + HOLD_MS + FADE_MS;

// Cubic in-out — slow start, slow finish, quick middle.
function ease(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function SpiritStrings() {
  const phase = useJarvis((s) => s.phase);
  const revealedPanels = useJarvis((s) => s.revealedPanels);
  const visible = phase === 'briefing' || phase === 'ready';

  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth  : 1536));
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900));
  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const svgRef = useRef<SVGSVGElement>(null);
  const deliveriesRef = useRef<Delivery[]>([]);
  const prevKeysRef = useRef<Set<string>>(new Set());
  const curveSignRef = useRef(1);

  // ── Watch for newly-revealed panels and queue a delivery ──
  useEffect(() => {
    if (!visible) {
      deliveriesRef.current = [];
      prevKeysRef.current = new Set();
      return;
    }
    const now = performance.now();
    revealedPanels.forEach((key) => {
      if (prevKeysRef.current.has(key)) return;
      const tgt = targetFor(key, vw, vh);
      if (!tgt) return;
      curveSignRef.current = -curveSignRef.current;
      deliveriesRef.current.push({
        key,
        target: tgt,
        startT: now,
        curveAmp: curveSignRef.current * (60 + Math.random() * 50),
      });
    });
    prevKeysRef.current = new Set(revealedPanels);
  }, [revealedPanels, visible, vw, vh]);

  // ── Render loop ──
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    let wasEmpty = false;

    const tick = () => {
      const now = performance.now();
      deliveriesRef.current = deliveriesRef.current.filter((d) => now - d.startT < TOTAL_MS);

      const svg = svgRef.current;
      const group = svg?.querySelector('#jv-strings-group') as SVGGElement | null;
      if (!group) { raf = requestAnimationFrame(tick); return; }

      // Fast path — no active deliveries: clear once (if not already
      // empty) and skip the whole rebuild. Strings fire at most a few
      // times per minute; no reason to DOM-churn at 60fps the rest of
      // the time.
      if (deliveriesRef.current.length === 0) {
        if (!wasEmpty) {
          while (group.firstChild) group.removeChild(group.firstChild);
          wasEmpty = true;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      wasEmpty = false;

      while (group.firstChild) group.removeChild(group.firstChild);

      const cx = vw / 2;
      const cy = vh / 2;

      for (const d of deliveriesRef.current) {
        const elapsed = now - d.startT;

        // Geometry — bezier from orb to target with perpendicular curve.
        const dx = d.target.x - cx;
        const dy = d.target.y - cy;
        const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const perpX = -dy / len;
        const perpY =  dx / len;
        const midX = (cx + d.target.x) * 0.5 + perpX * d.curveAmp;
        const midY = (cy + d.target.y) * 0.5 + perpY * d.curveAmp;

        const pathD = `M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${d.target.x.toFixed(1)} ${d.target.y.toFixed(1)}`;

        // Phase-dependent values
        let drawProgress: number;   // 0..1, fraction of path drawn
        let opacity: number;
        let sparkU: number;         // 0..1, spark position along bezier
        let sparkAlpha: number;

        if (elapsed < DRAW_MS) {
          const e = elapsed / DRAW_MS;
          drawProgress = ease(e);
          opacity = 0.15 + drawProgress * 0.85;
          sparkU = drawProgress;
          sparkAlpha = 1.0;
        } else if (elapsed < DRAW_MS + HOLD_MS) {
          drawProgress = 1;
          opacity = 1;
          sparkU = 1;
          const pulseT = (elapsed - DRAW_MS) / HOLD_MS;
          sparkAlpha = 1 - pulseT * 0.4;
        } else {
          const e = (elapsed - DRAW_MS - HOLD_MS) / FADE_MS;
          drawProgress = 1;
          opacity = 1 - ease(e);
          sparkU = 1;
          sparkAlpha = 0.6 * (1 - e);
        }

        // ── Outer glow path (thicker, blurred, low alpha) ──
        const glow = document.createElementNS(SVG_NS, 'path');
        glow.setAttribute('d', pathD);
        glow.setAttribute('stroke', `rgba(130, 195, 255, ${(opacity * 0.55).toFixed(3)})`);
        glow.setAttribute('stroke-width', '6');
        glow.setAttribute('stroke-linecap', 'round');
        glow.setAttribute('fill', 'none');
        glow.setAttribute('filter', 'url(#jv-string-blur)');
        group.appendChild(glow);

        // ── Main bright path with draw-on animation via dasharray ──
        // We don't use getTotalLength() for perf; we approximate with a
        // big "infinity" dash and shrink the visible part down from 100%.
        const main = document.createElementNS(SVG_NS, 'path');
        main.setAttribute('d', pathD);
        main.setAttribute('stroke', `rgba(200, 235, 255, ${opacity.toFixed(3)})`);
        main.setAttribute('stroke-width', '1.8');
        main.setAttribute('stroke-linecap', 'round');
        main.setAttribute('fill', 'none');
        // The dash pattern: [drawn_portion_of_path_len, infinity]
        // path length ≈ len + small; use len*1.3 as safe upper bound
        const approxPathLen = len * 1.05;
        const visibleLen = approxPathLen * drawProgress;
        const scrollPhase = ((now * 0.05) % 12).toFixed(2);
        main.setAttribute('stroke-dasharray', `${visibleLen.toFixed(1)} 99999`);
        main.setAttribute('stroke-dashoffset', `-${scrollPhase}`);
        group.appendChild(main);

        // ── Traveling spark (always at the drawn tip during extension,
        //    then pulses/fades at target) ──
        const iu = 1 - sparkU;
        const sx = iu * iu * cx + 2 * iu * sparkU * midX + sparkU * sparkU * d.target.x;
        const sy = iu * iu * cy + 2 * iu * sparkU * midY + sparkU * sparkU * d.target.y;
        const spark = document.createElementNS(SVG_NS, 'circle');
        spark.setAttribute('cx', sx.toFixed(1));
        spark.setAttribute('cy', sy.toFixed(1));
        spark.setAttribute('r', (2.6 + sparkAlpha * 2).toFixed(1));
        spark.setAttribute('fill', `rgba(230, 245, 255, ${(sparkAlpha * opacity).toFixed(3)})`);
        spark.setAttribute('filter', 'url(#jv-string-blur)');
        group.appendChild(spark);

        // ── Landing ring — dot/anchor appears at target once string arrives ──
        if (drawProgress > 0.95) {
          const anchorAge = Math.min(1, (elapsed - DRAW_MS) / 250);
          const anchorR = 3 + anchorAge * 6;
          const anchorAlpha = opacity * (1 - anchorAge) * 0.9;
          if (anchorAlpha > 0.02) {
            const ring = document.createElementNS(SVG_NS, 'circle');
            ring.setAttribute('cx', d.target.x.toFixed(1));
            ring.setAttribute('cy', d.target.y.toFixed(1));
            ring.setAttribute('r', anchorR.toFixed(1));
            ring.setAttribute('fill', 'none');
            ring.setAttribute('stroke', `rgba(190, 230, 255, ${anchorAlpha.toFixed(3)})`);
            ring.setAttribute('stroke-width', '1.2');
            ring.setAttribute('filter', 'url(#jv-string-blur)');
            group.appendChild(ring);
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, vw, vh]);

  if (!visible) return null;

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        // Above the map/scene and BELOW the mini panels — so the strings
        // look like they "dock into" each panel as it materializes.
        zIndex: 38,
        willChange: 'contents',
      }}
    >
      <defs>
        <filter id="jv-string-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g id="jv-strings-group" />
    </svg>
  );
}
