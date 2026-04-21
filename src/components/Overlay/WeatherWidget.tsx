import { useEffect, useState } from 'react';
import { CYAN, CYAN_DIM, CYAN_FAINT, GREEN, AMBER } from '@/components/Panels/styles';

const COND_ICON: Record<string, string> = {
  CLEAR: '☀', 'MAINLY CLEAR': '☀', 'PARTLY CLOUDY': '⛅', OVERCAST: '☁',
  FOG: '🌫', DRIZZLE: '🌦', RAIN: '🌧', 'HEAVY RAIN': '⛈',
  SNOW: '❄', 'HEAVY SNOW': '❄', STORM: '⛈', HAIL: '🌨',
};

export function WeatherWidget() {
  const [w, setW] = useState<any>(null);
  useEffect(() => {
    const fetch = async () => {
      const d = await (window as any).jarvis?.getWeather();
      if (d && !d.error) setW(d);
    };
    fetch();
    const id = setInterval(fetch, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!w) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 40, left: 20,
      padding: '10px 14px',
      background: 'rgba(4,10,20,0.7)',
      border: `1px solid rgba(108,244,255,0.25)`,
      backdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', gap: 12,
      pointerEvents: 'none',
      zIndex: 101,
      fontFamily: 'var(--mono)',
    }}>
      <div style={{ fontSize: 24 }}>{COND_ICON[w.cond] ?? '◦'}</div>
      <div>
        <div style={{
          fontFamily: 'var(--display)', fontSize: 20, fontWeight: 300,
          color: '#fff', lineHeight: 1,
        }}>{w.temp}°</div>
        <div style={{ fontSize: 8, letterSpacing: '0.15em', color: CYAN_DIM, marginTop: 2 }}>
          {w.cond} · {w.high}°/{w.low}°
        </div>
      </div>
      <div style={{
        borderLeft: `1px solid ${CYAN_FAINT}`, paddingLeft: 12,
        fontSize: 9, color: CYAN_DIM, letterSpacing: '0.12em',
      }}>
        <div>WIND {w.wind}MPH</div>
        <div>HUM {w.humidity}%</div>
      </div>
    </div>
  );
}
