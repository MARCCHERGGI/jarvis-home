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

/**
 * The 12-second cinematic monologue. One flowing line — no dead air.
 * Audio tags ([warm], [confident], etc.) steer v3 delivery.
 * Structure: greet → ground in time/place → state of world → handoff → call to action.
 */
// Main-character cinematic briefing. JARVIS-style observational cadence,
// personalized, layered with real-world context: markets, geopolitics, socials.
// Punctuation handles pacing — no emotion tags.
// Date-aware briefing — picks variant based on weekday.
const dayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });
const isWeekend = () => [0, 6].includes(new Date().getDay());
const isFriday = () => new Date().getDay() === 5;
const isMonday = () => new Date().getDay() === 1;

// Single flowing ~8-second monologue. The whole briefing — one breath,
// one TTS render, zero cascading lag. Tuned for Alice's British cadence:
// short clauses, hard consonants, no clutter. Weaves in the real layers
// of Marco's world: trading agents, energy markets, Strait of Hormuz,
// Bitcoin, and the e-commerce team shaping his new product.
// Single flowing ~14s monologue with three distinct topic beats.
// Panel reveals in useWakeSequence fire at offsets that line up with
// when each topic is spoken — the orb "places" the page right as Alice
// mentions it.
//
//   beat 1 (t≈ 1.2s)  → SOCIAL
//   beat 2 (t≈ 6.8s)  → TRADING
//   beat 3 (t≈10.5s)  → SCHEDULE
// JARVIS system briefing — formal, measured, Paul-Bettany cadence.
// MUSIC (AC/DC) opens at t≈0 so it plays under the whole narration.
// Panels reveal as their topic is spoken.
//
//   0.1s  MUSIC     (opens as briefing begins)
//   3.7s  TRADING   ("Global markets showing increased volatility…")
//   9.0s  BITCOIN   ("Bitcoin is currently holding trend…")
//  11.5s  SOCIAL    ("You gained three hundred fifty-six new followers…")
const SCRIPT =
  `Good morning, Marco. Systems are online. ` +
  `Global markets are showing increased volatility. ` +
  `Strait of Hormuz tensions are escalating. ` +
  `Your AI trading systems are active. ` +
  `Bitcoin is currently holding trend. ` +
  `You gained three hundred fifty-six new followers across your platforms. ` +
  `Growth momentum is accelerating. ` +
  `New opportunities detected. ` +
  `What would you like to execute today?`;

const WEEKDAY = SCRIPT;
const MONDAY  = SCRIPT;
const FRIDAY  = SCRIPT;
const WEEKEND = SCRIPT;

export const CINEMATIC_SCRIPT =
  isWeekend() ? WEEKEND :
  isMonday()  ? MONDAY :
  isFriday()  ? FRIDAY :
  WEEKDAY;

// Structured briefing — each sentence is a separate ElevenLabs render.
// `openPanel` fires RIGHT BEFORE that sentence plays → guaranteed 1:1 sync.
export type PanelKey = 'social' | 'trading' | 'bitcoin' | 'schedule' | 'music';
export type Segment = { text: string; openPanel?: PanelKey };

// ── Number-to-spoken conversion for natural TTS delivery ──
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
  // 10_000+ — speak as grouped thousands, e.g. 118_420 → "one hundred eighteen thousand, four hundred twenty"
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

// Fallback (used before live data arrives, or when APIs fail).
export const SEGMENTS: Segment[] = [
  { text: CINEMATIC_SCRIPT, openPanel: 'social' },
];

/**
 * Build ONE flowing ~8-second briefing.
 * Returns a single segment using the day-aware CINEMATIC_SCRIPT.
 * Single TTS render = no cascading latency.
 */
export function buildSegments(_ctx: BriefingContext): Segment[] {
  return [{ text: CINEMATIC_SCRIPT, openPanel: 'social' }];
}

/** Kept for fallback engines that can't handle a single long line. */
export const BRIEFING_LINES = [CINEMATIC_SCRIPT];

export const stripTags = (s: string) => s.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
