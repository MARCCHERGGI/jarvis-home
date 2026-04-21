import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { accentedPanel, ACCENT, CYAN, CYAN_DIM, CYAN_FAINT, GREEN, RED, AMBER } from './styles';
import {
  Corners, CountUp, DecryptText, SigilID, ClassificationBar,
  PanelFooter, RivetColumn,
} from './primitives';

// PORTFOLIO panel — opens when JARVIS says:
//   "stocks are up — Exxon, Chevron, Lockheed at four percent. Hormuz pushed energy.
//    Bitcoin above seventy-five thousand."

function MiniChart({ data, color = GREEN, w = 70, h = 22 }: {
  data: number[]; color?: string; w?: number; h?: number;
}) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h * 0.85 - 2}`
  );
  return (
    <svg width={w} height={h}>
      <defs>
        <linearGradient id={`mc-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${pts.join(' L ')} L ${w},${h} L 0,${h} Z`} fill={`url(#mc-${color})`} />
      <path d={`M ${pts.join(' L ')}`} fill="none" stroke={color} strokeWidth="1.3"
        style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
    </svg>
  );
}

function genData(up: boolean, seed: number): number[] {
  const pts = [];
  let v = 50;
  for (let i = 0; i < 20; i++) {
    v += Math.sin(seed + i * 0.5) * 2 + (up ? 0.8 : -0.5);
    pts.push(v);
  }
  return pts;
}

