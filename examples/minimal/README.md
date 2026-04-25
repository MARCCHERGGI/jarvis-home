# Minimal JARVIS

The smallest possible demonstration of the framework. Reads a briefing script,
runs it through a console "voice" adapter, prints each line + phase change.

No GPU. No Electron. No API keys.

## Run it

```bash
# from the repo root
npx tsx examples/minimal/main.ts
```

You should see:

```
── Morning briefing ──

🗣  Good morning, Marco.
   ↳ phase: waking  (beat: wake)
🗣  The sun is up over New York. clear, sixty-four degrees.
   ↳ phase: descending  (beat: situate)
🗣  You have two meetings — both before noon. The market is mixed.
   ↳ phase: briefing  (beat: brief)
🗣  What are we building today?
   ↳ phase: ready  (beat: prompt)

── briefing complete ──
```

## What it shows

- **Script parsing** — markdown → `BriefingScript`
- **The engine loop** — beat → phase → speak → pause → next
- **Variable interpolation** — `{{city}}` filled from the `data` map
- **Phase callbacks** — what your scene plugin would react to

## What it doesn't do

- Speak audibly. Replace `consoleVoice` with `elevenlabsVoice` or any other
  `VoiceAdapter` for that.
- Render anything. Add a scene plugin (`mount` it on a DOM element) for visuals.
- Use a real brain. The `mockBrain` is here just to show the slot — for real
  variable filling, swap in `ollamaBrain` / `anthropicBrain` / etc.

## Use this as a test harness

Building your own voice adapter? Drop it in here:

```ts
import { myVoice } from '../../src/voices/my-voice';

await runBriefing({ script, voice: myVoice, data });
```

You'll hear your provider speaking the morning briefing inside 30 seconds —
fast feedback loop for new adapters.
