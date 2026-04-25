# Architecture

JARVIS is a small core + four plugin layers. Replace any layer; the rest keeps working.

```
                       ┌──────────────────┐
                       │  briefing-script │   ← markdown, the soul
                       └────────┬─────────┘
                                │ parse
                                ▼
            ┌────────────────────────────────────────┐
            │           briefing engine              │   ← src/core
            │  beat → phase → speak → pause → next   │
            └──┬─────────────┬──────────────┬────────┘
               │             │              │
       phase   ▼      speak  ▼     ask      ▼  (optional)
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   scenes/    │ │   voices/    │ │   brains/    │
    │ Earth, etc.  │ │ ElevenLabs,  │ │ Ollama,      │
    │              │ │ OpenAI,      │ │ Anthropic,   │
    │              │ │ WebSpeech    │ │ Groq, OpenAI │
    └──────────────┘ └──────────────┘ └──────────────┘
```

## The core (50 lines of state)

`src/core/` is the entire framework:

| File                       | What it does                                       |
| -------------------------- | -------------------------------------------------- |
| `types.ts`                 | The four plugin interfaces + the script types     |
| `parse-briefing.ts`        | Markdown → `BriefingScript`                        |
| `briefing-engine.ts`       | Runs a script through voice + scene + (brain)     |
| `index.ts`                 | Public API surface                                 |

If you only want the framework, `import * from 'jarvis-home/core'` — the rest is a reference shell.

## The four plugin layers

### 1. Scenes — the visuals (`src/scenes/` + `docs/scenes.md`)

A scene is a 3D experience that responds to the phase machine. The reference
scene is `earth/` — a planet in space that zooms to a target city when the
script enters `descending`.

A scene plugin implements:

```ts
interface ScenePlugin {
  name: string;
  describe(): string;
  mount(container: HTMLElement, opts?: SceneMountOptions): SceneHandle;
}
```

The handle exposes `setPhase`, `setTarget`, `destroy`. Build any scene you want —
black hole, ocean surface, neon city skyline — as long as it speaks that contract.

### 2. Voices — the speech (`src/voices/` + `docs/voices.md`)

A voice plugin implements:

```ts
interface VoiceAdapter {
  name: string;
  describe(): string;
  speak(text: string, opts?: VoiceOptions): Promise<void>;
  stop(): void;
}
```

Three reference adapters ship: ElevenLabs (premium, streaming), OpenAI TTS
(cheap, very good), Web Speech (free, system voice). Add your own — Cartesia,
Deepgram, Resemble, your local Coqui.

### 3. Brains — the language (`src/brains/` + `docs/brains.md`)

A brain plugin implements:

```ts
interface BrainAdapter {
  name: string;
  describe(): string;
  ask(input: BrainRequest): Promise<string>;
  stream?(input: BrainStreamRequest): Promise<string>;
}
```

Brains are optional — JARVIS runs scripted with just a voice. Add a brain when
you want to fill `{{variables}}` dynamically (today's weather, your calendar
summary, the next thing on your todo list).

### 4. Briefing scripts — the soul (`briefing-scripts/`)

Markdown files. Each is a sequence of beats with phase, pause, and voice line.
See `briefing-scripts/README.md`.

This is the layer that gives JARVIS its personality. Rewrite the words, you have
your own assistant. Keep them, you have JARVIS.

## How a typical run flows

1. App boots → mount the scene with `phase: 'sleep'`
2. User triggers wake (clap / hotkey / voice)
3. App calls `runBriefing({ script, voice, brain, data, onPhase })`
4. Engine walks beats:
   - Each beat may set a new phase → `onPhase` fires → scene reacts
   - Engine interpolates `{{vars}}` from `data` (you populate this from your brain)
   - Engine calls `voice.speak(text)` → playback completes
   - Engine pauses for `pauseAfterMs`
5. Final beat (`phase: 'ready'`) → app idles, listening for the next command

Total app code is small. Most surface area is in the four plugins, where it belongs.

## Why this shape

Because the value people loved on Instagram wasn't any one piece — it was the
**experience** the pieces produce together. By exposing the pieces as plugins,
every fork inherits that experience and can change one slot without rewriting
the whole thing.

You can ship a fork called FRIDAY by changing two things:
- `briefing-scripts/morning.md` (rewrite in FRIDAY's voice)
- `src/scenes/earth/` → `src/scenes/orbital-station/` (different visual)

Everything else stays.
