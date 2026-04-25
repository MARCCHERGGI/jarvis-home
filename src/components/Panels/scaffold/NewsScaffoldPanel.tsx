import type { CSSProperties } from 'react';
import {
  accentedPanel,
  ACCENT,
  panelHeader,
  panelBody,
  mono,
  display,
  CYAN,
} from '../styles';
import { useFeed } from './useFeed';
import { mockNewsFeed } from '@/feeds';
import type { NewsFeed, NewsItem } from '@/feeds/types';
import { ScaffoldFooter, microLabel, RelativeTime } from './primitives';

// ──────────────────────────────────────────────────────────────
// NewsScaffoldPanel — generic news monitor.
//
//   <NewsScaffoldPanel feed={mockNewsFeed} />
//
// Swap `feed` with a real adapter — NewsAPI, GDELT, RSS, your
// own crawler. See `docs/feeds.md`.
// ──────────────────────────────────────────────────────────────

const PANEL_WIDTH = 320;

interface Props {
  feed?: NewsFeed;
  title?: string;
  limit?: number;
  pollMs?: number;
}

const rowStyle: CSSProperties = {
  padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const titleStyle: CSSProperties = {
  ...display,
  fontSize: 13,
  fontWeight: 400,
  color: '#fff',
  lineHeight: 1.3,
  letterSpacing: '-0.005em',
};

const metaStyle: CSSProperties = {
  ...mono,
  fontSize: 9,
  letterSpacing: '0.18em',
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const importanceColor: Record<NonNullable<NewsItem['importance']>, string> = {
  high: '#ff9b5a',
  med: CYAN,
  low: 'rgba(255,255,255,0.45)',
};

function ImportanceDot({ level }: { level?: NewsItem['importance'] }) {
  if (!level) return null;
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: importanceColor[level],
        boxShadow: `0 0 6px ${importanceColor[level]}`,
      }}
    />
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <div style={rowStyle}>
      <div style={metaStyle}>
        <ImportanceDot level={item.importance} />
        <span>{item.source}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <RelativeTime ts={item.ts} />
      </div>
      <div style={titleStyle}>{item.title}</div>
      {item.summary && (
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.4,
            marginTop: 2,
          }}
        >
          {item.summary}
        </div>
      )}
    </div>
  );
}

export function NewsScaffoldPanel({
  feed = mockNewsFeed,
  title = 'NEWS · MONITOR',
  limit = 5,
  pollMs = 30_000,
}: Props) {
  const { items, loading } = useFeed(feed, { limit, pollMs });

  return (
    <div style={{ ...accentedPanel(ACCENT.violet), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>{title}</span>
        <span style={{ color: '#b088ff' }}>●</span>
      </div>
      <div style={panelBody}>
        <div style={{ ...microLabel, marginBottom: 6 }}>
          {items.length} headlines · {feed.name}
        </div>
        {loading && items.length === 0 ? (
          <div
            style={{
              ...mono,
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
              padding: '20px 0',
            }}
          >
            scanning…
          </div>
        ) : (
          items.map((n) => <NewsRow key={n.id} item={n} />)
        )}
        <ScaffoldFooter>
          mock feed · swap with your provider →&nbsp;
          <code style={{ color: 'rgba(108,244,255,0.65)' }}>docs/feeds.md</code>
        </ScaffoldFooter>
      </div>
    </div>
  );
}
