import type { NewsFeed, NewsItem } from './types';

// ──────────────────────────────────────────────────────────────
// MockNewsFeed — rotating headline pool.
//
// A small bank of evergreen-feeling lines stamped with a fresh
// timestamp on each fetch. Useful for designing layouts without
// burning a NewsAPI quota.
//
// Wire NewsAPI / GDELT / RSS / a custom crawler by mirroring the
// shape — `docs/feeds.md` has a 20-line NewsAPI example.
// ──────────────────────────────────────────────────────────────

interface HeadlinePool {
  title: string;
  source: string;
  importance?: NewsItem['importance'];
  summary?: string;
}

const POOL: HeadlinePool[] = [
  {
    title: 'Markets open mixed after overnight chip rally cools',
    source: 'Reuters',
    importance: 'med',
    summary: 'Asia futures pared gains; semis still leading the tape.',
  },
  {
    title: 'Open-source LLM eclipses last-month\'s frontier on coding evals',
    source: 'arXiv',
    importance: 'high',
    summary: 'Reproducibility kit shipped with the paper — single-GPU inference.',
  },
  {
    title: 'Fed minutes signal patience as inflation cools',
    source: 'Bloomberg',
    importance: 'med',
  },
  {
    title: 'Manhattan office vacancies tick down for the third month',
    source: 'WSJ',
    importance: 'low',
  },
  {
    title: 'Gold breaks past $2,500 as central banks keep buying',
    source: 'FT',
    importance: 'high',
  },
  {
    title: 'Apple ships on-device personalisation API at WWDC keynote',
    source: 'The Verge',
    importance: 'med',
  },
  {
    title: 'Severe weather watch issued for the Tri-State area tonight',
    source: 'NWS',
    importance: 'high',
  },
  {
    title: 'GitHub trending today: a 200-line clone of yesterday\'s viral CLI',
    source: 'GitHub',
    importance: 'low',
  },
  {
    title: 'Strait of Hormuz transit fees climb on insurance premiums',
    source: 'Lloyds',
    importance: 'med',
  },
  {
    title: 'New CDC dashboard shows respiratory illness flat-lining',
    source: 'CDC',
    importance: 'low',
  },
  {
    title: 'Semiconductor exports to top destinations beat estimates',
    source: 'Nikkei',
    importance: 'med',
  },
  {
    title: 'European Parliament approves AI compute disclosure rule',
    source: 'Politico EU',
    importance: 'high',
  },
];

function pickRotated(now: number, limit: number): NewsItem[] {
  const minute = Math.floor(now / 60_000);
  const out: NewsItem[] = [];
  for (let i = 0; i < Math.min(limit, POOL.length); i++) {
    const idx = (minute + i * 7) % POOL.length;
    const h = POOL[idx];
    out.push({
      id: `news-${minute}-${idx}`,
      ts: now - i * 60_000 - (i * 17_000) % 240_000,
      ...h,
    });
  }
  return out;
}

export function createMockNewsFeed(): NewsFeed {
  return {
    name: 'mock-news',
    describe: () => 'rotating evergreen headlines for offline development',
    async fetch({ limit = 8 } = {}) {
      return pickRotated(Date.now(), limit);
    },
    subscribe(handler) {
      let cancelled = false;
      const id = setInterval(() => {
        if (cancelled) return;
        const [item] = pickRotated(Date.now(), 1);
        if (item) handler(item);
      }, 30_000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    },
  };
}

export const mockNewsFeed: NewsFeed = createMockNewsFeed();
