import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Horizontal metric strip — editorial top bar of 4 hero metrics,
 * each big number + delta + label. Like a Bloomberg dashboard.
 */
type Metric = { label: string; value: string; delta: string; up: boolean };

const METRICS: Metric[] = [
  { label: 'PORTFOLIO',    value: '$842,180', delta: '+$12.9k', up: true },
  { label: 'SOCIAL REACH', value: '1,350',    delta: '+69',     up: true },
  { label: 'BTC · USD',    value: '118,420',  delta: '+1.84%',  up: true },
  { label: 'OIL · BRENT',  value: '$87.40',   delta: '+4.20%',  up: true },
];

export function MetricStrip({ delay = 0 }: { delay?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        position: 'absolute',
        top: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 48,
        padding: '14px 36px',
        background: 'linear-gradient(180deg, rgba(6,12,22,0.55), rgba(2,6,12,0.75))',
        border: '1px solid rgba(108,244,255,0.18)',
        borderRadius: 4,
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.45), 0 0 40px rgba(108,244,255,0.05)',
      }}
    >
      {METRICS.map((m, i) => (
        <div key={m.label} style={{
          display: 'flex', flexDirection: 'column',
          borderLeft: i > 0 ? '1px solid rgba(108,244,255,0.12)' : 'none',
          paddingLeft: i > 0 ? 48 : 0,
          minWidth: 130,
        }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            color: 'rgba(108,244,255,0.65)',
          }}>
            {m.label}
          </div>
          <div style={{
            fontFamily: 'var(--display)',
            fontSize: 26,
            fontWeight: 300,
            color: '#fff',
            letterSpacing: '0.01em',
            lineHeight: 1.1,
            marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {m.value}
          </div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: m.up ? '#7fff9b' : '#ff6b6b',
            letterSpacing: '0.08em',
            marginTop: 2,
            textShadow: `0 0 6px ${m.up ? '#7fff9b' : '#ff6b6b'}`,
          }}>
            {m.up ? '▲' : '▼'} {m.delta}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
