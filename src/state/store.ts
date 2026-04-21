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

type State = {
  phase: Phase;
  voiceAmp: number;
  voiceActive: boolean;
  launches: Record<string, LaunchStatus>;
  revealedPanels: Set<string>;

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

export const useJarvis = create<State>((set) => ({
  phase: 'sleep',
  voiceAmp: 0,
  voiceActive: false,
  launches: {},
  revealedPanels: new Set<string>(),
  ...RITUAL_DEFAULTS,
  setPhase: (p) => set({ phase: p }),
  setVoiceAmp: (a) => set({ voiceAmp: a }),
  setVoiceActive: (b) => set({ voiceActive: b }),
  setLaunch: (name, s) =>
    set((st) => ({ launches: { ...st.launches, [name]: s } })),
  revealPanel: (key) => set((st) => ({
    revealedPanels: new Set([...st.revealedPanels, key]),
  })),
  setRitual: (patch) => set(patch),
  reset: () => set({
    phase: 'sleep',
    voiceAmp: 0,
    voiceActive: false,
    launches: {},
    revealedPanels: new Set<string>(),
    ...RITUAL_DEFAULTS,
  }),
}));
