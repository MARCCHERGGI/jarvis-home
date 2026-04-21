// OpenAI TTS — tier-0, frontier-human voice.
//
// gpt-4o-mini-tts with "shimmer" is the most human-sounding female TTS
// available as of 2026. Supports a `voice_instructions` prompt for style
// control ("warm, driven, British exec tone"). Price: ~$0.015/min.
//
// Activated automatically if VITE_OPENAI_API_KEY is set in .env. Otherwise
// pipeline silently falls through to ElevenLabs.

export type OpenAIVoice = 'shimmer' | 'sage' | 'coral' | 'nova' | 'alloy';

export type OpenAISpeakOptions = {
  voice?: OpenAIVoice;
  instructions?: string;
  onStart?: () => void;
  onEnd?: () => void;
};

export class OpenAITTS {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY ?? '';
    this.model = (import.meta as any).env?.VITE_OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
  }

  available(): boolean {
    return !!this.apiKey;
  }

  /** Render audio to a Blob URL. No playback here — keep the pipeline uniform. */
  async render(text: string, opts: OpenAISpeakOptions = {}): Promise<{ url: string; dispose: () => void }> {
    if (!this.apiKey) throw new Error('OpenAI API key missing');

    const body: Record<string, any> = {
      model: this.model,
      voice: opts.voice ?? 'shimmer',
      input: text,
      response_format: 'mp3',
    };
    if (opts.instructions) body.instructions = opts.instructions;

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return { url, dispose: () => URL.revokeObjectURL(url) };
  }
}

/**
 * Tuned instruction prompt — shapes the voice into a driven, charismatic
 * female executive. Change this to retune delivery without re-rendering code.
 */
export const JARVIS_INSTRUCTIONS = `
Voice: A confident, charismatic, driven female assistant.
Tone: Warm but precise. Quietly powerful. Slight smile in the voice.
Pacing: Slightly faster than neutral. No dragging. Decisive on punch lines.
Feel: Like a sharp, trusted chief of staff briefing her boss at sunrise.
Accent: Neutral American with a touch of crisp over-enunciation.
Do not sound like a robot. Breathe. Let words land.
`.trim();
