// Procedural cinematic score — Iron Man workshop vibe.
//   - Sub-bass drone (80 Hz foundation)
//   - Evolving pad (detuned saws + slow filter sweep = "orchestral")
//   - Synth arpeggio (Djawadi-style driving pulse at 110 BPM)
//   - Metallic percussion ticks
//   - Building intensity that peaks around 10s in
//   - Graceful tail-out after voice ends
//
// Zero audio assets — all generated live on the Web Audio graph.

import { audioBus } from './bus';

type Bed = {
  stop: (fadeMs?: number) => void;
  setLevel: (v: number) => void;
  swell: (targetLevel: number, durationMs: number) => void;
};

const BPM = 110;

export function playAmbientBed({ level = 0.22 }: { level?: number } = {}): Bed {
  const { ctx, master } = audioBus();
  const now = ctx.currentTime;

  // Master bus
  const busGain = ctx.createGain();
  busGain.gain.setValueAtTime(0, now);
  busGain.gain.linearRampToValueAtTime(level, now + 1.4);
  busGain.connect(master);

  // Soft master filter — opens up as score builds
  const masterLP = ctx.createBiquadFilter();
  masterLP.type = 'lowpass';
  masterLP.frequency.value = 1200;
  masterLP.Q.value = 0.5;
  masterLP.frequency.linearRampToValueAtTime(4500, now + 10);
  masterLP.connect(busGain);

  // 1. SUB DRONE — foundation weight
  const subOscs: OscillatorNode[] = [];
  const subGains: GainNode[] = [];
  [55, 82.5].forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f + (Math.random() - 0.5) * 0.2;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 0.5 : 0.3;
    osc.connect(g).connect(masterLP);
    osc.start();
    subOscs.push(osc);
    subGains.push(g);
  });

  // 2. PAD — detuned sawtooth stack, slow attack
  const padOscs: OscillatorNode[] = [];
  const padGain = ctx.createGain();
  padGain.gain.setValueAtTime(0, now);
  padGain.gain.linearRampToValueAtTime(0.15, now + 3.5);
  const padFilt = ctx.createBiquadFilter();
  padFilt.type = 'lowpass';
  padFilt.frequency.value = 800;
  padFilt.Q.value = 1.2;
  padFilt.frequency.linearRampToValueAtTime(2800, now + 10);
  padFilt.connect(padGain);
  padGain.connect(masterLP);

  // Stack: root + octave + fifth + third (A minor feel)
  [110, 165, 220, 261.6].forEach((f) => {
    for (let d = -1; d <= 1; d++) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = d * 7;
      const g = ctx.createGain();
      g.gain.value = 0.04;
      osc.connect(g).connect(padFilt);
      osc.start();
      padOscs.push(osc);
    }
  });

  // 3. ARPEGGIO — 16th-note driving pulse, kicks in at 2s
  const arpGain = ctx.createGain();
  arpGain.gain.setValueAtTime(0, now);
  arpGain.gain.linearRampToValueAtTime(0.18, now + 4);
  arpGain.connect(masterLP);

  const arpFilt = ctx.createBiquadFilter();
  arpFilt.type = 'bandpass';
  arpFilt.frequency.value = 1800;
  arpFilt.Q.value = 2.5;
  arpFilt.connect(arpGain);

  const noteSeq = [440, 523.25, 659.25, 523.25, 440, 523.25, 659.25, 783.99];
  const stepSec = 60 / BPM / 4;
  const arpStartTime = now + 2.0;
  const arpEndTime = now + 12.5;

  const scheduleArp = () => {
    let t = arpStartTime;
    let i = 0;
    while (t < arpEndTime) {
      const freq = noteSeq[i % noteSeq.length];
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const vel = 0.05 + (i % 4 === 0 ? 0.03 : 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + stepSec * 0.9);
      osc.connect(g).connect(arpFilt);
      osc.start(t);
      osc.stop(t + stepSec * 0.95);
      t += stepSec;
      i++;
    }
  };
  scheduleArp();

  // 4. METALLIC PERCUSSION — filtered noise hits on every beat
  const percGain = ctx.createGain();
  percGain.gain.value = 0.08;
  percGain.connect(masterLP);

  const schedulePerc = () => {
    const beatSec = 60 / BPM;
    const percStart = now + 3.0;
    const percEnd = now + 12.5;
    let t = percStart;
    let beat = 0;
    while (t < percEnd) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j++) {
        d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 2.5);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2000 + Math.sin(beat * 0.3) * 600;
      bp.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(beat % 2 === 0 ? 0.5 : 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      src.connect(bp).connect(g).connect(percGain);
      src.start(t);
      t += beatSec;
      beat++;
    }
  };
  schedulePerc();

  // 5. AIR SHIMMER — high noise bed
  const airBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const ad = airBuf.getChannelData(0);
  for (let i = 0; i < ad.length; i++) ad[i] = (Math.random() * 2 - 1) * 0.02;
  const air = ctx.createBufferSource();
  air.buffer = airBuf;
  air.loop = true;
  const airHp = ctx.createBiquadFilter();
  airHp.type = 'highpass';
  airHp.frequency.value = 5000;
  const airGain = ctx.createGain();
  airGain.gain.setValueAtTime(0, now);
  airGain.gain.linearRampToValueAtTime(0.4, now + 2);
  air.connect(airHp).connect(airGain).connect(busGain);
  air.start();

  return {
    stop: (fadeMs = 1500) => {
      const t = ctx.currentTime;
      busGain.gain.cancelScheduledValues(t);
      busGain.gain.setValueAtTime(busGain.gain.value, t);
      busGain.gain.linearRampToValueAtTime(0.0001, t + fadeMs / 1000);
      setTimeout(() => {
        subOscs.forEach((o) => { try { o.stop(); } catch {} });
        padOscs.forEach((o) => { try { o.stop(); } catch {} });
        try { air.stop(); } catch {}
      }, fadeMs + 60);
    },
    setLevel: (v) => {
      const t = ctx.currentTime;
      busGain.gain.cancelScheduledValues(t);
      busGain.gain.linearRampToValueAtTime(v, t + 0.3);
    },
    swell: (tgt, durMs) => {
      const t = ctx.currentTime;
      busGain.gain.cancelScheduledValues(t);
      busGain.gain.setValueAtTime(busGain.gain.value, t);
      busGain.gain.linearRampToValueAtTime(tgt, t + durMs / 1000);
    },
  };
}
