import type { CSSProperties } from 'react';

// ══ PALETTE ══
// A refined, restrained set. Cyan is the signature but most surfaces are deep navy/black.
export const CYAN = '#6cf4ff';
export const CYAN_BRIGHT = '#c8fdff';
export const CYAN_SOFT = '#8de5f0';
export const CYAN_DIM = 'rgba(108,244,255,0.42)';
export const CYAN_FAINT = 'rgba(108,244,255,0.14)';
export const CYAN_TRACE = 'rgba(108,244,255,0.06)';
export const WHITE = '#ffffff';
export const OFF_WHITE = 'rgba(255,255,255,0.92)';
export const GREEN = '#7fff9b';
export const GREEN_BRIGHT = '#c8ffd2';
export const RED = '#ff5b6b';
export const AMBER = '#ffb86c';
export const VIOLET = '#b088ff';
export const GOLD = '#f5c76a';

// Deep surface tones
export const BG_DEEP = '#010208';
export const BG_PANEL_1 = 'rgba(8,16,30,0.78)';
export const BG_PANEL_2 = 'rgba(3,8,18,0.92)';

// ══ PANEL BASE ══
// Premium glass — one quiet gradient, one hairline edge, one shadow stack.
// Every panel in the app inherits this so the whole UI reads as a set.
export const panelBase: CSSProperties = {
  position: 'relative',
  background: `
    linear-gradient(180deg,
      rgba(10,18,32,0.82) 0%,
      rgba(3,8,18,0.94) 100%)
  `,
  border: '1px solid rgba(108,244,255,0.12)',
  backgroundClip: 'padding-box',
  borderRadius: 8,
  backdropFilter: 'blur(20px) saturate(130%)',
  WebkitBackdropFilter: 'blur(20px) saturate(130%)',
  padding: 0,
  color: WHITE,
  overflow: 'hidden',
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 1px 2px rgba(0,0,0,0.3),
    0 16px 48px -12px rgba(0,0,0,0.55),
    0 0 80px -40px rgba(108,244,255,0.22)
  `,
};

// Per-panel accent flavoring — replaces the generic cyan top-radial glow with
// a department-specific hue so the four panels read as distinct modes, not
// four copies of the same template.
// Accepts an RGB triplet like "245,199,106" (Gold) and returns a panelBase
// override with matching glow + inner-edge tint + vertical accent strip.
export function accentedPanel(rgb: string, extra: CSSProperties = {}): CSSProperties {
  return {
    ...panelBase,
    background: `
      linear-gradient(180deg,
        rgba(10,18,32,0.82) 0%,
        rgba(3,8,18,0.94) 100%)
    `,
    // Accent lives in the LEFT rail + a whisper of matching shadow.
    // No more radial blooms competing with each other — one voice per panel.
    border: `1px solid rgba(${rgb},0.18)`,
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.08),
      inset 2px 0 0 0 rgba(${rgb},0.55),
      0 1px 2px rgba(0,0,0,0.3),
      0 16px 48px -12px rgba(0,0,0,0.55),
      0 0 80px -40px rgba(${rgb},0.28)
    `,
    ...extra,
  };
}

// Department hues — exported so panels pick their own tone.
export const ACCENT = {
  gold:    '245,199,106',   // Money / Revenue
  magenta: '255,107,196',   // NYC / Culture
  amber:   '255,155,90',    // Markets / Risk
  violet:  '176,136,255',   // System / Machine
} as const;

// ══ HEADER ══
// Quiet chrome rail — all the volume comes from the data underneath.
export const panelHeader: CSSProperties = {
  position: 'relative',
  padding: '13px 18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontFamily: 'var(--mono), ui-monospace, "SF Mono", monospace',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.32em',
  color: CYAN,
  background: 'transparent',
  borderBottom: '1px solid rgba(108,244,255,0.10)',
};

export const panelBody: CSSProperties = {
  padding: '18px 20px',
};

export const mono: CSSProperties = {
  fontFamily: 'var(--mono), ui-monospace, "SF Mono", monospace',
  letterSpacing: '0.05em',
  fontVariantNumeric: 'tabular-nums',
};

export const display: CSSProperties = {
  fontFamily: 'var(--display), "SF Pro Display", system-ui',
  letterSpacing: '-0.015em',
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"ss01", "cv11"',
};

