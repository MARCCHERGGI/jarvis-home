# `examples/feeds`

Smoke test for the **FeedAdapter** plugin contract — the fifth and most
data-hungry of JARVIS's pluggable surfaces.

```bash
npx tsx examples/feeds/main.ts
```

You should see snapshot tables for trading / news / social, then a 60-second
stream of pushed updates. No keys, no network — everything routed through the
mock adapters in `src/feeds/`.

## What it proves

- `FeedAdapter.fetch()` works for one-shot snapshots.
- `FeedAdapter.subscribe()` works for live push.
- The shapes (`TradingTick`, `NewsItem`, `SocialPost`) carry enough info that a
  scaffold panel can render usefully without provider-specific code.

## Wire a real provider

Swap any of the three imports at the top of `main.ts` for a real adapter —
CoinGecko, NewsAPI, Bluesky firehose, your own crawler. Same call signature,
same console output.

The full contract walkthrough — including a 20-line CoinGecko wiring — lives in
[`docs/feeds.md`](../../docs/feeds.md).
