import { useEffect } from 'react';
import { useJarvis } from '@/state/store';
import { ampBus } from '@/services/audio/ampBus';

/**
 * Global cinematic enforcement layer — sits above everything.
 * Letterbox bars, viewport corner brackets, grain, scanline,
 * chromatic aberration, bloom, vignette, global audio-reactive CSS var.
 *
 * See: JARVIS_HOME · VISUAL DIRECTOR BRIEF — "PARAMOUNT OPERATOR"
 */
export function CinematicOverlay() {
  const phase = useJarvis((s) => s.phase);
  const awake = phase === 'descending' || phase === 'briefing' || phase === 'ready';
  const cinematic = phase === 'briefing' || phase === 'ready';

  // Voice-amp CSS var — only pumps while speech is active + quantized
  // to 2% steps. During sleep phase voice is never active, so we don't
  // even schedule the rAF loop. Starts/stops based on phase.
  useEffect(() => {
    if (phase === 'sleep') {
      // Ensure reset and don't run the loop at all.
      document.documentElement.style.setProperty('--jv-amp', '0');
      return;
    }
    let raf = 0;
    let lastQ = -1;
    const pump = () => {
      if (ampBus.active) {
        const a = Math.min(1, ampBus.amp * 2.2);
        const q = Math.round(a * 50) / 50;
        if (q !== lastQ) {
          document.documentElement.style.setProperty('--jv-amp', q.toFixed(2));
          lastQ = q;
        }
      } else if (lastQ !== 0) {
        document.documentElement.style.setProperty('--jv-amp', '0');
        lastQ = 0;
      }
      raf = requestAnimationFrame(pump);
    };
    raf = requestAnimationFrame(pump);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <>
      {/* ═══ LETTERBOX BARS — 2.35:1 cinematic frame ═══ */}
      <div className="jv-letterbox jv-letterbox-top" data-active={cinematic} />
      <div className="jv-letterbox jv-letterbox-bottom" data-active={cinematic} />

      {/* ══ FOUNDATIONAL LAG FIX ══
          The stack below is SIX fullscreen divs with mix-blend-mode. Every
          frame anything updates underneath (Earth rotating, orb emerging,
          map rendering) the compositor has to re-raster the entire
          viewport through every blend layer. During sleep that's the
          single biggest constant perf drain. Gate the whole stack behind
          `awake` so sleep phase has a clean compositor pipeline. */}
      {awake && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          zIndex: 998,
        }}>
          {/* ─── VIGNETTE ─── */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 120% 85% at center, transparent 28%, rgba(0,0,0,0.35) 72%, rgba(0,0,0,0.85) 100%)',
            mixBlendMode: 'multiply',
          }} />

          {/* ─── CHROMATIC EDGE SPLIT ─── */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 62%, rgba(255,60,130,0.10) 100%)',
            mixBlendMode: 'screen',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 62%, rgba(60,220,255,0.10) 100%)',
            mixBlendMode: 'screen',
            transform: 'translate(2px, 0)',
          }} />

          {/* ─── FILM GRAIN ─── */}
          <div className="jv-grain" />

          {/* ─── CRT SCANLINES ─── */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 3px)',
            mixBlendMode: 'multiply',
            opacity: 0.5,
          }} />

          {/* ─── INNER BLOOM HALO ─── */}
          <div style={{
            position: 'absolute', inset: 0,
            boxShadow: 'inset 0 0 240px rgba(108,244,255,0.10), inset 0 0 60px rgba(108,244,255,0.07)',
          }} />

          {/* ─── DIAGONAL SCAN SWEEP during briefing ─── */}
          {cinematic && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, transparent 0%, rgba(108,244,255,0.06) 48%, rgba(200,253,255,0.12) 50%, rgba(108,244,255,0.06) 52%, transparent 100%)',
              backgroundSize: '100% 280%',
              animation: 'jv-full-scan 9s linear infinite',
              mixBlendMode: 'screen',
              opacity: 0.6,
            }} />
          )}
        </div>
      )}

      {/* ═══ VIEWPORT CORNER BRACKETS — above everything ═══ */}
      {awake && (
        <>
          <span className="jv-vp-corner tl" />
          <span className="jv-vp-corner tr" />
          <span className="jv-vp-corner bl" />
          <span className="jv-vp-corner br" />
        </>
      )}

      {/* ═══ STYLES ═══ */}
      <style>{css}</style>
    </>
  );
}

