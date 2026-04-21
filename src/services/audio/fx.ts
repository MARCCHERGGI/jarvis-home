// Voice FX chain v2 — transparent & human.
//
// Previous chain over-processed the voice: heavy presence + reverb made it
// sound like a voiceover, not a person in the room. New chain:
//   input → gentle highpass → soft presence tilt → light compressor
//         → 90% dry + 8% tiny-room reverb + subtle tape saturation → output
//
// Total effect: sits in the room with you, still cinematic, stops sounding processed.

import { audioBus } from './bus';

export type VoiceChain = {
  input: AudioNode;
  output: AudioNode;
  dispose: () => void;
};

export function createVoiceChain(): VoiceChain {
  const { ctx, master } = audioBus();

  // 1. Gentle highpass — remove sub-rumble only
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 75;
  hp.Q.value = 0.5;

  // 2. Presence — +3 dB at 2.8 kHz for vocal clarity (multilingual_v2 needs slight lift)
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2800;
  presence.Q.value = 0.7;
  presence.gain.value = 3.0;

  // 3. Air shelf — +1.5 dB opens up the top, adds "premium headphone" quality
  const air = ctx.createBiquadFilter();
  air.type = 'highshelf';
  air.frequency.value = 10000;
  air.gain.value = 1.5;

  // 4. Light compressor — catches peaks only
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 14;
  comp.ratio.value = 2;
  comp.attack.value = 0.006;
  comp.release.value = 0.14;

  // 5. Subtle tape saturation via WaveShaper — adds warmth, not distortion
  const sat = ctx.createWaveShaper();
  sat.curve = makeSaturationCurve(1.5);
  sat.oversample = '4x';

  // 6. Dry/wet mix — 98% dry, 2% tight room for a hint of space
  const dry = ctx.createGain();
  dry.gain.value = 0.98;

  const wet = ctx.createGain();
  wet.gain.value = 0.02;

  const conv = ctx.createConvolver();
  conv.buffer = makeReverbIR(ctx, 0.4, 4.0);  // very short, very fast decay

  // 7. Output — slight lift so voice sits forward
  const out = ctx.createGain();
  out.gain.value = 1.08;

  // Wire: input → hp → presence → air → comp → sat → (dry + reverb) → out → master
  hp.connect(presence);
  presence.connect(air);
  air.connect(comp);
  comp.connect(sat);
  sat.connect(dry);
  sat.connect(conv);
  conv.connect(wet);
  dry.connect(out);
  wet.connect(out);
  out.connect(master);

  return {
    input: hp,
    output: out,
    dispose: () => {
      [hp, presence, air, comp, sat, dry, wet, conv, out].forEach((n) => {
        try { n.disconnect(); } catch {}
      });
    },
  };
}

/** Cubic soft-clip — warms the voice without audible distortion. */
function makeSaturationCurve(amount: number): Float32Array {
  const n = 8192;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

function makeReverbIR(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const ir = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return ir;
}
