import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useJarvis } from '@/state/store';
import {
  SocialPanel,
  TradingStrategyPanel,
  SchedulePanel,
  BitcoinPanel,
  MusicMini,
} from '@/components/Panels/BriefingPanels';
import { MiniLLMPanels } from '@/components/Panels/MiniLLMPanels';
import { SpiritStrings } from '@/components/SpiritStrings/SpiritStrings';
import { GLOBAL_PANEL_CSS } from '@/components/Panels/styles';

// Briefing panel geometry — PANEL_WIDTH=320, height ≈ 260 in BriefingPanels.
const PANEL_W = 320;
const PANEL_H = 260;
const EDGE_GAP = 36;
const TOP_Y = 120;
const BOT_Y_INSET = 48;

// Music mini strip
const MUSIC_W = 260;
const MUSIC_H = 44;
const MUSIC_TOP = 14;

// A brief border flash when the panel lands — like the spirit touched it.
const touchFlash: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  borderRadius: 8,
  boxShadow:
    '0 0 0 1px rgba(200,253,255,0.55), 0 0 40px rgba(108,244,255,0.45)',
  opacity: 0,
  animation: 'jv-touch-flash 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
};

// Helper — build a motion entrance that springs from the orb center
// to the panel's final absolute corner. Matches the string delivery:
// the panel rides the tether out from the spirit to its destination.
function springFromOrb(finalCx: number, finalCy: number, vw: number, vh: number) {
  const dx = (vw / 2) - finalCx;
  const dy = (vh / 2) - finalCy;
  return {
    initial: { opacity: 0, x: dx, y: dy, scale: 0.25, filter: 'blur(3px)' },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: {
      opacity: 0, scale: 0.94,
      transition: { duration: 0.24, ease: [0.4, 0, 1, 1] as const },
    },
    transition: {
      x:       { type: 'spring', stiffness: 140, damping: 20, mass: 0.9, delay: 0.18 },
      y:       { type: 'spring', stiffness: 140, damping: 20, mass: 0.9, delay: 0.18 },
      scale:   { type: 'spring', stiffness: 170, damping: 20, mass: 0.75, delay: 0.18 },
      opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const, delay: 0.18 },
      filter:  { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const, delay: 0.18 },
    },
  } as const;
}

// Hexagon reveal order walks the ring.
const HEX_REVEAL_ORDER = ['gpt', 'gemini', 'x', 'tiktok', 'youtube', 'grok'];
// Briefing reveal order matches the script beats (see mock-data).
// Music opens first (underscores the narration), then 4 content panels
// in the order they're mentioned.
const BRIEFING_SEQUENCE = ['music', 'trading', 'bitcoin', 'social', 'schedule'];

export function BootSequence() {
  const phase = useJarvis((s) => s.phase);
  const revealed = useJarvis((s) => s.revealedPanels);
  const revealPanel = useJarvis((s) => s.revealPanel);
  const showRoot = phase === 'briefing' || phase === 'ready';

  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth  : 1536));
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900));
  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (document.getElementById('jv-panel-css')) return;
    const s = document.createElement('style');
    s.id = 'jv-panel-css';
    s.textContent = GLOBAL_PANEL_CSS + `
      @keyframes jv-touch-flash {
        0%   { opacity: 0; }
        30%  { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  // Hexagon sequential delivery — panels appear during briefing, strings
  // fire on each reveal. The expensive Chromium webview inside each
  // panel is lazy-mounted (see LLMPage in MiniLLMPanels) — the frame,
  // header, glow, and spring entrance all run during briefing; the web
  // page itself waits until the audio finishes.
  useEffect(() => {
    if (phase !== 'briefing' && phase !== 'ready') return;
    const timers = HEX_REVEAL_ORDER.map((key, i) =>
      window.setTimeout(() => revealPanel(key), 450 + i * 560)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [phase, revealPanel]);

  // Corner centers (for orb→corner spring motion)
  const leftCx   = EDGE_GAP + PANEL_W / 2;
  const rightCx  = vw - EDGE_GAP - PANEL_W / 2;
  const topCy    = TOP_Y + PANEL_H / 2;
  const bottomCy = vh - BOT_Y_INSET - PANEL_H / 2;
  const musicCx  = vw / 2;
  const musicCy  = MUSIC_TOP + MUSIC_H / 2;

  return (
    <AnimatePresence>
      {showRoot && (
        <motion.div
          key="panels"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {/* ── 4 CONTENT PANELS at corners ── */}
          <AnimatePresence>
            {revealed.has('social') && (
              <motion.div key="social" {...springFromOrb(leftCx, topCy, vw, vh)}
                style={{ position: 'absolute', top: TOP_Y, left: EDGE_GAP, willChange: 'transform, opacity' }}>
                <div style={{ position: 'relative' }}>
                  <SocialPanel />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {revealed.has('trading') && (
              <motion.div key="trading" {...springFromOrb(rightCx, topCy, vw, vh)}
                style={{ position: 'absolute', top: TOP_Y, right: EDGE_GAP, willChange: 'transform, opacity' }}>
                <div style={{ position: 'relative' }}>
                  <TradingStrategyPanel />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {revealed.has('bitcoin') && (
              <motion.div key="bitcoin" {...springFromOrb(leftCx, bottomCy, vw, vh)}
                style={{ position: 'absolute', bottom: BOT_Y_INSET, left: EDGE_GAP, willChange: 'transform, opacity' }}>
                <div style={{ position: 'relative' }}>
                  <BitcoinPanel />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {revealed.has('schedule') && (
              <motion.div key="schedule" {...springFromOrb(rightCx, bottomCy, vw, vh)}
                style={{ position: 'absolute', bottom: BOT_Y_INSET, right: EDGE_GAP, willChange: 'transform, opacity' }}>
                <div style={{ position: 'relative' }}>
                  <SchedulePanel />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MINIMIZED MUSIC · top-center strip ── */}
          <AnimatePresence>
            {revealed.has('music') && (
              <motion.div key="music" {...springFromOrb(musicCx, musicCy, vw, vh)}
                style={{
                  position: 'absolute',
                  top: MUSIC_TOP,
                  left: '50%',
                  marginLeft: -MUSIC_W / 2,
                  willChange: 'transform, opacity',
                }}>
                <div style={{ position: 'relative' }}>
                  <MusicMini />
                  <div style={touchFlash} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hexagon of 6 mini live-page panels orbiting the JARVIS spirit. */}
          <MiniLLMPanels />

          {/* String tethers — fire on every revealPanel(key). */}
          <SpiritStrings />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
