/**
 * `jarvis.config.json` — the user-facing config that drives a personalized
 * JARVIS without touching any code. The repo ships an example at
 * `jarvis.config.example.json`. The real `jarvis.config.json` is gitignored
 * so each user / install can have their own.
 */

export interface JarvisConfig {
  user: {
    firstName: string;
    city: string;
    lat: number;
    lon: number;
  };

  voice: {
    provider: 'elevenlabs' | 'openai' | 'webspeech';
    /** Provider-specific voice ID (e.g. ElevenLabs UUID). */
    voiceId?: string;
    /** Optional preset alias from `src/services/tts/voices.ts`. */
    voicePreset?: 'alice' | 'charlotte' | 'matilda' | (string & {});
    speed?: number;
  };

  scene: {
    /** Scene plugin id, e.g. `"earth"`. Matches a scene in `src/scenes/`. */
    name: string;
    options?: Record<string, unknown>;
  };

  brain: {
    provider: 'ollama' | 'groq' | 'anthropic' | 'openai' | 'none';
    model?: string;
    /** Order of providers to try if the primary fails. */
    fallbackChain?: Array<JarvisConfig['brain']['provider']>;
  };

  briefing: {
    /** Script id — matches a file in `briefing-scripts/<id>.md`. */
    script: string;
    openMusicPanel?: boolean;
    panels?: {
      trading?: boolean;
      bitcoin?: boolean;
      social?: boolean;
      schedule?: boolean;
    };
  };

  dataSources?: {
    weather?: { enabled: boolean; provider?: string | null };
    calendar?: { enabled: boolean; provider?: string | null };
    trading?: { enabled: boolean; watchlist?: string[] };
    social?: { enabled: boolean; platforms?: string[] };
  };

  wake?: {
    trigger?: 'clap' | 'hotkey' | 'voice';
    hotkey?: string;
    clapThreshold?: number;
  };
}

/** Defaults applied when a user-supplied config is missing fields. */
export const DEFAULT_CONFIG: JarvisConfig = {
  user: {
    firstName: '',
    city: 'New York',
    lat: 40.7233,
    lon: -74.003,
  },
  voice: {
    provider: 'elevenlabs',
    voicePreset: 'alice',
    speed: 1.08,
  },
  scene: {
    name: 'earth',
  },
  brain: {
    provider: 'ollama',
    model: 'llama3.2:3b',
    fallbackChain: ['groq', 'anthropic', 'openai'],
  },
  briefing: {
    script: 'morning',
    openMusicPanel: true,
    panels: { trading: true, bitcoin: true, social: true, schedule: true },
  },
  dataSources: {
    weather: { enabled: true, provider: 'openmeteo' },
    calendar: { enabled: false, provider: null },
    trading: { enabled: false, watchlist: [] },
    social: { enabled: false, platforms: [] },
  },
  wake: {
    trigger: 'clap',
    hotkey: 'Space',
    clapThreshold: 0.45,
  },
};

/**
 * Shallow-merge a partial user config over the defaults. Top-level keys are
 * deep-merged one level so callers can pass `{ voice: { voiceId: 'X' } }`
 * without losing the rest of the voice defaults.
 */
export function mergeConfig(partial: Partial<JarvisConfig>): JarvisConfig {
  const out: JarvisConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  for (const [k, v] of Object.entries(partial)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && (out as any)[k] && typeof (out as any)[k] === 'object') {
      (out as any)[k] = { ...(out as any)[k], ...v };
    } else {
      (out as any)[k] = v as any;
    }
  }
  return out;
}
