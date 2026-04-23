import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useJarvis } from '@/state/store';
import { panelBase } from './styles';

// ──────────────────────────────────────────────────────────────
// Hexagon of 6 mini live-page panels orbiting the JARVIS spirit.
//
//   Top     — ChatGPT     (auto-types 3-turn story prompt)
//   UR      — Gemini      (auto-types 3-turn AI trends prompt)
//   LR      — X / @MarcoHergi   (live profile, login nag killed)
//   Bottom  — TikTok / @marcohergi (live profile)
//   LL      — YouTube / @MarcoHergi (live channel)
//   UL      — Grok        (auto-types 3-turn trends prompt)
//
// Each renders a real Electron <webview> scaled down "minimized browser"
// style. Panels spring outward from center on mount so they feel like
// particles the spirit shot out.
// ──────────────────────────────────────────────────────────────

const MINI_WIDTH = 300;
const MINI_HEIGHT = 140;

// Hexagon radii — ellipse so it reads wide on landscape screens.
// Widened for the larger 3D orb — inner corner distance must stay
// clear of the orb's visible radius (~146px at CANVAS 560 × scale 0.52).
const Rx = 340;
const Ry = 280;

// ─── Brand glyphs ───
const GPTGlyph = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.28 10.1a5.85 5.85 0 0 0-.5-4.8 5.91 5.91 0 0 0-6.37-2.84A5.9 5.9 0 0 0 5.1 3.83a5.91 5.91 0 0 0-3.95 2.86 5.9 5.9 0 0 0 .72 6.93 5.85 5.85 0 0 0 .5 4.8 5.92 5.92 0 0 0 6.38 2.84 5.9 5.9 0 0 0 10.31-2.37 5.91 5.91 0 0 0 3.95-2.86 5.9 5.9 0 0 0-.73-6.93zM13.07 20.8a4.37 4.37 0 0 1-2.81-1.02l.14-.08 4.67-2.7a.76.76 0 0 0 .39-.67v-6.6l1.97 1.14a.07.07 0 0 1 .04.05v5.46a4.4 4.4 0 0 1-4.4 4.42zM3.64 16.78a4.37 4.37 0 0 1-.52-2.94l.14.08 4.67 2.7c.24.14.54.14.77 0l5.7-3.3v2.28a.07.07 0 0 1-.03.06L9.65 18.3a4.4 4.4 0 0 1-6-1.52zM2.4 8.67A4.4 4.4 0 0 1 4.7 6.73l-.01.16v5.4c0 .28.15.54.38.67l5.7 3.3-1.97 1.13a.07.07 0 0 1-.07 0L4 14.66a4.4 4.4 0 0 1-1.6-6zm16.2 3.78-5.7-3.3 1.97-1.13a.07.07 0 0 1 .07 0l4.73 2.72a4.4 4.4 0 0 1-.66 7.94v-5.56a.75.75 0 0 0-.4-.67zm1.96-2.95-.14-.09-4.67-2.7a.76.76 0 0 0-.77 0l-5.7 3.3V7.72a.07.07 0 0 1 .03-.06l4.72-2.72a4.4 4.4 0 0 1 6.53 4.55zm-12.35 4.05-1.97-1.14a.07.07 0 0 1-.04-.05V6.88a4.4 4.4 0 0 1 7.22-3.38l-.14.08L8.6 6.28a.75.75 0 0 0-.38.67zm1.07-2.31L11.82 9.73l2.54 1.47v2.94l-2.54 1.47-2.54-1.47z"/>
  </svg>
);
const GeminiGlyph = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0 L13.5 8.5 L22 10 L13.5 11.5 L12 20 L10.5 11.5 L2 10 L10.5 8.5 Z"/>
  </svg>
);
const GrokGlyph = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3 L7 3 L13 11 L9 11 Z M21 3 L17 3 L3 21 L7 21 Z M11 13 L15 13 L21 21 L17 21 Z"/>
  </svg>
);
const XGlyph = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"/>
  </svg>
);
const YtIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.5 6.2a3 3 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3 3 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.8a3 3 0 0 0 2.12 2.14c1.87.51 9.38.51 9.38.51s7.5 0 9.38-.51A3 3 0 0 0 23.5 17.8C24 15.93 24 12 24 12s0-3.93-.5-5.8zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/>
  </svg>
);
const TtIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-2.9 2.9 2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.32 0 .62.05.9.13V9.4a6.3 6.3 0 0 0-.9-.07 6.35 6.35 0 0 0-6.35 6.35 6.35 6.35 0 0 0 6.35 6.35 6.35 6.35 0 0 0 6.35-6.35V8.69a8.35 8.35 0 0 0 4.89 1.57V6.81a4.85 4.85 0 0 1-1.12-.12z"/>
  </svg>
);

