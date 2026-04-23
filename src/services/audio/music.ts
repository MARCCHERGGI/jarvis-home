// Background music loader — reverted to the original working architecture.
// Plays an MP3 through AudioContext with master gain for smooth ducking.
// Returns null if the file can't be loaded (wake uses procedural bed).

import { audioBus } from './bus';

export type MusicController = {
  stop: (fadeMs?: number) => void;
  duck: (level: number, durMs?: number) => void;
};

// No-op kept for call-site compatibility. The original working flow
// didn't need pre-warming; the fetch happens inside playMusic().
export function primeMusic(_url: string): void {}

export async function playMusic(url: string, level: number): Promise<MusicController | null> {
  const { ctx, master } = audioBus();

  try {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.loop = false;

    await new Promise<void>((resolve, reject) => {
      const onReady = () => { audio.removeEventListener('canplay', onReady); resolve(); };
      const onErr   = () => { audio.removeEventListener('error', onErr); reject(new Error('music load error')); };
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
