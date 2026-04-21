import { useEffect, useRef, useState } from 'react';

/**
 * Screen recorder — press T to toggle.
 *
 * Zero-lag path:
 *   - desktopCapturer on main → chromeMediaSourceId to getUserMedia (no picker)
 *   - MediaRecorder VP9 @ 10 Mbps — encodes on the GPU via Windows Media Foundation
 *   - Data chunks collected every 500ms (minimal memory pressure)
 *   - Saved via IPC to ~/Videos/JARVIS/jarvis-<timestamp>.webm
 *
 * Recording does NOT impact the app's frame rate — capture is hardware-driven
 * and the encoder runs on a separate thread.
 */
export function ScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const recordingRef = useRef(false);  // avoid stale closure in key handler

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.key !== 't' && e.key !== 'T') return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      if (recordingRef.current) stop();
      else await start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [isRecording]);

  async function start() {
    try {
      const src = await (window as any).jarvis?.getScreenSource?.();
      if (!src) { console.warn('[rec] no screen source'); return; }

      // Native resolution capture — physical pixels, not CSS pixels.
      const dpr = window.devicePixelRatio || 1;
      const nativeW = Math.round(window.screen.width * dpr);
      const nativeH = Math.round(window.screen.height * dpr);

      // Request SYSTEM AUDIO + full-resolution video from the same source.
      // On Windows, chromeMediaSource: 'desktop' captures what's playing.
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: src.id,
          },
        } as any,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: src.id,
            minWidth: nativeW, minHeight: nativeH,
            maxWidth: nativeW, maxHeight: nativeH,
            maxFrameRate: 60,
          },
        } as any,
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Pick the best codec combo available. VP9 + Opus = ~25% smaller than VP8
      // at the same visual/audio quality.
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      // 25 Mbps video is enough for 1080p60 to look pixel-clean; 4K bumps to 40.
      const videoBits = nativeH >= 2000 ? 40_000_000 : 25_000_000;

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: videoBits,
        audioBitsPerSecond: 192_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const buf = await blob.arrayBuffer();
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `jarvis-${stamp}.webm`;
        const res = await (window as any).jarvis?.saveRecording?.(buf, filename);
        if (res?.ok) {
          console.log('[rec] saved:', res.path);
          setSavedToast(filename);
          setTimeout(() => setSavedToast(null), 3500);
        } else {
          console.warn('[rec] save failed:', res?.error);
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start(500);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      recordingRef.current = true;
      setIsRecording(true);
    } catch (err) {
      console.warn('[rec] start failed:', err);
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    recordingRef.current = false;
    setIsRecording(false);
  }

  // Confirmation toast — shows briefly after a recording saves to Desktop
  if (!isRecording && savedToast) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 9999,
          padding: '7px 16px',
          background: 'rgba(0,16,8,0.88)',
          border: '1px solid #7fff9b',
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: 'var(--mono), monospace',
          fontSize: 11,
          color: '#fff',
          letterSpacing: '0.22em',
          boxShadow: '0 0 24px rgba(127,255,155,0.35)',
          pointerEvents: 'none',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span style={{ color: '#7fff9b' }}>✓</span>
        <span>SAVED TO DESKTOP</span>
        <span style={{ opacity: 0.55 }}>· {savedToast}</span>
      </div>
    );
  }

  if (!isRecording) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 9999,
        padding: '7px 16px',
        background: 'rgba(20,0,0,0.88)',
        border: '1px solid #ff3b4f',
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'var(--mono), monospace',
        fontSize: 11,
        color: '#fff',
        letterSpacing: '0.22em',
        boxShadow: '0 0 24px rgba(255,59,79,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        pointerEvents: 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: '#ff3b4f',
          boxShadow: '0 0 12px #ff3b4f',
          animation: 'recDot 1.1s ease-in-out infinite',
        }}
      />
      <span>REC · {mm}:{ss}</span>
      <span style={{ opacity: 0.55 }}>· T TO STOP</span>
      <style>{`@keyframes recDot { 0%,100% { opacity: 1 } 50% { opacity: 0.28 } }`}</style>
    </div>
  );
}