type PanelKind = 'gpt' | 'gemini' | 'grok' | 'x' | 'youtube' | 'tiktok';

type LLMConfig = {
  kind: PanelKind;
  name: string;
  url: string;
  accent: string;
  Glyph: React.FC<{ size?: number }>;
  /** Array of prompts to send sequentially — multi-turn conversation. */
  prompts: string[];
  /** Hexagon vertex angle in degrees, 0 = top, clockwise. */
  vertex: number;
};

const PANELS: LLMConfig[] = [
  // Top vertex — flagship AI
  { kind: 'gpt', name: 'CHATGPT', vertex: 0,
    url: 'https://chat.openai.com/', accent: '#7ed8a8', Glyph: GPTGlyph,
    prompts: [
      'Write a vivid 500-word story about a hacker in NYC who wakes up to an AI that runs his entire life.',
      'Now continue — what happens in the second week when his AI starts making decisions he never asked for?',
      'Finish with a twist. What does the AI confess at the end?',
    ] },
  // Upper-right
  { kind: 'gemini', name: 'GEMINI', vertex: 60,
    url: 'https://gemini.google.com/app', accent: '#8ab4ff', Glyph: GeminiGlyph,
    prompts: [
      'Give me a comprehensive 2026 analysis of global AI trends — which companies are winning, what is next, what breaks.',
      'Zoom in on the top three winners — who is actually pulling ahead and why?',
      'Now the opposite — which three companies or categories are most at risk of being replaced by autonomous agents by 2028?',
    ] },
  // Lower-right — Marco's X
  { kind: 'x', name: '@MarcoHergi · X', vertex: 120,
    url: 'https://x.com/MarcoHergi', accent: '#e6e6e6', Glyph: XGlyph,
    prompts: [] },
  // Bottom vertex — Marco's TikTok
  { kind: 'tiktok', name: '@marcohergi · TT', vertex: 180,
    url: 'https://www.tiktok.com/@marcohergi', accent: '#ff4b82', Glyph: TtIcon,
    prompts: [] },
  // Lower-left — Marco's YouTube
  { kind: 'youtube', name: '@MarcoHergi · YT', vertex: 240,
    url: 'https://www.youtube.com/@MarcoHergi', accent: '#ff4343', Glyph: YtIcon,
    prompts: [] },
  // Upper-left
  { kind: 'grok', name: 'GROK', vertex: 300,
    url: 'https://grok.com/', accent: '#c8c8c8', Glyph: GrokGlyph,
    prompts: [
      'What is trending on X right now in AI, crypto, and geopolitics — go deep and be specific.',
      'Give me five specific X accounts worth following on each of those topics, with why.',
      'Now call out three trends that are pure hype and three that are legitimately under-priced. Be sharp.',
    ] },
];

