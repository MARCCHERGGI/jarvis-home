// Unified voice pipeline — frontier tier chain.
//
//   Tier 0: OpenAI gpt-4o-mini-tts (shimmer) — MOST human-sounding.
//           Activated if VITE_OPENAI_API_KEY is set.
//   Tier 1: ElevenLabs v3 + Jessica (or chosen voice) — hyper-natural.
//   Tier 2: Web Speech — free OS fallback.
//
// Everything flows through the same voice FX chain + amplitude analyser
// so HUD sync works regardless of provider.

import { ElevenLabsTTS, type RenderedClip } from './elevenlabs';
import { WebSpeechTTS } from './webspeech';
import { OpenAITTS, JARVIS_INSTRUCTIONS } from './openai';
import { VOICES } from './voices';
import { stripTags } from '../briefing/mock-data';
import { audioBus, unlockAudio } from '../audio/bus';
import { createVoiceChain, type VoiceChain } from '../audio/fx';
import { publishAmp, setActive, ampBus } from '../audio/ampBus';

export type JarvisSpeakOptions = {
  voice?: keyof typeof VOICES;
  onStart?: () => void;
  onEnd?: () => void;
  onAmplitude?: (amp: number) => void;
  /** Fires during playback with the live audio position + duration.
   *  Use to gate UI (panel reveals) on actual voice progress, not wall-clock. */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
};

type CacheEntry = { url: string; dispose: () => void };

class VoicePipeline {
  private eleven = new ElevenLabsTTS();
  private openai = new OpenAITTS();
  private webspeech = new WebSpeechTTS();
  private cache = new Map<string, CacheEntry>();
  private chain: VoiceChain | null = null;
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private rafId: number | null = null;
  private _backend: 'openai' | 'elevenlabs' | 'webspeech' | 'none' = 'none';

  get backend() {
    return this._backend;
  }

  /** Pre-render batch so playback is zero-latency once the user hears it. */
  async precache(lines: string[], voice?: keyof typeof VOICES): Promise<void> {
    const missing = lines.filter((l) => !this.cache.has(this.key(l, voice)));
    if (!missing.length) return;

    // Prefer OpenAI if available
    if (this.openai.available()) {
      await Promise.allSettled(
        missing.map(async (line) => {
          try {
            const clip = await this.openai.render(stripTags(line), {
              voice: 'shimmer',
              instructions: JARVIS_INSTRUCTIONS,
            });
            this.cache.set(this.key(line, voice), clip);
          } catch (err) {
            console.warn('[tts] OpenAI precache failed, will retry via ElevenLabs:', err);
          }
        })
      );
      // Fill any gaps with ElevenLabs
      const stillMissing = missing.filter((l) => !this.cache.has(this.key(l, voice)));
      if (stillMissing.length && this.eleven.available()) {
        await this.precacheEleven(stillMissing, voice);
      }
      return;
    }

    if (this.eleven.available()) {
      await this.precacheEleven(missing, voice);
    }
  }

  private async precacheEleven(missing: string[], voice?: keyof typeof VOICES) {
    await Promise.allSettled(
      missing.map(async (line) => {
        try {
          const clip: RenderedClip = await this.eleven.render(line, { voice });
          this.cache.set(this.key(line, voice), { url: clip.url, dispose: clip.dispose });
        } catch (err) {
          console.warn('[tts] ElevenLabs precache failed for line:', line.slice(0, 40), err);
        }
      })
    );
  }

  /** Speak — plays cached clip instantly if available, else renders on demand. */
  async speak(text: string, opts: JarvisSpeakOptions = {}): Promise<void> {
    const key = this.key(text, opts.voice);
    let entry = this.cache.get(key);

    if (!entry) {
      // Render on demand in priority order
      try {
        if (this.openai.available()) {
          this._backend = 'openai';
          const clip = await this.openai.render(stripTags(text), {
            voice: 'shimmer',
            instructions: JARVIS_INSTRUCTIONS,
          });
          entry = clip;
        } else if (this.eleven.available()) {
          this._backend = 'elevenlabs';
          const clip = await this.eleven.render(text, { voice: opts.voice });
          entry = { url: clip.url, dispose: clip.dispose };
        }
      } catch (err) {
        console.warn('[tts] render failed:', err);
      }
    } else {
      this._backend = this.openai.available() ? 'openai' : 'elevenlabs';
    }

    if (entry) {
      await this.playThroughChain(entry.url, opts);
      return;
    }

    // Absolute fallback
    if (this.webspeech.available()) {
      this._backend = 'webspeech';
      await this.webspeech.speak(stripTags(text), opts);
      return;
    }

    this._backend = 'none';
  }

  private async playThroughChain(url: string, opts: JarvisSpeakOptions): Promise<void> {
    await unlockAudio();
    const { ctx, master } = audioBus();

    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';

      let src = this.sourceMap.get(audio);
      if (!src) {
        try {
          src = ctx.createMediaElementSource(audio);
          this.sourceMap.set(audio, src);
        } catch {}
      }
      // BYPASS FX chain — play ElevenLabs audio CLEAN through master gain only.
      // ElevenLabs output is already mastered; adding EQ/comp/reverb was degrading it.
      if (src) {
        try { src.disconnect(); } catch {}
        src.connect(master);
      }

      // Always attach analyser — writes amplitude to both the direct ampBus
      // (for ParticleOrb zero-latency read) and the legacy onAmplitude callback.
      if (src) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.08;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const BANDS = 8;
        const bandSize = Math.floor(data.length / BANDS);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          let max = 0;
          let rms = 0;
          const lo = 3, hi = Math.min(80, data.length);
          for (let i = lo; i < hi; i++) {
            const v = data[i];
            if (v > max) max = v;
            rms += v * v;
          }
          rms = Math.sqrt(rms / (hi - lo));
          const amp = Math.min(1, (max * 0.7 + rms * 0.5) / 200);
          publishAmp(amp);
          // Publish 8 frequency bands for per-band particle reactivity
          for (let b = 0; b < BANDS; b++) {
            let bMax = 0;
            for (let i = b * bandSize; i < (b + 1) * bandSize && i < data.length; i++) {
              if (data[i] > bMax) bMax = data[i];
            }
            ampBus.bands[b] = bMax / 255;
          }
          opts.onAmplitude?.(amp);
          this.rafId = requestAnimationFrame(tick);
        };
        tick();
      }

      // Flip active IMMEDIATELY so orb responds from t=0 — don't wait for
      // the play event (which is sometimes delayed or missed entirely).
      setActive(true);

      audio.addEventListener('play', () => opts.onStart?.(), { once: true });
      if (opts.onTimeUpdate) {
        const tu = opts.onTimeUpdate;
        audio.addEventListener('timeupdate', () => {
          tu(audio.currentTime, isFinite(audio.duration) ? audio.duration : 0);
        });
      }
      audio.addEventListener('ended', () => {
        setActive(false);
        opts.onEnd?.();
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        resolve();
      });
      audio.addEventListener('error', () => {
        setActive(false);
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        reject(new Error('playback failed'));
      });

      audio.play().catch((err) => {
        setActive(false);
        reject(err);
      });
    });
  }

  clearCache() {
    for (const c of this.cache.values()) c.dispose();
    this.cache.clear();
  }

  stop() {
    this.eleven.stop();
    this.webspeech.stop();
  }

  private key(text: string, voice?: keyof typeof VOICES) {
    return `${voice ?? 'default'}::${text}`;
  }
}

export const voice = new VoicePipeline();
export { VOICES } from './voices';
