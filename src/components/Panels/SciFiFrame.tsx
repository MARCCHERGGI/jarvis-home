import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CYAN, CYAN_DIM, CYAN_FAINT } from './styles';

/**
 * Sci-fi panel wrapper — wraps any panel in:
 *  - Layered glass with inner glow
 *  - Running neon border (moving light bar)
 *  - Scan line sweep
 *  - Animated corner brackets with tick marks
 *  - Holographic noise overlay
 *  - Corner coordinate strings (hex)
 *  - Pulse glow on mount
 */
export function SciFiFrame({
  children,
  width = 460,
  delay = 0,
  slideFrom = 'left' as 'left' | 'right',
  title,
  statusLabel = 'LIVE',
  statusColor = CYAN,
}: {
  children: React.ReactNode;
  width?: number;
  delay?: number;
  slideFrom?: 'left' | 'right';
  title: string;
  statusLabel?: string;
  statusColor?: string;
}) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  // Animated noise texture in the background
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = 460;
    const H = canvas.height = 400;

    let raf = 0;
    const tick = () => {
      const img = ctx.createImageData(W, H);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = Math.random() * 15;
        img.data[i] = n * 0.4;
        img.data[i+1] = n * 0.95;
        img.data[i+2] = n;
        img.data[i+3] = 8;
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Generate random hex for corner readouts
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');

  return (
    <motion.div
      initial={{ opacity: 0, x: slideFrom === 'left' ? -60 : 60, scale: 0.95, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        width,
        background: `
          linear-gradient(180deg, rgba(6,14,28,0.92) 0%, rgba(2,6,14,0.95) 100%)
        `,
        border: `1px solid rgba(108,244,255,0.3)`,
        borderRadius: 4,
        overflow: 'hidden',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.05),
          inset 0 0 40px rgba(108,244,255,0.04),
          0 24px 60px rgba(0,0,0,0.5),
          0 0 60px rgba(108,244,255,0.12)
        `,
      }}
    >
      {/* Holographic noise texture */}
      <canvas
        ref={bgCanvasRef}
        style={{
          position: 'absolute', inset: 0, opacity: 0.4,
          mixBlendMode: 'screen', pointerEvents: 'none',
        }}
      />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(108,244,255,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(108,244,255,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
      }} />

      {/* Running neon border — goes around perimeter */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 4,
        padding: 1,
        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 320deg, rgba(108,244,255,0.9) 355deg, rgba(255,255,255,1) 358deg, rgba(108,244,255,0.9) 361deg, transparent 396deg)',
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        maskComposite: 'exclude',
        animation: 'jv-rotate 4s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* Scan line sweep */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '100%',
        background: 'linear-gradient(180deg, transparent 0%, rgba(108,244,255,0.08) 48%, rgba(108,244,255,0.15) 50%, rgba(108,244,255,0.08) 52%, transparent 100%)',
        backgroundSize: '100% 300%',
        animation: 'jv-vscan 5s ease-in-out infinite',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
        opacity: 0.7,
      }} />

      {/* Header bar */}
      <div style={{
        position: 'relative',
        padding: '10px 16px',
        borderBottom: `1px solid rgba(108,244,255,0.2)`,
        background: 'linear-gradient(180deg, rgba(108,244,255,0.08), transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.28em',
          color: CYAN,
          textShadow: `0 0 8px ${CYAN}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, background: CYAN, borderRadius: 1,
            boxShadow: `0 0 6px ${CYAN}`,
            animation: 'jv-blink 2s ease-in-out infinite',
          }} />
          {title}
        </span>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: statusColor,
          letterSpacing: '0.15em',
          textShadow: `0 0 6px ${statusColor}`,
        }}>
          ● {statusLabel}
        </span>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* Corner brackets */}
      {(['tl','tr','bl','br'] as const).map(c => (
        <span key={c} style={{
          position: 'absolute',
          width: 14, height: 14,
          border: `1.5px solid ${CYAN}`,
          boxShadow: `0 0 6px ${CYAN}`,
          pointerEvents: 'none',
          ...(c === 'tl' && { top: 6, left: 6, borderRight: 'none', borderBottom: 'none' }),
          ...(c === 'tr' && { top: 6, right: 6, borderLeft: 'none', borderBottom: 'none' }),
          ...(c === 'bl' && { bottom: 6, left: 6, borderRight: 'none', borderTop: 'none' }),
          ...(c === 'br' && { bottom: 6, right: 6, borderLeft: 'none', borderTop: 'none' }),
        }} />
      ))}

      {/* Hex ID strings in corners — classic sci-fi detail */}
      <div style={{
        position: 'absolute', bottom: 8, right: 22,
        fontFamily: 'var(--mono)', fontSize: 7,
        color: CYAN_DIM, letterSpacing: '0.2em',
        pointerEvents: 'none',
      }}>
        0x{hex()}·{hex()}
      </div>
    </motion.div>
  );
}
