import type { CSSProperties } from 'react';
import { TradingScaffoldPanel } from './TradingScaffoldPanel';
import { NewsScaffoldPanel } from './NewsScaffoldPanel';
import { SocialScaffoldPanel } from './SocialScaffoldPanel';
import type { TradingFeed, NewsFeed, SocialFeed } from '@/feeds/types';

// ──────────────────────────────────────────────────────────────
// ScaffoldGrid — drop-in trio of scaffold panels.
//
// Use during dev to see all three modules at once. In production
// you almost certainly want to lay these out yourself, in your
// own HUD.
// ──────────────────────────────────────────────────────────────

interface Props {
  trading?: TradingFeed;
  news?: NewsFeed;
  social?: SocialFeed;
  /** Wraps the grid — pass position, gap, etc. */
  style?: CSSProperties;
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
  padding: 16,
  alignItems: 'start',
};

export function ScaffoldGrid({ trading, news, social, style }: Props) {
  return (
    <div style={{ ...gridStyle, ...style }}>
      <TradingScaffoldPanel feed={trading} />
      <NewsScaffoldPanel feed={news} />
      <SocialScaffoldPanel feed={social} />
    </div>
  );
}