// ─── Social-media hardening — kill login modals AND stop video autoplay.
// The autoplay video on TikTok/YouTube/X was the single biggest perf
// killer — 30-60fps video decode × 3 panels × forever = massive drain.
// We pause everything and keep it paused on an interval.
const SOCIAL_DISMISS_SCRIPT = `
(() => {
  // Kill all video playback — stop the decoder loop permanently.
  const killVideo = () => {
    document.querySelectorAll('video').forEach(v => {
      try {
        v.pause();
        v.autoplay = false;
        v.removeAttribute('autoplay');
        // Prevent play() calls from restarting it
        v.play = () => Promise.resolve();
      } catch {}
    });
  };

  const kill = () => {
    killVideo();
    document.querySelectorAll('div[role="dialog"], dialog').forEach(d => {
      const txt = (d.innerText || '').toLowerCase();
      if (/sign ?in|sign ?up|log ?in|continue with|join tiktok|join instagram|join x|see more on x/.test(txt)) {
        try { d.remove(); } catch {}
      }
    });
    document.querySelectorAll('button, a[role="button"], div[role="button"]').forEach(b => {
      const t = (b.textContent || '').trim().toLowerCase();
      if (/^(not now|maybe later|dismiss|close|skip|continue as guest)$/.test(t)) {
        try { b.click(); } catch {}
      }
    });
    document.querySelectorAll('div').forEach(el => {
      if (el.children.length === 0) return;
      const s = getComputedStyle(el);
      if (s.position === 'fixed' && parseFloat(s.bottom) < 10 &&
          el.offsetHeight < 200 && el.offsetWidth > window.innerWidth * 0.5) {
        const txt = (el.innerText || '').toLowerCase();
        if (/sign ?in|log ?in|sign ?up|open in app/.test(txt)) {
          try { el.remove(); } catch {}
        }
      }
    });
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.position = 'static';
  };
  setTimeout(kill, 500);
  setInterval(kill, 2000);

  // Watch for new <video> elements and kill them on sight.
  const obs = new MutationObserver(() => killVideo());
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
`;

// ─── Multi-turn auto-type — sequentially sends each prompt after the
// previous response finishes.
const makeAutoTypeScript = (prompts: string[]) => `
(async () => {
  const PROMPTS = ${JSON.stringify(prompts)};
  if (!PROMPTS || PROMPTS.length === 0) return;
  await new Promise(r => setTimeout(r, 4000));

  const pickInput = () => {
    const tiers = [
      'textarea#prompt-textarea', 'div#prompt-textarea',
      'textarea[data-testid="prompt-textarea"]',
      'div[contenteditable="true"].ProseMirror',
      'div.ql-editor[contenteditable="true"]',
      'rich-textarea div.ql-editor',
      'textarea[placeholder*="Ask Grok" i]',
      'textarea[placeholder*="What" i]',
      'textarea[aria-label*="Grok" i]',
      'div[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="Message" i]',
      'textarea[placeholder*="Ask" i]',
      'textarea[aria-label*="prompt" i]',
      'textarea:not([readonly]):not([disabled])',
      'div[contenteditable="true"]',
    ];
    for (const s of tiers) {
      const el = document.querySelector(s);
      if (el && el.offsetParent !== null) return el;
    }
    const cand = [...document.querySelectorAll('textarea, div[contenteditable="true"]')]
      .filter(el => el.offsetParent !== null && !el.disabled && !el.readOnly && el.offsetWidth > 120);
    cand.sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight));
    return cand[0] || null;
  };

  const waitForInput = async () => {
    for (let i = 0; i < 30; i++) {
      const el = pickInput();
      if (el) return el;
      await new Promise(r => setTimeout(r, 500));
    }
    return null;
  };

  const setInputText = (input, text) => {
    input.scrollIntoView({ block: 'center' });
    input.click();
    input.focus();
    if (input.tagName === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const range = document.createRange();
      range.selectNodeContents(input);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try { document.execCommand('delete', false); } catch {}
      try { document.execCommand('insertText', false, text); } catch {
        input.textContent = text;
        input.dispatchEvent(new InputEvent('input', {
          bubbles: true, cancelable: true, data: text, inputType: 'insertText',
        }));
      }
    }
  };

  const pressSend = (input) => {
    const btnSels = [
      'button[data-testid="send-button"]',
      'button[aria-label="Send message"]',
      'button[aria-label*="Send prompt" i]',
      'button.send-button-container', 'button.send-button',
      'button[aria-label*="Send" i]:not([disabled])',
      'button[aria-label*="Submit" i]:not([disabled])',
      'button[type="submit"]:not([disabled])',
    ];
    for (const s of btnSels) {
      const b = document.querySelector(s);
      if (b && !b.disabled && b.offsetParent !== null) { b.click(); return true; }
    }
    const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true, composed: true };
    input.dispatchEvent(new KeyboardEvent('keydown', opts));
    input.dispatchEvent(new KeyboardEvent('keypress', opts));
    input.dispatchEvent(new KeyboardEvent('keyup', opts));
    return false;
  };

  const isGenerating = () => {
    const sels = [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="stop generating" i]',
      'button[data-testid*="stop" i]',
      'button[aria-label*="Cancel" i]',
    ];
    for (const s of sels) {
      const b = document.querySelector(s);
      if (b && b.offsetParent !== null) return true;
    }
    return false;
  };

  const waitForResponse = async (timeoutMs) => {
    const start = Date.now();
    let seenGenerating = false;
    while (Date.now() - start < 3000) {
      if (isGenerating()) { seenGenerating = true; break; }
      await new Promise(r => setTimeout(r, 200));
    }
    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 1000));
      if (seenGenerating && !isGenerating()) return;
      if (!seenGenerating && Date.now() - start > 8000) return;
    }
  };

  try {
    for (let turn = 0; turn < PROMPTS.length; turn++) {
      const input = await waitForInput();
      if (!input) return;
      await new Promise(r => setTimeout(r, 400));
      setInputText(input, PROMPTS[turn]);
      await new Promise(r => setTimeout(r, 900));
      pressSend(input);
      await waitForResponse(40000);
      await new Promise(r => setTimeout(r, 1200));
    }
  } catch (e) {}
})();
`;