export function TradingSwarmPanel({ delay = 0 }: { delay?: number }) {
  const [btcPrice, setBtcPrice] = useState(75420);
  useEffect(() => {
    (async () => {
      const d = await (window as any).jarvis?.getCrypto();
      if (d?.btc?.price) setBtcPrice(d.btc.price);
    })();
  }, []);
  const btcK = Math.round(btcPrice / 1000);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={accentedPanel(ACCENT.amber, { width: 460 })}
    >
      <div className="jv-grid" />
      <div className="jv-scanline" />
      <div className="jv-running-border" />
      <div className="jv-dust" />
      <div className="jv-crt-noise" />
      <div className="jv-hud-scan" style={{ animationDelay: `${delay + 0.8}s` }} />
      <Corners />
      <RivetColumn side="left" count={5} />
      <RivetColumn side="right" count={5} />

      <ClassificationBar code="MKT-042-TRD" classification="MARKETS.LIVE" status="TRADING" color={GREEN} />

      <div style={{ padding: '10px 18px 12px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SigilID code="MKT-042" variant="hex" color={GREEN} size={22} />
            <DecryptText
              text="YOUR PORTFOLIO"
              delay={delay * 1000 + 80}
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.3em',
                color: CYAN, textShadow: `0 0 8px ${CYAN}`,
              }}
            />
          </div>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, color: GREEN,
            textShadow: `0 0 4px ${GREEN}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="jv-dot" style={{ color: GREEN }} />
            ALL GREEN
          </span>
        </div>

        {/* STRAIT OF HORMUZ conflict banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          style={{
            padding: '8px 10px',
            background: 'linear-gradient(90deg, rgba(255,91,107,0.15), rgba(255,184,108,0.08) 70%, transparent)',
            border: '1px solid rgba(255,91,107,0.4)',
            borderLeft: '3px solid #ff5b6b',
            marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
            position: 'relative', overflow: 'hidden',
          }}>
          {/* pulsing scan bar inside */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,91,107,0.25), transparent)',
            backgroundSize: '200% 100%',
            animation: 'jv-shimmer 3s linear infinite',
            pointerEvents: 'none',
          }} />
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9,
            color: '#ff5b6b', letterSpacing: '0.22em',
            textShadow: '0 0 6px #ff5b6b',
            animation: 'jv-blink 1.5s ease-in-out infinite',
            position: 'relative',
          }}>⚠ CONFLICT</span>
          <span style={{
            fontSize: 11, color: '#fff', fontWeight: 500, position: 'relative',
          }}>Strait of Hormuz · Energy rally mode</span>
          <span style={{
            marginLeft: 'auto', position: 'relative',
            fontFamily: 'var(--mono)', fontSize: 11, color: AMBER,
            textShadow: `0 0 4px ${AMBER}`,
          }}>
            <CountUp to={4.2} decimals={1} prefix="+" suffix="%" duration={1200} />
          </span>
        </motion.div>

        {/* HERO: STOCKS +4% + BTC 75K */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
          padding: '4px 0 14px',
          borderBottom: `1px solid ${CYAN_FAINT}`,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 7.5, color: CYAN_DIM,
              letterSpacing: '0.22em', marginBottom: 4,
            }}>STOCKS · ENERGY</div>
            <div data-text="+4.2%" className="jv-chromatic" style={{
              fontSize: 40, color: GREEN, lineHeight: 1,
              textShadow: `0 0 22px ${GREEN}`,
            }}>
              <CountUp to={4.2} decimals={1} prefix="+" suffix="%" duration={1300} />
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, color: CYAN_DIM,
              marginTop: 4, letterSpacing: '0.1em',
            }}>XOM · CVX · LMT</div>
            <div style={{ marginTop: 4 }}>
              <MiniChart data={genData(true, 2)} color={GREEN} w={140} h={20} />
            </div>
          </div>
          <div style={{ borderLeft: `1px solid ${CYAN_FAINT}`, paddingLeft: 14 }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 7.5, color: CYAN_DIM,
              letterSpacing: '0.22em', marginBottom: 4,
            }}>BITCOIN</div>
            <div data-text={`$${btcK}K`} className="jv-chromatic" style={{
              fontSize: 40, color: '#fff', lineHeight: 1,
              textShadow: '0 0 22px rgba(108,244,255,0.4)',
            }}>
              <CountUp to={btcK} prefix="$" suffix="K" duration={1400} />
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, color: GREEN,
              marginTop: 4, textShadow: `0 0 4px ${GREEN}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>▲ ABOVE 75
              <span className="jv-barcode" style={{ flex: 1, marginLeft: 4 }} />
            </div>
          </div>
        </div>

        {/* Position rows */}
        {[
          { sym: 'BTC',  name: 'Bitcoin',    val: '$38.4K', change: 3.2,  up: true },
          { sym: 'XOM',  name: 'ExxonMobil', val: '$12.6K', change: 4.2,  up: true },
          { sym: 'CVX',  name: 'Chevron',    val: '$8.9K',  change: 3.8,  up: true },
          { sym: 'LMT',  name: 'Lockheed',   val: '$7.2K',  change: 4.6,  up: true },
          { sym: 'ETH',  name: 'Ethereum',   val: '$4.1K',  change: 2.1,  up: true },
        ].map((p, i) => (
          <div key={p.sym} className="jv-row" style={{
            display: 'grid',
            gridTemplateColumns: '24px 44px 1fr 72px 58px 54px',
            gap: 8, padding: '7px 2px',
            borderBottom: i < 4 ? `1px solid rgba(108,244,255,0.06)` : 'none',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 7, color: CYAN_DIM,
              letterSpacing: '0.12em',
            }}>{String(i + 1).padStart(3, '0')}</span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: '#fff', letterSpacing: '0.08em',
              textShadow: `0 0 4px ${CYAN_DIM}`,
            }}>{p.sym}</span>
            <span style={{ fontSize: 10, color: CYAN_DIM }}>{p.name}</span>
            <MiniChart data={genData(p.up, i)} color={p.up ? GREEN : RED} />
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: '#fff', textAlign: 'right',
            }}>{p.val}</span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10,
              color: p.up ? GREEN : RED, textAlign: 'right',
              textShadow: `0 0 3px ${p.up ? GREEN : RED}`,
            }}>+{p.change}%</span>
          </div>
        ))}

        <PanelFooter code="MKT-042-TRD.FEED" meta="NYSE.COINBASE" color={GREEN} />
      </div>

      <div className="jv-vignette" />
    </motion.div>
  );
}
