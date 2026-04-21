// Custom background music loader.
//
// If a track exists at the configured URL (default: /audio/workshop.mp3),
// play it through the audio graph with master gain + lowpass filter for
// "sits underneath the voice" ducking. Returns a controller with stop/duck.
//
// Falls back silently (returns null) if the file is missing — the wake
// sequence should then use the procedural ambient bed instead.

import { audioBus } from './bus';

export type MusicController = {
  stop: (fadeMs?: number) => void;
  duck: (level: number, durMs?: number) => void;
};

/** Returns null if the track couldn't be loaded. */
export async function playMusic(url: string, level: number): Promise<MusicController | null> {
  const { ctx, master } = audioBus();

  // HEAD-check the file — avoid building audio graph for 404s
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return null;
  } catch {
    return null;
  }

  try {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.loop = false;

    // Wait until enough is buffered to start
    await new Promise<void>((resolve, reject) => {
      const onReady = () => { audio.removeEventListener('canplay', onReady); resolve(); };
      const onErr = () => { audio.removeEventListener('error', onErr); reject(new Error('music load error')); };
      audio.addEventListener('canplay', onReady);
      audio.addEventListener('error', onErr);
    });

    const src = ctx.createMediaElementSource(audio);

    // Master gain with fade-in
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(level, ctx.currentTime + 1.2);

    // Subtle lowpass so music sits under the voice
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6000;
    lp.Q.value = 0.5;

    src.connect(lp).connect(gain).connect(master);

    await audio.play();

    return {
      stop: (fadeMs = 1500) => {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0.0001, t + fadeMs / 1000);
        setTimeout(() => {
          try { audio.pause(); audio.src = ''; } catch {}
        }, fadeMs + 80);
      },
      duck: (newLevel, durMs = 600) => {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(newLevel, t + durMs / 1000);
      },
    };
  } catch (err) {
    console.warn('[music] load failed', err);
    return null;
  }
}
