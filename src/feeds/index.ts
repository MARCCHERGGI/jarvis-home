// FeedAdapter — JARVIS's fifth plugin contract.
//
// Implement one of these and the panels in
// `src/components/Panels/scaffold/` will render it.
// See `docs/feeds.md` for the full contract + reference wirings.

export type {
  FeedItem,
  FeedAdapter,
  FeedFetchOpts,
  TradingFeed,
  TradingTick,
  NewsFeed,
  NewsItem,
  SocialFeed,
  SocialPost,
  SocialPlatform,
} from './types';

export { createMockTradingFeed, mockTradingFeed } from './mock-trading';
export { createMockNewsFeed, mockNewsFeed } from './mock-news';
export { createMockSocialFeed, mockSocialFeed } from './mock-social';
