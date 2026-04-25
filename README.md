# JARVIS

> **An open-source cinematic AI desktop UI framework.**
> The voice. The Earth zoom. The HUD reveal. Bring your own brain.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-v0.1%20building-orange.svg)](#)
[![Early access](https://img.shields.io/badge/early%20access-jarvis--landing--theta.vercel.app-1d8fff.svg)](https://jarvis-landing-theta.vercel.app)

---

## What this is

JARVIS is a desktop interface kit. The clap-to-wake, the Earth-to-city zoom, the briefing voice, the HUD — all of it open source under MIT.

You compose four plugins:

```
   scene      voice       brain       briefing-script
   (3D)       (TTS)       (LLM)       (markdown lines)
     \         |           |               /
      \________|___________|_____________/
                       │
                  briefing engine
                       │
                  your assistant
```

Replace any plugin, the rest keeps working. Want a JARVIS that lives on Mars instead of Earth? Swap the scene. Want it to speak in your voice? Swap the voice adapter. Want it powered by Llama on your laptop instead of GPT? Swap the brain. Want it called FRIDAY? Rewrite `briefing-scripts/morning.md`.

The waitlist for the polished hosted version (memory, voice cloning, smart routing) is at **[jarvis-landing-theta.vercel.app](https://jarvis-landing-theta.vercel.app)**. The framework you're looking at right now is forever free.

## See it run

```bash
git clone https://github.com/MARCCHERGGI/jarvis-home.git
cd jarvis-home
npm install

# 30-second framework smoke test, no GPU, no keys
npx tsx examples/minimal/main.ts

# the full reference build (Electron + Three.js + voice)
cp .env.example .env       # paste any one of: ElevenLabs / OpenAI / Groq
npm run dev:electron
```

**Triggers in the full build:**
- **Clap** — your mic, real time. Adjust `VITE_CLAP_THRESHOLD` if it's too sensitive.
- **Spacebar** — always works. Use this for rehearsals.
- **Esc** — quit.

## Repo tour

```
briefing-scripts/      🔥 the soul — markdown voice scripts (forkable)
docs/                  the four plugin contracts, fully explained
examples/minimal/      tiny "hello JARVIS" — no Electron, runs in 1s

src/core/              the framework itself (4 files, ~200 LOC)
  types.ts             plugin interfaces — Brain · Voice · Scene · Script
  parse-briefing.ts    markdown → BriefingScript
  briefing-engine.ts   the runner — phase, speak, pause, next
  index.ts             public API

src/voices/            voice adapters (the reference: ElevenLabs / OpenAI / Web Speech)
src/brains/            brain adapters (the reference: Ollama / Groq / Anthropic / OpenAI)
src/scenes/            scene plugins (the reference: Earth)

electron/              the desktop shell — windowing, IPC, native services
src/components/        the HUD, panels, boot sequence — visual layer
src/hooks/             wake sequence, clap, voice commands
public/                Earth textures, audio assets

build/                 electron-builder resources (Mac entitlements, etc.)
.github/workflows/     tag-triggered Mac + Windows release builds
```

## The four plugin contracts

Read `docs/architecture.md` for the full picture. The 30-second version:

```ts
interface ScenePlugin    { mount(el): { setPhase, setTarget, destroy } }
interface VoiceAdapter   { speak(text, opts): Promise<void>; stop() }
interface BrainAdapter   { ask(req): Promise<string>; stream?(req) }
interface BriefingScript { id, beats: { id, text, pauseAfterMs?, phase? }[] }
```

Implement one, drop it in, you've extended JARVIS.

## Build for distribution

```bash
npm run build:win        # Windows .exe (NSIS + portable)
npm run build:mac        # macOS universal .dmg
npm run build:linux      # Linux .AppImage
```

Outputs land in `release/`. The GitHub Actions workflow at `.github/workflows/release.yml` auto-builds on tag push (`git tag v0.1.0 && git push --tags`).

## Privacy

- JARVIS does not phone home. No analytics. No telemetry.
- Your prompts only leave your machine if you put a key in for ElevenLabs / OpenAI / Groq — those services then see the audio you submit.
- The optional auto-updater checks GitHub Releases for new versions. Disable by removing the `publish` block from `package.json`'s `build` config.

## Make it yours

The fastest way to own this:

1. Fork the repo
2. Edit `briefing-scripts/morning.md` — rewrite every line in your assistant's voice
3. (Optional) Replace `src/scenes/SleepScene.tsx` with your own visual
4. (Optional) Set your default voice ID in `.env`
5. `npm run build:mac` → ship a `.dmg` named after **your** assistant

That's it. No framework dependencies to learn. No build chain to fight.

## Roadmap

**v0.1 — First Light** (shipping now)
- ✅ Cinematic wake sequence (clap → earth → city → briefing)
- ✅ Voice output via ElevenLabs / OpenAI TTS / Web Speech
- ✅ Local LLM via Ollama, cloud LLM via Groq / Anthropic / OpenAI
- ✅ Plugin contracts: scene · voice · brain · briefing-script
- ⏳ First-run setup wizard
- ⏳ Auto-update from GitHub Releases

**v0.2 — Hosted brain** (~6 weeks)
- Persistent memory + personality across sessions
- Calendar / email / notifications integration
- Voice command → action layer
- Mobile companion (iOS/Android)
- *(this layer is paid, $19/mo or $49 lifetime — founders get half off forever)*

**v0.3 — Custom voice**
- Voice cloning (your own voice, or licensed read-alikes)
- Pluggable persona profiles

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Small, focused PRs land fast. The bar is "would Marco run this on his own machine."

Particularly welcome: new scene plugins, new voice adapters, new briefing scripts (in any language or persona).

## Security

See [SECURITY.md](SECURITY.md). Report vulnerabilities privately.

## License

MIT — see [LICENSE](LICENSE).

---

*Made in NYC by [@marcohergi](https://www.instagram.com/marcohergi). Drop your email at [jarvis-landing-theta.vercel.app](https://jarvis-landing-theta.vercel.app) for founding access when v0.2 ships.*
