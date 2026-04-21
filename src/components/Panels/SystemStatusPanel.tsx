import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { panelBase, panelHeader, panelBody, CYAN, CYAN_DIM, CYAN_FAINT, GREEN } from './styles';
import { Corners, Meter, ProgressRing } from './primitives';

export function SystemStatusPanel({ delay = 0 }: { delay?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, []);

  // Gently-varying synthetic telemetry
  const cpu = 0.34 + Math.sin(tick * 0.3) * 0.08 + Math.random() * 0.04;
  const ram = 0.58 + Math.sin(tick * 0.22) * 0.04;
  const gpu = 0.12 + Math.sin(tick * 0.4) * 0.05;
  const net = 0.28 + Math.abs(Math.sin(tick * 0.6)) * 0.3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ ...panelBase, width: 460 }}
    >
      <div className="jv-grid" />
      <div className="jv-scanline" />
      <Corners />

      <div style={panelHeader}>
        <span>◉ SYSTEM VITALS · MK-VII</span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="jv-dot" style={{ background: GREEN }} />
          <span>ALL GREEN</span>
        </span>
      </div>

      <div style={panelBody}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18,
          paddingBottom: 12, borderBottom: `1px solid ${CYAN_FAINT}`,
        }}>
          <div>
            <Meter value={cpu} label="CPU" suffix="%" />
            <Meter value={ram} label="MEM" suffix="%" />
            <Meter value={gpu} label="GPU" suffix="%" />
            <Meter value={net} label="NET" suffix="%" />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <ProgressRing value={0.92} size={90} stroke={5}
                          color={GREEN} label="92°" />
            <div>
              <div style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 9,
                color: CYAN_DIM, letterSpacing: '0.18em',
              }}>REACTOR</div>
              <div style={{ fontSize: 18, fontWeight: 200, marginTop: 2 }}>NOMINAL</div>
              <div style={{
                fontFamily: 'ui-monospace, monospace', fontSize: 10,
                color: GREEN, letterSpacing: '0.12em', marginTop: 2,
              }}>
                92% · 4.2 GHz · 38°C
              </div>
            </div>
          </div>
        </div>

        {/* Agent swarm */}
        <div style={{ paddingTop: 12 }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 9,
            color: CYAN_DIM, letterSpacing: '0.18em', marginBottom: 8,
          }}>
            AGENT SWARM · 7 ACTIVE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {['SCOUT', 'POSTER', 'TRADER', 'SENTINEL', 'SCRIBE', 'BROKER', 'CURATOR', 'IDLE'].map((name, i) => {
              const active = i < 7;
              return (
                <div key={name} style={{
                  position: 'relative',
                  border: `1px solid ${active ? CYAN_DIM : CYAN_FAINT}`,
                  padding: '6px 8px',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 10, letterSpacing: '0.1em',
                  color: active ? CYAN : 'rgba(255,255,255,0.25)',
                  background: active ? 'rgba(108,244,255,0.04)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{name}</span>
                    <span className="jv-dot" style={{
                      background: active ? GREEN : 'rgba(255,255,255,0.2)',
                      width: 5, height: 5,
                    }} />
                  </div>
                  <div style={{ fontSize: 8, color: CYAN_DIM, marginTop: 2 }}>
                    {active ? `${(Math.random() * 99).toFixed(0).padStart(2, '0')}% · OK` : 'STBY'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
