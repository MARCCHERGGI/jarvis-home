import { motion } from 'framer-motion';
import { MOCK_NEWS } from '@/services/briefing/mock-data';
import { panelBase, panelHeader, panelBody, CYAN, CYAN_DIM, CYAN_FAINT, GREEN } from './styles';
import { Corners } from './primitives';

// Crude lat/lon for news sources → screen coords on the world-map SVG
const HOTSPOTS = [
  { x: 240, y: 85,  label: 'NYC',    pulse: true },
  { x: 188, y: 82,  label: 'LDN' },
  { x: 210, y: 84,  label: 'BRU' },
  { x: 324, y: 110, label: 'TYO' },
  { x: 280, y: 155, label: 'SGP' },
  { x: 180, y: 180, label: 'LAG' },
];

export function NewsPanel({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ ...panelBase, width: 460 }}
    >
      <div className="jv-grid" />
      <div className="jv-scanline" />
      <Corners />

      <div style={panelHeader}>
        <span>◉ GLOBAL INTEL · STREAM A</span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="jv-dot" style={{ background: GREEN }} />
          <span>LIVE · 24/7</span>
        </span>
      </div>

      <div style={panelBody}>
        {/* World map with hotspots */}
        <div style={{ position: 'relative', height: 200, marginBottom: 12 }}>
          <svg viewBox="0 0 420 220" width="100%" height="100%" style={{ display: 'block' }}>
            {/* Longitude/latitude grid */}
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`lng${i}`} x1={i * 35} y1="0" x2={i * 35} y2="220"
                    stroke={CYAN_FAINT} strokeWidth="0.5" />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={`lat${i}`} x1="0" y1={i * 32} x2="420" y2={i * 32}
                    stroke={CYAN_FAINT} strokeWidth="0.5" />
            ))}
            {/* Continents as abstract blobs */}
            <g fill={CYAN_FAINT} stroke={CYAN_DIM} strokeWidth="0.8">
              <path d="M40,70 Q60,55 95,62 Q130,60 145,80 Q140,115 120,135 Q85,145 60,125 Q35,100 40,70 Z" />
              <path d="M175,65 Q215,50 245,72 Q260,95 240,118 Q200,122 182,105 Q165,85 175,65 Z" />
              <path d="M185,130 Q210,125 228,150 Q225,180 200,190 Q175,180 172,155 Q178,138 185,130 Z" />
              <path d="M275,75 Q320,60 355,85 Q365,115 340,135 Q295,140 275,120 Q262,95 275,75 Z" />
              <path d="M305,150 Q330,145 348,162 Q346,182 325,190 Q305,185 300,170 Z" />
            </g>
            {/* Hotspot pulses */}
            {HOTSPOTS.map((h, i) => (
              <g key={i}>
                {h.pulse && (
                  <>
                    <circle cx={h.x} cy={h.y} r="3" fill={CYAN}>
                      <animate attributeName="r" from="3" to="18" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={h.x} cy={h.y} r="3" fill={CYAN}>
                      <animate attributeName="r" from="3" to="26" dur="2s" begin="0.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
                <circle cx={h.x} cy={h.y} r="2.5" fill={h.pulse ? CYAN : GREEN}
                        style={{ filter: `drop-shadow(0 0 4px ${h.pulse ? CYAN : GREEN})` }} />
                <text x={h.x + 6} y={h.y + 3} fontSize="7" fill={CYAN_DIM}
                      fontFamily="ui-monospace, monospace" letterSpacing="1">
                  {h.label}
                </text>
              </g>
            ))}
            {/* Scan arc */}
            <g style={{ transformOrigin: '240px 85px', animation: 'jv-sweep 6s linear infinite' }}>
              <line x1="240" y1="85" x2="240" y2="25" stroke={CYAN} strokeWidth="0.8" opacity="0.7" />
              <path d="M240,85 L 240,25 A60,60 0 0,1 288,50 Z" fill={CYAN} opacity="0.08" />
            </g>
          </svg>
          <div style={{
            position: 'absolute', top: 4, left: 6,
            fontFamily: 'ui-monospace, monospace', fontSize: 8,
            color: CYAN_DIM, letterSpacing: '0.15em',
          }}>
            LAT 40.72°N · LON 74.00°W · SCOPE: GLOBAL
          </div>
        </div>

        {/* Headlines */}
        {MOCK_NEWS.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.25 + i * 0.1, duration: 0.5 }}
            style={{
              padding: '8px 0',
              borderTop: i ? `1px solid ${CYAN_FAINT}` : 'none',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}
          >
            <div style={{
              width: 26, flexShrink: 0,
              fontFamily: 'ui-monospace, monospace', fontSize: 9,
              color: CYAN, letterSpacing: '0.08em',
              paddingTop: 2,
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9, color: CYAN_DIM, letterSpacing: '0.15em',
                fontFamily: 'ui-monospace, monospace',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{n.source.toUpperCase()} · {n.time}</span>
                <span style={{ color: GREEN }}>● PRIORITY {i === 0 ? 'A' : 'B'}</span>
              </div>
              <div style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.3 }}>{n.headline}</div>
            </div>
          </motion.div>
        ))}

        {/* Ticker */}
        <div style={{
          marginTop: 10, overflow: 'hidden',
          borderTop: `1px solid ${CYAN_FAINT}`,
          paddingTop: 8, height: 18, position: 'relative',
        }}>
          <div style={{
            whiteSpace: 'nowrap',
            animation: 'jv-ticker 40s linear infinite',
            fontFamily: 'ui-monospace, monospace', fontSize: 10,
            color: CYAN_DIM, letterSpacing: '0.1em',
          }}>
            {'▸ FED PAUSE CONFIRMED · NVDA +1.12% · NYC LEASING UP · OAI DUBLIN HQ · ETH > 4K · BTC ATH · '.repeat(2)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
