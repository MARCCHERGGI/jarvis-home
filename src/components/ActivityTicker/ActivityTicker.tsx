import { motion } from 'framer-motion';

const ITEMS = [
  { type: 'MARKET', text: 'Oil futures +4.2% · XOM breakout confirmed · LMT @ 52w high' },
  { type: 'SOCIAL', text: '@a16z_partner followed · 42 likes on LinkedIn · 3 inbound DMs' },
  { type: 'INTEL',  text: 'Strait of Hormuz radar: 2 elevated contacts · IRGC patrol shift' },
  { type: 'AGENT',  text: 'GAMMA · long LMT 500sh · +3.6% · ETA · long BTC · +5.1%' },
  { type: 'SYSTEM', text: 'CPU 34% · GPU 12% · Reactor nominal · 7 agents online' },
  { type: 'NEWS',   text: 'Fed pause confirmed · Nvidia inference stack v2 · OpenAI Dublin HQ' },
];

export function ActivityTicker({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8 }}
      style={{
        position: 'absolute',
        bottom: 24,
        left: 40, right: 40,
        height: 44,
        background: 'linear-gradient(180deg, rgba(6,12,22,0.6), rgba(2,6,12,0.8))',
        border: '1px solid rgba(108,244,255,0.2)',
        borderRadius: 3,
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Label on left */}
      <div style={{
        padding: '0 16px',
        borderRight: '1px solid rgba(108,244,255,0.15)',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '0.25em',
        color: '#6cf4ff',
        textShadow: '0 0 8px #6cf4ff',
        display: 'flex', alignItems: 'center', gap: 8,
        minWidth: 130,
        height: '100%',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#7fff9b',
          boxShadow: '0 0 8px #7fff9b',
          animation: 'jv-blink 1.2s ease-in-out infinite',
        }} />
        LIVE · FEED
      </div>

      {/* Ticker content */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
      }}>
        <div style={{
          display: 'flex',
          gap: 56,
          alignItems: 'center',
          height: '100%',
          whiteSpace: 'nowrap',
          animation: 'jv-ticker 55s linear infinite',
          paddingLeft: 32,
        }}>
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <span key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              fontFamily: 'var(--mono)',
              fontSize: 12,
            }}>
              <span style={{
                fontSize: 9,
                color: '#6cf4ff',
                letterSpacing: '0.2em',
                padding: '2px 8px',
                border: '1px solid rgba(108,244,255,0.35)',
                borderRadius: 2,
              }}>{item.type}</span>
              <span style={{ color: 'rgba(255,255,255,0.82)' }}>{item.text}</span>
            </span>
          ))}
        </div>
        {/* Edge fade */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: 60,
          background: 'linear-gradient(90deg, rgba(2,6,12,1), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: 60,
          background: 'linear-gradient(270deg, rgba(2,6,12,1), transparent)',
          pointerEvents: 'none',
        }} />
      </div>
    </motion.div>
  );
}
