# Contributing to JARVIS

Thanks for being here. JARVIS is a small, opinionated codebase — it stays small on purpose.

## The vibe

- Voice-first. Local-first. Zero ceremony.
- Cinematic over enterprise. The product is the experience, not the abstraction layer.
- One way to do each thing. We delete more than we add.

If your PR adds an abstraction, a config knob, or a third-party SDK, write one paragraph in the PR description explaining why the simpler thing didn't work.

## Quickstart

```bash
git clone https://github.com/MARCCHERGGI/jarvis-home.git
cd jarvis-home
cp .env.example .env       # add your ElevenLabs / OpenAI / Groq keys (any one is enough)
npm install
npm run dev:electron
```

Spacebar = simulated clap. Esc = quit.

## Project layout

- `electron/` — main process (window, IPC, native services like clap detection)
- `src/` — React renderer (Three.js scene, HUD, panels)
- `public/` — static assets (Earth textures, audio)
- See the README for the full architecture overview

## Submitting a PR

1. Fork → branch → push.
2. Run `npm run typecheck` and make sure it passes.
3. Test the full wake cycle: sleep → clap/space → descent → briefing → ready.
4. Open the PR with: what changed, why, and a screenshot or screen recording if it touches UI.
5. Small PRs land fast. PRs that mix three unrelated changes get sent back.

## Where help is most welcome

- Real-time data sources (better weather/news/markets feeds)
- Voice-command intent parsing (mic input → action)
- Cross-platform build polish (macOS notarization is the current gap)
- Custom voice profile loaders
- Memory/personality system (see `data-sources.ts:getMorningContext`)

## What we won't merge

- Telemetry that runs without explicit opt-in
- Hardcoded secrets, paths, or usernames (we keep things env-driven)
- New runtimes/frameworks unless they replace a heavier existing one
- Generic "config" PRs without a concrete user need

## Code of conduct

Be a person. The project is small and the standards are old: be specific, be kind, be brief.
