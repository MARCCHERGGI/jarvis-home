import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useJarvis } from '@/state/store';

/**
 * Sleep/waking HUD — premium restrained. Clock + tight status line.
 * Hides during briefing/ready so panels own the frame.
 */
export function HUDFrame() {
  const phase = useJarvis((s) => s.phase);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dd = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const showSleepHud = phase === 'sleep' || phase === 'waking' || phase === 'descending';

  return (
    <>
      {(['tl','tr','bl','br'] as const).map((c) => (
        <Corner key={c} corner={c} />
      ))}

      {showSleepHud && (
        <>
          {/* Clock — display font, large but restrained, no bouncing seconds */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', top: 48, left: 44,
              fontFamily: 'var(--display), system-ui',
              letterSpacing: '-0.02em',
            }}
          >
            <div style={{
              fontSize: 52,
              fontWeight: 200,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              color: '#fff',
              textShadow: '0 0 24px rgba(108,244,255,0.25)',
            }}>
              {hh}
            </div>
            <div style={{
              fontSize: 10,
              opacity: 0.55,
              marginTop: 10,
              letterSpacing: '0.28em',
              fontFamily: 'var(--mono), monospace',
              fontWeight: 400,
            }}>
              {dd.toUpperCase()}
            </div>
          </motion.div>

          {/* Status — minimal, one line per item, no fluff */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', top: 54, right: 46, textAlign: 'right',
              fontFamily: 'var(--mono), monospace', fontSize: 10, letterSpacing: '0.32em',
            }}
          >
            <div style={{
              color: '#6cf4ff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: 999, background: '#6cf4ff',
                boxShadow: '0 0 6px #6cf4ff',
              }} />
              JARVIS
            </div>
            <div style={{
              opacity: 0.45,
              marginTop: 8,
              fontSize: 9,
              letterSpacing: '0.36em',
            }}>
              {phase.toUpperCase()}
            </div>
          </motion.div>
        </>
      )}
    </>
  );
}

function Corner({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  // Hairline corner fiducials — subtle presence, not decorative brackets
  const style: React.CSSProperties = {
    position: 'absolute',
    width: 20, height: 20,
    border: '1px solid rgba(108,244,255,0.35)',
    pointerEvents: 'none',
  };
  const inset = 22;
  if (corner === 'tl') Object.assign(style, { top: inset, left: inset, borderRight: 'none', borderBottom: 'none' });
  if (corner === 'tr') Object.assign(style, { top: inset, right: inset, borderLeft: 'none', borderBottom: 'none' });
  if (corner === 'bl') Object.assign(style, { bottom: inset, left: inset, borderRight: 'none', borderTop: 'none' });
  if (corner === 'br') Object.assign(style, { bottom: inset, right: inset, borderLeft: 'none', borderTop: 'none' });
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    />
  );
}
