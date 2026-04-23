import { create } from 'zustand';

export type Phase =
  | 'sleep'
  | 'waking'      // zoom from space → earth
  | 'descending'  // earth → NYC
  | 'briefing'    // panels visible + voice
  | 'ritual'      // two-question morning ritual, hands-free
  | 'ready';      // "What are we building today, boss?"

export type RitualStep = 'idle' | 'asking' | 'listening' | 'reflecting';

type LaunchStatus = 'pending' | 'running' | 'ok' | 'failed';

// v2.0 — Alive Mode. During ready phase, JARVIS keeps pulling fresh data
// every 30s and panels react to it. Each field updates independently so
// panels only re-render when their slice changes.
export type LivePulse = {
  btc:     { price: number; change: number } | null;
  eth:     { price: number; change: number } | null;
  stripeToday: number | null;
  stripeWeek:  number | null;
  stripeCount: number | null;
  weather: { temp: number; cond: string } | null;
  cpu:     number | null;
  lastUpdated: number;
  // Which panel the user has clicked to expand (null = none)
  expandedPanel: string | null;
};

type State = {
  phase: Phase;
  voiceAmp: number;
  voiceActive: boolean;
  launches: Record<string, LaunchStatus>;
  revealedPanels: Set<string>;
  pulse: LivePulse;

  // ── Morning ritual state ──
  ritualQuestion: string;
  ritualAnswer: string;
  ritualStep: RitualStep;
  ritualIndex: number;     // 0 = priming, 1 = action
  ritualSource: 'groq' | 'ollama' | 'curated' | null;

  setPhase: (p: Phase) => void;
  setVoiceAmp: (a: number) => void;
  setVoiceActive: (b: boolean) => void;
  setLaunch: (name: string, s: LaunchStatus) => void;
  revealPanel: (key: string) => void;
  setPulse: (patch: Partial<LivePulse>) => void;
  setExpandedPanel: (key: string | null) => void;
  setRitual: (patch: Partial<Pick<State,
    'ritualQuestion' | 'ritualAnswer' | 'ritualStep' | 'ritualIndex' | 'ritualSource'>>) => void;
  reset: () => void;
};

const RITUAL_DEFAULTS = {
  ritualQuestion: '',
  ritualAnswer: '',
  ritualStep: 'idle' as RitualStep,
  ritualIndex: 0,
  ritualSource: null as 'groq' | 'ollama' | 'curated' | null,
};

const PULSE_DEFAULTS: LivePulse = {
  btc: null,
  eth: null,
  stripeToday: null,
  stripeWeek: null,
  stripeCount: null,
  weather: null,
  cpu: null,
  lastUpdated: 0,
  expandedPanel: null,
};

export const useJarvis = create<State>((set) => ({
  phase: 'sleep',
  voiceAmp: 0,
  voiceActive: false,
  launches: {},
  revealedPanels: new Set<string>(),
  pulse: PULSE_DEFAULTS,
  ...RITUAL_DEFAULTS,
  setPhase: (p) => set({ phase: p }),
  setVoiceAmp: (a) => set({ voiceAmp: a }),
  setVoiceActive: (b) => set({ voiceActive: b }),
  setLaunch: (name, s) =>
    set((st) => ({ launches: { ...st.launches, [name]: s } })),
  revealPanel: (key) => set((st) => ({
    revealedPanels: new Set([...st.revealedPanels, key]),
  })),
  setPulse: (patch) => set((st) => ({ pulse: { ...st.pulse, ...patch, lastUpdated: Date.now() } })),
  setExpandedPanel: (key) => set((st) => ({ pulse: { ...st.pulse, expandedPanel: key } })),
  setRitual: (patch) => set(patch),
  reset: () => set({
    phase: 'sleep',
    voiceAmp: 0,
    voiceActive: false,
    launches: {},
    revealedPanels: new Set<string>(),
    pulse: PULSE_DEFAULTS,
    ...RITUAL_DEFAULTS,
  }),
}));
