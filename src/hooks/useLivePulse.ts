// v2.0 ALIVE MODE — Live pulse.
//
// During the `ready` phase, JARVIS keeps pulling fresh data every 30s
// and broadcasts it through the zustand `pulse` slice. Panels subscribe
// to their slice of the pulse and re-render (with a subtle flash) when
// their data changes. The briefing is no longer a terminal state — the
// kiosk becomes a living dashboard.

import { useEffect } from 'react';
import { useJarvis } from '@/state/store';

const REFRESH_MS = 30_000;

export function useLivePulse() {
  const phase = useJarvis((s) => s.phase);
  const setPulse = useJarvis((s) => s.setPulse);

  useEffect(() => {
    if (phase !== 'ready') return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pullOnce = async () => {
      if (!alive) return;
      try {
        const [crypto, stripe, weather, system] = await Promise.all([
          (window as any).jarvis?.getCrypto?.().catch(() => null),
          (window as any).jarvis?.getStripe?.().catch(() => null),
          (window as any).jarvis?.getWeather?.().catch(() => null),
          (window as any).jarvis?.getSystem?.().catch(() => null),
        ]);
        if (!alive) return;

        const patch: Parameters<typeof setPulse>[0] = {};
        if (crypto?.btc?.price) patch.btc = { price: crypto.btc.price, change: crypto.btc.change ?? 0 };
        if (crypto?.eth?.price) patch.eth = { price: crypto.eth.price, change: crypto.eth.change ?? 0 };
        if (stripe && !stripe.error) {
          patch.stripeToday = Math.round((stripe.todayCents ?? 0) / 100);
          patch.stripeWeek  = Math.round((stripe.weekCents  ?? 0) / 100);
          patch.stripeCount = stripe.todayCount ?? 0;
        }
        if (weather && !weather.error && typeof weather.temp === 'number') {
          patch.weather = { temp: weather.temp, cond: weather.cond ?? '' };
        }
        if (system && typeof system.cpu === 'number') {
          patch.cpu = system.cpu;
        }
        if (Object.keys(patch).length > 0) setPulse(patch);
      } catch {}
      if (alive) timer = setTimeout(pullOnce, REFRESH_MS);
    };

    // Fire immediately on entering ready, then every 30s.
    pullOnce();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [phase, setPulse]);
}
