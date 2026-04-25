# Scenes — 3D plugins

A scene is the visual half of JARVIS. It mounts into a DOM container, listens
for phase changes, and animates accordingly. The reference scene is `earth/` —
a planet in space that zooms to a target city when the briefing enters
`descending`.

## Interface

```ts
import type { ScenePlugin, SceneHandle, Phase, GeoTarget } from 'jarvis-home/core';

export const myScene: ScenePlugin = {
  name: 'my-scene',
  describe: () => 'one-line description',

  mount(container, opts) {
    // build your three.js / canvas / webgpu / pixi / SVG scene
    return {
      setPhase(phase: Phase) {
        // animate to match the new phase
      },
      setTarget(target: GeoTarget) {
        // update zoom destination (optional — ignore if irrelevant)
      },
      destroy() {
        // free GPU resources, remove listeners
      },
    };
  },
};
```

## Phases your scene must handle

| Phase         | What's happening                                             | Suggested visual                |
| ------------- | ------------------------------------------------------------ | ------------------------------- |
| `sleep`       | App is dormant, ambient                                      | Slow rotation, low brightness   |
| `waking`      | User triggered wake — first 800ms of energy                  | Brightness up, camera nudge in  |
| `descending`  | Camera approaches the target / focal point                   | Heavy motion, zoom              |
| `briefing`    | Voice is speaking, panels reveal                             | Steady, focal — let HUD breathe |
| `ready`       | All UI in, voice done, idling for input                      | Calm but alive                  |

You don't need to handle every phase distinctly — a minimal scene can collapse
`waking → descending → briefing` into one motion and just hold during `ready`.

## Reference: earth

`src/scenes/SleepScene.tsx` + `earthShaders.ts` + `astronomy.ts` build the
reference Earth scene:
- Day/night terminator driven by real solar position (not faked)
- Atmosphere shader (Rayleigh scattering approximation)
- Cloud layer with independent rotation
- Camera lerp from orbit → target lat/lon during `descending`

It's heavier than what most forks need. Strip what you don't use.

## Build something else

Some ideas that fit the framework:

- **Starfield** — minimalist, pure black with parallax stars
- **Aurora** — gradient ribbons over a dark sphere
- **Grid** — Tron-style horizon, retro
- **Ocean** — surface waves, camera dives at descent
- **Workshop** — Iron Man's garage, panels rise around the user
- **Black hole** — accretion disk, light bending, descend = cross the horizon
- **Cyberpunk skyline** — descend = drop into the streets

Pick one that matches your assistant's personality.

## Things to get right

- **No leaking GPU resources.** Implement `destroy()` properly. Forkers will
  hot-reload during development.
- **Don't block the main thread.** Use `requestAnimationFrame`. Heavy compute
  goes to web workers or shader passes.
- **Respect prefers-reduced-motion.** Ship a "still" mode for accessibility.
- **Match the audio pacing.** A 1.4-second pause in the script should feel like
  a 1.4-second held shot in the visual.
