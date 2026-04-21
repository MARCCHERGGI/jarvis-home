import { useEffect } from 'react';
import { useJarvis } from '@/state/store';
import { voice } from '@/services/tts';

/**
 * Global keyboard + NATIVE clap wiring.
 *   CLAP (via SoX in main process) → wake sequence
 *   SPACE → wake sequence
 *   R     → reset back to Earth
 *   ESC   → quit
 */
export function useClap(onTrigger: () => void) {
  useEffect(() => {
    // Native clap detection from Electron main process (SoX → IPC)
    const stopNativeClap = window.jarvis?.onClap?.(() => {
      console.log('[useClap] Native clap received from main process!');
      onTrigger();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onTrigger();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        voice.stop();
        useJarvis.getState().reset();
        return;
      }
      if (e.key === 'Escape') window.jarvis?.quit();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      stopNativeClap?.();
      window.removeEventListener('keydown', onKey);
    };
  }, [onTrigger]);
}
