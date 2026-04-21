// ElevenLabs TTS — frontier pipeline.
//
//   1. Model: eleven_v3 (emotion tags). Auto-fallback to multilingual_v2.
//   2. Pre-render: `render()` caches a clip, `play()` fires it instantly.
//   3. Voice FX chain: every clip flows through EQ + compressor + reverb so TTS
//      sounds cinematic, not bare.

import { VOICES, DEFAULT_VOICE, type JarvisVoice } from './voices';
import { audioBus, unlockAudio } from '../audio/bus';
import { createVoiceChain, type VoiceChain } from '../audio/fx';

const API_BASE = 'https://api.elevenlabs.io/v1';

export type SpeakOptions = {
  voice?: keyof typeof VOICES | JarvisVoice;
  model?: 'eleven_v3' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5' | 'eleven_multilingual_v2';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
  onAmplitude?: (amp: number) => void;
};

export type RenderedClip = {
  url: string;
  voice: JarvisVoice;
  dispose: () => void;
};

export class ElevenLabsTTS {
  private apiKey: string;
  private defaultModel: string;
  private currentAudio: HTMLAudioElement | null = null;
  private chain: VoiceChain | null = null;
  private rafId: number | null = null;
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? (import.meta as any).env?.VITE_ELEVENLABS_API_KEY ?? '';
    this.defaultModel = opts?.model ?? (import.meta as any).env?.VITE_ELEVENLABS_MODEL ?? 'eleven_v3';
  }

  available(): boolean {
    return !!this.apiKey;
  }

  private resolveVoice(v: SpeakOptions['voice']): JarvisVoice {
    if (!v) return DEFAULT_VOICE;
    if (typeof v === 'string') return VOICES[v] ?? DEFAULT_VOICE;
    return v;
  }

  async render(text: string, opts: SpeakOptions = {}): Promise<RenderedClip> {
    if (!this.apiKey) throw new Error('ElevenLabs API key missing');
    const voice = this.resolveVoice(opts.voice);
    const model = opts.model ?? this.defaultModel;

    let res = await this.request(text, voice, model);
    if (!res.ok && model === 'eleven_v3') {
      console.warn('[tts] v3 unavailable, falling back to multilingual_v2');
      res = await this.request(text, voice, 'eleven_multilingual_v2');
    }
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`);
    return this.blobToClip(await res.blob(), voice);
  }

  private async request(text: string, voice: JarvisVoice, model: string): Promise<Response> {
    return fetch(
      `${API_BASE}/text-to-speech/${voice.id}/stream?optimize_streaming_latency=2&output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability: voice.settings.stability,
            similarity_boost: voice.settings.similarity_boost,
            style: voice.settings.style,
            use_speaker_boost: voice.settings.use_speaker_boost,
            speed: voice.settings.speed,
          },
        }),
      }
    );
  }

  private blobToClip(blob: Blob, voice: JarvisVoice): RenderedClip {
    const url = URL.createObjectURL(blob);
    return { url, voice, dispose: () => URL.revokeObjectURL(url) };
  }

  async play(clip: RenderedClip, opts: Pick<SpeakOptions, 'onStart' | 'onEnd' | 'onAmplitude' | 'onError'> = {}): Promise<void> {
    return this.playFromUrl(clip.url, opts);
  }

  async speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    const clip = await this.render(text, opts);
    try {
      await this.play(clip, opts);
    } finally {
      clip.dispose();
    }
  }

  private async playFromUrl(url: string, opts: Pick<SpeakOptions, 'onStart' | 'onEnd' | 'onAmplitude' | 'onError'>): Promise<void> {
    await unlockAudio();
    const { ctx } = audioBus();
    if (!this.chain) this.chain = createVoiceChain();

    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      this.currentAudio = audio;

      // Route through voice FX chain
      let src = this.sourceMap.get(audio);
      if (!src) {
        try {
          src = ctx.createMediaElementSource(audio);
          this.sourceMap.set(audio, src);
        } catch { /* already claimed */ }
      }
      if (src && this.chain) {
        try { src.disconnect(); } catch {}
        src.connect(this.chain.input);
      }

      // Amplitude analyser tap for HUD VU bar
      if (opts.onAmplitude && src) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (const b of data) sum += b;
          opts.onAmplitude?.(sum / data.length / 255);
          this.rafId = requestAnimationFrame(tick);
        };
        tick();
      }

      audio.addEventListener('play', () => opts.onStart?.(), { once: true });
      audio.addEventListener('ended', () => {
        opts.onEnd?.();
        this.stopAnalyser();
        resolve();
      });
      audio.addEventListener('error', () => {
        const err = new Error('Audio playback failed');
        opts.onError?.(err);
        this.stopAnalyser();
        reject(err);
      });

      audio.play().catch((err) => {
        opts.onError?.(err);
        this.stopAnalyser();
        reject(err);
      });
    });
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    this.stopAnalyser();
  }

  private stopAnalyser() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
