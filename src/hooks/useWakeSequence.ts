import { useCallback } from 'react';
import { useJarvis } from '@/state/store';
import { voice } from '@/services/tts';
import { buildSegments, type BriefingContext, type PanelKey } from '@/services/briefing/mock-data';
import { playAmbientBed } from '@/services/audio/ambient';
import { playMusic, type MusicController } from '@/services/audio/music';
import { whoosh, chime, impact, riser } from '@/services/audio/sfx';
import { unlockAudio } from '@/services/audio/bus';
import { CONFIG } from '@/config';

// Live data fetch — timeboxed so the wake never stalls on a slow API.
async function fetchBriefingContext(timeoutMs = 800): Promise<BriefingContext> {
  const race = <T,>(p: Promise<T>): Promise<T | null> =>
    Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))]);

  const [stripe, crypto, weather] = await Promise.all([
    race(window.jarvis?.getStripe?.() ?? Promise.resolve(null)),
    race(window.jarvis?.getCrypto?.() ?? Promise.resolve(null)),
    race(window.jarvis?.getWeather?.() ?? Promise.resolve(null)),
  ]);

  return {
    stripeTodayUsd: stripe && !stripe.error ? Math.round(stripe.todayCents / 100) : undefined,
    stripeWeekUsd:  stripe && !stripe.error ? Math.round(stripe.weekCents / 100)  : undefined,
    stripeTxnCount: stripe && !stripe.error ? stripe.todayCount : undefined,
    btcPrice:    crypto?.btc?.price,
    btcChange:   crypto?.btc?.change,
    ethPrice:    crypto?.eth?.price,
    weatherTemp: weather && !weather.error ? weather.temp : undefined,
    weatherCond: weather && !weather.error ? weather.cond : undefined,
  };
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 10-second total wake: clap → briefing done.
 *
 * Timing budget (ms):
 *   0      clap / space
 *   0–700  waking (space → Earth)
 *   700–1600  descending (Earth → NYC)
 *   1600–1900  briefing stance + chime
 *   1900–~9500  single TTS render speaks (~7.5s of audio)
 *   ~9500  music ducks, phase flips to ready
 */
export function useWakeSequence() {
  const setPhase = useJarvis((s) => s.setPhase);
  const setVoiceAmp = useJarvis((s) => s.setVoiceAmp);
  const setVoiceActive = useJarvis((s) => s.setVoiceActive);
  const revealPanel = useJarvis((s) => s.revealPanel);

  return useCallback(async () => {
    const phase = useJarvis.getState().phase;
    if (phase !== 'sleep') return;

    await unlockAudio();

    // Fetch live data (short timeout — we move even if it's slow).
    const ctx = await fetchBriefingContext(800);
    const segments = buildSegments(ctx);
    const script = segments[0]?.text ?? '';

    // Pre-render the single briefing clip — no cascading renders.
    const precachePromise = voice.precache([script], 'jarvis').catch(() => {});

    // Audio bed — local MP3 (AC/DC Shoot to Thrill on disk). No YouTube,
    // no embed block. MusicPanel is purely visual; this plays the actual audio.
    let musicCtl: MusicController | null = null;
    let proceduralBed: ReturnType<typeof playAmbientBed> | null = null;
    playMusic(CONFIG.musicTrack, CONFIG.musicLevel).then((ctl) => {
      if (ctl) musicCtl = ctl;
      else proceduralBed = playAmbientBed({ level: 0.18 });
    });

    // Phase 1: space → Earth
    whoosh({ level: 0.35, duration: 0.55 });
    setPhase('waking');
    await delay(500);

    // Phase 2: dive to NYC
    whoosh({ level: 0.28, duration: 0.7 });
    riser({ level: 0.15, duration: 0.9 });
    setPhase('descending');
    await delay(700);

    // Phase 3: briefing begins. Music is already playing from disk —
    // duck it so JARVIS cuts through cleanly.
    chime({ level: 0.18 });
    musicCtl?.duck(CONFIG.musicLevel * 0.42, 400);
    proceduralBed?.swell(0.18, 300);
    setPhase('briefing');
    setVoiceActive(true);

    // Panel reveals fire in sync with when JARVIS speaks the topic.
    // Timings are calibrated against Alice's natural cadence on the
    // current CINEMATIC_SCRIPT — each beat lands right as she says it.
    // Four beats, MUSIC first. Each fires right as JARVIS speaks the topic.
    //  music    · opens BEFORE speech so AC/DC plays under the narration
    //  trading  · "Global markets showing increased volatility…"
    //  bitcoin  · "Bitcoin is currently holding trend…"
    //  social   · "You gained three hundred fifty-six new followers…"
    const panelKeys: PanelKey[] = ['music', 'trading', 'bitcoin', 'social'];
    const panelOffsets = [100, 3700, 9000, 11500];
    const panelTimers = panelKeys.map((key, i) =>
      setTimeout(() => {
        revealPanel(key);
        chime({ level: 0.07 });
      }, panelOffsets[i]),
    );

    // Speak the whole briefing as a single pre-rendered clip.
    await precachePromise;
    await voice.speak(script, {
      voice: 'jarvis',
      onAmplitude: setVoiceAmp,
    });

    // Flush any still-pending panel reveals (in case speech finished early)
    panelTimers.forEach(clearTimeout);
    panelKeys.forEach((k) => revealPanel(k));

    // Done — final stinger. Music swells back to full after George finishes.
    impact({ level: 0.45 });
    musicCtl?.duck(CONFIG.musicLevel, 1800);  // unduck — restore to full
    proceduralBed?.swell(0.22, 1200);
    setPhase('ready');
    setVoiceActive(false);
    setVoiceAmp(0);
    // Music keeps playing — no auto-stop. Track is the whole morning vibe.
  }, [setPhase, setVoiceAmp, setVoiceActive, revealPanel]);
}
