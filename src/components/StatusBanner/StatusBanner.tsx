import { useEffect, useState } from 'react';
import { useJarvis } from '@/state/store';
import { ampBus } from '@/services/audio/ampBus';

export function StatusBanner() {
  const phase = useJarvis((s) => s.phase);
  const [now, setNow] = useState(new Date());
  const [amp, setAmp] = useState(0);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 500);
    const ampTick = setInterval(() => setAmp(ampBus.amp), 60);
    return () => { clearInterval(clock); clearInterval(ampTick); };
  }, []);

  if (phase !== 'briefing' && phase !== 'ready') return null;

  const hh = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const ss = now.getSeconds().toString().padStart(2, '0');
  const ms = now.getMilliseconds().toString().padStart(3, '0').slice(0, 2);
  const dd = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      position: 'absolute', top: 24, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-between',
      padding: '0 44px',
      pointerEvents: 'none',
      fontFamily: 'var(--mono)',
      fontSize: 10,
      letterSpacing: '0.18em',
      color: 'rgba(108, 244, 255, 0.7)',
    }}>
      {/* Left: time */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <div>
          <div style={{
            fontSize: 36, fontWeight: 200, letterSpacing: '0.02em',
            fontFamily: 'var(--display)', color: '#fff',
            lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {hh}
            <span style={{ color: 'rgba(108,244,255,0.6)', fontSize: 20, marginLeft: 6 }}>
              :{ss}<span style={{ opacity: 0.5, fontSize: 14 }}>.{ms}</span>
            </span>
          </div>
          <div style={{ marginTop: 2, opacity: 0.6 }}>{dd.toUpperCase()}</div>
        </div>
        <div style={{
          borderLeft: '1px solid rgba(108,244,255,0.2)',
          paddingLeft: 20, marginLeft: 6,
        }}>
          <div style={{ fontSize: 9, opacity: 0.55 }}>LAT · LON</div>
          <div style={{ color: '#fff', fontSize: 11, letterSpacing: '0.1em' }}>40.7233°N · 74.0030°W</div>
          <div style={{ fontSize: 9, opacity: 0.55, marginTop: 3 }}>SECURE · TLS 1.3</div>
        </div>
      </div>

      {/* Right: JARVIS status + VU */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, opacity: 0.55 }}>SESSION</div>
          <div style={{ color: '#fff', fontSize: 11, letterSpacing: '0.1em' }}>MH · NYC-01</div>
          <div style={{ fontSize: 9, opacity: 0.55, marginTop: 3 }}>UPTIME · 00:00:{ss}</div>
        </div>
        <div style={{
          borderLeft: '1px solid rgba(108,244,255,0.2)',
          paddingLeft: 20,
          minWidth: 120,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#6cf4ff',
              boxShadow: `0 0 8px #6cf4ff`,
              animation: 'jv-blink 1.4s ease-in-out infinite',
            }} />
            <span style={{ color: '#6cf4ff', fontSize: 11 }}>JARVIS · ONLINE</span>
          </div>
          <div style={{ marginTop: 5, display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const h = 2 + (Math.sin(Date.now() / 120 + i * 0.5) * 0.5 + 0.5) * amp * 13 + (i * 0.1);
              return (
                <span key={i} style={{
                  width: 2, height: Math.max(2, h),
                  background: '#6cf4ff',
                  opacity: 0.4 + amp * 0.6,
                  transition: 'height 60ms linear',
                }} />
              );
            })}
          </div>
          <div style={{ fontSize: 9, opacity: 0.55, marginTop: 3 }}>VOICE · {(amp * 100).toFixed(0).padStart(3, '0')}%</div>
        </div>
      </div>
    </div>
  );
}
