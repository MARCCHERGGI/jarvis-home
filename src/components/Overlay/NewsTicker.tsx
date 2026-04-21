import { useEffect, useState } from 'react';
import { CYAN, CYAN_DIM, CYAN_FAINT, AMBER } from '@/components/Panels/styles';

export function NewsTicker() {
  const [stories, setStories] = useState<any[]>([]);
  useEffect(() => {
    const fetch = async () => {
      const d = await (window as any).jarvis?.getNews();
      if (Array.isArray(d)) setStories(d);
    };
    fetch();
    const id = setInterval(fetch, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  if (stories.length === 0) return null;
  return (
    <div style={{
      position: 'absolute',
      bottom: 40, left: 0, right: 0,
      height: 26,
      background: 'linear-gradient(180deg, rgba(4,10,20,0.85), rgba(0,4,10,0.9))',
      borderTop: `1px solid rgba(108,244,255,0.2)`,
      borderBottom: `1px solid rgba(108,244,255,0.1)`,
      overflow: 'hidden',
      display: 'flex', alignItems: 'center',
      zIndex: 99,
      pointerEvents: 'none',
    }}>
      <div style={{
        padding: '0 14px', height: '100%',
        borderRight: `1px solid ${CYAN_FAINT}`,
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.25em',
        color: AMBER, textShadow: `0 0 6px ${AMBER}`,
        minWidth: 130,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: AMBER, boxShadow: `0 0 6px ${AMBER}`,
          animation: 'jv-blink 1.4s ease-in-out infinite',
        }} />
        HN · TECH
      </div>
      <div style={{
        flex: 1, display: 'flex', whiteSpace: 'nowrap',
        animation: 'jv-ticker 60s linear infinite',
      }}>
        {[...stories, ...stories].map((s, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, alignItems: 'center',
            padding: '0 24px',
            fontFamily: 'var(--mono)', fontSize: 10.5,
          }}>
            <span style={{
              color: AMBER, fontSize: 9,
              minWidth: 28, textAlign: 'right',
            }}>↑{s.score}</span>
            <span style={{ color: '#fff' }}>{s.title}</span>
            <span style={{ color: CYAN_DIM, fontSize: 9 }}>· {s.comments ?? 0} comments</span>
          </div>
        ))}
      </div>
    </div>
  );
}
