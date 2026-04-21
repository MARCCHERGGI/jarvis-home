import { useEffect, useRef, useState } from 'react';
import { CYAN, CYAN_DIM, CYAN_FAINT, GREEN, RED, AMBER } from './styles';

export function Sparkline({
  data, width = 110, height = 28, positive = true,
}: { data: number[]; width?: number; height?: number; positive?: boolean }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const path = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - ((v - min) / range) * height}`)
    .join(' ');
  const fill = positive ? GREEN : RED;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sp-${fill}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={`url(#sp-${fill})`} />
      <path d={path} fill="none" stroke={fill} strokeWidth={1.3} />
    </svg>
  );
}

export function ProgressRing({
  value, size = 64, stroke = 3, label, color = CYAN,
}: { value: number; size?: number; stroke?: number; label?: string; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={CYAN_FAINT} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace', fontSize: 11, color,
      }}>
        {label ?? `${Math.round(value * 100)}%`}
      </div>
    </div>
  );
}

export function Meter({
  value, label, color = CYAN, suffix = '',
}: { value: number; label: string; color?: string; suffix?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'ui-monospace, monospace', fontSize: 9,
        letterSpacing: '0.15em', color: CYAN_DIM, marginBottom: 3,
      }}>
        <span>{label}</span>
        <span style={{ color }}>{Math.round(value * 100)}{suffix}</span>
      </div>
      <div style={{
        height: 4, background: CYAN_FAINT, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${Math.min(100, value * 100)}%`,
          background: color, transition: 'width 500ms ease',
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
    </div>
  );
}

export function HexReadout({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      fontFamily: 'ui-monospace, monospace', fontSize: 9,
      letterSpacing: '0.15em', color: CYAN_DIM,
      display: 'flex', gap: 8,
    }}>
      <span>{label}</span>
      <span style={{ color: CYAN }}>{value}</span>
    </div>
  );
}

export function Corners() {
  return (
    <>
      <span className="jv-corner tl" />
      <span className="jv-corner tr" />
      <span className="jv-corner bl" />
      <span className="jv-corner br" />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// CINEMATIC PRIMITIVES — sci-fi HUD layer
// ═══════════════════════════════════════════════════════════

// Animated number that counts from 0 to target on mount.
export function CountUp({
  to, duration = 1200, prefix = '', suffix = '', decimals = 0, className, style,
}: {
  to: number; duration?: number; prefix?: string; suffix?: string;
  decimals?: number; className?: string; style?: React.CSSProperties;
}) {
  const [n, setN] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // ease-out-expo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setN(to * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return (
    <span className={className} style={style}>
      {prefix}{n.toFixed(decimals)}{suffix}
    </span>
  );
}

// Text that glitches in, char-by-char, with random scramble before settling.
export function DecryptText({
  text, delay = 0, speed = 28, className, style,
}: { text: string; delay?: number; speed?: number; className?: string; style?: React.CSSProperties }) {
  const [out, setOut] = useState('');
  useEffect(() => {
    const chars = '█▓▒░#@$*<>/|=+-_';
    let i = 0;
    let active = true;
    const run = () => {
      const timer = setInterval(() => {
        if (!active) return;
        if (i >= text.length) {
          clearInterval(timer);
          setOut(text);
          return;
        }
        const scrambleFrames = 2;
        let f = 0;
        const inner = setInterval(() => {
          if (f >= scrambleFrames) {
            clearInterval(inner);
            i++;
            setOut(text.slice(0, i) + (i < text.length ? chars[Math.floor(Math.random() * chars.length)] : ''));
          } else {
            setOut(text.slice(0, i) + chars[Math.floor(Math.random() * chars.length)]);
            f++;
          }
        }, speed);
      }, speed * 3);
    };
    const kick = setTimeout(run, delay);
    return () => { active = false; clearTimeout(kick); };
  }, [text, delay, speed]);
  return <span className={className} style={style}>{out || '\u00A0'}</span>;
}

// Tiny signature SVG emblem for each panel.
export function SigilID({
  code, variant = 'chevron', color = CYAN, size = 28,
}: { code: string; variant?: 'chevron' | 'reticle' | 'hex' | 'diamond'; color?: string; size?: number }) {
  const glyph = (() => {
    const c = size / 2;
    switch (variant) {
      case 'reticle':
        return (
          <>
            <circle cx={c} cy={c} r={c - 2} fill="none" stroke={color} strokeWidth="1" opacity="0.7" />
            <circle cx={c} cy={c} r={c - 6} fill="none" stroke={color} strokeWidth="0.6" opacity="0.35" />
            <line x1={c} y1="0" x2={c} y2={size} stroke={color} strokeWidth="0.6" opacity="0.5" />
            <line x1="0" y1={c} x2={size} y2={c} stroke={color} strokeWidth="0.6" opacity="0.5" />
            <circle cx={c} cy={c} r="1.6" fill={color} />
          </>
        );
      case 'hex': {
        const pts = Array.from({ length: 6 }, (_, i) => {
          const a = (i * 60 - 90) * Math.PI / 180;
          return `${c + (c - 2) * Math.cos(a)},${c + (c - 2) * Math.sin(a)}`;
        }).join(' ');
        return (
          <>
            <polygon points={pts} fill="none" stroke={color} strokeWidth="1" opacity="0.8" />
            <polygon points={pts} fill={color} opacity="0.08" />
            <circle cx={c} cy={c} r="2" fill={color} />
          </>
        );
      }
      case 'diamond':
        return (
          <>
            <polygon points={`${c},2 ${size - 2},${c} ${c},${size - 2} 2,${c}`}
              fill="none" stroke={color} strokeWidth="1" opacity="0.85" />
            <polygon points={`${c},6 ${size - 6},${c} ${c},${size - 6} 6,${c}`}
              fill={color} opacity="0.15" />
          </>
        );
      default:
        return (
          <>
            <polyline points={`4,${c - 4} ${c},${c + 3} ${size - 4},${c - 4}`}
              fill="none" stroke={color} strokeWidth="1.4" opacity="0.9" />
            <polyline points={`4,${c + 2} ${c},${c + 9} ${size - 4},${c + 2}`}
              fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
          </>
        );
    }
  })();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <svg width={size} height={size} style={{
        filter: `drop-shadow(0 0 4px ${color})`,
        animation: 'jv-breathe 3s ease-in-out infinite',
      }}>{glyph}</svg>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 8, color,
        letterSpacing: '0.2em', textShadow: `0 0 4px ${color}`,
      }}>{code}</span>
    </div>
  );
}

// Animated waveform / signal strip — lives at panel bottom as a data trace.
export function SignalStrip({
  color = CYAN, height = 18,
}: { color?: string; height?: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => p + 1), 80);
    return () => clearInterval(id);
  }, []);
  const w = 420;
  const path = Array.from({ length: 120 }, (_, i) => {
    const x = (i / 119) * w;
    const y = height / 2 +
      Math.sin(i * 0.32 + phase * 0.12) * (height * 0.28) +
      Math.sin(i * 0.08 + phase * 0.05) * (height * 0.12) +
      (Math.random() - 0.5) * 0.8;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(2)}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none"
      style={{ display: 'block', opacity: 0.9 }}>
      <path d={path} fill="none" stroke={color} strokeWidth="0.9" opacity="0.7"
        style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i}
          x1={(i / 39) * w} y1={height - 2}
          x2={(i / 39) * w} y2={height - (i % 5 === 0 ? 6 : 3)}
          stroke={color} strokeWidth="0.5" opacity="0.3" />
      ))}
    </svg>
  );
}

// Radial gauge: hand sweeping inside an arc with tick marks — HUD style.
export function RadialGauge({
  value, max = 100, size = 88, color = CYAN, label,
}: { value: number; max?: number; size?: number; color?: string; label?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0, to = value, dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const c = size / 2;
  const r = c - 6;
  const ratio = Math.min(1, v / max);
  const startA = -220; // degrees
  const endA = 40;
  const sweep = endA - startA;
  const a = (startA + sweep * ratio) * Math.PI / 180;
  const handX = c + (r - 4) * Math.cos(a);
  const handY = c + (r - 4) * Math.sin(a);

  // Build arc path
  const arcStart = startA * Math.PI / 180;
  const arcEndFull = endA * Math.PI / 180;
  const arcEndVal = (startA + sweep * ratio) * Math.PI / 180;
  const arcP = (a0: number, a1: number) => {
    const x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0);
    const x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* background arc */}
      <path d={arcP(arcStart, arcEndFull)} fill="none"
        stroke={CYAN_FAINT} strokeWidth="2" />
      {/* value arc */}
      <path d={arcP(arcStart, arcEndVal)} fill="none"
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      {/* tick marks */}
      {Array.from({ length: 11 }, (_, i) => {
        const ta = (startA + (sweep * i) / 10) * Math.PI / 180;
        const inner = i % 5 === 0 ? r - 8 : r - 4;
        return (
          <line key={i}
            x1={c + r * Math.cos(ta)} y1={c + r * Math.sin(ta)}
            x2={c + inner * Math.cos(ta)} y2={c + inner * Math.sin(ta)}
            stroke={color} strokeWidth={i % 5 === 0 ? 1.3 : 0.6}
            opacity={i % 5 === 0 ? 0.9 : 0.5} />
        );
      })}
      {/* hand */}
      <line x1={c} y1={c} x2={handX} y2={handY}
        stroke={color} strokeWidth="1.6" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <circle cx={c} cy={c} r="3" fill={color}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      {/* center label */}
      {label && (
        <text x={c} y={size - 8} textAnchor="middle"
          fill={color} fontSize="7" opacity="0.7"
          style={{ fontFamily: 'var(--mono)', letterSpacing: '0.15em' }}>
          {label}
        </text>
      )}
    </svg>
  );
}

// Classification bar — Blade Runner style file header.
export function ClassificationBar({
  code, classification = 'PRIORITY', status = 'LIVE', color = CYAN,
}: { code: string; classification?: string; status?: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '3px 8px',
      borderBottom: `1px solid ${CYAN_FAINT}`,
      background: 'linear-gradient(90deg, rgba(108,244,255,0.06), transparent)',
      fontFamily: 'var(--mono)', fontSize: 7,
      letterSpacing: '0.25em', color: CYAN_DIM,
    }}>
      <span style={{ color, textShadow: `0 0 4px ${color}` }}>◇</span>
      <span style={{ color }}>{code}</span>
      <span style={{ opacity: 0.4 }}>│</span>
      <span>CLASS:{classification}</span>
      <span style={{ opacity: 0.4 }}>│</span>
      <span style={{ flex: 1 }}>CHANNEL:OMEGA-07</span>
      <span style={{
        color: GREEN, textShadow: `0 0 4px ${GREEN}`,
        animation: 'jv-blink 2.2s ease-in-out infinite',
      }}>● {status}</span>
    </div>
  );
}

// Bottom data strip — SignalStrip + panel code footer combined.
export function PanelFooter({
  code, meta = 'JARVIS.HOME.v2', color = CYAN,
}: { code: string; meta?: string; color?: string }) {
  return (
    <div style={{
      marginTop: 10,
      paddingTop: 6,
      borderTop: `1px solid ${CYAN_FAINT}`,
      position: 'relative',
    }}>
      <SignalStrip color={color} height={16} />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--mono)', fontSize: 7,
        letterSpacing: '0.22em', color: CYAN_DIM,
        marginTop: 2,
      }}>
        <span>⟐ {code}</span>
        <span>T+{new Date().toISOString().slice(11, 19)}</span>
        <span>{meta}</span>
      </div>
    </div>
  );
}

// Side rivets: decorative hex pips along the left edge of the panel.
export function RivetColumn({ side = 'left', count = 4 }: { side?: 'left' | 'right'; count?: number }) {
  return (
    <div style={{
      position: 'absolute', top: '22%', bottom: '22%',
      [side]: 4,
      width: 5,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      pointerEvents: 'none',
    }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{
          width: 5, height: 5,
          border: `1px solid ${CYAN_DIM}`,
          background: CYAN_FAINT,
          transform: 'rotate(45deg)',
          boxShadow: `0 0 4px ${CYAN_FAINT}`,
          animation: `jv-breathe ${3 + i * 0.3}s ease-in-out infinite`,
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}