function scriptFor(cfg: LLMConfig): string {
  if (cfg.kind === 'x' || cfg.kind === 'youtube' || cfg.kind === 'tiktok') {
    return SOCIAL_DISMISS_SCRIPT;
  }
  return cfg.prompts.length > 0 ? makeAutoTypeScript(cfg.prompts) : '';
}

// ─── Single panel ───
function LLMPage({ cfg, mountDelay = 0 }: { cfg: LLMConfig; mountDelay?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [webviewMounted, setWebviewMounted] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    let wv: (HTMLElement & {
      src?: string; partition?: string;
      executeJavaScript?: (code: string, userGesture?: boolean) => Promise<any>;
      addEventListener: (k: string, cb: () => void) => void;
      remove: () => void;
    }) | null = null;

    const timer = setTimeout(() => {
      if (!hostRef.current) return;
      wv = document.createElement('webview') as any;
      if (!wv) return;
      setWebviewMounted(true);
      wv.setAttribute('src', cfg.url);
      wv.setAttribute('partition', `persist:jarvis-${cfg.kind}`);
      wv.setAttribute('allowpopups', '');
      wv.setAttribute('useragent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

      const bodyH = MINI_HEIGHT - 28;
      // Internal viewport — tuned for perf. 6 webviews running live
      // websites is inherently expensive; shrinking each one's internal
      // raster size by ~40% nearly halves total webview paint cost.
      // Aspect still matches panel body (2.67×1) so content fills cleanly.
      const INTERNAL_W = 800;
      const INTERNAL_H = 300;
      const scale = Math.min(MINI_WIDTH / INTERNAL_W, bodyH / INTERNAL_H);
      wv.style.position = 'absolute';
      wv.style.top = '0';
      wv.style.left = '0';
      wv.style.width = `${INTERNAL_W}px`;
      wv.style.height = `${INTERNAL_H}px`;
      wv.style.transform = `scale(${scale})`;
      wv.style.transformOrigin = 'top left';
      wv.style.border = '0';
      wv.style.background = '#0a0a0a';

      let fired = false;
      const wvRef = wv;
      wvRef.addEventListener('did-finish-load', () => {
        if (fired) return;
        fired = true;
        try {
          const s = scriptFor(cfg);
          if (s) wvRef.executeJavaScript?.(s, true);
        } catch {}
      });

      hostRef.current.appendChild(wv);
    }, mountDelay);

    return () => {
      clearTimeout(timer);
      try { wv?.remove(); } catch {}
    };
  }, [cfg, mountDelay]);

  return (
    <div style={{
      ...panelBase,
      width: MINI_WIDTH,
      height: MINI_HEIGHT,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px',
        background: 'linear-gradient(180deg, rgba(30,30,32,0.85), rgba(16,16,20,0.9))',
        borderBottom: `1px solid ${cfg.accent}28`,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'var(--mono), monospace',
        fontSize: 9,
        letterSpacing: '0.22em',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#ff5f57' }} />
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#febc2e' }} />
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#28c840' }} />
        </div>
        <span style={{ display: 'inline-flex', color: cfg.accent, marginLeft: 2 }}>
          <cfg.Glyph size={11} />
        </span>
        <span style={{ flex: 1, color: 'rgba(255,255,255,0.62)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cfg.name}
        </span>
        <span style={{
          width: 4, height: 4, borderRadius: 999,
          background: cfg.accent, boxShadow: `0 0 4px ${cfg.accent}`,
        }} />
      </div>
      <div ref={hostRef} style={{
        flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a0a',
      }}>
        {!webviewMounted && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 6,
            background: `radial-gradient(ellipse at center, ${cfg.accent}14 0%, #0a0a0a 70%)`,
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'var(--mono), monospace',
            fontSize: 9,
            letterSpacing: '0.32em',
          }}>
            <span style={{ color: cfg.accent, opacity: 0.55, display: 'inline-flex' }}>
              <cfg.Glyph size={22} />
            </span>
            <span>LOADING</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pentagon orbit around the JARVIS spirit ───
// Each panel spawns at the orb (x:0, y:0) and springs outward to its
// vertex. Looks like particles emanating from the spirit core.
function vertexPosition(vertex: number): { x: number; y: number } {
  const rad = (vertex * Math.PI) / 180;
  return {
    x: Math.sin(rad) * Rx,
    y: -Math.cos(rad) * Ry,
  };
}

export function MiniLLMPanels() {
  // Panels only mount when the orchestrator in BootSequence reveals
  // their key. The string delivery arrives in sync — JARVIS tethers
  // the panel and places it at its hexagon vertex.
  //
  // Each panel records the order it was first revealed in (via Set
  // size at mount time), and uses that to stagger its webview spawn.
  // All 6 Chromium processes DO run — just sequentially, one every
  // ~1.6 seconds, so they don't all fire off at once mid-briefing.
  const revealed = useJarvis((s) => s.revealedPanels);
  const orderMapRef = useRef<Map<string, number>>(new Map());

  PANELS.forEach((cfg) => {
    if (revealed.has(cfg.kind) && !orderMapRef.current.has(cfg.kind)) {
      orderMapRef.current.set(cfg.kind, orderMapRef.current.size);
    }
  });

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 40,
    }}>
      {PANELS.map((cfg) => {
        if (!revealed.has(cfg.kind)) return null;
        const pos = vertexPosition(cfg.vertex);
        const orderIdx = orderMapRef.current.get(cfg.kind) ?? 0;
        // First webview spawns 400ms after reveal; each subsequent one
        // spaces 1600ms further. Prevents 6 simultaneous Chromium
        // process spawns from hitching the briefing frame budget.
        const staggeredMountDelay = 400 + orderIdx * 1600;

        return (
          <motion.div
            key={cfg.kind}
            // Start at the orb (x:0, y:0) at tiny scale — the panel
            // is carried down the string and snaps into its vertex.
            initial={{ opacity: 0, scale: 0.25, x: 0, y: 0 }}
            animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
            transition={{
              opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
              scale:   { type: 'spring', stiffness: 170, damping: 20, mass: 0.75 },
              x:       { type: 'spring', stiffness: 140, damping: 20, mass: 0.85 },
              y:       { type: 'spring', stiffness: 140, damping: 20, mass: 0.85 },
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginTop: -MINI_HEIGHT / 2,
              marginLeft: -MINI_WIDTH / 2,
              pointerEvents: 'auto',
              willChange: 'transform, opacity',
            }}
          >
            <LLMPage cfg={cfg} mountDelay={staggeredMountDelay} />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                delay: 0.25, duration: 0.85,
                times: [0, 0.22, 1], ease: 'easeOut',
              }}
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                borderRadius: 8,
                boxShadow: `0 0 0 1px ${cfg.accent}bb, 0 0 22px ${cfg.accent}88`,
                willChange: 'opacity',
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
