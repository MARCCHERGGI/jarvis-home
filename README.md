# JARVIS_HOME

Cinematic Windows desktop shell. Sleeps on a 3D Earth in space, wakes on a clap, zooms to Manhattan, briefs you, launches your stack, and asks what we're building today.

## Quick start

```bash
cd C:/Users/hergi/JARVIS_HOME
cp .env.example .env     # ElevenLabs key already pre-filled
npm install
npm run dev:electron     # dev mode, fullscreen, hot reload
```

**Test mode:** spacebar simulates a clap. `Esc` quits.

## Architecture

```
electron/                        Electron main process (fullscreen shell + launcher)
  main.ts                        BrowserWindow, IPC
  preload.ts                     contextBridge → window.jarvis
  services/launcher.ts           child_process.spawn for OpenClaw, Hermes, Claude Code
src/
  main.tsx / App.tsx             Renderer entry
  scenes/SleepScene.tsx          Three.js Earth + stars + atmosphere + phase-driven camera
  components/
    HUD/HUDFrame.tsx             Corner brackets, clock, status, voice VU bar
    Panels/                      News · Markets · Launch status
    Boot/BootSequence.tsx        Panel choreography
  services/
    tts/                         Voice pipeline (see below)
    briefing/mock-data.ts        News + markets + voice lines
    clap/mic-detector.ts         Mic RMS → clap trigger
    launcher/ (via preload)      IPC to Electron main
  hooks/
    useWakeSequence.ts           The cinematic timeline
    useClap.ts                   Mic + spacebar trigger
  state/store.ts                 Zustand: phase, voice, launches
  config/index.ts                Apps + URLs + thresholds
```

### Phase state machine

```
sleep  →  waking  →  descending  →  briefing  →  ready
          space↗    earth↗NYC      panels in   final line
```

## Voice (the centerpiece)

Premium path: **ElevenLabs Turbo v2.5**, streaming, ~250 ms latency.
Default voice: **Alice** — British, crisp, driven. The "sharp exec" JARVIS-female.

Three curated voices ship in `src/services/tts/voices.ts`:

| Voice     | Accent    | Character                                              |
|-----------|-----------|--------------------------------------------------------|
| **Alice** (default) | British  | Clear, fast, driven. Sharp exec.                |
| Charlotte | British   | Smoother, sophisticated, more cinematic.               |
| Matilda   | American  | Warmer, friendlier JARVIS.                             |

Each ships with a tuned profile (`stability`, `similarity_boost`, `style`, `speed`) to hit the "smooth, fast, charismatic" target.

Fallback chain: **ElevenLabs → Web Speech (Sonia/Libby/Aria)**. If the key 401s on quota, the pipeline silently downgrades so the experience still runs.

Swap voice:
```ts
await voice.speak('text here', { voice: 'charlotte' });
```

## Wake trigger

- **Mic clap** — `startClapDetector` watches time-domain RMS for spikes above `VITE_CLAP_THRESHOLD`. Refractory window 1.2 s.
- **Spacebar** — always active. Use for rehearsals.

## Launchers

`electron/services/launcher.ts` spawns apps via shell. Configure apps in `src/config/index.ts`:

```ts
launchApps: ['openclaw', 'hermes', 'claude-code'],
launchUrls: ['https://chat.openai.com', 'https://claude.ai'],
```

## Design language

- Pure black background, white text, subtle cyan (`#6cf4ff`) accents.
- Frosted-glass panels, hairline borders, monospace labels.
- No skeuomorphism, no gamer neon, no clutter.

## Build for Windows

```bash
npm run build
# output: dist/ + packaged .exe in release/
```

## Phases shipped

- [x] **Phase 1 — Runnable mock.** Electron scaffold, Three.js Earth + stars + atmosphere, HUD frame, sleep hint, spacebar trigger, phase state machine, wake → descend → panels → ready sequence, mock news/markets, launcher IPC stubs.
- [x] **Phase 2 — Premium voice.** ElevenLabs Turbo v2.5 streaming, 3 curated JARVIS-female voices with tuned profiles, Web Speech fallback, amplitude analyser driving HUD VU bar.
- [x] **Phase 3 — Launch orchestration.** Real `child_process` launches for OpenClaw / Hermes / Claude Code with status updates in LaunchPanel.

## What remains

- Real Earth textures + night-lights overlay (drop into `/public/textures/earth.*`).
- City-level zoom texture (Manhattan satellite overlay) for the final camera stop.
- Live news feed (swap `mock-data.ts` for an RSS/News API fetch).
- Live market feed (Binance WS for crypto, Polygon/Finnhub for equities).
- Weather + calendar panel.
- Custom voice clone (your own voice or a licensed celebrity read-alike).
- Electron-builder signing / auto-update.
- Multi-display awareness.
