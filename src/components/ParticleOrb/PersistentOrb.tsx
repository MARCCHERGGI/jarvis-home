import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useJarvis } from '@/state/store';
import { ParticleOrb } from './ParticleOrb';

/**
 * Physics-based orb motion.
 *
 *  Sleep     → hidden, centered
 *  Waking    → fades in at center, large
 *  Briefing  → springs up to top, smaller
 *
 * Three.js canvas is a CONSTANT 460px (no re-init / no layout).
 * Position and scale animate via Framer springs on TRANSFORM only
 * (GPU-composited, zero jank). Target Y values are real pixels —
 * no cross-unit interpolation.
 */

const CANVAS = 460;
const TARGET_TOP_PX = 60;
const BRIEFING_SCALE = 360 / 460;

export function PersistentOrb() {
  const phase = useJarvis((s) => s.phase);
  const isSleep = phase === 'sleep';
  const isWaking = phase === 'waking';
  const centered = isSleep || isWaking;

  const [vh, setVh] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900
  );
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const centeredY = vh / 2 - CANVAS / 2;
  const briefingY = TARGET_TOP_PX - (CANVAS * (1 - BRIEFING_SCALE)) / 2;

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
      }}
      animate={{
        y: centered ? centeredY : briefingY,
        scale: centered ? 1 : BRIEFING_SCALE,
        opacity: isSleep ? 0 : 1,
      }}
      transition={{
        y:       { type: 'spring', stiffness: 52, damping: 18, mass: 1.35 },
        scale:   { type: 'spring', stiffness: 60, damping: 20, mass: 1.15 },
        opacity: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <ParticleOrb size={CANVAS} />
    </motion.div>
  );
}
