import type { CSSProperties } from 'react';
import {
  accentedPanel,
  ACCENT,
  panelHeader,
  panelBody,
  display,
  mono,
  GREEN,
  RED,
} from '../styles';
import { useFeed } from './useFeed';
import { mockTradingFeed } from '@/feeds';
import type { TradingFeed, TradingTick } from '@/feeds/types';
import { ScaffoldFooter, microLabel } from './primitives';

// ──────────────────────────────────────────────────────────────
// TradingScaffoldPanel — generic trading/markets panel.
//
//   <TradingScaffoldPanel feed={mockTradingFeed} />
//
// Swap `feed` for a real adapter (CoinGecko, Binance, your own
// trading swarm). The shape — `TradingTick` — is the contract.
// ──────────────────────────────────────────────────────────────

const PANEL_WIDTH = 320;

interface Props {
  feed?: TradingFeed;
  title?: string;
  /** Cap rows. Default 5. */
  limit?: number;
  /** Poll interval in ms. Default 6_000. */
  pollMs?: number;
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '54px 1fr 70px 56px',
  alignItems: 'center',
  gap: 10,
  padding: '10px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const symbolStyle: CSSProperties = {
  ...mono,
  fontSize: 11,
  letterSpacing: '0.18em',
  color: 'rgba(255,255,255,0.85)',
  textTransform: 'uppercase',
};

const priceStyle: CSSProperties = {
  ...display,
  fontSize: 18,
  fontWeight: 300,
  color: '#fff',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const changeStyle = (up: boolean): CSSProperties => ({
  ...mono,
  fontSize: 11,
  color: up ? GREEN : RED,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
});

function Sparkline({ values, up }: { values?: number[]; up: boolean }) {
  if (!values || values.length < 2) {
    return <div style={{ width: 70, height: 22 }} aria-hidden />;
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1e-6);
  const W = 70;
  const H = 22;
  const pad = 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - lo) / span) * (H - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = up ? GREEN : RED;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} aria-hidden>
      <path d={points.join(' ')} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function Row({ tick }: { tick: TradingTick }) {
  const up = tick.change24h >= 0;
  return (
    <div style={rowStyle}>
      <span style={symbolStyle}>{tick.symbol}</span>
      <Sparkline values={tick.sparkline} up={up} />
      <span style={priceStyle}>
        {tick.price.toLocaleString('en-US', {
          maximumFractionDigits: tick.price < 10 ? 4 : tick.price < 1000 ? 2 : 0,
        })}
      </span>
      <span style={changeStyle(up)}>
        {up ? '+' : ''}
        {tick.change24h.toFixed(2)}%
      </span>
    </div>
  );
}

export function TradingScaffoldPanel({
  feed = mockTradingFeed,
  title = 'TRADING · MARKETS',
  limit = 5,
  pollMs = 6_000,
}: Props) {
  const { items, loading } = useFeed(feed, { limit, pollMs });

  return (
    <div style={{ ...accentedPanel(ACCENT.amber), width: PANEL_WIDTH }}>
      <div style={panelHeader}>
        <span>{title}</span>
        <span style={{ color: '#ff9b5a' }}>●</span>
      </div>
      <div style={panelBody}>
        <div style={{ ...microLabel, marginBottom: 6 }}>
          {items.length} symbols · {feed.name}
        </div>
        {loading && items.length === 0 ? (
          <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.45)', padding: '20px 0' }}>
            connecting…
          </div>
        ) : (
          items.map((t) => <Row key={t.symbol} tick={t} />)
        )}
        <ScaffoldFooter>
          mock feed · swap with your provider →&nbsp;
          <code style={{ color: 'rgba(108,244,255,0.65)' }}>docs/feeds.md</code>
        </ScaffoldFooter>
      </div>
    </div>
  );
}
