import { CSSProperties, useEffect, useRef, useState } from 'react';
import {
  panelBase, accentedPanel, panelHeader, ACCENT,
  CYAN, OFF_WHITE, GREEN, GOLD,
} from './styles';
import { useJarvis } from '@/state/store';

// v2.0 — subtle ring flash when a panel's data just updated. Call on
// value change with a stable key. The style object is applied to the
// panel container to do a 600ms border pulse without layout shift.
function useFlashOnChange<T>(value: T): boolean {
  const [flash, setFlash] = useState(false);
  const prev = useRef<T>(value);
  useEffect(() => {
    if (prev.current !== value && prev.current !== undefined && prev.current !== null) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return flash;
}

const flashBoxShadow: CSSProperties = {
  boxShadow: '0 0 0 1.5px rgba(108,244,255,0.85), 0 0 40px rgba(108,244,255,0.45)',
  transition: 'box-shadow 600ms cubic-bezier(0.22,1,0.36,1)',
};
const flashOff: CSSProperties = {
  transition: 'box-shadow 1200ms ease-out',
};

// ──────────────────────────────────────────────────────────────
// Briefing panels — each has ONE focal point. No clutter.
// Voice-gated (mounted only after JARVIS mentions the topic).
// ──────────────────────────────────────────────────────────────

const PANEL_WIDTH = 320;

const bodyStyle: CSSProperties = {
  padding: '22px 24px 24px',
};

const microLabel: CSSProperties = {
  fontFamily: 'var(--mono), monospace',
  fontSize: 9,
  letterSpacing: '0.36em',
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase',
};

const heroNumber: CSSProperties = {
  fontFamily: 'var(--display), system-ui',
  fontWeight: 200,
  fontSize: 68,
  lineHeight: 1,
  letterSpacing: '-0.03em',
  color: '#fff',
  fontVariantNumeric: 'tabular-nums',
  textShadow: '0 0 28px rgba(108,244,255,0.35)',
};

const secondaryNumber: CSSProperties = {
  fontFamily: 'var(--display), system-ui',
  fontWeight: 300,
  fontSize: 22,
  color: '#fff',
  letterSpacing: '-0.01em',
  fontVariantNumeric: 'tabular-nums',
};

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  padding: '9px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

// ═══════════ PLATFORM ICONS (inline SVG — no asset deps) ═══════════
type IconProps = { size?: number; color?: string };
const baseIconProps = { fill: 'currentColor', xmlns: 'http://www.w3.org/2000/svg' };

const IgIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...baseIconProps}>
    <path d="M12 2.2c3.2 0 3.6 0 4.85.07 3.25.15 4.77 1.7 4.92 4.92.06 1.26.07 1.64.07 4.85s-.01 3.59-.07 4.85c-.15 3.22-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.26-.07-1.64-.07-4.85s.01-3.59.07-4.85c.15-3.23 1.66-4.77 4.92-4.92C8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.16 0-3.52.01-4.76.07-2.11.1-3.29 1.29-3.4 3.4C3.79 8.7 3.78 9.06 3.78 12s.01 3.3.07 4.53c.1 2.11 1.29 3.3 3.4 3.4 1.23.06 1.6.07 4.75.07s3.53-.01 4.76-.07c2.11-.1 3.29-1.29 3.4-3.4.06-1.23.07-1.6.07-4.53s-.01-3.3-.07-4.53c-.11-2.11-1.29-3.3-3.4-3.4C15.53 4.01 15.16 4 12 4zm0 3.24a4.76 4.76 0 1 1 0 9.52 4.76 4.76 0 0 1 0-9.52zm0 1.8a2.96 2.96 0 1 0 0 5.92 2.96 2.96 0 0 0 0-5.92zm4.95-2.16a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/>
  </svg>
);

const TtIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...baseIconProps}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-2.9 2.9 2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.32 0 .62.05.9.13V9.4a6.3 6.3 0 0 0-.9-.07 6.35 6.35 0 0 0-6.35 6.35 6.35 6.35 0 0 0 6.35 6.35 6.35 6.35 0 0 0 6.35-6.35V8.69a8.35 8.35 0 0 0 4.89 1.57V6.81a4.85 4.85 0 0 1-1.12-.12z"/>
  </svg>
);

const YtIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...baseIconProps}>
    <path d="M23.5 6.2a3 3 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3 3 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.8a3 3 0 0 0 2.12 2.14c1.87.51 9.38.51 9.38.51s7.5 0 9.38-.51A3 3 0 0 0 23.5 17.8C24 15.93 24 12 24 12s0-3.93-.5-5.8zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/>
  </svg>
);

const FbIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...baseIconProps}>
    <path d="M24 12.07C24 5.45 18.63.08 12 .08S0 5.45 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.03 24 18.06 24 12.07z"/>
  </svg>
);

const XIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...baseIconProps}>
    <path d="M18.24 2.25h3.31l-7.23 8.26L22.82 21.75h-6.65l-5.21-6.82-5.96 6.82H1.68l7.73-8.83L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z"/>
  </svg>
);

type PlatformStat = { label: string; gain: number; Icon: React.FC<IconProps> };
const PLATFORMS: PlatformStat[] = [
  { label: 'IG', gain: 112, Icon: IgIcon },
  { label: 'TT', gain:  98, Icon: TtIcon },
  { label: 'YT', gain:  72, Icon: YtIcon },
  { label: 'FB', gain:  42, Icon: FbIcon },
  { label: 'X',  gain:  32, Icon: XIcon  },
];

// ═══════════ SOCIAL / GROWTH ═══════════
export function SocialPanel() {
  return (
    <div style={{ ...accentedPanel(ACCENT.gold), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>OVERNIGHT · SOCIAL</span>
        <span style={{ color: GOLD }}>●</span>
      </div>
      <div style={bodyStyle}>
        <div style={{ ...microLabel, marginBottom: 6 }}>Followers Gained</div>
        <div style={heroNumber}>+356</div>

        {/* Platform icon row with per-platform gains */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
          marginTop: 18,
          marginBottom: 16,
          padding: '10px 6px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {PLATFORMS.map(({ label, gain, Icon }) => (
            <div key={label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}>
              <Icon size={17} color="rgba(255,255,255,0.88)" />
              <div style={{
                fontFamily: 'var(--display), system-ui',
                fontSize: 14,
                fontWeight: 300,
                color: '#fff',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}>
                +{gain}
              </div>
              <div style={{
                fontFamily: 'var(--mono), monospace',
                fontSize: 8,
                letterSpacing: '0.2em',
                color: 'rgba(255,255,255,0.38)',
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div style={row}>
          <span style={microLabel}>Momentum</span>
          <span style={{ ...secondaryNumber, color: GREEN, fontSize: 14, letterSpacing: '0.14em' }}>
            ACCELERATING
          </span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={microLabel}>Signal</span>
          <span style={{ ...secondaryNumber, color: GOLD, fontSize: 13, letterSpacing: '0.14em' }}>
            NEW OPPORTUNITIES
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════ STRAIT OF HORMUZ MAP (stylized, news-graphic) ═══════════
// Simplified but recognizable: Iran north, Musandam peninsula (Oman/UAE)
// pushing up from south creating the chokepoint. Dashed shipping lane,
// red hot-spot marker at the narrow point.
function HormuzMap() {
  return (
    <svg
      viewBox="0 0 320 130"
      width="100%"
      height="130"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="jv-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#081c2e" />
          <stop offset="100%" stopColor="#050e1a" />
        </linearGradient>
        <linearGradient id="jv-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1a2416" />
          <stop offset="100%" stopColor="#0f1810" />
        </linearGradient>
      </defs>

      {/* Sea background */}
      <rect width="320" height="130" fill="url(#jv-sea)" />

      {/* Faint lat/lon grid — cartographic feel */}
      <g stroke="rgba(108,244,255,0.05)" strokeWidth="0.5">
        <line x1="0" y1="32" x2="320" y2="32" />
        <line x1="0" y1="64" x2="320" y2="64" />
        <line x1="0" y1="96" x2="320" y2="96" />
        <line x1="80"  y1="0" x2="80"  y2="130" />
        <line x1="160" y1="0" x2="160" y2="130" />
        <line x1="240" y1="0" x2="240" y2="130" />
      </g>

      {/* Iran (north) — sweeps across the top with Bandar Abbas bulge */}
      <path
        d="M 0 0 L 320 0 L 320 42 C 280 50 250 55 220 48 C 195 42 175 58 160 66 C 145 72 125 66 105 60 C 80 52 55 58 30 54 C 15 52 5 54 0 56 Z"
        fill="url(#jv-land)"
        stroke="rgba(127,255,155,0.38)"
        strokeWidth="1"
      />

      {/* Musandam peninsula (Oman/UAE) — triangular push from bottom */}
      <path
        d="M 0 130 L 320 130 L 320 96 C 280 92 260 98 230 104 C 210 108 195 94 178 82 C 166 74 150 78 130 86 C 110 94 80 100 55 104 C 25 108 10 110 0 112 Z"
        fill="url(#jv-land)"
        stroke="rgba(127,255,155,0.38)"
        strokeWidth="1"
      />

      {/* Shipping lane — dashed cyan line through the strait */}
      <path
        d="M 20 74 C 80 76 130 78 175 74 C 220 70 270 72 305 70"
        fill="none"
        stroke="rgba(108,244,255,0.6)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
      />

      {/* Hot-spot marker at the chokepoint */}
      <g>
        <circle cx="178" cy="76" r="14" fill="none" stroke="rgba(255,91,107,0.3)" strokeWidth="1" />
        <circle cx="178" cy="76" r="8"  fill="none" stroke="rgba(255,91,107,0.55)" strokeWidth="1">
          <animate attributeName="r" values="8;14;8" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="178" cy="76" r="3.2" fill="#ff5b6b" />
      </g>

      {/* Labels */}
      <text
        x="108" y="30"
        fill="rgba(255,255,255,0.72)"
        fontSize="10"
        fontFamily="var(--mono), monospace"
        letterSpacing="3"
      >IRAN</text>
      <text
        x="206" y="124"
        fill="rgba(255,255,255,0.72)"
        fontSize="10"
        fontFamily="var(--mono), monospace"
        letterSpacing="3"
      >OMAN · UAE</text>
      <text
        x="86" y="66"
        fill="rgba(108,244,255,0.75)"
        fontSize="8"
        fontFamily="var(--mono), monospace"
        letterSpacing="2.6"
      >STRAIT OF HORMUZ</text>
      <text
        x="188" y="70"
        fill="rgba(255,91,107,0.9)"
        fontSize="7.5"
        fontFamily="var(--mono), monospace"
        letterSpacing="2"
        fontWeight="600"
      >HOT</text>
    </svg>
  );
}

// Trend-up icon — small rising arrow for oil/gas signal
function TrendUpIcon({ size = 18, color = '#7fff9b' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         xmlns="http://www.w3.org/2000/svg">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}

// ═══════════ TRADING / MACRO ═══════════
export function TradingStrategyPanel() {
  return (
    <div style={{ ...accentedPanel(ACCENT.amber), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>TRADING · STRATEGY</span>
        <span style={{ color: '#ff9b5a' }}>●</span>
      </div>

      {/* Hormuz map — same 16:9 footprint as other visual panels */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <HormuzMap />
      </div>

      <div style={bodyStyle}>
        {/* Oil & Gold with rising-trend icon */}
        <div style={{ ...microLabel, marginBottom: 6 }}>Posture</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 2,
        }}>
          <div style={{
            fontFamily: 'var(--display), system-ui',
            fontWeight: 300,
            fontSize: 30,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: '#fff',
          }}>
            Oil &amp; Gold
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(127,255,155,0.1)',
            border: '1px solid rgba(127,255,155,0.25)',
          }}>
            <TrendUpIcon size={14} />
            <span style={{
              fontFamily: 'var(--display), system-ui',
              fontSize: 13,
              fontWeight: 400,
              color: GREEN,
              fontVariantNumeric: 'tabular-nums',
            }}>
              +3.2%
            </span>
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 300 }}>
          adaptive rotation
        </div>

        <div style={{ height: 16 }} />

        <div style={row}>
          <span style={microLabel}>Bots</span>
          <span style={{ ...secondaryNumber, color: GREEN, fontSize: 15 }}>
            69% PROFITABLE
          </span>
        </div>
        <div style={row}>
          <span style={microLabel}>Signal</span>
          <span style={{ ...secondaryNumber, fontSize: 14, letterSpacing: '0.14em', color: '#ff9b5a' }}>
            HORMUZ · HOT
          </span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={microLabel}>Posture</span>
          <span style={{ ...secondaryNumber, fontSize: 13, letterSpacing: '0.14em' }}>
            LONG · COMMODITIES
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════ BITCOIN SPARKLINE ═══════════
// 24-point synthetic price curve biased by the 24h change direction/amount.
// Renders as a smooth SVG polyline with a soft gradient area fill underneath.
function BtcSparkline({ change, color, width = PANEL_WIDTH - 48, height = 54 }: {
  change: number; color: string; width?: number; height?: number;
}) {
  // Seeded synthetic data: realistic random-walk that ends change% above start.
  const N = 28;
  const points = useState(() => {
    const out: number[] = [];
    let v = 0.5;
    const drift = change / 100 / N;        // total drift per step
    for (let i = 0; i < N; i++) {
      // Smooth pseudo-random noise (sin-based, deterministic for aesthetic stability)
      const noise = (Math.sin(i * 1.7) * 0.025) + (Math.sin(i * 0.9) * 0.02);
      v += drift + noise;
      out.push(v);
    }
    // Normalize to 0..1
    const lo = Math.min(...out);
    const hi = Math.max(...out);
    const span = Math.max(hi - lo, 0.0001);
    return out.map((x) => (x - lo) / span);
  })[0];

  const pad = 4;
  const pts = points.map((p, i) => {
    const x = pad + (i / (N - 1)) * (width - pad * 2);
    const y = pad + (1 - p) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="jv-btc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#jv-btc-area)" />
      <path d={linePath} stroke={color} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      {/* Leading-edge dot */}
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="3"
        fill={color}
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="6"
        fill="none"
        stroke={color}
        strokeOpacity="0.35"
      />
    </svg>
  );
}

// ═══════════ BITCOIN LIVE ═══════════
export function BitcoinPanel() {
  // v2.0: read from live pulse instead of own polling. useLivePulse hook
  // owns the 30s refresh loop during ready phase.
  const pulseBtc = useJarvis((s) => s.pulse.btc);
  const [local, setLocal] = useState<{ price: number; change: number } | null>(null);

  // Fallback: during briefing phase (before useLivePulse kicks in at ready)
  // do one direct fetch so the panel isn't blank on first reveal.
  useEffect(() => {
    if (pulseBtc) { setLocal(pulseBtc); return; }
    let mounted = true;
    (async () => {
      try {
        const data = await (window as any).jarvis?.getCrypto?.();
        if (!mounted) return;
        if (data?.btc?.price) setLocal({ price: data.btc.price, change: data.btc.change ?? 0 });
      } catch {}
    })();
    return () => { mounted = false; };
  }, [pulseBtc]);

  const current = pulseBtc ?? local;
  const price  = current?.price ?? null;
  const change = current?.change ?? 0;
  const flash = useFlashOnChange(price);

  const up = change >= 0;
  const changeColor = up ? GREEN : '#ff5b6b';
  const priceStr = price
    ? price.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '—';

  return (
    <div style={{ ...accentedPanel(ACCENT.gold), width: PANEL_WIDTH, ...(flash ? flashBoxShadow : flashOff) }}>
      <div style={panelHeader}>
        <span>BITCOIN · LIVE</span>
        <span style={{ color: changeColor, fontFamily: 'var(--mono), monospace', fontSize: 10 }}>
          {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </span>
      </div>
      <div style={bodyStyle}>
        <div style={{ ...microLabel, marginBottom: 6 }}>Price · USD</div>
        <div style={{ ...heroNumber, fontSize: 48 }}>
          <span style={{ opacity: 0.55, fontSize: 26, marginRight: 4 }}>$</span>
          {priceStr}
        </div>

        {/* 24h sparkline */}
        <div style={{ marginTop: 10, marginBottom: 8 }}>
          <BtcSparkline change={change} color={changeColor} />
        </div>

        <div style={row}>
          <span style={microLabel}>24h</span>
          <span style={{ ...secondaryNumber, color: changeColor, fontSize: 15 }}>
            {up ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={microLabel}>Posture</span>
          <span style={{ ...secondaryNumber, fontSize: 13, letterSpacing: '0.14em' }}>
            HOLD · STEADY
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════ MUSIC / NOW PLAYING ═══════════
// Plays the LOCAL mp3 (/public/audio/opt2-shoot-to-thrill.mp3) via the
// existing playMusic pipeline — no iframe, no embed restrictions, no lag.
// This panel is purely visual: album-art block + decorative waveform bars.
const DEFAULT_MUSIC_TITLE =
  (import.meta as any).env?.VITE_MUSIC_TITLE ?? 'AC/DC · BACK IN BLACK';

export function MusicPanel({ title = DEFAULT_MUSIC_TITLE }: { title?: string }) {
  // 16 decorative bars — CSS animated so no JS cost per frame
  const bars = Array.from({ length: 16 });

  return (
    <div style={{ ...accentedPanel(ACCENT.magenta), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>NOW PLAYING</span>
        <span style={{ color: '#ff6bc4' }}>●</span>
      </div>

      {/* Album art — pure typography, AC/DC-style black with red accent */}
      <div style={{
        position: 'relative',
        width: PANEL_WIDTH,
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #020204 0%, #0a0408 100%)',
      }}>
        {/* Subtle vinyl-like concentric circles behind the type */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: 220, height: 220,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, transparent 0%, transparent 38%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0.03) 39%, transparent 39%, transparent 52%, rgba(255,255,255,0.025) 52%, rgba(255,255,255,0.025) 53%, transparent 53%, transparent 66%, rgba(255,255,255,0.02) 66%, rgba(255,255,255,0.02) 67%, transparent 67%)',
          opacity: 0.9,
        }} />

        {/* Red accent bar top */}
        <div style={{
          position: 'absolute',
          top: 14,
          left: 20,
          width: 36,
          height: 2,
          background: '#ff2e3a',
          boxShadow: '0 0 12px #ff2e3a',
        }} />

        {/* Artist / title typography stack */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '0 20px',
        }}>
          <div style={{
            fontFamily: 'var(--mono), monospace',
            fontSize: 10,
            letterSpacing: '0.44em',
            color: '#ff2e3a',
            marginBottom: 10,
            fontWeight: 500,
          }}>
            AC ⚡ DC
          </div>
          <div style={{
            fontFamily: 'var(--display), system-ui',
            fontWeight: 800,
            fontSize: 34,
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: '#fff',
            textShadow: '0 0 18px rgba(255,46,58,0.35)',
          }}>
            BACK IN
          </div>
          <div style={{
            fontFamily: 'var(--display), system-ui',
            fontWeight: 800,
            fontSize: 34,
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: '#fff',
            textShadow: '0 0 18px rgba(255,46,58,0.35)',
          }}>
            BLACK
          </div>
        </div>

        {/* Decorative waveform — bottom */}
        <div style={{
          position: 'absolute',
          left: 14, right: 14, bottom: 10,
          height: 20,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          gap: 2,
        }}>
          {bars.slice(0, 10).map((_, i) => (
            <div key={i} style={{
              width: 2,
              background: 'linear-gradient(to top, rgba(255,46,58,0.95), rgba(255,136,140,0.75))',
              borderRadius: 1,
              animation: `jv-music-bar ${0.5 + (i % 5) * 0.1}s ease-in-out ${i * 0.05}s infinite alternate`,
              minHeight: 3,
              height: '60%',
              willChange: 'transform',
              transformOrigin: 'bottom',
            }} />
          ))}
        </div>
      </div>

      <div style={{ ...bodyStyle, paddingTop: 14, paddingBottom: 16 }}>
        <div style={row}>
          <span style={microLabel}>Track</span>
          <span style={{ ...secondaryNumber, fontSize: 12, letterSpacing: '0.08em', maxWidth: 200, textAlign: 'right' }}>
            {title}
          </span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={microLabel}>Status</span>
          <span style={{ ...secondaryNumber, fontSize: 12, letterSpacing: '0.12em', color: '#ff6bc4' }}>
            STREAMING
          </span>
        </div>
      </div>

      <style>{`
        @keyframes jv-music-bar {
          0%   { transform: scaleY(0.25); }
          100% { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════ MUSIC · MINIMIZED ═══════════
// Thin horizontal strip — "now playing" status bar. Sits at the top
// edge above the hexagon, out of the briefing panels' way.
export function MusicMini({ title = DEFAULT_MUSIC_TITLE }: { title?: string }) {
  const bars = Array.from({ length: 5 });
  return (
    <div style={{
      width: 260,
      height: 44,
      borderRadius: 22,
      background: 'linear-gradient(180deg, rgba(20,12,18,0.85) 0%, rgba(10,4,8,0.92) 100%)',
      border: '1px solid rgba(255,46,58,0.28)',
      boxShadow: '0 0 0 1px rgba(255,46,58,0.18), 0 8px 22px rgba(0,0,0,0.45)',
      backdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 14px',
      color: '#fff',
      overflow: 'hidden',
    }}>
      {/* Red pulse dot */}
      <span style={{
        width: 7, height: 7, borderRadius: 999,
        background: '#ff2e3a',
        boxShadow: '0 0 10px #ff2e3a',
        animation: 'jv-music-bar 1.4s ease-in-out infinite alternate',
        flexShrink: 0,
      }} />

      {/* NOW PLAYING label */}
      <span style={{
        fontFamily: 'var(--mono), monospace',
        fontSize: 8,
        letterSpacing: '0.34em',
        color: '#ff6b78',
        flexShrink: 0,
      }}>
        NOW · PLAYING
      </span>

      {/* Divider */}
      <span style={{
        width: 1, height: 16,
        background: 'rgba(255,255,255,0.15)',
        flexShrink: 0,
      }} />

      {/* Track title */}
      <span style={{
        fontFamily: 'var(--display), system-ui',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '-0.005em',
        color: 'rgba(255,255,255,0.92)',
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {title}
      </span>

      {/* Mini eq bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, flexShrink: 0 }}>
        {bars.map((_, i) => (
          <div key={i} style={{
            width: 2.5,
            height: 14,
            background: '#ff2e3a',
            borderRadius: 1,
            transformOrigin: 'bottom',
            animation: `jv-music-bar ${0.6 + (i % 3) * 0.15}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.07}s`,
            opacity: 0.85,
          }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════ SCHEDULE ═══════════
// Two events to attend — both downtown Manhattan.
export function SchedulePanel() {
  return (
    <div style={{ ...accentedPanel(ACCENT.violet), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>TONIGHT · SCHEDULE</span>
        <span style={{ color: '#b088ff' }}>●</span>
      </div>
      <div style={bodyStyle}>
        <div style={{ ...microLabel, marginBottom: 6 }}>Events</div>
        <div style={{ ...heroNumber, fontSize: 58 }}>
          2<span style={{ fontSize: 18, opacity: 0.6, marginLeft: 10, letterSpacing: '0.12em' }}>DOWNTOWN</span>
        </div>
        <div style={{
          marginTop: 4,
          fontFamily: 'var(--mono), monospace',
          fontSize: 11,
          letterSpacing: '0.22em',
          color: OFF_WHITE,
        }}>
          MANHATTAN
        </div>

        <div style={{ height: 18 }} />

        <div style={row}>
          <span style={microLabel}>First</span>
          <span style={{ ...secondaryNumber, color: '#c8a3ff' }}>7:30 PM</span>
        </div>
        <div style={row}>
          <span style={{ ...microLabel, opacity: 0 }}>·</span>
          <span style={{ ...secondaryNumber, fontSize: 13, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)' }}>
            TRIBECA
          </span>
        </div>
        <div style={row}>
          <span style={microLabel}>Second</span>
          <span style={{ ...secondaryNumber, color: '#c8a3ff' }}>10:00 PM</span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={{ ...microLabel, opacity: 0 }}>·</span>
          <span style={{ ...secondaryNumber, fontSize: 13, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)' }}>
            SOHO
          </span>
        </div>
      </div>
    </div>
  );
}
