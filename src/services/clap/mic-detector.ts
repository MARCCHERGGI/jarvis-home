// Clap detector v3 — uses a click/keypress to unlock AudioContext first,
// then monitors mic for sharp impulses.
//
// Key fix: AudioContext stays suspended until a user gesture in Chromium/Electron.
// We create a "pending" state that activates on first keypress/click, THEN
// starts actually reading mic data.

export type ClapOptions = {
  threshold?: number;
  refractoryMs?: number;
  onClap: () => void;
};

export async function startClapDetector(opts: ClapOptions): Promise<() => void> {
  const threshold = opts.threshold ?? 0.18;
  const refractoryMs = opts.refractoryMs ?? 1200;

  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let raf = 0;
  let started = false;
  let destroyed = false;

  // Try to get mic stream immediately
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    console.log('[clap] Mic stream acquired ✓');
  } catch {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[clap] Mic stream acquired (default) ✓');
    } catch (err) {
      console.warn('[clap] Mic fully denied:', err);
      return () => {};
    }
  }

  const startListening = async () => {
    if (started || destroyed || !stream) return;
    started = true;

    ctx = new AudioContext();
    // Resume — should work now because we're inside a user gesture handler
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }
    console.log('[clap] AudioContext state:', ctx.state);

    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    src.connect(analyser);

    const buf = new Uint8Array(analyser.fftSize);
    let lastClap = 0;
    let prevPeak = 0;
    let ambient = 0.02;
    let frameCount = 0;

    const tick = () => {
      if (destroyed) return;
      analyser.getByteTimeDomainData(buf);

      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = Math.abs(buf[i] - 128) / 128;
        if (v > peak) peak = v;
      }

      ambient += (Math.min(peak, 0.08) - ambient) * 0.005;
      const rise = peak - prevPeak;
      prevPeak = peak * 0.6 + prevPeak * 0.4;

      const now = performance.now();
      frameCount++;

      // Log mic levels periodically so we can verify it's working
      if (frameCount % 300 === 0) {
        console.log(`[clap] mic alive · peak=${peak.toFixed(3)} ambient=${ambient.toFixed(3)} ctx=${ctx?.state}`);
      }

      // Clap = peak above threshold AND sharp rise AND above ambient
      if (peak > threshold && rise > 0.06 && peak > ambient * 2.5 && now - lastClap > refractoryMs) {
        console.log(`[clap] ████ TRIGGERED ████ peak=${peak.toFixed(3)} rise=${rise.toFixed(3)}`);
        lastClap = now;
        opts.onClap();
      }

      raf = requestAnimationFrame(tick);
    };
    tick();
    console.log('[clap] Listening for claps ✓');
  };

  // Try to start immediately (works if AudioContext auto-resumes)
  await startListening();

  // Safety net: if AudioContext is still suspended, listen for user gesture to unlock
  if (ctx && ctx.state === 'suspended') {
    console.log('[clap] AudioContext suspended — waiting for user gesture to unlock');
    const unlock = async () => {
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
        console.log('[clap] AudioContext unlocked via user gesture:', ctx.state);
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  return () => {
    destroyed = true;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach(t => t.stop());
    ctx?.close();
  };
}
