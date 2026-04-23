import { AnimatePresence, motion } from 'framer-motion';
import { SleepScene } from '@/scenes/SleepScene';
import { ManhattanMap } from '@/components/Map/ManhattanMap';
import { HUDFrame } from '@/components/HUD/HUDFrame';
import { BootSequence } from '@/components/Boot/BootSequence';
import { CinematicOverlay } from '@/components/CinematicOverlay/CinematicOverlay';
import { PersistentOrb } from '@/components/ParticleOrb/PersistentOrb';
import { VoiceCommandUI } from '@/components/VoiceCommand/VoiceCommandUI';
import { ScreenRecorder } from '@/components/ScreenRecorder/ScreenRecorder';
import { GlobalHUD } from '@/components/Overlay/GlobalHUD';
import { WeatherWidget } from '@/components/Overlay/WeatherWidget';
import { IdleMode } from '@/components/Overlay/IdleMode';
import { VolumeControl } from '@/components/Overlay/VolumeControl';
import { NewsTicker } from '@/components/Overlay/NewsTicker';
import { FocusMode } from '@/components/Overlay/FocusMode';
import { ShortcutHelp } from '@/components/Overlay/ShortcutHelp';
import { useWakeSequence } from '@/hooks/useWakeSequence';
import { useClap } from '@/hooks/useClap';
import { useJarvis } from '@/state/store';
import { CONFIG } from '@/config';

import { useEffect } from 'react';
import { voice } from '@/services/tts';
import { CINEMATIC_SCRIPT } from '@/services/briefing/mock-data';
import { primeMusic } from '@/services/audio/music';

export default function App() {
  const phase = useJarvis((s) => s.phase);
  const wake = useWakeSequence();
  useClap(wake);

  // Pre-render the voice on mount so SPACE triggers instant playback.
  // Eliminates the 0.8-2s ElevenLabs fetch lag the first time.
  useEffect(() => {
    voice.precache([CINEMATIC_SCRIPT], 'jarvis').catch(() => {});
    // Pre-warm the 7.6 MB Back in Black MP3 so it's already decoded by
    // the time Marco claps — music starts with zero lag, iconic opening
    // riff lands right as the Earth dive begins.
    primeMusic(CONFIG.musicTrack);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <SleepScene />
      <ManhattanMap />
      <HUDFrame />
      <PersistentOrb />
      <BootSequence />
      <CinematicOverlay />
      <VoiceCommandUI />
      <ScreenRecorder />
      <GlobalHUD />
      <WeatherWidget />
      <VolumeControl />
      <NewsTicker />
      <FocusMode />
      <ShortcutHelp />
      <IdleMode />

      <AnimatePresence>
        {phase === 'sleep' && (
          <motion.div
            key="idle-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{
              position: 'absolute', bottom: 90, left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 11, letterSpacing: '0.35em',
              fontFamily: 'ui-monospace, monospace',
              color: '#6cf4ff',
              textAlign: 'center',
            }}
          >
            {CONFIG.testMode ? 'CLAP · SPACE · V TALK · R RESET · F FOCUS · ? HELP' : 'CLAP TO WAKE'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
