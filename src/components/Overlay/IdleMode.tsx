import { useEffect, useState } from 'react';

/**
 * Idle detection + ambient dimming.
 * After 30s of no mouse/keyboard activity, dims the UI and slows animations.
 * Any input immediately restores.
 */
export function IdleMode() {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer: number;
    const reset = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), 30000);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    window.addEventListener('click', reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
      window.removeEventListener('click', reset);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: idle ? 'rgba(0,0,0,0.45)' : 'transparent',
      pointerEvents: 'none',
      transition: 'background 3s ease',
      zIndex: 9995,
      backdropFilter: idle ? 'saturate(0.6) brightness(0.7)' : 'none',
      WebkitBackdropFilter: idle ? 'saturate(0.6) brightness(0.7)' : 'none',
    }} />
  );
}
