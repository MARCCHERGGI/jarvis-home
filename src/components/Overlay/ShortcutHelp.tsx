import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CYAN, CYAN_DIM, CYAN_FAINT, AMBER } from '@/components/Panels/styles';

const KEYS: Array<{ key: string; label: string; accent?: string }> = [
  { key: 'SPACE',      label: 'Wake JARVIS', accent: CYAN },
  { key: 'CLAP',       label: 'Wake JARVIS', accent: CYAN },
  { key: 'R',          label: 'Reset to Earth' },
  { key: 'F',          label: 'Focus mode (hide panels)' },
  { key: 'V',          label: 'Voice query (hold)', accent: AMBER },
  { key: '?',          label: 'Toggle this help' },
  { key: 'ESC',        label: 'Quit' },
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 380,
            padding: '20px 24px',
            background: 'linear-gradient(180deg, rgba(8,16,28,0.95), rgba(2,6,14,0.98))',
            border: `1px solid ${CYAN}`,
            borderRadius: 4,
            backdropFilter: 'blur(30px)',
            boxShadow: `0 0 80px rgba(108,244,255,0.25), inset 0 0 40px rgba(108,244,255,0.06)`,
            zIndex: 10000,
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.3em',
            color: CYAN, textShadow: `0 0 8px ${CYAN}`,
            borderBottom: `1px solid ${CYAN_FAINT}`,
            paddingBottom: 10, marginBottom: 14,
          }}>
            ◉ SHORTCUTS
          </div>
          {KEYS.map((k, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr',
              gap: 14, padding: '6px 0',
              borderBottom: i < KEYS.length - 1 ? `1px solid rgba(108,244,255,0.08)` : 'none',
              alignItems: 'center',
            }}>
              <kbd style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                padding: '4px 10px',
                background: 'rgba(108,244,255,0.08)',
                border: `1px solid ${k.accent ?? CYAN_FAINT}`,
                color: k.accent ?? CYAN,
                textShadow: k.accent ? `0 0 4px ${k.accent}` : 'none',
                textAlign: 'center',
                letterSpacing: '0.15em',
                borderRadius: 2,
              }}>{k.key}</kbd>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                {k.label}
              </span>
            </div>
          ))}
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop: `1px solid ${CYAN_FAINT}`,
            fontFamily: 'var(--mono)', fontSize: 9,
            color: CYAN_DIM, letterSpacing: '0.15em', textAlign: 'center',
          }}>
            PRESS ? OR ESC TO CLOSE
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
