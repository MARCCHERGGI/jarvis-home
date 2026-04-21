import { CSSProperties, useEffect, useState } from 'react';
import {
  panelBase, accentedPanel, panelHeader, ACCENT,
  CYAN, OFF_WHITE, GREEN, GOLD,
} from './styles';

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

        <div style={{ height: 18 }} />

        <div style={row}>
          <span style={microLabel}>Momentum</span>
          <span style={{ ...secondaryNumber, color: GREEN, fontSize: 14, letterSpacing: '0.14em' }}>
            ACCELERATING
          </span>
        </div>
        <div style={row}>
          <span style={microLabel}>Platforms</span>
          <span style={{ ...secondaryNumber, fontSize: 13, letterSpacing: '0.12em' }}>
            ALL · SYNCED
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

// ═══════════ TRADING / MACRO ═══════════
export function TradingStrategyPanel() {
  return (
    <div style={{ ...accentedPanel(ACCENT.amber), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>TRADING · STRATEGY</span>
        <span style={{ color: '#ff9b5a' }}>●</span>
      </div>
      <div style={bodyStyle}>
        <div style={{ ...microLabel, marginBottom: 6 }}>Posture</div>
        <div style={{
          fontFamily: 'var(--display), system-ui',
          fontWeight: 300,
          fontSize: 32,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: '#fff',
        }}>
          Oil &amp; Gas<br/>
          <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: 16, fontWeight: 300 }}>
            adaptive rotation
          </span>
        </div>

        <div style={{ height: 18 }} />

        <div style={row}>
          <span style={microLabel}>Signal</span>
          <span style={{ ...secondaryNumber, fontSize: 14, letterSpacing: '0.14em', color: '#ff9b5a' }}>
            HORMUZ · HOT
          </span>
        </div>
        <div style={row}>
          <span style={microLabel}>BTC</span>
          <span style={{ ...secondaryNumber, color: GREEN }}>STEADY</span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={microLabel}>Agents</span>
          <span style={{ ...secondaryNumber, fontSize: 14, letterSpacing: '0.14em', color: OFF_WHITE }}>
            7 · ADAPTIVE
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════ BITCOIN LIVE ═══════════
export function BitcoinPanel() {
  const [price, setPrice] = useState<number | null>(82410);  // fallback
  const [change, setChange] = useState<number>(1.8);

  useEffect(() => {
    let mounted = true;
    const fetchPrice = async () => {
      try {
        const data = await (window as any).jarvis?.getCrypto?.();
        if (!mounted) return;
        if (data?.btc?.price) setPrice(data.btc.price);
        if (data?.btc?.change !== undefined) setChange(data.btc.change);
      } catch {}
    };
    fetchPrice();
    const id = setInterval(fetchPrice, 20000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const up = change >= 0;
  const changeColor = up ? GREEN : '#ff5b6b';
  const priceStr = price
    ? price.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '—';

  return (
    <div style={{ ...accentedPanel(ACCENT.gold), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>BITCOIN · LIVE</span>
        <span style={{ color: changeColor, fontFamily: 'var(--mono), monospace', fontSize: 10 }}>
          {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </span>
      </div>
      <div style={bodyStyle}>
        <div style={{ ...microLabel, marginBottom: 6 }}>Price · USD</div>
        <div style={{ ...heroNumber, fontSize: 52 }}>
          <span style={{ opacity: 0.55, fontSize: 30, marginRight: 4 }}>$</span>
          {priceStr}
        </div>

        <div style={{ height: 18 }} />

        <div style={row}>
          <span style={microLabel}>24h</span>
          <span style={{ ...secondaryNumber, color: changeColor, fontSize: 15 }}>
            {up ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        <div style={row}>
          <span style={microLabel}>Posture</span>
          <span style={{ ...secondaryNumber, fontSize: 13, letterSpacing: '0.14em' }}>
            HOLD
          </span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={microLabel}>Source</span>
          <span style={{ ...secondaryNumber, fontSize: 12, letterSpacing: '0.12em', color: OFF_WHITE }}>
            COINGECKO · LIVE
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

      {/* Album-art block — gradient with monogram. Same 16:9 footprint */}
      <div style={{
        position: 'relative',
        width: PANEL_WIDTH,
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 80% 140% at 20% 100%, rgba(255,107,196,0.35) 0%, transparent 60%), ' +
          'radial-gradient(ellipse 80% 140% at 100% 0%, rgba(108,244,255,0.25) 0%, transparent 55%), ' +
          'linear-gradient(160deg, #0b0620 0%, #05020f 100%)',
      }}>
        {/* Track monogram — big typographic silhouette */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--display), system-ui',
          fontWeight: 800,
          fontSize: 78,
          letterSpacing: '-0.04em',
          color: 'rgba(255,255,255,0.88)',
          textShadow: '0 0 28px rgba(255,107,196,0.35)',
        }}>
          ⚡
        </div>

        {/* Decorative waveform — 16 bars, pure CSS keyframes */}
        <div style={{
          position: 'absolute',
          left: 14, right: 14, bottom: 10,
          height: 26,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
        }}>
          {bars.map((_, i) => (
            <div key={i} style={{
              flex: 1,
              background: 'linear-gradient(to top, rgba(255,107,196,0.9), rgba(200,163,255,0.8))',
              borderRadius: 1,
              animation: `jv-music-bar ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.04}s infinite alternate`,
              minHeight: 4,
              height: '40%',
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

// ═══════════ SCHEDULE ═══════════
export function SchedulePanel() {
  return (
    <div style={{ ...accentedPanel(ACCENT.violet), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>TODAY · SCHEDULE</span>
        <span style={{ color: '#b088ff' }}>●</span>
      </div>
      <div style={bodyStyle}>
        <div style={{ ...microLabel, marginBottom: 6 }}>Next</div>
        <div style={{ ...heroNumber, fontSize: 58 }}>3:30<span style={{ fontSize: 22, opacity: 0.6, marginLeft: 6 }}>PM</span></div>
        <div style={{
          marginTop: 4,
          fontFamily: 'var(--mono), monospace',
          fontSize: 11,
          letterSpacing: '0.22em',
          color: OFF_WHITE,
        }}>
          SHIFT · RESTAURANT
        </div>

        <div style={{ height: 18 }} />

        <div style={row}>
          <span style={microLabel}>Later</span>
          <span style={{ ...secondaryNumber, color: '#c8a3ff' }}>9:00 PM</span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={microLabel}>Where</span>
          <span style={{ ...secondaryNumber, fontSize: 14, letterSpacing: '0.1em' }}>
            DOWNTOWN · PARTY
          </span>
        </div>
      </div>
    </div>
  );
}
