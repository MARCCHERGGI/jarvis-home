import { useEffect, useRef, useState } from 'react';
import { CYAN, CYAN_DIM, GREEN, RED } from '@/components/Panels/styles';

// Top-of-screen ticker with live crypto prices
function CryptoTicker() {
  const [prices, setPrices] = useState<any>(null);
  useEffect(() => {
    const fetch = async () => {
      const d = await (window as any).jarvis?.getCrypto();
      if (d) setPrices(d);
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  const items = [
    { sym: 'BTC', d: prices?.btc },
    { sym: 'ETH', d: prices?.eth },
    { sym: 'SOL', d: prices?.sol },
    { sym: 'NASDAQ', d: { price: 19420, change: 0.84 } },
    { sym: 'GOLD', d: { price: 2714, change: 0.32 } },
    { sym: 'BRENT', d: { price: 87.42, change: 4.21 } },
    { sym: 'VIX',  d: { price: 14.2, change: -2.1 } },
    { sym: 'SPY',  d: { price: 612.4, change: 0.22 } },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 28,
      background: 'linear-gradient(180deg, rgba(0,8,16,0.95), rgba(0,4,10,0.85))',
      borderBottom: `1px solid rgba(108,244,255,0.25)`,
      overflow: 'hidden',
      display: 'flex', alignItems: 'center',
      zIndex: 100,
      pointerEvents: 'none',
    }}>
      <div style={{
        padding: '0 14px',
        borderRight: `1px solid rgba(108,244,255,0.2)`,
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.25em',
        color: CYAN, textShadow: `0 0 6px ${CYAN}`,
        height: '100%', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: GREEN, boxShadow: `0 0 6px ${GREEN}`,
          animation: 'jv-blink 1.2s ease-in-out infinite',
        }} />
        MARKET TAPE
      </div>
      <div style={{
        flex: 1, display: 'flex', whiteSpace: 'nowrap',
        animation: 'jv-ticker 45s linear infinite',
      }}>
        {[...items, ...items].map((item, i) => {
          if (!item.d) return null;
          const pos = (item.d.change ?? 0) >= 0;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px',
              fontFamily: 'var(--mono)', fontSize: 11,
            }}>
              <span style={{ color: CYAN, letterSpacing: '0.1em' }}>{item.sym}</span>
              <span style={{ color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                ${item.d.price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              <span style={{
                color: pos ? GREEN : RED,
                textShadow: `0 0 4px ${pos ? GREEN : RED}`,
              }}>
                {pos ? '▲' : '▼'} {Math.abs(item.d.change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Chronometer with ms precision
function Chronometer() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // 250ms = 4Hz, still reads as "live" ms digits. Was 53ms = 19Hz —
    // a hidden React re-render storm.
    const id = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(id);
  }, []);
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');
  const ms = now.getMilliseconds().toString().padStart(3, '0').slice(0, 2);
  return (
    <div style={{
      position: 'absolute',
      bottom: 14, left: '50%', transform: 'translateX(-50%)',
      fontFamily: 'var(--mono)',
      fontSize: 11, letterSpacing: '0.3em',
      color: CYAN,
      display: 'flex', gap: 4,
      pointerEvents: 'none',
      textShadow: `0 0 10px rgba(108,244,255,0.5)`,
      zIndex: 101,
    }}>
      <span>T</span>
      <span style={{ color: '#fff' }}>{hh}</span>
      <span>:</span>
      <span style={{ color: '#fff' }}>{mm}</span>
      <span>:</span>
      <span style={{ color: '#fff' }}>{ss}</span>
      <span style={{ color: CYAN_DIM }}>.{ms}</span>
      <span style={{ marginLeft: 16, color: CYAN_DIM }}>UTC−04 · EDT</span>
    </div>
  );
}

// Cursor trail particles
function CursorGlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -100, y: -100, active: false });
  const particlesRef = useRef<Array<{ x: number; y: number; life: number; size: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let raf = 0;
    let lastMoveT = 0;
    let dirty = false;  // canvas has non-clear content that needs clearing

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
      lastMoveT = performance.now();
      for (let i = 0; i < 2; i++) {
        particlesRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          life: 1,
          size: 1 + Math.random() * 2,
        });
      }
    };
    window.addEventListener('mousemove', onMove);

    const tick = () => {
      const now = performance.now();
      const hasParticles = particlesRef.current.length > 0;
      const mouseRecent = (now - lastMoveT) < 600;

      // Idle fast-path — no particles, mouse hasn't moved in a while.
      // Skip full-screen clear + draw entirely. This was the silent lag
      // source burning a full compositor frame every 16ms forever.
      if (!hasParticles && !mouseRecent) {
        if (dirty) {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          dirty = false;
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = 'lighter';
      dirty = true;

      particlesRef.current = particlesRef.current.filter(p => {
        p.life -= 0.025;
        if (p.life <= 0) return false;
        ctx.fillStyle = `rgba(108, 244, 255, ${p.life * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // Main cursor glow — only while mouse recent.
      if (mouseRecent && mouseRef.current.active) {
        const { x, y } = mouseRef.current;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 50);
        grad.addColorStop(0, 'rgba(108, 244, 255, 0.25)');
        grad.addColorStop(1, 'rgba(108, 244, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 50, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none',
        zIndex: 9998,
        // mixBlendMode removed — forced compositor to blend this full-
        // screen layer against everything underneath every paint, even
        // when the canvas was empty. Visual diff is trivial since the
        // trail uses low-alpha cyan anyway.
      }}
    />
  );
}

// Ambient edge particles (subtle)
function AmbientEdges() {
  return (
    <>
      {/* Top glow bar */}
      <div style={{
        position: 'absolute', top: 28, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(108,244,255,0.4), transparent)',
        boxShadow: '0 0 12px rgba(108,244,255,0.3)',
        pointerEvents: 'none',
        zIndex: 99,
      }} />
      {/* Bottom glow bar */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(108,244,255,0.25), transparent)',
        pointerEvents: 'none',
        zIndex: 99,
      }} />
    </>
  );
}

// System status indicators floating top-right — LIVE from main process.
function SystemIndicators() {
  const [sys, setSys] = useState<any>(null);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const s = await (window as any).jarvis?.getSystem?.().catch(() => null);
      if (alive && s && typeof s.cpu === 'number') setSys(s);
    };
    pull();
    const id = setInterval(pull, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Real FPS counter via requestAnimationFrame sampling.
  useEffect(() => {
    let frames = 0;
    let t0 = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - t0 >= 1000) {
        setFps(Math.round((frames * 1000) / (now - t0)));
        frames = 0;
        t0 = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cpuPct = sys ? Math.round(sys.cpu * 100) : null;
  const memPct = sys ? Math.round(sys.mem * 100) : null;
  const cpuColor = cpuPct !== null && cpuPct > 80 ? '#ff6b6b' : CYAN_DIM;
  const fpsColor = fps >= 55 ? GREEN : fps >= 30 ? '#ffb86c' : '#ff6b6b';

  return (
    <div style={{
      position: 'absolute',
      top: 36, right: 16,
      display: 'flex', gap: 14,
      fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em',
      color: CYAN_DIM,
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      <span style={{ color: cpuColor }}>CPU {cpuPct !== null ? `${cpuPct}%` : '—'}</span>
      <span>MEM {memPct !== null ? `${memPct}%` : '—'}</span>
      <span style={{ color: GREEN }}>● TLS</span>
      <span style={{ color: sys ? GREEN : CYAN_DIM }}>● SYS</span>
      <span style={{ color: fpsColor }}>{fps} FPS</span>
    </div>
  );
}

export function GlobalHUD() {
  return (
    <>
      <CryptoTicker />
      <AmbientEdges />
      <SystemIndicators />
      <Chronometer />
      <CursorGlow />
    </>
  );
}
