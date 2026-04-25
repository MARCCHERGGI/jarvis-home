import type { SocialFeed, SocialPost, SocialPlatform } from './types';

// ──────────────────────────────────────────────────────────────
// MockSocialFeed — rotating multi-platform post pool.
//
// Posts cycle with a timestamp window so the panel feels alive.
// Wire X, Reddit, Mastodon, Bluesky, the HN firehose — same shape.
// ──────────────────────────────────────────────────────────────

interface PostSeed {
  platform: SocialPlatform;
  author: string;
  text: string;
  baseLikes: number;
  baseReplies?: number;
  baseReshares?: number;
}

const POOL: PostSeed[] = [
  {
    platform: 'x',
    author: '@karpathy',
    text: 'best 2-hour intro to transformers I\'ve seen — link in thread.',
    baseLikes: 8420,
    baseReplies: 162,
    baseReshares: 2100,
  },
  {
    platform: 'hackernews',
    author: 'pg',
    text: 'Show HN: a 200-line static-site generator written this weekend.',
    baseLikes: 942,
    baseReplies: 187,
  },
  {
    platform: 'reddit',
    author: 'r/MachineLearning',
    text: '[D] Why does cosine similarity outperform L2 here?',
    baseLikes: 412,
    baseReplies: 88,
  },
  {
    platform: 'bluesky',
    author: '@ada.bsky',
    text: 'The font you\'re using is 12% of your design. The rest is the air around it.',
    baseLikes: 318,
    baseReplies: 24,
    baseReshares: 92,
  },
  {
    platform: 'x',
    author: '@levelsio',
    text: 'Shipped a tiny side project. Made $42 in the first hour. Loving the indie life.',
    baseLikes: 5_200,
    baseReplies: 240,
    baseReshares: 612,
  },
  {
    platform: 'mastodon',
    author: '@sarah@hachyderm',
    text: 'Postgres 17 fixed the foot-gun I filed against pg13. Five years.',
    baseLikes: 220,
    baseReplies: 18,
  },
  {
    platform: 'instagram',
    author: '@marcohergi',
    text: 'Manhattan from the FDR at 6:14 AM — color of money.',
    baseLikes: 1_840,
    baseReplies: 96,
  },
  {
    platform: 'tiktok',
    author: '@codingwithcat',
    text: '60-second walkthrough of yesterday\'s viral CLI tool.',
    baseLikes: 12_400,
    baseReplies: 320,
    baseReshares: 1_900,
  },
  {
    platform: 'reddit',
    author: 'r/personalfinance',
    text: 'Simple emergency-fund script: 3 buckets, no apps, no spreadsheets.',
    baseLikes: 2_140,
    baseReplies: 144,
  },
  {
    platform: 'hackernews',
    author: 'tptacek',
    text: 'Most "AI security" guides re-derive 2003 web security and miss the new attack surface.',
    baseLikes: 1_840,
    baseReplies: 312,
  },
];

function noise(seed: number, salt: number) {
  return Math.abs(Math.sin(seed * 9.301 + salt * 4.117));
}

function pickRotated(now: number, limit: number): SocialPost[] {
  const bucket = Math.floor(now / 90_000);
  const out: SocialPost[] = [];
  for (let i = 0; i < Math.min(limit, POOL.length); i++) {
    const idx = (bucket + i * 3) % POOL.length;
    const seed = POOL[idx];
    const drift = noise(bucket, idx);
    out.push({
      id: `social-${bucket}-${idx}`,
      ts: now - i * 27_000,
      platform: seed.platform,
      author: seed.author,
      text: seed.text,
      engagement: {
        likes: Math.round(seed.baseLikes * (0.85 + drift * 0.5)),
        replies: seed.baseReplies
          ? Math.round(seed.baseReplies * (0.85 + drift * 0.5))
          : undefined,
        reshares: seed.baseReshares
          ? Math.round(seed.baseReshares * (0.85 + drift * 0.5))
          : undefined,
      },
    });
  }
  return out;
}

export function createMockSocialFeed(): SocialFeed {
  return {
    name: 'mock-social',
    describe: () =>
      'rotating multi-platform posts for offline development',
    async fetch({ limit = 8 } = {}) {
      return pickRotated(Date.now(), limit);
    },
    subscribe(handler) {
      let cancelled = false;
      const id = setInterval(() => {
        if (cancelled) return;
        const [item] = pickRotated(Date.now(), 1);
        if (item) handler(item);
      }, 18_000);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    },
  };
}

export const mockSocialFeed: SocialFeed = createMockSocialFeed();
