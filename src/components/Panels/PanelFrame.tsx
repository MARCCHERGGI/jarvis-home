import { motion } from 'framer-motion';
import { CSSProperties, ReactNode } from 'react';
import { panelBase, panelHeader, CYAN, GREEN, RED, AMBER, VIOLET } from './styles';
import { Corners } from './primitives';

type StatusColor = 'cyan' | 'green' | 'red' | 'amber' | 'violet';
const STATUS_COLOR: Record<StatusColor, string> = {
  cyan: CYAN, green: GREEN, red: RED, amber: AMBER, violet: VIOLET,
};

/**
 * Premium panel frame — applies the full JARVIS visual treatment:
 *   • Multi-layer glass background with radial glow
 *   • Grid backdrop masked to center
 *   • Floating holographic dust particles
 *   • Diagonal scanning light sweep
 *   • 4 corner fiducials with embedded dots (breathing animation)
 *   • Shimmer holographic title (cyan→white→cyan gradient)
 *   • Pulsing status dot with double-glow
 *   • Animated data-flow line at bottom edge
 *   • Entrance animation: blur + scale + slide
 */
export function PanelFrame({
  title,
  status = 'LIVE',
  statusColor = 'green',
  width = 460,
  delay = 0,
  from = 'left',
  children,
  style,
  interactive = false,
}: {
  title: string;
  status?: string;
  statusColor?: StatusColor;
  width?: number;
  delay?: number;
  from?: 'left' | 'right' | 'bottom' | 'top';
  children: ReactNode;
  style?: CSSProperties;
  interactive?: boolean;
}) {
  const dir = {
    left:   { x: -50, y: 0 },
    right:  { x: 50,  y: 0 },
    top:    { x: 0,   y: -30 },
    bottom: { x: 0,   y: 30 },
  }[from];
  const sc = STATUS_COLOR[statusColor];

  return (
    <motion.div
      initial={{ opacity: 0, x: dir.x, y: dir.y, scale: 0.94, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      style={{
        ...panelBase,
        width,
        pointerEvents: interactive ? 'auto' : 'none',
        ...style,
      }}
    >
      {/* Layered backdrop effects */}
      <div className="jv-grid" />
      <div className="jv-dust" />
      <div className="jv-scanline" />

      {/* Corner fiducials */}
      <Corners />

      {/* Top inner chromed highlight */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={panelHeader}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span className="jv-title-glyph" />
          <span className="jv-shimmer-text" style={{ letterSpacing: '0.3em' }}>
            {title}
          </span>
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: sc,
          fontSize: 10,
          letterSpacing: '0.24em',
          textShadow: `0 0 10px ${sc}`,
        }}>
          <span className="jv-dot" style={{ background: sc, color: sc }} />
          {status}
        </span>
      </div>

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>

      {/* Bottom data-flow line */}
      <div className="jv-data-line" />
    </motion.div>
  );
}
