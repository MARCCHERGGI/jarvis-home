import { motion } from 'framer-motion';
import { useJarvis } from '@/state/store';
import { useEffect, useState } from 'react';
import { panelBase, panelHeader, panelBody, CYAN, CYAN_DIM, CYAN_FAINT, GREEN, RED, AMBER } from './styles';
import { Corners, ProgressRing } from './primitives';

const LABELS: Record<string, { name: string; subtitle: string; icon: string }> = {
  openclaw:      { name: 'OpenClaw',    subtitle: 'Autonomous agent · main',  icon: '◈' },
  hermes:        { name: 'Hermes',      subtitle: 'Skill evolution runtime',  icon: '▶' },
  'claude-code': { name: 'Claude Code', subtitle: 'Anthropic · opus-4-6 1M',  icon: '✦' },
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 0.0, running: 0.5, ok: 1.0, failed: 1.0,
};

const BOOT_LOGS = [
  '[0.021] kernel: jarvis-home v0.1.0',
  '[0.103] audio-bus: context acquired · 48kHz',
  '[0.214] voice-chain: eleven_v3 · alice · fx on',
  '[0.482] three.js: earth mesh · 96×96 · atmosphere',
  '[0.661] hud: corners · scanlines · grid armed',
  '[0.912] launcher: openclaw · hermes · claude-code queued',
  '[1.108] tts: precache 1 line · 2.3kb · cached',
  '[1.402] state: phase → briefing',
];

export function LaunchPanel({ delay = 0 }: { delay?: number }) {
  const launches = useJarvis((s) => s.launches);
  const [logIdx, setLogIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLogIdx((i) => Math.min(i + 1, BOOT_LOGS.length)), 280);
    return () => clearInterval(id);
  }, []);

  const apps = ['openclaw', 'hermes', 'claude-code'] as const;

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
        <span>◉ BOOT SEQUENCE · PID 8001</span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="jv-dot" style={{ background: CYAN }} />
          <span>COLD START</span>
        </span>
      </div>

      <div style={panelBody}>
        {/* Service rings */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
          marginBottom: 14, paddingBottom: 14,
          borderBottom: `1px solid ${CYAN_FAINT}`,
        }}>
          {apps.map((app) => {
            const status = launches[app] ?? 'pending';
            const prog = STATUS_PROGRESS[status];
            const color = status === 'ok' ? GREEN : status === 'failed' ? RED : status === 'running' ? AMBER : CYAN_DIM;
            return (
              <div key={app} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ProgressRing value={prog} size={60} stroke={3} color={color}
                                label={LABELS[app].icon} />
                </div>
                <div style={{
                  fontSize: 11, marginTop: 6, letterSpacing: '0.05em',
                }}>{LABELS[app].name}</div>
                <div style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 8,
                  color: CYAN_DIM, letterSpacing: '0.12em', marginTop: 2,
                }}>{LABELS[app].subtitle}</div>
                <div style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 9,
                  color, letterSpacing: '0.18em', marginTop: 4,
                  animation: status === 'running' ? 'jv-blink 1s ease-in-out infinite' : undefined,
                }}>
                  {status.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Terminal log stream */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${CYAN_FAINT}`,
          padding: 10, height: 140, overflow: 'hidden',
          fontFamily: 'ui-monospace, monospace', fontSize: 10.5,
          letterSpacing: '0.02em', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 6, right: 10,
            fontSize: 8, color: CYAN_DIM, letterSpacing: '0.2em',
          }}>TTY · /dev/jarvis0</div>
          {BOOT_LOGS.slice(0, logIdx).map((l, i) => (
            <div key={i} style={{
              color: i === logIdx - 1 ? CYAN : 'rgba(255,255,255,0.55)',
              animation: 'jv-rise 240ms ease-out',
            }}>
              {l}
            </div>
          ))}
          {logIdx < BOOT_LOGS.length && (
            <span style={{
              display: 'inline-block', width: 7, height: 11,
              background: CYAN, animation: 'jv-blink 0.7s steps(2) infinite',
              verticalAlign: 'middle',
            }} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
