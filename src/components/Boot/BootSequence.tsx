import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useJarvis } from '@/state/store';
import {
  SocialPanel,
  TradingStrategyPanel,
  SchedulePanel,
  BitcoinPanel,
  MusicPanel,
} from '@/components/Panels/BriefingPanels';
import { GLOBAL_PANEL_CSS, CYAN } from '@/components/Panels/styles';

// ─────────────────────────────────────────────────────────────
// "Spirit places the page" entrance.
//
// Transform + opacity + blur ONLY. No layout thrash. The motion
// suggests the orb (above) reached down and set the panel in place:
//   - Starts slightly above its final position, blurred
//   - Settles with a spring, blur clears
//   - Border gets a brief cyan whisper on first-touch
// ─────────────────────────────────────────────────────────────
const placed = (anchor: 'left' | 'right') => ({
  initial: { opacity: 0, y: -32, x: anchor === 'left' ? -6 : 6, scale: 0.96, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)' },
  exit: {
    opacity: 0, y: -12, scale: 0.98,
    transition: { duration: 0.24, ease: [0.4, 0, 1, 1] as const },
  },
  transition: {
    y:       { type: 'spring', stiffness: 110, damping: 22, mass: 0.9 },
    x:       { type: 'spring', stiffness: 130, damping: 22 },
    scale:   { type: 'spring', stiffness: 130, damping: 22 },
    opacity: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const },
    filter:  { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const },
  },
});

// A brief border flash when the panel lands — like the spirit touched it.
// Pure CSS, compositor-only, fades itself out.
const touchFlash: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  borderRadius: 8,
  boxShadow:
    '0 0 0 1px rgba(200,253,255,0.55), 0 0 40px rgba(108,244,255,0.45)',
  opacity: 0,
  animation: 'jv-touch-flash 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
};

export function BootSequence() {
  const phase = useJarvis((s) => s.phase);
  const revealed = useJarvis((s) => s.revealedPanels);
  const showRoot = phase === 'briefing' || phase === 'ready';

  useEffect(() => {
    if (document.getElementById('jv-panel-css')) return;
    const s = document.createElement('style');
    s.id = 'jv-panel-css';
    s.textContent = GLOBAL_PANEL_CSS + `
      @keyframes jv-touch-flash {
        0%   { opacity: 0; }
        30%  { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  return (
    <AnimatePresence>
      {showRoot && (
        <motion.div
          key="panels"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {/* Top row ─ SOCIAL (left) · ORB (center, not here) · TRADING (right) */}
          <AnimatePresence>
            {revealed.has('social') && (
              <motion.div key="social" {...placed('left')}
                style={{ position: 'absolute', top: 120, left: 36 }}>
                <div style={{ position: 'relative' }}>
                  <SocialPanel />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {revealed.has('trading') && (
              <motion.div key="trading" {...placed('right')}
                style={{ position: 'absolute', top: 120, right: 36 }}>
                <div style={{ position: 'relative' }}>
                  <TradingStrategyPanel />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom row ─ BITCOIN (left) · MUSIC (right) */}
          <AnimatePresence>
            {revealed.has('bitcoin') && (
              <motion.div key="bitcoin" {...placed('left')}
                style={{ position: 'absolute', bottom: 48, left: 36 }}>
                <div style={{ position: 'relative' }}>
                  <BitcoinPanel />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {revealed.has('music') && (
              <motion.div key="music" {...placed('right')}
                style={{ position: 'absolute', bottom: 48, right: 36 }}>
                <div style={{ position: 'relative' }}>
                  <MusicPanel />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Closing prompt when ready — JARVIS asks for a directive */}
          {phase === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                y: { type: 'spring', stiffness: 140, damping: 22, mass: 0.7 },
                opacity: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
              }}
              style={{
                position: 'absolute',
                bottom: '44%',
                left: '50%', transform: 'translateX(-50%)',
                fontSize: 24, fontWeight: 200,
                fontFamily: 'var(--display)',
                color: '#fff',
                textShadow: '0 0 20px rgba(108,244,255,0.4)',
                textAlign: 'center', whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
              What would you like to execute today?
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
