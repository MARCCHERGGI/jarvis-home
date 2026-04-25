import { useEffect, useRef, useState } from 'react';
import type { FeedAdapter, FeedItem } from '@/feeds/types';

// ──────────────────────────────────────────────────────────────
// useFeed — drive a panel from any FeedAdapter.
//
// Prefers `subscribe` (push) when the adapter implements it.
// Falls back to polling at `pollMs`. Falls back to a single
// snapshot when both are unavailable.
//
// Returns `{ items, loading, error }`. Items are newest-first,
// capped at `limit`.
// ──────────────────────────────────────────────────────────────

export interface UseFeedOptions {
  /** Cap displayed items (also passed to the adapter's fetch). Default 10. */
  limit?: number;
  /** Poll interval in ms when no `subscribe` exists. 0 = fetch once. Default 30_000. */
  pollMs?: number;
}

export interface UseFeedResult<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
  /** Manual refetch. Useful from a panel header refresh button. */
  refresh: () => void;
}

export function useFeed<T extends FeedItem>(
  adapter: FeedAdapter<T>,
  opts: UseFeedOptions = {},
): UseFeedResult<T> {
  const { limit = 10, pollMs = 30_000 } = opts;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const versionRef = useRef(0);

  const tick = async () => {
    const myVersion = ++versionRef.current;
    try {
      const next = await adapter.fetch({ limit });
      if (myVersion !== versionRef.current) return;
      setItems(next);
      setError(null);
      setLoading(false);
    } catch (e) {
      if (myVersion !== versionRef.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    void tick();

    if (typeof adapter.subscribe === 'function') {
      unsub = adapter.subscribe((item) => {
        if (cancelled) return;
        setItems((prev) => {
          const dedup = prev.filter((p) => p.id !== item.id);
          return [item, ...dedup].slice(0, limit);
        });
      });
    } else if (pollMs > 0) {
      const loop = () => {
        timer = setTimeout(async () => {
          if (cancelled) return;
          await tick();
          if (!cancelled) loop();
        }, pollMs);
      };
      loop();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, limit, pollMs]);

  return { items, loading, error, refresh: () => void tick() };
}
