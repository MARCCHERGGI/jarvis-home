// v2.0 — Click-to-expand wrapper for briefing panels.
//
// Wraps any briefing panel. When the user clicks during `ready` phase,
// the panel pops to center-stage with a backdrop. Click outside or ESC
// to dismiss. Only one panel can be expanded at a time — the store
// owns `expandedPanel` so it's globally consistent.

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useEffect } from 'react';
import { useJarvis } from '@/state/store';

export function ExpandablePanel({
  panelKey,
  children,
}: {
  panelKey: string;
  children: ReactNode;
}) {
  const phase = useJarvis((s) => s.phase);
  const expanded = useJarvis((s) => s.pulse.expandedPanel);
  const setExpandedPanel = useJarvis((s) => s.setExpandedPanel);

  const isInteractive = phase === 'ready' || phase === 'briefing';
  const isExpanded = expanded === panelKey;

  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExpanded, setExpandedPanel]);

  return (
    <>
      {/* In-place placeholder when expanded */}
      <div
        onClick={() => {
          if (!isInteractive) return;
          if (isExpanded) setExpandedPanel(null);
          else setExpandedPanel(panelKey);
        }}
        style={{
          cursor: isInteractive ? 'pointer' : 'default',
          opacity: isExpanded ? 0 : 1,
          transition: 'opacity 160ms ease-out',
          pointerEvents: isInteractive ? 'auto' : 'none',
        }}
      >
        {children}
      </div>

      {/* Expanded overlay — portal-adjacent via fixed positioning */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setExpandedPanel(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 4, 12, 0.82)',
                backdropFilter: 'blur(10px)',
                zIndex: 9000,
                cursor: 'pointer',
              }}
            />
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1.55, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.8, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 160, damping: 22, mass: 0.8 }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                transformOrigin: 'center',
                zIndex: 9001,
                pointerEvents: 'auto',
                filter: 'drop-shadow(0 0 60px rgba(108,244,255,0.45))',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
