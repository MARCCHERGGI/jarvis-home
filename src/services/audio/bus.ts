// Shared AudioContext for the whole app. Everything — TTS, ambient, SFX —
// runs on one graph so levels can be mixed cleanly.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function audioBus() {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = 1.0;
    master.connect(ctx.destination);
  }
  return { ctx: ctx!, master: master! };
}

/** Resume — browsers suspend contexts until a user gesture. Call after clap/space. */
export async function unlockAudio() {
  const { ctx } = audioBus();
  if (ctx.state === 'suspended') await ctx.resume();
}
