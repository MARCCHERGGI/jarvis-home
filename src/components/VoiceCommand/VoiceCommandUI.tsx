import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { speech } from '@/services/voice/speechRecognition';
import { runAndSpeak, ExecutedCommand } from '@/services/voice/commandRouter';
import { CYAN, GREEN, RED, AMBER } from '@/components/Panels/styles';

/**
 * Hold V to talk. Release to execute.
 * Shows live transcription, executed command, and response.
 */
export function VoiceCommandUI() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recent, setRecent] = useState<ExecutedCommand[]>([]);

  useEffect(() => {
    if (!speech.available()) return;

    const unsub = speech.onResult((text, isFinal) => {
      setTranscript(text);
      if (isFinal) {
        runAndSpeak(text).then(result => {
          setRecent(prev => [result, ...prev].slice(0, 4));
          setTimeout(() => setTranscript(''), 1500);
        });
      }
    });

    let vHeld = false;
    const onDown = (e: KeyboardEvent) => {
      if ((e.key === 'v' || e.key === 'V') && !vHeld && !e.repeat) {
        vHeld = true;
        setListening(true);
        setTranscript('');
        speech.start();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'v' || e.key === 'V') {
        vHeld = false;
        setListening(false);
        speech.stop();
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      unsub();
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return (
    <>
      {/* HOLD-V hint (bottom-center, always visible) */}
      <div style={{
        position: 'fixed',
        bottom: 12, left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--mono), monospace',
        fontSize: 9,
        letterSpacing: '0.3em',
        color: listening ? CYAN : 'rgba(108,244,255,0.35)',
        textShadow: listening ? `0 0 10px ${CYAN}` : 'none',
        pointerEvents: 'none',
        zIndex: 1000,
        transition: 'color 200ms, text-shadow 200ms',
      }}>
        {listening ? '◉ LISTENING…' : 'HOLD V TO TALK'}
      </div>

      {/* Listening overlay — full-screen cyan glow + transcript */}
      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', inset: 0, pointerEvents: 'none',
              zIndex: 999,
              boxShadow: 'inset 0 0 200px rgba(108,244,255,0.25)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Live transcription (bottom-center, above hint) */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              position: 'fixed',
              bottom: 48, left: '50%',
              transform: 'translateX(-50%)',
              padding: '14px 28px',
              background: 'linear-gradient(180deg, rgba(6,12,22,0.88), rgba(2,6,12,0.95))',
              border: `1px solid ${CYAN}`,
              borderRadius: 6,
              fontFamily: 'var(--display), system-ui',
              fontSize: 20,
              fontWeight: 300,
              color: '#fff',
              textShadow: `0 0 16px ${CYAN}`,
              backdropFilter: 'blur(20px)',
              boxShadow: `0 0 40px rgba(108,244,255,0.35), inset 0 1px 0 rgba(255,255,255,0.1)`,
              whiteSpace: 'nowrap',
              maxWidth: '70vw',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pointerEvents: 'none',
              zIndex: 1001,
            }}
          >
            "{transcript}"
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent commands log (top-center) */}
      <AnimatePresence>
        {recent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 70, left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column', gap: 6,
              pointerEvents: 'none',
              zIndex: 998,
            }}
          >
            {recent.map((cmd, i) => {
              const color = cmd.success ? GREEN : cmd.action === 'unknown' ? AMBER : RED;
              return (
                <motion.div
                  key={`${cmd.input}-${i}`}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1 - i * 0.22, y: 0, scale: 1 - i * 0.02 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                  style={{
                    padding: '8px 18px',
                    background: 'rgba(6,12,22,0.78)',
                    border: `1px solid ${color}44`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 4,
                    fontFamily: 'var(--mono), monospace',
                    fontSize: 11,
                    color: '#fff',
                    backdropFilter: 'blur(16px)',
                    boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 20px ${color}22`,
                    display: 'flex', gap: 10, alignItems: 'center',
                  }}
                >
                  <span style={{ color, letterSpacing: '0.15em', fontSize: 9 }}>
                    {cmd.action.toUpperCase()}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>→</span>
                  <span style={{ color: '#fff' }}>{cmd.spoken}</span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
