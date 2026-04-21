import { useEffect, useRef, useState } from 'react';
import { CINEMATIC_SCRIPT } from '@/services/briefing/mock-data';
import { stripTags } from '@/services/briefing/mock-data';
import { ampBus } from '@/services/audio/ampBus';
import { useJarvis } from '@/state/store';

/**
 * Karaoke-style live transcript. Words light up as Jessica speaks.
 * Uses amp envelope to advance word highlighting, approximating timing.
 */
export function LiveTranscript() {
  const phase = useJarvis((s) => s.phase);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const startRef = useRef<number>(0);
  const words = stripTags(CINEMATIC_SCRIPT).split(/\s+/);
  // Estimate ~0.35s per word at Jessica speed 1.12 → ~0.31s per word
  const WORD_MS = 310;

  useEffect(() => {
    if (phase === 'sleep') { setHighlightIdx(-1); return; }
    startRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      if (!ampBus.active) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = performance.now() - startRef.current;
      const idx = Math.floor(elapsed / WORD_MS);
      setHighlightIdx(Math.min(idx, words.length - 1));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    // Reset on each new sequence start
    const unsub = useJarvis.subscribe((s, prev) => {
      if (s.phase === 'briefing' && prev.phase !== 'briefing') {
        startRef.current = performance.now();
      }
    });
    return unsub;
  }, []);

  if (phase === 'sleep') return null;

  return (
    <div style={{
      position: 'absolute',
      top: 540,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 680,
      textAlign: 'center',
      fontFamily: 'var(--display), Inter, sans-serif',
      fontSize: 19,
      fontWeight: 300,
      letterSpacing: '0.01em',
      lineHeight: 1.5,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {words.map((w, i) => {
        const past = i < highlightIdx;
        const active = i === highlightIdx;
        return (
          <span key={i} style={{
            color: active ? '#fff' : past ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)',
            textShadow: active ? '0 0 16px rgba(108,244,255,0.9)' : past ? '0 0 6px rgba(108,244,255,0.25)' : 'none',
            transition: 'color 140ms linear, text-shadow 140ms linear',
            marginRight: 7,
          }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}
