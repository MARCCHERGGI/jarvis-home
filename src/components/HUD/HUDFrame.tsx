import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useJarvis } from '@/state/store';

/**
 * Sleep/waking HUD. Only renders clock + status during early phases;
 * StatusBanner takes over during briefing/ready to avoid duplication.
 */
export function HUDFrame() {
  const phase = useJarvis((s) => s.phase);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const ss = now.getSeconds().toString().padStart(2, '0');
  const dd = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Hide HUD clock during briefing — StatusBanner renders instead
  const showSleepHud = phase === 'sleep' || phase === 'waking' || phase === 'descending';

  return (
    <>
      {(['tl','tr','bl','br'] as const).map((c) => (
        <Corner key={c} corner={c} />
      ))}

      {showSleepHud && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            style={{
              position: 'absolute', top: 52, left: 40,
              fontFamily: 'var(--mono), ui-monospace, monospace',
              letterSpacing: '0.08em',
            }}
          >
            <div style={{ fontFamily: 'var(--display)', fontSize: 42, fontWeight: 200, lineHeight: 1 }}>
              {hh}<span style={{ color: '#6cf4ff', fontSize: 24, marginLeft: 8 }}>{ss}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>{dd.toUpperCase()}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            style={{
              position: 'absolute', top: 56, right: 44, textAlign: 'right',
              fontFamily: 'var(--mono), ui-monospace, monospace', fontSize: 11, letterSpacing: '0.12em',
            }}
          >
            <div style={{ color: '#6cf4ff' }}>● JARVIS_HOME</div>
            <div style={{ opacity: 0.55, marginTop: 4 }}>STATUS: {phase.toUpperCase()}</div>
            <div style={{ opacity: 0.45, marginTop: 2 }}>NODE: NYC-01</div>
          </motion.div>
        </>
      )}
    </>
  );
}

function Corner({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: 28, height: 28,
    border: '1px solid rgba(108,244,255,0.6)',
    pointerEvents: 'none',
  };
  const inset = 20;
  if (corner === 'tl') Object.assign(style, { top: inset, left: inset, borderRight: 'none', borderBottom: 'none' });
  if (corner === 'tr') Object.assign(style, { top: inset, right: inset, borderLeft: 'none', borderBottom: 'none' });
  if (corner === 'bl') Object.assign(style, { bottom: inset, left: inset, borderRight: 'none', borderTop: 'none' });
  if (corner === 'br') Object.assign(style, { bottom: inset, right: inset, borderLeft: 'none', borderTop: 'none' });
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 1.2 }}
      style={style}
    />
  );
}
