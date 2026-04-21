import { motion } from 'framer-motion';
import { MOCK_MARKETS } from '@/services/briefing/mock-data';
import { panelBase, panelHeader, panelBody, CYAN, CYAN_DIM, CYAN_FAINT, GREEN, RED } from './styles';
import { Corners, Sparkline, ProgressRing } from './primitives';

// Deterministic sparkline data per ticker
const sparkFor = (seed: number, change: number): number[] => {
  const pts: number[] = [];
  let v = 50;
  for (let i = 0; i < 30; i++) {
    v += ((Math.sin(seed + i * 0.4) + Math.cos(seed * 2 + i * 0.7)) * 3) + change * 0.3;
    pts.push(v);
  }
  return pts;
};

export function MarketPanel({ delay = 0 }: { delay?: number }) {
  const totalPnl = MOCK_MARKETS.reduce((a, m) => a + m.change, 0);
  const pnlPositive = totalPnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ ...panelBase, width: 460 }}
    >
      <div className="jv-grid" />
      <div className="jv-scanline" />
      <Corners />

      <div style={panelHeader}>
        <span>◉ MARKET COMMAND · TIER-1</span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="jv-dot" style={{ background: GREEN }} />
          <span>NYSE · NASDAQ · CRYPTO</span>
        </span>
      </div>

      <div style={panelBody}>
        {/* Header row: P/L ring + totals */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '8px 0 14px',
          borderBottom: `1px solid ${CYAN_FAINT}`, marginBottom: 12,
        }}>
          <ProgressRing
            value={Math.min(1, Math.abs(totalPnl) / 10)}
            size={74} stroke={4}
            color={pnlPositive ? GREEN : RED}
            label={`${pnlPositive ? '+' : ''}${totalPnl.toFixed(2)}%`}
          />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 9,
              color: CYAN_DIM, letterSpacing: '0.18em', marginBottom: 4,
            }}>
              AGGREGATE SENTIMENT
            </div>
            <div style={{ fontSize: 22, fontWeight: 200, letterSpacing: '0.04em' }}>
              {pnlPositive ? 'RISK-ON' : 'DEFENSIVE'}
            </div>
            <div style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 10,
              color: CYAN, letterSpacing: '0.1em', marginTop: 2,
            }}>
              VOL σ · 0.42 · β 1.08
            </div>
          </div>
        </div>

        {/* Ticker rows with sparklines */}
        {MOCK_MARKETS.map((m, i) => {
          const pts = sparkFor(i + 1, m.change);
          const pos = m.change >= 0;
          return (
            <motion.div
              key={m.symbol}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.25 + i * 0.07, duration: 0.5 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '56px 1fr 120px 80px',
                alignItems: 'center', gap: 10,
                padding: '9px 0',
                borderTop: i ? `1px solid ${CYAN_FAINT}` : 'none',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              <div style={{ fontSize: 13, letterSpacing: '0.08em' }}>{m.symbol}</div>
              <div style={{ fontSize: 13, color: '#fff' }}>
                {m.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
              <Sparkline data={pts} positive={pos} />
              <div style={{
                fontSize: 11, textAlign: 'right',
                color: pos ? GREEN : RED,
                textShadow: `0 0 6px ${pos ? GREEN : RED}`,
              }}>
                {pos ? '▲' : '▼'} {Math.abs(m.change).toFixed(2)}%
              </div>
            </motion.div>
          );
        })}

        {/* Volume heatmap */}
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: `1px solid ${CYAN_FAINT}`,
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 9,
            color: CYAN_DIM, letterSpacing: '0.18em', marginBottom: 6,
          }}>
            24H VOLUME HEATMAP
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const v = (Math.sin(i * 0.8) * 0.5 + 0.5) * 0.7 + Math.random() * 0.3;
              return (
                <div key={i} style={{
                  height: 18, background: CYAN,
                  opacity: 0.15 + v * 0.7,
                  boxShadow: v > 0.8 ? `0 0 6px ${CYAN}` : 'none',
                }} />
              );
            })}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'ui-monospace, monospace', fontSize: 8,
            color: CYAN_DIM, marginTop: 4, letterSpacing: '0.1em',
          }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>NOW</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
