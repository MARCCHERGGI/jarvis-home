// Browser SpeechRecognition wrapper — transcribes speech live.
// Electron/Chromium ships with webkitSpeechRecognition which works great.

type Listener = (text: string, isFinal: boolean) => void;

export class SpeechInput {
  private rec: any = null;
  private listeners: Listener[] = [];
  private running = false;
  private endHandlers: Array<() => void> = [];

  constructor() {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      console.warn('[speech] SpeechRecognition not available');
      return;
    }
    this.rec = new SR();
    this.rec.continuous = false;
    this.rec.interimResults = true;
    this.rec.lang = 'en-US';
    this.rec.maxAlternatives = 1;

    this.rec.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript.trim();
      this.listeners.forEach(fn => fn(text, last.isFinal));
    };
    this.rec.onerror = (e: any) => {
      console.warn('[speech] error:', e.error);
      this.running = false;
    };
    this.rec.onend = () => {
      this.running = false;
      const handlers = [...this.endHandlers];
      handlers.forEach((fn) => { try { fn(); } catch {} });
    };
  }

  available() { return !!this.rec; }

  /** Toggle continuous mode for long-form capture (e.g. morning ritual). */
  setContinuous(v: boolean) { if (this.rec) this.rec.continuous = v; }

  start() {
    if (!this.rec || this.running) return;
    try {
      this.rec.start();
      this.running = true;
    } catch (err) {
      console.warn('[speech] start failed:', err);
    }
  }

  stop() {
    if (!this.rec || !this.running) return;
    try { this.rec.stop(); } catch {}
  }

  onResult(fn: Listener) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(x => x !== fn); };
  }

  onEnd(fn: () => void) {
    this.endHandlers.push(fn);
    return () => { this.endHandlers = this.endHandlers.filter(x => x !== fn); };
  }
}

export const speech = new SpeechInput();

export type CaptureOpts = {
  /** Hard ceiling in ms before we force-resolve. */
  maxMs?: number;
  /** Silence after last speech before we call it done. Tuned for teeth-brushing rhythm. */
  silenceMs?: number;
  /** Minimum listen time even if no speech — avoids closing too eagerly. */
  minMs?: number;
  /** Live transcript callback for UI streaming. */
  onInterim?: (partial: string) => void;
};

/**
 * Hands-free capture tuned for the morning ritual.
 *
 * Smoother than the old one-shot:
 *   - continuous=true so a brushing pause doesn't kill the recognizer
 *   - finalizes after silenceMs of no new speech (natural beat)
 *   - auto-restarts if webkit ends us early (it sometimes fires onend
 *     when audio drops below threshold briefly)
 *   - respects minMs so we don't close before Marco even starts
 */
export async function captureOnce(opts: CaptureOpts | number = {}): Promise<string> {
  // Back-compat: captureOnce(12000) still works
  const o: CaptureOpts = typeof opts === 'number' ? { maxMs: opts } : opts;
  const maxMs     = o.maxMs     ?? 18000;
  const silenceMs = o.silenceMs ?? 1600;
  const minMs     = o.minMs     ?? 1800;

  if (!speech.available()) return '';

  return new Promise<string>((resolve) => {
    let best = '';
    let lastHeardAt = 0;
    let startedAt = Date.now();
    let resolved = false;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    const wasContinuous = (speech as any).rec?.continuous ?? false;
    speech.setContinuous(true);

    const finish = (text: string) => {
      if (resolved) return;
      resolved = true;
      if (silenceTimer) clearTimeout(silenceTimer);
      unsubResult();
      unsubEnd();
      try { speech.stop(); } catch {}
      clearTimeout(hardTimer);
      speech.setContinuous(wasContinuous);
      resolve(text.trim());
    };

    const scheduleSilenceCheck = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        const enoughTime = Date.now() - startedAt >= minMs;
        if (enoughTime && best) finish(best);
      }, silenceMs);
    };

    const unsubResult = speech.onResult((text, isFinal) => {
      if (text && text.length >= best.length) best = text;
      lastHeardAt = Date.now();
      o.onInterim?.(text);
      if (isFinal) {
        // Wait a beat — Marco might keep going
        scheduleSilenceCheck();
      } else {
        scheduleSilenceCheck();
      }
    });

    // If Chrome closes recognition early (happens on brief silence), restart it.
    const unsubEnd = speech.onEnd(() => {
      if (resolved) return;
      const elapsed = Date.now() - startedAt;
      if (elapsed < maxMs) {
        // Nudge it back on
        setTimeout(() => {
          if (!resolved) {
            try { speech.start(); } catch {}
          }
        }, 120);
      }
    });

    const hardTimer = setTimeout(() => finish(best), maxMs);

    try {
      speech.start();
    } catch {
      finish('');
    }
  });
}

/** True if the answer is clearly a skip/pass — handled gracefully by the ritual. */
export function isSkipAnswer(s: string): boolean {
  const t = (s || '').toLowerCase().trim();
  if (!t) return true;
  if (t.length < 3) return true;
  return /^(skip|pass|next|dunno|don'?t know|no idea|nothing|nope|no|n\/a|idk)\.?$/.test(t);
}
