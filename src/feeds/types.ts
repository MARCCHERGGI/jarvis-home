// ──────────────────────────────────────────────────────────────
// FeedAdapter — the fifth plugin contract.
//
// Brain talks. Voice speaks. Scene renders. Script schedules.
// Feed *streams* — the world outside JARVIS, normalized into
// shapes the panels know how to render.
//
// Implement one of these (or wrap an existing API) and JARVIS
// will display it. The mock adapters in this folder show the
// shape; `docs/feeds.md` walks through wiring real providers.
// ──────────────────────────────────────────────────────────────

export interface FeedItem {
  /** Stable id — used for React keys and de-duplication. */
  id: string;
  /** Unix milliseconds. */
  ts: number;
}

// ─── Trading ──────────────────────────────────────────────────

export interface TradingTick extends FeedItem {
  /** e.g. "BTC", "ETH", "SPY", "EUR/USD". Adapter-defined. */
  symbol: string;
  /** Last price in `currency` (default USD). */
  price: number;
  /** 24h change as a percent — -3.2 means down 3.2%. */
  change24h: number;
  /** Optional 3-letter ISO. Defaults to USD when omitted. */
  currency?: string;
  /** Optional sparkline series, oldest → newest. Used by the panel. */
  sparkline?: number[];
}

// ─── News ─────────────────────────────────────────────────────

export interface NewsItem extends FeedItem {
  title: string;
  source: string;
  url?: string;
  summary?: string;
  /** Adapter's signal. JARVIS uses this to color the row. */
  importance?: 'low' | 'med' | 'high';
}

// ─── Social ───────────────────────────────────────────────────

export type SocialPlatform =
  | 'x'
  | 'reddit'
  | 'instagram'
  | 'tiktok'
  | 'mastodon'
  | 'bluesky'
  | 'hackernews'
  | (string & {});

export interface SocialPost extends FeedItem {
  platform: SocialPlatform;
  author: string;
  text: string;
  url?: string;
  engagement?: {
    likes?: number;
    replies?: number;
    reshares?: number;
  };
}

// ─── The contract ─────────────────────────────────────────────

export interface FeedFetchOpts {
  /** Cap items returned. Default: adapter's choice (usually ~10). */
  limit?: number;
  /** Filter: only items newer than this unix-ms timestamp. */
  since?: number;
}

export interface FeedAdapter<T extends FeedItem> {
  /** Short identifier — `coingecko`, `newsapi`, `x-firehose`, … */
  name: string;
  /** One-line description for ops + docs. */
  describe(): string;
  /** Pull the latest snapshot. Required. */
  fetch(opts?: FeedFetchOpts): Promise<T[]>;
  /**
   * Optional push channel. If implemented, the panel uses it instead
   * of polling — call `handler(item)` whenever a new item arrives.
   * Return an unsubscribe function.
   */
  subscribe?(handler: (item: T) => void): () => void;
  /** Optional gate — adapter returns false when env/keys are missing. */
  available?(): boolean;
}

export type TradingFeed = FeedAdapter<TradingTick>;
export type NewsFeed = FeedAdapter<NewsItem>;
export type SocialFeed = FeedAdapter<SocialPost>;
