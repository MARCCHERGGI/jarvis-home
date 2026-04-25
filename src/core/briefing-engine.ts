import { interpolate } from './parse-briefing';
import type { BriefingRunOptions, Phase } from './types';

/**
 * Runs a briefing script: for each beat, fire the phase + onBeat hooks,
 * speak the (interpolated) line through the voice adapter, then pause.
 *
 * Cancel via `options.signal` — adapters that respect AbortSignal will halt mid-beat.
 */
export async function runBriefing(options: BriefingRunOptions): Promise<void> {
  const { script, voice, data = {}, onPhase, onBeat, signal } = options;
  let lastPhase: Phase | null = null;

  for (const beat of script.beats) {
    if (signal?.aborted) return;

    if (beat.phase && beat.phase !== lastPhase) {
      lastPhase = beat.phase;
      onPhase?.(beat.phase, beat.id);
    }
    onBeat?.(beat);

    const text = interpolate(beat.text, data).trim();
    if (text.length > 0) {
      await voice.speak(text, { signal });
    }

    if (beat.pauseAfterMs && beat.pauseAfterMs > 0) {
      await sleep(beat.pauseAfterMs, signal);
    }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      resolve();
    }, { once: true });
  });
}
