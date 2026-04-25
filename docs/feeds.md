# Feeds — the data plugins

A **FeedAdapter** is a normalized wrapper around any external data source you
want JARVIS to see — markets, news, social, weather, your own internal swarm.
The framework doesn't care where the data comes from. It cares about the shape.

Trading swarm? Wrap it in a `TradingFeed`.
RSS reader? Wrap it in a `NewsFeed`.
Bluesky firehose? Wrap it in a `SocialFeed`.

Then the scaffold panels in `src/components/Panels/scaffold/` render them, no
provider-specific UI code anywhere.

## Interface

```ts
import type { FeedAdapter } from 'jarvis-home/feeds';

export const myAdapter: FeedAdapter<MyItem> = {
  name: 'my-adapter',
  describe: () => 'one-line description for ops + docs',

  async fetch({ limit, since } = {}) {
    // pull a snapshot
    return [/* …items, newest first… */];
  },

  // optional — implement when the source supports push
  subscribe(handler) {
    const id = setInterval(async () => {
      const next = await poll();
      next.forEach(handler);
    }, 5_000);
    return () => clearInterval(id);
  },

  // optional — adapter returns false when env/keys missing
  available() {
    return Boolean(process.env.MY_KEY);
  },
};
```

When `subscribe` exists, the panels use it and skip polling. When it doesn't,
they call `fetch` on the panel's `pollMs` interval.

## The three shapes that ship

```ts
interface TradingTick {
  id: string;
  ts: number;
  symbol: string;
  price: number;
  change24h: number;
  currency?: string;
  sparkline?: number[];
}

interface NewsItem {
  id: string;
  ts: number;
  title: string;
  source: string;
  url?: string;
  summary?: string;
  importance?: 'low' | 'med' | 'high';
}

interface SocialPost {
  id: string;
  ts: number;
  platform: 'x' | 'reddit' | 'instagram' | 'tiktok' | 'mastodon' | 'bluesky' | 'hackernews' | string;
  author: string;
  text: string;
  url?: string;
  engagement?: { likes?: number; replies?: number; reshares?: number };
}
```

Anything that satisfies one of these renders for free. Add fields if you need
them; the scaffold panels ignore unknown keys.

## Reference: mock adapters

The three reference implementations in `src/feeds/`:

| Adapter            | Describe                                            |
| ------------------ | --------------------------------------------------- |
| `mockTradingFeed`  | deterministic synthetic ticks, BTC/ETH/SOL/SPY/GLD  |
| `mockNewsFeed`     | rotating evergreen headline pool                    |
| `mockSocialFeed`   | rotating multi-platform post pool                   |

Useful while you're designing layouts. Burn them as soon as you have a real
provider.

## Wiring a real provider — three working examples

### Trading: CoinGecko (no key required)

```ts
import type { TradingFeed } from 'jarvis-home/feeds';

const SYMBOLS = ['bitcoin', 'ethereum', 'solana'];

export const coinGeckoFeed: TradingFeed = {
  name: 'coingecko',
  describe: () => 'CoinGecko free-tier price endpoint',
  async fetch({ limit = SYMBOLS.length } = {}) {
    const ids = SYMBOLS.slice(0, limit).join(',');
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    );
    if (!r.ok) throw new Error(`coingecko ${r.status}`);
    const data = await r.json();
    const now = Date.now();
    const labels: Record<string, string> = {
      bitcoin: 'BTC',
      ethereum: 'ETH',
      solana: 'SOL',
    };
    return Object.entries(data).map(([id, v]: any) => ({
      id: `${id}-${now}`,
      ts: now,
      symbol: labels[id] ?? id.toUpperCase(),
      price: v.usd,
      change24h: v.usd_24h_change ?? 0,
    }));
  },
};
```

### News: NewsAPI (free tier — 100 req/day, dev-only key)

```ts
import type { NewsFeed } from 'jarvis-home/feeds';

export const newsApiFeed: NewsFeed = {
  name: 'newsapi',
  describe: () => 'NewsAPI top-headlines endpoint',
  available: () => Boolean(process.env.NEWSAPI_KEY),
  async fetch({ limit = 10 } = {}) {
    const r = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=${limit}`,
      { headers: { 'X-Api-Key': process.env.NEWSAPI_KEY! } },
    );
    if (!r.ok) throw new Error(`newsapi ${r.status}`);
    const { articles } = await r.json();
    return articles.map((a: any, i: number) => ({
      id: a.url ?? `na-${i}`,
      ts: a.publishedAt ? Date.parse(a.publishedAt) : Date.now(),
      title: a.title,
      source: a.source?.name ?? 'NewsAPI',
      url: a.url,
      summary: a.description ?? undefined,
      importance: 'med' as const,
    }));
  },
};
```

### Social: Hacker News (no key, JSON firehose)

```ts
import type { SocialFeed } from 'jarvis-home/feeds';

export const hackerNewsFeed: SocialFeed = {
  name: 'hackernews',
  describe: () => 'HN top stories — public, no key required',
  async fetch({ limit = 10 } = {}) {
    const idsRes = await fetch(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
    );
    const ids: number[] = await idsRes.json();
    const top = ids.slice(0, limit);
    const stories = await Promise.all(
      top.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json()),
      ),
    );
    return stories.map((s: any) => ({
      id: String(s.id),
      ts: s.time * 1000,
      platform: 'hackernews' as const,
      author: s.by ?? 'anon',
      text: s.title,
      url: s.url ?? `https://news.ycombinator.com/item?id=${s.id}`,
      engagement: { likes: s.score, replies: s.descendants ?? 0 },
    }));
  },
};
```

## Mounting in a UI

```tsx
import {
  TradingScaffoldPanel,
  NewsScaffoldPanel,
  SocialScaffoldPanel,
} from '@/components/Panels/scaffold';
import { coinGeckoFeed } from './my-feeds/coingecko';
import { newsApiFeed } from './my-feeds/newsapi';
import { hackerNewsFeed } from './my-feeds/hackernews';

export function MyHud() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <TradingScaffoldPanel feed={coinGeckoFeed} />
      <NewsScaffoldPanel feed={newsApiFeed} />
      <SocialScaffoldPanel feed={hackerNewsFeed} />
    </div>
  );
}
```

Same panels. Different data. That's the contract.

## Things to get right

- **Resolve `fetch` with newest-first items.** Most panels render top-down.
- **Stable `id` field.** React keys + de-dup depend on it.
- **Honor `limit`.** Returning 1,000 rows when the panel asked for 5 is wasteful.
- **Don't throw on transient network failures.** Return `[]` and let the
  retry loop take over, OR throw — pick one and document it.
- **Throttle `subscribe`.** A 60Hz handler will saturate React's render path.
  10s–60s for news, 1s–10s for trading, ~5s–30s for social is reasonable.
