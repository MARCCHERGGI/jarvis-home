import { motion } from 'framer-motion';
import { panelBase, panelHeader, panelBody, CYAN, CYAN_DIM, CYAN_FAINT, GREEN } from './styles';
import { Corners, HexReadout } from './primitives';

const POIS = [
  { x: 50, y: 48, label: 'SOHO · HOME',   priority: true },
  { x: 58, y: 40, label: 'WEST VILLAGE' },
  { x: 48, y: 35, label: 'CHELSEA' },
  { x: 62, y: 62, label: 'FIDI' },
  { x: 44, y: 58, label: 'TRIBECA' },
  { x: 70, y: 50, label: 'LES' },
  { x: 55, y: 22, label: 'MIDTOWN' },
  { x: 80, y: 45, label: 'WILLIAMSBURG' },
];

export function CityScopePanel({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ ...panelBase, width: 460, height: 460 }}
    >
      <div className="jv-grid" />
      <div className="jv-scanline" />
      <Corners />

      <div style={panelHeader}>
        <span>◉ CITY SCOPE · NYC-01</span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="jv-dot" style={{ background: CYAN }} />
          <span>RADAR · ACTIVE</span>
        </span>
      </div>

      <div style={{ ...panelBody, padding: 16 }}>
        {/* Radar disk */}
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '1 / 1',
          marginBottom: 10,
        }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Concentric rings */}
            {[10, 22, 34, 46].map((r) => (
              <circle key={r} cx="50" cy="50" r={r}
                      stroke={CYAN_FAINT} strokeWidth="0.3" fill="none" />
            ))}
            {/* Cross hairs */}
            <line x1="50" y1="0"  x2="50" y2="100" stroke={CYAN_FAINT} strokeWidth="0.3" />
            <line x1="0"  y1="50" x2="100" y2="50" stroke={CYAN_FAINT} strokeWidth="0.3" />
            <line x1="15" y1="15" x2="85"  y2="85" stroke={CYAN_FAINT} strokeWidth="0.2" />
            <line x1="85" y1="15" x2="15"  y2="85" stroke={CYAN_FAINT} strokeWidth="0.2" />

            {/* Outer bracket */}
            <circle cx="50" cy="50" r="48" stroke={CYAN_DIM} strokeWidth="0.5" fill="none"
                    strokeDasharray="2 3" />

            {/* Manhattan outline — stylized shape */}
            <path d="M52,12 L58,22 L62,38 L64,52 L60,68 L58,82 L54,90 L48,84 L42,68 L40,52 L42,38 L46,22 Z"
                  fill={CYAN} opacity="0.08"
                  stroke={CYAN} strokeWidth="0.4" />

            {/* Sweep */}
            <g style={{ transformOrigin: '50px 50px', animation: 'jv-sweep 4s linear infinite' }}>
              <defs>
                <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={CYAN} stopOpacity="0" />
                  <stop offset="100%" stopColor={CYAN} stopOpacity="0.35" />
                </linearGradient>
              </defs>
              <path d="M50,50 L50,4 A46,46 0 0,1 93,34 Z" fill="url(#sweepGrad)" />
              <line x1="50" y1="50" x2="50" y2="4" stroke={CYAN} strokeWidth="0.5" />
            </g>

            {/* POIs */}
            {POIS.map((p, i) => (
              <g key={i}>
                {p.priority && (
                  <circle cx={p.x} cy={p.y} r="2" fill={GREEN}>
                    <animate attributeName="r" from="2" to="9" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.9" to="0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={p.x} cy={p.y} r={p.priority ? 1.6 : 1}
                        fill={p.priority ? GREEN : CYAN}
                        style={{ filter: `drop-shadow(0 0 3px ${p.priority ? GREEN : CYAN})` }} />
                <text x={p.x + 2.2} y={p.y + 0.8} fontSize="2.4"
                      fill={p.priority ? GREEN : CYAN_DIM}
                      fontFamily="ui-monospace, monospace" letterSpacing="0.3">
                  {p.label}
                </text>
              </g>
            ))}

            {/* Compass labels */}
            <text x="50" y="6"  fontSize="3" fill={CYAN} textAnchor="middle"
                  fontFamily="ui-monospace, monospace">N</text>
            <text x="96" y="51" fontSize="3" fill={CYAN_DIM} textAnchor="middle"
                  fontFamily="ui-monospace, monospace">E</text>
            <text x="50" y="98" fontSize="3" fill={CYAN_DIM} textAnchor="middle"
                  fontFamily="ui-monospace, monospace">S</text>
            <text x="4"  y="51" fontSize="3" fill={CYAN_DIM} textAnchor="middle"
                  fontFamily="ui-monospace, monospace">W</text>
          </svg>
        </div>

        {/* Telemetry */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          paddingTop: 10, borderTop: `1px solid ${CYAN_FAINT}`,
        }}>
          <HexReadout label="LAT"   value="40.7233° N" />
          <HexReadout label="LON"   value="74.0030° W" />
          <HexReadout label="ALT"   value="12 m MSL" />
          <HexReadout label="ZONE"  value="GMT−04 EDT" />
          <HexReadout label="WX"    value="CLR · 14°C" />
          <HexReadout label="WIND"  value="6 kt · NE" />
          <HexReadout label="AQI"   value="42 · GOOD" />
          <HexReadout label="SEISM" value="0.00g" />
        </div>
      </div>
    </motion.div>
  );
}
