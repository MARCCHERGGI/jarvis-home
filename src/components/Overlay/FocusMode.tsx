import { useEffect, useState } from 'react';
import { CYAN, CYAN_DIM } from '@/components/Panels/styles';

/**
 * Focus mode — press F to toggle. Hides panels + HUD, leaves only orb.
 * For deep work / presenting / getting out of the way.
 */
export function FocusMode() {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        setFocused(f => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.dataset.focusMode = focused ? 'on' : 'off';
    if (focused) {
      document.body.style.setProperty('--jv-panel-opacity', '0');
      document.body.style.setProperty('--jv-hud-opacity', '0.3');
    } else {
      document.body.style.removeProperty('--jv-panel-opacity');
      document.body.style.removeProperty('--jv-hud-opacity');
    }
  }, [focused]);

  return (
    <>
      {focused && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, 80px)',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.5em',
          color: CYAN,
          textShadow: `0 0 12px ${CYAN}`,
          pointerEvents: 'none',
          zIndex: 9997,
          animation: 'jv-blink 3s ease-in-out infinite',
        }}>
          ◉ FOCUS MODE ·  F TO EXIT
        </div>
      )}
      <style>{`
        body[data-focus-mode="on"] .jv-grid,
        body[data-focus-mode="on"] .jv-scanline,
        body[data-focus-mode="on"] .jv-running-border {
          opacity: 0.15 !important;
        }
      `}</style>
    </>
  );
}
