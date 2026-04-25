import type { TradingFeed, TradingTick } from './types';

// ──────────────────────────────────────────────────────────────
// MockTradingFeed — deterministic synthetic ticks.
//
// Use as a placeholder until you wire a real provider. Drift is
// seeded by `Date.now()` divided into 6-second buckets so the
// numbers move convincingly without needing an external API.
//
// Replace with any adapter from `docs/feeds.md` — CoinGecko,
// Binance, Alpha Vantage — the panel renders the same shape.
// ──────────────────────────────────────────────────────────────

interface SymbolSeed {
  symbol: string;
  base: number;
  vol: number;
}

const DEFAULT_SYMBOLS: SymbolSeed[] = [
  { symbol: 'BTC', base: 67_400, vol: 0.018 },
  { symbol: 'ETH', base: 3_280,  vol: 0.022 },
  { symbol: 'SOL', base: 162,    vol: 0.034 },
  { symbol: 'SPY', base: 558,    vol: 0.006 },
  { symbol: 'GLD', base: 246,    vol: 0.005 },
];

function noise(seed: number, i: number): number {
  // Deterministic pseudo-random from sin — good enough for fake data,
  // and doesn't pull in a PRNG dep.
  return Math.sin(seed * 7919 + i * 5417) * 0.5 + Math.sin(seed * 1.7 + i) * 0.5;
}

function buildTick(s: SymbolSeed, bucket: number): TradingTick {
  const drift = noise(bucket, s.symbol.charCodeAt(0)) * s.vol;
  const change = drift * 100; // percent
  const price = s.base * (1 + drift);
  const sparkline: number[] = [];
  for (let i = 0; i < 28; i++) {
    const n = noise(bucket - 28 + i, s.symbol.charCodeAt(0));
    sparkline.push(s.base * (1 + n * s.vol));
  }
  return {
    id: `${s.symbol}-${bucket}`,
    ts: bucket * 6_000,
    symbol: s.symbol,
    price: Math.round(price * 100) / 100,
    change24h: Math.round(change * 100) / 100,
    currency: 'USD',
    sparkline,
  };
}

export function createMockTradingFeed(
  symbols: SymbolSeed[] = DEFAULT_SYMBOLS,
): TradingFeed {
  return {
    name: 'mock-trading',
    describe: () => 'deterministic synthetic ticks for offline development',
    async fetch({ limit } = {}) {
      const bucket = Math.floor(Date.now() / 6_000);
      const ticks = symbols.map((s) => buildTick(s, bucket));
      return typeof limit === 'number' ? ticks.slice(0, limit) : ticks;
    },
    subscribe(handler) {
      let cancelled = false;
      let cursor = Math.floor(Date.now() / 6_000);
      const tick = () => {
        if (cancelled) return;
        cursor += 1;
        for (const s of symbols) handler(buildTick(s, cursor));
      };
      const id = setInterval(tick, 6_000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    },
  };
}

export const mockTradingFeed: TradingFeed = createMockTradingFeed();
