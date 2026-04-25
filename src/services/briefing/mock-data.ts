export type NewsItem = { id: string; source: string; headline: string; time: string };
export type MarketItem = { symbol: string; price: number; change: number };

export const MOCK_NEWS: NewsItem[] = [
  { id: '1', source: 'Bloomberg', headline: 'Fed signals pause as core PCE softens', time: '06:12' },
  { id: '2', source: 'Reuters',   headline: 'NVIDIA announces next-gen inference stack', time: '05:48' },
  { id: '3', source: 'WSJ',       headline: 'Manhattan office leasing hits 2019 levels', time: '05:31' },
  { id: '4', source: 'FT',        headline: 'OpenAI to open European HQ in Dublin', time: '04:55' },
];

export const MOCK_MARKETS: MarketItem[] = [
  { symbol: 'BTC',  price: 118_420.12, change:  1.84 },
  { symbol: 'ETH',  price:   4_203.55, change:  2.12 },
  { symbol: 'SOL',  price:     212.04, change: -0.45 },
  { symbol: 'NVDA', price:     146.88, change:  1.12 },
  { symbol: 'TSLA', price:     268.92, change: -0.88 },
  { symbol: 'SPY',  price:     612.40, change:  0.22 },
];

// ──────────────────────────────────────────────────────────────────
// Briefing scripts — script + matching panel cue keywords.
// The PUBLIC repo ships GENERIC_SCRIPT only. Personal/branded variants
// (e.g. someone's actual market thesis, follower count, evening events)
// live in `morning.private.ts` which is gitignored. If that file is
// present locally it overrides GENERIC_SCRIPT at build time via Vite glob.
// ──────────────────────────────────────────────────────────────────

export type PanelKey = 'social' | 'trading' | 'bitcoin' | 'schedule' | 'music';

export type ScriptCue = {
  key: PanelKey;
  /** Substring in `text` that triggers this panel reveal. `null` = fire instantly. */
  keyword: string | null;
};

export type ScriptDefinition = {
  text: string;
  cues: ScriptCue[];
};

// PUBLIC, ships in OSS. Edit freely — this is the "your turn to make it yours" copy.
// Variables in {{double-braces}} are interpolated by the brain at runtime; missing
// ones collapse to empty string, so the script gracefully degrades.
const GENERIC_SCRIPT: ScriptDefinition = {
  text:
    `The agents are awake — markets are moving and signals are showing up. ` +
    `Bitcoin is holding the trend with the rest of the majors close behind. ` +
    `The social monitoring layer caught fresh momentum across your channels overnight. ` +
    `Meanwhile, I've opened the mini panels — fresh AI, your socials, your stack. ` +
    `Finally, you have items on your calendar today. Let's get to it.`,
  cues: [
    { key: 'music',    keyword: null },                      // opens instantly — underscore
    { key: 'trading',  keyword: 'agents are awake' },        // top-of-briefing macro line
    { key: 'bitcoin',  keyword: 'Bitcoin is holding' },      // crypto callout
    { key: 'social',   keyword: 'social monitoring layer' }, // social panel
    { key: 'schedule', keyword: 'items on your calendar' },  // calendar / events
  ],
};

// Try to load a private override at build time. The glob returns an empty map
// if the file doesn't exist (i.e. on a public clone), so this is safe.
let _active: ScriptDefinition = GENERIC_SCRIPT;
try {
  const privates = import.meta.glob<{ default: ScriptDefinition }>(
    './morning.private.ts',
    { eager: true }
  );
  const first = Object.values(privates)[0];
  if (first?.default?.text && first.default.cues) {
    _active = first.default;
  }
} catch {
  /* keep generic */
}

export const ACTIVE_SCRIPT: ScriptDefinition = _active;

/** Public accessor for the current cue list — keeps useWakeSequence script-agnostic. */
export function getActiveCues(): ScriptCue[] {
  return ACTIVE_SCRIPT.cues;
}

// ──────────────────────────────────────────────────────────────────
// Day variants — currently all the same, but the structure is here for
// you to swap the script by weekday, weekend, holiday, etc.
// ──────────────────────────────────────────────────────────────────
const dayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });
const isWeekend = () => [0, 6].includes(new Date().getDay());
const isFriday = () => new Date().getDay() === 5;
const isMonday = () => new Date().getDay() === 1;

const WEEKDAY = ACTIVE_SCRIPT.text;
const MONDAY  = ACTIVE_SCRIPT.text;
const FRIDAY  = ACTIVE_SCRIPT.text;
const WEEKEND = ACTIVE_SCRIPT.text;

export const CINEMATIC_SCRIPT =
  isWeekend() ? WEEKEND :
  isMonday()  ? MONDAY :
  isFriday()  ? FRIDAY :
  WEEKDAY;

// ──────────────────────────────────────────────────────────────────
// Segments + brain context — used by useWakeSequence.
// ──────────────────────────────────────────────────────────────────
export type Segment = { text: string; openPanel?: PanelKey };

const SMALL = ['zero','one','two','three','four','five','six','seven','eight','nine',
               'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function toWords(n: number): string {
  n = Math.round(n);
  if (n < 0) return 'minus ' + toWords(-n);
  if (n < 20) return SMALL[n];
  if (n < 100) return TENS[Math.floor(n/10)] + (n % 10 ? '-' + SMALL[n%10] : '');
  if (n < 1000) return SMALL[Math.floor(n/100)] + ' hundred' + (n % 100 ? ' ' + toWords(n%100) : '');
  if (n < 10000) {
    const thou = Math.floor(n/1000);
    const rest = n % 1000;
    return toWords(thou) + ' thousand' + (rest ? ' ' + toWords(rest) : '');
  }
  const thou = Math.floor(n/1000);
  const rest = n % 1000;
  return toWords(thou) + ' thousand' + (rest ? ', ' + toWords(rest) : '');
}

export type BriefingContext = {
  stripeTodayUsd?: number;
  stripeWeekUsd?: number;
  stripeTxnCount?: number;
  btcPrice?: number;
  btcChange?: number;
  ethPrice?: number;
  weatherTemp?: number;
  weatherCond?: string;
};

export const SEGMENTS: Segment[] = [
  { text: CINEMATIC_SCRIPT, openPanel: 'social' },
];

/**
 * Build ONE flowing briefing. Returns a single segment using the active script.
 * Single TTS render = no cascading latency.
 */
export function buildSegments(_ctx: BriefingContext): Segment[] {
  return [{ text: CINEMATIC_SCRIPT, openPanel: 'social' }];
}

export const BRIEFING_LINES = [CINEMATIC_SCRIPT];

export const stripTags = (s: string) => s.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
