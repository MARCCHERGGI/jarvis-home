// Scaffold panels — generic, provider-driven HUD modules.
//
// Each one consumes a `FeedAdapter` from `@/feeds`. Default to
// the mock adapters; pass `feed={…}` to wire a real provider.
//
// See `docs/feeds.md` for the contract and reference wirings.

export { TradingScaffoldPanel } from './TradingScaffoldPanel';
export { NewsScaffoldPanel } from './NewsScaffoldPanel';
export { SocialScaffoldPanel } from './SocialScaffoldPanel';
export { ScaffoldGrid } from './ScaffoldGrid';
export { useFeed } from './useFeed';
export type { UseFeedOptions, UseFeedResult } from './useFeed';
