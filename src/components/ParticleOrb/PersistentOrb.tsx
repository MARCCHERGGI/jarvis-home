import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useJarvis } from '@/state/store';
import { ParticleOrb } from './ParticleOrb';

/**
 * Physics-based orb motion.
 *
 *  Sleep     → hidden, centered
 *  Waking    → fades in at center, large
 *  Briefing  → shrinks in place to "spirit" form at the pentagon core
 *  Ready     → stays at center as the spirit the 5 panels orbit
 *
 * Three.js canvas is a CONSTANT 460px (no re-init / no layout).
 * Position and scale animate via Framer springs on TRANSFORM only
 * (GPU-composited, zero jank).
 */

const CANVAS = 560;
const BRIEFING_SCALE = 0.52;

export function PersistentOrb() {
  const phase = useJarvis((s) => s.phase);
  // Orb is hidden while the camera is still in orbit (sleep, waking).
  // It emerges during descending — the kinetic energy of re-entry
  // crystallizing at the point of arrival — then settles at briefing.
  const hidden = phase === 'sleep' || phase === 'waking';
  const isBriefing = phase === 'briefing' || phase === 'ready';
  const isDescending = phase === 'descending';

  const [vh, setVh] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900
  );
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const centeredY = vh / 2 - CANVAS / 2;

  // Scale journey: 0 (hidden) → 1 (emerge at full size during descent)
  // → 0.45 (settle to spirit form as panels orbit in). The spring does
  // the overshoot automatically — no keyframes needed.
  const scale = hidden ? 0.2 : isDescending ? 1 : BRIEFING_SCALE;

  return (
    <motion.div
      initial={false}
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        width: CANVAS,
        height: CANVAS,
        x: '-50%',
        pointerEvents: 'none',
        zIndex: 50,
        willChange: 'transform, opacity',
        transformOrigin: '50% 50%',
        // Promote to its own GPU layer pre-emptively so the emerge
        // doesn't pay for layer creation mid-animation.
        transform: 'translateZ(0)',
      }}
      animate={{
        y: centeredY,
        scale,
        opacity: hidden ? 0 : 1,
      }}
      transition={{
        y:       { type: 'spring', stiffness: 105, damping: 26, mass: 0.85 },
        // Slightly bouncier spring so the orb "crystallizes" with a kiss
        // of overshoot when it emerges from the descent.
        scale:   { type: 'spring', stiffness: 130, damping: 20, mass: 0.8 },
        opacity: { duration: isDescending ? 0.55 : 0.45, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <ParticleOrb size={CANVAS} />
    </motion.div>
  );
}