// ══ GLOBAL KEYFRAMES + CLASSES ══
export const GLOBAL_PANEL_CSS = `
  @keyframes jv-scan {
    0% { transform: translateX(-110%); }
    100% { transform: translateX(210%); }
  }
  @keyframes jv-pulse {
    0%, 100% { opacity: 0.55; transform: scale(1); }
    50%      { opacity: 1.0;  transform: scale(1.12); }
  }
  @keyframes jv-sweep {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes jv-ticker {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes jv-blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.25; }
  }
  @keyframes jv-rise {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  @keyframes jv-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes jv-breathe {
    0%, 100% { opacity: 0.85; }
    50%      { opacity: 1.0;  }
  }
  @keyframes jv-data-flow {
    0% { background-position: 0 0; }
    100% { background-position: 40px 0; }
  }
  @keyframes jv-orbit {
    from { transform: rotate(0deg) translateX(8px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(8px) rotate(-360deg); }
  }
  @keyframes jv-tick-pulse {
    0%, 100% { opacity: 0.5; }
    50%      { opacity: 1; }
  }
  @keyframes jv-float {
    0%, 100% { transform: translateY(0) translateX(0); }
    50%      { transform: translateY(-3px) translateX(1px); }
  }

  /* ── SHIMMER TEXT ─────────── */
  .jv-shimmer-text {
    background: linear-gradient(90deg,
      ${CYAN} 0%,
      ${CYAN_BRIGHT} 45%,
      #ffffff 50%,
      ${CYAN_BRIGHT} 55%,
      ${CYAN} 100%);
    background-size: 250% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    animation: jv-shimmer 8s linear infinite;
    filter: drop-shadow(0 0 10px rgba(108,244,255,0.55));
  }

  /* ── DIAGONAL SCAN BAR ─────── */
  .jv-scanline {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(110deg,
      transparent 35%,
      rgba(255,255,255,0.05) 50%,
      transparent 65%);
    background-size: 320% 100%;
    animation: jv-shimmer 12s linear infinite;
    mix-blend-mode: screen;
    opacity: 0.45;
  }

  /* ── RUNNING BORDER LIGHT ──── */
  @keyframes jv-runlight {
    0%, 100% { background-position: 0% 0; }
    50%      { background-position: 100% 0; }
  }
  .jv-running-border {
    position: absolute; inset: 0; pointer-events: none;
    padding: 1px;
    background: linear-gradient(90deg,
      rgba(108,244,255,0)   0%,
      rgba(108,244,255,0)   42%,
      rgba(108,244,255,0.45) 50%,
      rgba(108,244,255,0)   58%,
      rgba(108,244,255,0)   100%);
    background-size: 320% 100%;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: jv-runlight 12s ease-in-out infinite;
    border-radius: 8px;
  }

  /* ── GRID BACKDROP ────────── */
  .jv-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(108,244,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(108,244,255,0.025) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse 85% 65% at center, rgba(0,0,0,0.7), transparent 90%);
    -webkit-mask-image: radial-gradient(ellipse 85% 65% at center, rgba(0,0,0,0.7), transparent 90%);
  }

  /* ── HOLOGRAPHIC PARTICLE DUST ─── */
  .jv-dust {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.18;
    background-image:
      radial-gradient(1px 1px at 20% 30%, rgba(108,244,255,0.6), transparent 50%),
      radial-gradient(1px 1px at 75% 60%, rgba(108,244,255,0.45), transparent 50%),
      radial-gradient(1px 1px at 50% 85%, rgba(200,253,255,0.4), transparent 50%);
    animation: jv-float 12s ease-in-out infinite;
  }

  /* ── STATUS DOT ───────────── */
  .jv-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    animation: jv-pulse 2.4s ease-in-out infinite;
    box-shadow: 0 0 6px currentColor;
  }

  /* ── CORNER FIDUCIALS ───────── */
  .jv-corner {
    position: absolute; width: 10px; height: 10px;
    border: 1px solid rgba(108,244,255,0.55);
    opacity: 0.75;
  }
  .jv-corner.tl { top: 5px; left: 5px;  border-right: none; border-bottom: none; }
  .jv-corner.tr { top: 5px; right: 5px; border-left: none;  border-bottom: none; }
  .jv-corner.bl { bottom: 5px; left: 5px;  border-right: none; border-top: none; }
  .jv-corner.br { bottom: 5px; right: 5px; border-left: none;  border-top: none; }

  /* ── DATA FLOW LINE ───────── */
  .jv-data-line {
    position: absolute;
    left: 8px; right: 8px; bottom: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(108,244,255,0.3) 20%,
      rgba(108,244,255,0.6) 50%,
      rgba(108,244,255,0.3) 80%,
      transparent 100%);
  }
  .jv-data-line::after {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent 0,
      ${CYAN} 2px,
      transparent 4px,
      transparent 8px);
    background-size: 40px 100%;
    animation: jv-data-flow 2s linear infinite;
    opacity: 0.7;
  }

  /* ── ROW HOVER ────────────── */
  .jv-row {
    position: relative;
    transition: background 250ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 250ms;
  }
  .jv-row:hover {
    background: rgba(108,244,255,0.05);
    transform: translateX(3px);
  }

  /* ── BUTTON GLOW ──────────── */
  .jv-btn-glow {
    transition: all 250ms cubic-bezier(0.2, 0.8, 0.2, 1);
    position: relative;
  }
  .jv-btn-glow:hover {
    background: rgba(108,244,255,0.12) !important;
    border-color: ${CYAN} !important;
    box-shadow:
      0 0 20px rgba(108,244,255,0.35),
      inset 0 0 12px rgba(108,244,255,0.12),
      0 4px 16px rgba(0,0,0,0.4);
    transform: translateY(-2px);
  }
  .jv-btn-glow:active {
    transform: translateY(0);
    box-shadow:
      0 0 12px rgba(108,244,255,0.25),
      inset 0 2px 4px rgba(0,0,0,0.3);
  }

  /* ── HERO NUMBER ──────────── */
  .jv-hero-number {
    font-family: var(--display), system-ui;
    font-weight: 200;
    letter-spacing: -0.02em;
    color: #ffffff;
    text-shadow: 0 0 20px rgba(108,244,255,0.28);
    font-variant-numeric: tabular-nums;
  }

  /* ── TITLE PREFIX GLYPH ───── */
  .jv-title-glyph {
    display: inline-block;
    width: 5px; height: 5px;
    background: ${CYAN};
    border-radius: 50%;
    margin-right: 10px;
    box-shadow: 0 0 5px ${CYAN};
    animation: jv-pulse 2.6s ease-in-out infinite;
    vertical-align: middle;
  }

  /* ── DIVIDER WITH GLYPH ───── */
  .jv-divider {
    position: relative;
    height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(108,244,255,0.25) 50%,
      transparent 100%);
    margin: 12px 0;
  }
  .jv-divider::before {
    content: ''; position: absolute;
    left: 50%; top: 50%;
    width: 4px; height: 4px;
    border-radius: 50%;
    background: ${CYAN};
    transform: translate(-50%, -50%);
    box-shadow: 0 0 6px ${CYAN};
  }

  /* ── TABULAR NUMBERS EVERYWHERE ── */
  .jv-num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }

  /* ── CHROMATIC HERO NUMBER ──── */
  /* RGB split ghosting like old CRT monitors */
  .jv-chromatic {
    position: relative;
    font-family: var(--display), system-ui;
    font-weight: 200;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .jv-chromatic::before,
  .jv-chromatic::after {
    content: attr(data-text);
    position: absolute; inset: 0;
    pointer-events: none;
    mix-blend-mode: screen;
  }
  .jv-chromatic::before {
    color: rgba(255,40,120,0.22);
    transform: translate(-0.6px, 0);
    filter: blur(0.3px);
  }
  .jv-chromatic::after {
    color: rgba(60,220,255,0.25);
    transform: translate(0.6px, 0);
    filter: blur(0.3px);
  }

  /* ── CINEMATIC VIGNETTE ─────── */
  .jv-vignette {
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse 110% 80% at 50% 45%,
      transparent 40%,
      rgba(0,0,0,0.25) 85%,
      rgba(0,0,0,0.55) 100%);
    mix-blend-mode: multiply;
  }

  /* ── HUD HORIZONTAL SCAN ───── */
  @keyframes jv-hud-scan-v {
    0%   { transform: translateY(-20px); opacity: 0; }
    8%   { opacity: 0.8; }
    90%  { opacity: 0.8; }
    100% { transform: translateY(320px); opacity: 0; }
  }
  .jv-hud-scan {
    position: absolute; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(108,244,255,0.5) 50%,
      transparent 100%);
    box-shadow: 0 0 6px rgba(108,244,255,0.5);
    animation: jv-hud-scan-v 12s linear infinite;
    pointer-events: none;
  }

  /* ── CRT NOISE ──────────────── */
  @keyframes jv-noise {
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-1%, -1%); }
    20% { transform: translate(1%, 1%); }
    30% { transform: translate(-2%, 1%); }
    40% { transform: translate(2%, -1%); }
    50% { transform: translate(-1%, 2%); }
    60% { transform: translate(1%, -2%); }
    70% { transform: translate(-2%, -1%); }
    80% { transform: translate(2%, 1%); }
    90% { transform: translate(-1%, -2%); }
  }
  .jv-crt-noise {
    position: absolute; inset: -2%;
    pointer-events: none; opacity: 0.015;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.95 0 0 0 0 1 0 0 0 0.9 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>");
    animation: jv-noise 0.48s steps(6) infinite;
    mix-blend-mode: screen;
  }

  /* ── HOLOGRAPHIC HEADER BAND ── */
  .jv-header-band {
    position: relative;
    display: flex; align-items: center; gap: 10px;
    padding: 3px 8px;
    background: linear-gradient(90deg,
      rgba(108,244,255,0.08) 0%,
      rgba(108,244,255,0.02) 50%,
      rgba(108,244,255,0.08) 100%);
    border-top: 1px solid rgba(108,244,255,0.12);
    border-bottom: 1px solid rgba(108,244,255,0.12);
  }

  /* ── BARCODE STRIP ──────────── */
  .jv-barcode {
    display: inline-block;
    height: 10px;
    background: repeating-linear-gradient(90deg,
      ${CYAN} 0, ${CYAN} 1px,
      transparent 1px, transparent 2px,
      ${CYAN} 2px, ${CYAN} 3px,
      transparent 3px, transparent 5px,
      ${CYAN} 5px, ${CYAN} 7px,
      transparent 7px, transparent 9px);
    opacity: 0.55;
  }
`;
