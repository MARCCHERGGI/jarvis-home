export const CONFIG = {
  testMode: ((import.meta as any).env?.VITE_TEST_MODE ?? 'true') === 'true',
  clapThreshold: parseFloat((import.meta as any).env?.VITE_CLAP_THRESHOLD ?? '0.45'),
  // Desktop apps to launch on wake. Empty = pure visual experience, no cmd windows.
  launchApps: [] as const as readonly string[],
  // Background music. Drop an MP3 at /public/audio/workshop.mp3 to play it.
  // Falls back to procedural score if file is missing.
  // Local MP3 path (served from /public/audio). AC/DC "Back in Black" —
  // Iron Man (2008) opening credits / Tony Stark intro scene track.
  musicTrack:
    (import.meta as any).env?.VITE_MUSIC_TRACK ??
    `${(import.meta as any).env?.BASE_URL ?? '/'}audio/opt1-back-in-black.mp3`,
  musicTitle:
    (import.meta as any).env?.VITE_MUSIC_TITLE ?? 'AC/DC · BACK IN BLACK',
  musicLevel: 0.55,
  // Manhattan / SoHo
  targetLat: 40.7233,
  targetLon: -74.0030,
  // Ollama LLM model — override with VITE_OLLAMA_MODEL. 3B is default (fast + tiny RAM).
  // Marco's DGX Spark or any Ollama-capable box can use larger models here.
  ollamaModel:
    (import.meta as any).env?.VITE_OLLAMA_MODEL ?? 'llama3.2:3b',
};