const css = `
  :root {
    --jv-ease: cubic-bezier(0.22, 1, 0.36, 1);
    --jv-fast: 240ms;
    --jv-base: 500ms;
    --jv-cine: 1200ms;
    --jv-amp: 0;
  }

  /* ═══ LETTERBOX ═══ */
  .jv-letterbox {
    position: fixed; left: 0; right: 0;
    height: 0;
    background: #000;
    z-index: 9999;
    pointer-events: none;
    transition: height var(--jv-cine) var(--jv-ease);
  }
  .jv-letterbox-top    { top: 0; }
  .jv-letterbox-bottom { bottom: 0; }
  .jv-letterbox[data-active="true"] {
    height: min(9vh, 80px);
  }
  .jv-letterbox-top[data-active="true"] {
    box-shadow:
      0 2px 24px rgba(108,244,255,0.18),
      inset 0 -1px 0 rgba(108,244,255,0.28);
  }
  .jv-letterbox-bottom[data-active="true"] {
    box-shadow:
      0 -2px 24px rgba(108,244,255,0.18),
      inset 0 1px 0 rgba(108,244,255,0.28);
  }

  /* ═══ VIEWPORT CORNER BRACKETS ═══ */
  .jv-vp-corner {
    position: fixed;
    width: 32px; height: 32px;
    border: 1.5px solid #6cf4ff;
    opacity: 0.9;
    /* drop-shadow replaced with box-shadow — same glow, compositor-only,
       no per-frame filter raster. Breathe animation removed — it was
       animating a filter which is the single most expensive CSS op. */
    box-shadow: 0 0 8px rgba(108, 244, 255, 0.65);
    z-index: 9998;
    pointer-events: none;
  }
  .jv-vp-corner::after {
    content: ''; position: absolute;
    width: 4px; height: 4px; border-radius: 50%;
    background: #6cf4ff;
    box-shadow: 0 0 6px #6cf4ff;
  }
  .jv-vp-corner.tl { top: min(9vh, 80px); left: 16px; border-right: none; border-bottom: none; }
  .jv-vp-corner.tr { top: min(9vh, 80px); right: 16px; border-left: none; border-bottom: none; }
  .jv-vp-corner.bl { bottom: min(9vh, 80px); left: 16px; border-right: none; border-top: none; }
  .jv-vp-corner.br { bottom: min(9vh, 80px); right: 16px; border-left: none; border-top: none; }
  .jv-vp-corner.tl::after { bottom: -6px; right: -6px; }
  .jv-vp-corner.tr::after { bottom: -6px; left: -6px; }
  .jv-vp-corner.bl::after { top: -6px; right: -6px; }
  .jv-vp-corner.br::after { top: -6px; left: -6px; }

  @keyframes jv-vp-breathe {
    0%, 100% { opacity: 0.85; }
    50%      { opacity: 1; filter: drop-shadow(0 0 12px #6cf4ff) drop-shadow(0 0 20px rgba(108,244,255,0.4)); }
  }

  /* ═══ FILM GRAIN ═══ (animation slowed 8× — jitter at 0.24s = 33Hz was
     hammering compositor with mixBlendMode layer repaint 33x/sec. At
     2s / 4-step it still reads as grain jitter, 8x less work.) */
  .jv-grain {
    position: absolute; inset: -4%;
    pointer-events: none;
    opacity: 0.08;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.96 0 0 0 0 1 0 0 0 0.9 0'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='0.35'/></svg>");
    background-size: 220px 220px;
    mix-blend-mode: screen;
    animation: jv-grain-jitter 2s steps(4) infinite;
  }

  @keyframes jv-grain-jitter {
    0%, 100% { transform: translate(0, 0); }
    12%      { transform: translate(-1%, 1%); }
    25%      { transform: translate(2%, -1%); }
    37%      { transform: translate(-2%, 0); }
    50%      { transform: translate(1%, 2%); }
    62%      { transform: translate(0, -2%); }
    75%      { transform: translate(-1%, -1%); }
    87%      { transform: translate(2%, 1%); }
  }

  @keyframes jv-full-scan {
    0%   { background-position: 0 -100%; }
    100% { background-position: 0 200%; }
  }
`;
