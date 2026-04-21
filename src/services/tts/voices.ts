// Voice registry — JARVIS-matching tier.
//
// Default voice matches Paul Bettany's JARVIS from Iron Man:
// British, male, calm, refined, butler-like cadence.

export type JarvisVoice = {
  id: string;
  name: string;
  accent: 'british' | 'american';
  character: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  };
};

export const VOICES: Record<string, JarvisVoice> = {
  // DEFAULT — JARVIS (Tony Stark's AI). George on ElevenLabs: warm,
  // resonant, refined British male. Tuned for a calm-but-awake butler
  // cadence — exactly Paul Bettany's delivery.
  jarvis: {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    accent: 'british',
    character: 'Refined British male butler-AI. Calm, resonant, dryly warm. Bettany JARVIS.',
    settings: {
      stability: 0.55,          // controlled — not too expressive
      similarity_boost: 0.88,   // strong voice identity
      style: 0.24,              // subtle personality, not theatrical
      use_speaker_boost: true,
      speed: 1.02,              // deliberate, confident
    },
  },
  // Charlotte — female alt (FRIDAY-coded, sophisticated British).
  charlotte: {
    id: 'XB0fDUnXU5powFXDhCwa',
    name: 'Charlotte',
    accent: 'british',
    character: 'Sophisticated British female. Confident, warm, sharp.',
    settings: {
      stability: 0.38, similarity_boost: 0.85, style: 0.32,
      use_speaker_boost: true, speed: 1.05,
    },
  },
  // Jessica — female alternative (FRIDAY-coded).
  jessica: {
    id: 'cgSgspJ2msm6clMCkdW9',
    name: 'Jessica',
    accent: 'american',
    character: 'Hyper-natural female. Smooth, clear, warm. FRIDAY-coded.',
    settings: {
      stability: 0.42,
      similarity_boost: 0.85,
      style: 0.22,
      use_speaker_boost: true,
      speed: 1.05,
    },
  },
  // Rachel — ElevenLabs reference voice. Smoothest, clearest, most natural female.
  // The "default" voice everyone compares to. Extremely clean articulation.
  rachel: {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    accent: 'american',
    character: 'Ultra-smooth female. Crystal clear. The benchmark voice.',
    settings: {
      stability: 0.50,
      similarity_boost: 0.80,
      style: 0.20,
      use_speaker_boost: true,
      speed: 1.0,
    },
  },
  // Lily — British female, quick, bright.
  lily: {
    id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily',
    accent: 'british',
    character: 'Young British female. Quick, bright — FRIDAY-adjacent.',
    settings: {
      stability: 0.33,
      similarity_boost: 0.78,
      style: 0.32,
      use_speaker_boost: true,
      speed: 1.12,
    },
  },
  // George kept as male-JARVIS alt.
  george: {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    accent: 'british',
    character: 'Mature British male (Bettany-JARVIS).',
    settings: {
      stability: 0.55, similarity_boost: 0.80, style: 0.30,
      use_speaker_boost: true, speed: 0.98,
    },
  },
};

export const DEFAULT_VOICE = VOICES.jarvis;
