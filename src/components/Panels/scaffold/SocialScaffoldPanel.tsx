import type { CSSProperties } from 'react';
import {
  accentedPanel,
  ACCENT,
  panelHeader,
  panelBody,
  mono,
  display,
} from '../styles';
import { useFeed } from './useFeed';
import { mockSocialFeed } from '@/feeds';
import type { SocialFeed, SocialPost, SocialPlatform } from '@/feeds/types';
import { ScaffoldFooter, microLabel, RelativeTime } from './primitives';

// ──────────────────────────────────────────────────────────────
// SocialScaffoldPanel — generic social media monitor.
//
//   <SocialScaffoldPanel feed={mockSocialFeed} />
//
// Swap `feed` for X / Reddit / Mastodon / Bluesky / HN. The
// shape — `SocialPost` — is the contract. See `docs/feeds.md`.
// ──────────────────────────────────────────────────────────────

const PANEL_WIDTH = 320;

interface Props {
  feed?: SocialFeed;
  title?: string;
  limit?: number;
  pollMs?: number;
}

const PLATFORM_LABEL: Partial<Record<SocialPlatform, string>> = {
  x: 'X',
  reddit: 'REDDIT',
  hackernews: 'HN',
  bluesky: 'BSKY',
  mastodon: 'MASTODON',
  instagram: 'IG',
  tiktok: 'TT',
};

const PLATFORM_COLOR: Partial<Record<SocialPlatform, string>> = {
  x: '#ffffff',
  reddit: '#ff7b3d',
  hackernews: '#ff9b5a',
  bluesky: '#6cf4ff',
  mastodon: '#b088ff',
  instagram: '#ff6bc4',
  tiktok: '#7fff9b',
};

function platformLabel(p: SocialPlatform) {
  return PLATFORM_LABEL[p] ?? String(p).toUpperCase();
}
function platformColor(p: SocialPlatform) {
  return PLATFORM_COLOR[p] ?? 'rgba(255,255,255,0.85)';
}

const rowStyle: CSSProperties = {
  padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const headerLine: CSSProperties = {
  ...mono,
  fontSize: 9,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: 'rgba(255,255,255,0.55)',
};

const tagPill = (color: string): CSSProperties => ({
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: 999,
  fontSize: 8,
  letterSpacing: '0.22em',
  color,
  border: `1px solid ${color}55`,
  background: `${color}10`,
});

const textStyle: CSSProperties = {
  ...display,
  fontSize: 13,
  fontWeight: 400,
  color: '#fff',
  lineHeight: 1.35,
  letterSpacing: '-0.005em',
};

const engagementStyle: CSSProperties = {
  ...mono,
  fontSize: 10,
  color: 'rgba(255,255,255,0.5)',
  fontVariantNumeric: 'tabular-nums',
  display: 'flex',
  gap: 12,
  marginTop: 4,
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function PostRow({ post }: { post: SocialPost }) {
  const color = platformColor(post.platform);
  return (
    <div style={rowStyle}>
      <div style={headerLine}>
        <span style={tagPill(color)}>{platformLabel(post.platform)}</span>
        <span style={{ color: 'rgba(255,255,255,0.78)' }}>{post.author}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <RelativeTime ts={post.ts} />
      </div>
      <div style={textStyle}>{post.text}</div>
      {post.engagement && (
        <div style={engagementStyle}>
          {post.engagement.likes !== undefined && <span>♥ {fmt(post.engagement.likes)}</span>}
          {post.engagement.replies !== undefined && <span>↵ {fmt(post.engagement.replies)}</span>}
          {post.engagement.reshares !== undefined && <span>↻ {fmt(post.engagement.reshares)}</span>}
        </div>
      )}
    </div>
  );
}

export function SocialScaffoldPanel({
  feed = mockSocialFeed,
  title = 'SOCIAL · MONITOR',
  limit = 5,
  pollMs = 18_000,
}: Props) {
  const { items, loading } = useFeed(feed, { limit, pollMs });

  return (
    <div style={{ ...accentedPanel(ACCENT.gold), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>{title}</span>
        <span style={{ color: '#f5c76a' }}>●</span>
      </div>
      <div style={panelBody}>
        <div style={{ ...microLabel, marginBottom: 6 }}>
          {items.length} posts · {feed.name}
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
            tuning…
          </div>
        ) : (
          items.map((p) => <PostRow key={p.id} post={p} />)
        )}
        <ScaffoldFooter>
          mock feed · swap with your provider →&nbsp;
          <code style={{ color: 'rgba(108,244,255,0.65)' }}>docs/feeds.md</code>
        </ScaffoldFooter>
      </div>
    </div>
  );
}
