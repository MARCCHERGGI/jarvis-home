// UI SFX — procedural. Iron Man workshop palette: whooshes, sonar pings, impacts.

import { audioBus } from './bus';

export function whoosh({ level = 0.4, duration = 0.9 } = {}) {
  const { ctx, master } = audioBus();
  const now = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(300, now);
  bp.frequency.exponentialRampToValueAtTime(4500, now + duration * 0.7);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(level, now + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(bp).connect(g).connect(master);
  src.start();
  src.stop(now + duration);
}

/** Sonar-ping — clean two-tone. Used for panel reveal. */
export function chime({ level = 0.22 } = {}) {
  const { ctx, master } = audioBus();
  const now = ctx.currentTime;
  const notes = [880, 1320];
  notes.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now + i * 0.04);
    g.gain.linearRampToValueAtTime(level, now + 0.01 + i * 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4 + i * 0.04);
    osc.connect(g).connect(master);
    osc.start(now + i * 0.04);
    osc.stop(now + 1.5 + i * 0.04);
  });
}

/** Cinematic impact — sub punch + noise tail. Iron Man stinger. */
export function impact({ level = 0.5 } = {}) {
  const { ctx, master } = audioBus();
  const now = ctx.currentTime;

  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(90, now);
  sub.frequency.exponentialRampToValueAtTime(35, now + 0.5);
  const subG = ctx.createGain();
  subG.gain.setValueAtTime(level, now);
  subG.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  sub.connect(subG).connect(master);
  sub.start(now);
  sub.stop(now + 0.7);

  const tailDur = 1.2;
  const buf = ctx.createBuffer(1, ctx.sampleRate * tailDur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500;
  const tailG = ctx.createGain();
  tailG.gain.value = level * 0.35;
  src.connect(hp).connect(tailG).connect(master);
  src.start(now);
}

/** Riser — builds tension before the impact. Use ~1.5s before big reveal. */
export function riser({ level = 0.35, duration = 2.2 } = {}) {
  const { ctx, master } = audioBus();
  const now = ctx.currentTime;

  // Pitched noise sweep
  const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 8;
  bp.frequency.setValueAtTime(200, now);
  bp.frequency.exponentialRampToValueAtTime(5000, now + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(level, now + duration * 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(bp).connect(g).connect(master);
  src.start(now);
  src.stop(now + duration);

  // Overtone sine sweep for musicality
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + duration);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0, now);
  og.gain.linearRampToValueAtTime(level * 0.5, now + duration * 0.9);
  og.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(og).connect(master);
  osc.start(now);
  osc.stop(now + duration);
}
