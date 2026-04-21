// Shared module-level refs for audio amplitude and voice activity.
//
// Audio pipeline writes to these DIRECTLY at audio-callback rate (~60Hz or higher).
// UI consumers (ParticleOrb, HUD VU) read every render frame. Zero state-machine
// round-trip, zero React re-renders — pure ref-level coupling.

export const ampBus = {
  amp: 0,
  ampRaw: 0,
  active: false,
  lastWrite: 0,
  /** 8 frequency bands (0=bass → 7=highs), each 0..1 */
  bands: new Float32Array(8),
};

/** Called by the audio pipeline each frame during playback. */
export function publishAmp(amp: number) {
  ampBus.ampRaw = amp;
  // Exponential smoothing (fast attack, slightly slower release)
  if (amp > ampBus.amp) ampBus.amp += (amp - ampBus.amp) * 0.45;
  else                  ampBus.amp += (amp - ampBus.amp) * 0.18;
  ampBus.lastWrite = performance.now();
}

export function setActive(on: boolean) {
  ampBus.active = on;
  if (!on) {
    ampBus.amp = 0;
    ampBus.ampRaw = 0;
  }
}
