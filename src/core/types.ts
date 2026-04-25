/**
 * JARVIS Framework — plugin contracts.
 *
 * These four interfaces are the entire public surface of the framework.
 * If your adapter satisfies one of them, JARVIS can use it.
 */

// ─────────────────────────────────────────────────────────────
// Phases — the cinematic state machine
// ─────────────────────────────────────────────────────────────
export type Phase = 'sleep' | 'waking' | 'descending' | 'briefing' | 'ready';

// ─────────────────────────────────────────────────────────────
// Brain — pluggable LLM
// ─────────────────────────────────────────────────────────────
export interface BrainAdapter {
  /** Stable identifier, e.g. `"ollama"`, `"anthropic"`, `"groq"`. */
  readonly name: string;
  /** Human-readable one-liner. */
  describe(): string;

  /** Single-shot completion. Implementations MUST resolve in finite time. */
  ask(input: BrainRequest): Promise<string>;

  /** Optional streaming completion. Resolves with the full text. */
  stream?(input: BrainStreamRequest): Promise<string>;

  /** Optional probe — return false if this adapter cannot run (no key, etc). */
  available?(): boolean | Promise<boolean>;
}

export interface BrainRequest {
  system?: string;
  user: string;
  /** Soft cap; adapters may exceed if their model can't honor it. */
  maxTokens?: number;
  /** 0..1, defaults are adapter-specific. */
  temperature?: number;
}

export interface BrainStreamRequest extends BrainRequest {
  onToken: (token: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Voice — pluggable TTS
// ─────────────────────────────────────────────────────────────
export interface VoiceAdapter {
  readonly name: string;
  describe(): string;

  /** Speak text. Resolves when playback completes (or is stopped). */
  speak(text: string, options?: VoiceOptions): Promise<void>;

  /** Halt any in-flight playback. Idempotent. */
  stop(): void;

  /** Optional probe — return false if no key / no audio device / blocked autoplay. */
  available?(): boolean | Promise<boolean>;
}

export interface VoiceOptions {
  /** Adapter-specific voice ID — e.g. an ElevenLabs voice UUID. */
  voice?: string;
  /** Multiplicative speed: 0.5 = half, 1 = native, 2 = double. */
  speed?: number;
  /** Real-time amplitude 0..1 — used to drive HUD VU meters. */
  onAmplitude?: (level: number) => void;
  /** Abort signal for early cancellation. */
  signal?: AbortSignal;
}

// ─────────────────────────────────────────────────────────────
// Scene — pluggable 3D experience
// ─────────────────────────────────────────────────────────────
export interface ScenePlugin {
  readonly name: string;
  describe(): string;

  /** Mount the scene into a container. Returns a handle for control + teardown. */
  mount(container: HTMLElement, opts?: SceneMountOptions): SceneHandle;
}

export interface SceneMountOptions {
  /** Initial phase. Defaults to "sleep". */
  phase?: Phase;
  /** Optional zoom target — for the "earth → city" descent. */
  target?: GeoTarget;
}

export interface SceneHandle {
  /** Drive the cinematic timeline. */
  setPhase(phase: Phase): void;
  /** Update zoom target while running. */
  setTarget(target: GeoTarget): void;
  /** Tear down. Frees GPU resources. */
  destroy(): void;
}

export interface GeoTarget {
  lat: number;
  lon: number;
  /** Optional human label, e.g. "New York". */
  label?: string;
}

// ─────────────────────────────────────────────────────────────
// Briefing scripts — the soul
// ─────────────────────────────────────────────────────────────
export interface BriefingScript {
  /** Stable id, e.g. "morning". */
  id: string;
  /** Optional title for docs. */
  title?: string;
  beats: BriefingBeat[];
}

export interface BriefingBeat {
  /** Beat label, e.g. "wake", "situate", "prompt". */
  id: string;
  /** Voice line. Supports `{{var}}` interpolation against `data` at runtime. */
  text: string;
  /** Pause AFTER speaking, in ms. Default 0. */
  pauseAfterMs?: number;
  /** Phase to enter when this beat starts. */
  phase?: Phase;
}

// ─────────────────────────────────────────────────────────────
// Runtime config — what `runBriefing` accepts
// ─────────────────────────────────────────────────────────────
export interface BriefingRunOptions {
  script: BriefingScript;
  voice: VoiceAdapter;
  /** Optional brain — if provided, lets you generate variable values dynamically. */
  brain?: BrainAdapter;
  /** Variable map for `{{var}}` interpolation. */
  data?: Record<string, string>;
  /** Phase change callback (drive your scene from here). */
  onPhase?: (phase: Phase, beatId: string) => void;
  /** Per-beat hook. Useful for HUD reveals or telemetry. */
  onBeat?: (beat: BriefingBeat) => void;
  /** Abort signal. */
  signal?: AbortSignal;
}
