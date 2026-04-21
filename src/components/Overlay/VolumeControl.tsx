import { useEffect, useState } from 'react';
import { audioBus } from '@/services/audio/bus';
import { CYAN, CYAN_DIM, CYAN_FAINT } from '@/components/Panels/styles';

export function VolumeControl() {
  const [vol, setVol] = useState(() => {
    const saved = localStorage.getItem('jarvis:volume');
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    const { master } = audioBus();
    master.gain.value = vol;
    localStorage.setItem('jarvis:volume', String(vol));
  }, [vol]);

  return (
    <div style={{
      position: 'absolute',
      bottom: 14, left: 20,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px',
      background: 'rgba(4,10,20,0.65)',
      border: `1px solid ${CYAN_FAINT}`,
      backdropFilter: 'blur(14px)',
      fontFamily: 'var(--mono)',
      fontSize: 9,
      color: CYAN_DIM,
      letterSpacing: '0.18em',
      pointerEvents: 'auto',
      zIndex: 101,
    }}>
      <span style={{ color: CYAN }}>VOL</span>
      <input
        type="range" min="0" max="1" step="0.01"
        value={vol}
        onChange={(e) => setVol(parseFloat(e.target.value))}
        style={{
          width: 100, accentColor: CYAN, height: 4, cursor: 'pointer',
        }}
      />
      <span style={{ color: '#fff', minWidth: 28, textAlign: 'right' }}>{Math.round(vol * 100)}</span>
    </div>
  );
}
