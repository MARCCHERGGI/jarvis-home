/**
 * Feeds — proof-of-life for the FeedAdapter contract.
 *
 *   npx tsx examples/feeds/main.ts
 *
 * Subscribes to the three mock feeds (trading / news / social),
 * prints a snapshot, then streams live updates for ~60 seconds.
 *
 * Wire your own adapters by replacing the imports below — same
 * shape, no other code changes. See `docs/feeds.md`.
 */
import {
  mockTradingFeed,
  mockNewsFeed,
  mockSocialFeed,
} from '../../src/feeds';
import type {
  TradingFeed,
  NewsFeed,
  SocialFeed,
  TradingTick,
  NewsItem,
  SocialPost,
} from '../../src/feeds/types';

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const violet = (s: string) => `\x1b[35m${s}\x1b[0m`;
const gold = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function fmtMoney(n: number, dp = 2) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

function printTradingSnapshot(ticks: TradingTick[]) {
  console.log(bold('\n  TRADING · MARKETS'));
  for (const t of ticks) {
    const color = t.change24h >= 0 ? green : red;
    const sign = t.change24h >= 0 ? '+' : '';
    console.log(
      `    ${cyan(t.symbol.padEnd(5))} ${fmtMoney(t.price, t.price < 10 ? 4 : 2).padStart(12)} ${color(
        `${sign}${t.change24h.toFixed(2)}%`,
      )}`,
    );
  }
}

function printNewsSnapshot(items: NewsItem[]) {
  console.log(bold('\n  NEWS · MONITOR'));
  for (const n of items) {
    const tag =
      n.importance === 'high' ? red('●') : n.importance === 'med' ? gold('●') : dim('●');
    console.log(`    ${tag} ${dim(n.source.padEnd(10))} ${n.title}`);
  }
}

function printSocialSnapshot(items: SocialPost[]) {
  console.log(bold('\n  SOCIAL · MONITOR'));
  for (const p of items) {
    const author = violet(p.author.padEnd(20));
    const eng = p.engagement?.likes ? dim(`(♥ ${p.engagement.likes})`) : '';
    console.log(`    ${dim(`[${p.platform}]`.padEnd(12))} ${author} ${p.text} ${eng}`);
  }
}

async function snapshot(
  trading: TradingFeed,
  news: NewsFeed,
  social: SocialFeed,
) {
  const [t, n, s] = await Promise.all([
    trading.fetch({ limit: 5 }),
    news.fetch({ limit: 4 }),
    social.fetch({ limit: 4 }),
  ]);
  printTradingSnapshot(t);
  printNewsSnapshot(n);
  printSocialSnapshot(s);
}

async function main() {
  const trading = mockTradingFeed;
  const news = mockNewsFeed;
  const social = mockSocialFeed;

  console.log(dim('── jarvis feeds — adapter proof of life ──────────'));
  console.log(`    trading: ${cyan(trading.name)} — ${trading.describe()}`);
  console.log(`    news   : ${cyan(news.name)} — ${news.describe()}`);
  console.log(`    social : ${cyan(social.name)} — ${social.describe()}`);

  await snapshot(trading, news, social);

  console.log(dim('\n── streaming updates for 60s (Ctrl-C to stop) ────'));

  const unsubs: Array<() => void> = [];
  unsubs.push(
    trading.subscribe?.((t) => {
      const color = t.change24h >= 0 ? green : red;
      const sign = t.change24h >= 0 ? '+' : '';
      console.log(
        `  ${dim('▸')} ${cyan(t.symbol)} ${fmtMoney(t.price, t.price < 10 ? 4 : 2)} ${color(
          `${sign}${t.change24h.toFixed(2)}%`,
        )}`,
      );
    }) ?? (() => {}),
  );
  unsubs.push(
    news.subscribe?.((n) => {
      console.log(`  ${dim('▸')} ${gold('NEWS')} ${dim(n.source)} ${n.title}`);
    }) ?? (() => {}),
  );
  unsubs.push(
    social.subscribe?.((p) => {
      console.log(`  ${dim('▸')} ${violet(p.platform)} ${dim(p.author)} ${p.text}`);
    }) ?? (() => {}),
  );

  await new Promise<void>((resolve) => setTimeout(resolve, 60_000));
  for (const u of unsubs) u();
  console.log(dim('\n── done ──'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
