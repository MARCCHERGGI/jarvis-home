# Voices — TTS plugins

A voice plugin turns text into audio playback. JARVIS doesn't care how —
neural cloud TTS, your local Coqui model, Web Speech, a prerecorded sample bank.
As long as it satisfies the `VoiceAdapter` interface, the framework can drive it.

## Interface

```ts
import type { VoiceAdapter, VoiceOptions } from 'jarvis-home/core';

export const myVoice: VoiceAdapter = {
  name: 'my-voice',
  describe: () => 'a 60s description for ops + docs',

  async speak(text, options) {
    // play audio, resolve when done
  },

  stop() {
    // halt anything in flight
  },

  // optional
  available() {
    return Boolean(import.meta.env.VITE_MY_KEY);
  },
};
```

## Options the engine may pass

```ts
interface VoiceOptions {
  voice?: string;                            // adapter-specific voice ID
  speed?: number;                            // 0.5 = half, 1 = native, 2 = double
  onAmplitude?: (level: number) => void;     // 0..1 stream — drives HUD VU meters
  signal?: AbortSignal;                      // honor for early cancel
}
```

If your adapter can't honor an option, ignore it. Don't throw.

## Reference implementations

The three that ship in `src/services/tts/`:

| Adapter      | Quality | Latency | Cost        | Notes                                  |
| ------------ | ------- | ------- | ----------- | -------------------------------------- |
| `elevenlabs` | A+      | ~250ms  | paid        | Streaming, voice library, default      |
| `openai-tts` | A       | ~600ms  | very cheap  | `gpt-4o-mini-tts`, "shimmer" voice     |
| `webspeech`  | C       | 0       | free        | System voice, last-resort fallback     |

The framework's voice pipeline (`src/services/tts/index.ts`) layers these — try
ElevenLabs first, fall through to OpenAI on quota, fall through to Web Speech
on network failure. Copy that pattern for your own provider chain.

## Writing your own

1. New file under `src/voices/<name>.ts`
2. Implement `VoiceAdapter`
3. Register it in your app — wherever you instantiate `runBriefing`, pass your adapter
4. (Optional) Open a PR adding it to the official ship if it's broadly useful

## Things to get right

- **Resolve when audio finishes**, not when the request returns. Premature resolution
  breaks pause timing.
- **Stop on AbortSignal.** Mid-line cancellation is non-negotiable for good UX.
- **Don't double-speak.** If `speak` is called while another speak is in flight,
  cut the previous one. Behavior should match a calm assistant, not a hold queue.
- **Emit amplitude when you can.** It costs you nothing and makes HUD VU meters work.
