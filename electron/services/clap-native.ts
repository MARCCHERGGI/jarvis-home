import { BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'node:child_process';

// ffmpeg path: env override → assume on PATH. Catch handles missing binary.
const FFMPEG = process.env.JARVIS_FFMPEG || 'ffmpeg';
// Mic device: env override → blank string lets ffmpeg pick the default input.
const MIC_DEVICE = process.env.JARVIS_MIC_DEVICE || 'Microphone Array (Realtek(R) Audio)';

let proc: ChildProcess | null = null;

export function startNativeClap(win: BrowserWindow) {
  try {
    proc = spawn(FFMPEG, [
      '-f', 'dshow',
      '-i', `audio=${MIC_DEVICE}`,
      '-ac', '1',
      '-ar', '16000',
      '-f', 's16le',
      '-',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let lastClap = 0;
    let prevPeak = 0;
    let ambient = 0.02;
    // DROPPED thresholds significantly for sensitivity
    const THRESHOLD = 0.08;   // was 0.18
    const RISE_MIN = 0.03;    // was 0.06
    const AMBIENT_MULT = 1.8; // was 2.5
    const REFRACTORY = 1000;

    let chunkCount = 0;
    let maxSeen = 0;

    proc.stdout?.on('data', (chunk: Buffer) => {
      try {
        chunkCount++;
        let peak = 0;
        for (let i = 0; i < chunk.length - 1; i += 2) {
          const sample = chunk.readInt16LE(i);
          const norm = Math.abs(sample) / 32768;
          if (norm > peak) peak = norm;
        }

        if (peak > maxSeen) maxSeen = peak;

        // Log every ~3s so we can see mic activity
        if (chunkCount % 30 === 0) {
          console.log(`[clap] alive · peak=${peak.toFixed(3)} ambient=${ambient.toFixed(3)} maxEverSeen=${maxSeen.toFixed(3)}`);
        }

        // Log any peak over 0.05 (noise or clap candidate)
        if (peak > 0.05) {
          console.log(`[clap] SPIKE peak=${peak.toFixed(3)} rise=${(peak - prevPeak).toFixed(3)} ambient=${ambient.toFixed(3)}`);
        }

        ambient += (Math.min(peak, 0.06) - ambient) * 0.005;
        const rise = peak - prevPeak;
        prevPeak = peak * 0.6 + prevPeak * 0.4;

        const now = Date.now();
        if (peak > THRESHOLD && rise > RISE_MIN && peak > ambient * AMBIENT_MULT && now - lastClap > REFRACTORY) {
          console.log(`[clap] ████ TRIGGERED ████ peak=${peak.toFixed(3)} rise=${rise.toFixed(3)}`);
          lastClap = now;
          try { win.webContents.send('clap-detected'); } catch {}
        }
      } catch {}
    });

    proc.stderr?.on('data', () => {});
    proc.on('error', (err) => console.warn('[clap] ffmpeg error:', err.message));
    proc.on('close', (code) => console.log('[clap] ffmpeg exited with code', code));

    console.log('[clap] Mic started via ffmpeg — threshold:', THRESHOLD, 'rise:', RISE_MIN);
  } catch (err) {
    console.warn('[clap] Failed:', (err as Error).message);
  }
}

export function stopNativeClap() {
  try { proc?.kill(); } catch {}
  proc = null;
}
