import { useEffect, useRef } from 'react';
import { ampBus } from '@/services/audio/ampBus';

/**
 * Debug readout — bottom-right corner.
 * Shows live ampBus values so we can SEE if the audio pipeline is publishing.
 * Big obvious bar + numeric value, updates every RAF.
 */
export function DebugAmp() {
  const barRef = useRef<HTMLDivElement>(null);
  const valRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (barRef.current) {
        barRef.current.style.width = `${ampBus.amp * 100}%`;
        barRef.current.style.background = ampBus.active ? '#7fff9b' : '#6cf4ff';
      }
      if (valRef.current) {
        valRef.current.innerText =
          `AMP ${ampBus.amp.toFixed(3)}  RAW ${ampBus.ampRaw.toFixed(3)}`;
      }
      if (statusRef.current) {
        statusRef.current.innerText = ampBus.active ? '● SPEAKING' : '○ IDLE';
        statusRef.current.style.color = ampBus.active ? '#7fff9b' : '#6cf4ff';
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 100, right: 20,
      width: 240,
      padding: '10px 12px',
      background: 'rgba(0,8,16,0.85)',
      border: '1px solid rgba(108,244,255,0.35)',
      borderRadius: 3,
      zIndex: 9999,
      fontFamily: 'var(--mono), ui-monospace, monospace',
      color: '#6cf4ff',
      fontSize: 11,
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.2em', opacity: 0.7 }}>AUDIO BUS · DEBUG</div>
      <div ref={statusRef} style={{ fontSize: 10, marginTop: 4 }}>○ IDLE</div>
      <div ref={valRef} style={{ fontSize: 10, marginTop: 3, opacity: 0.8 }}>
        AMP 0.000  RAW 0.000
      </div>
      <div style={{
        marginTop: 6, height: 8,
        background: 'rgba(108,244,255,0.1)',
        overflow: 'hidden',
      }}>
        <div ref={barRef} style={{
          height: '100%', width: '0%',
          background: '#6cf4ff',
          transition: 'width 40ms linear',
          boxShadow: '0 0 8px currentColor',
        }} />
      </div>
    </div>
  );
}
