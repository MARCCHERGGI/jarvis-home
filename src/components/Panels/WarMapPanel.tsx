import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { panelBase, CYAN, CYAN_DIM, CYAN_FAINT, GREEN, AMBER } from './styles';
import { Corners } from './primitives';

// OVERNIGHT REPORT — what your agents did while you slept
const TASKS = [
  { agent: 'SCOUT',  task: 'Scanned 12 trending AI repos',    status: 'done' as const, time: '03:14' },
  { agent: 'POSTER', task: 'Published LinkedIn post (42 likes)', status: 'done' as const, time: '04:22' },
  { agent: 'TRADER', task: 'Rebalanced BTC position +0.3%',   status: 'done' as const, time: '02:48' },
  { agent: 'SENTINEL', task: 'Blocked 3 suspicious login attempts', status: 'done' as const, time: '01:55' },
  { agent: 'SCRIBE', task: 'Generated weekly analytics report', status: 'done' as const, time: '05:10' },
  { agent: 'BROKER', task: 'Found 2 freelance leads ($2K+)',   status: 'new' as const, time: '04:50' },
  { agent: 'CURATOR', task: 'Organized 18 vault photos',       status: 'done' as const, time: '03:40' },
];

export function WarMapPanel({ delay = 0 }: { delay?: number }) {
  const [visibleTasks, setVisibleTasks] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setVisibleTasks(v => Math.min(v + 1, TASKS.length));
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        ...panelBase, width: 460,
        background: 'linear-gradient(180deg, rgba(4,10,20,0.82), rgba(2,6,14,0.92))',
      }}
    >
      <Corners />
      <div style={{ padding: '16px 18px 14px' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.25em',
          color: CYAN, marginBottom: 10,
        }}>◉ OVERNIGHT REPORT</div>

        {/* Summary stats */}
        <div style={{
          display: 'flex', gap: 20,
          paddingBottom: 14, borderBottom: `1px solid ${CYAN_FAINT}`,
        }}>
          {[
            { label: 'TASKS', value: '47', color: CYAN },
            { label: 'REVENUE', value: '+$340', color: GREEN },
            { label: 'UPTIME', value: '99.97%', color: GREEN },
            { label: 'ALERTS', value: '3', color: AMBER },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--display)', fontSize: 22, fontWeight: 300,
                color: s.color, textShadow: `0 0 8px ${s.color}`,
              }}>{s.value}</div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 7, color: CYAN_DIM,
                letterSpacing: '0.2em', marginTop: 2,
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Task feed */}
        <div style={{ marginTop: 10 }}>
          {TASKS.slice(0, visibleTasks).map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr 38px',
                gap: 8,
                padding: '7px 0',
                borderBottom: `1px solid ${CYAN_FAINT}`,
                alignItems: 'center',
              }}
            >
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                color: CYAN, letterSpacing: '0.08em',
                textShadow: `0 0 4px ${CYAN}`,
              }}>{t.agent}</div>
              <div style={{
                fontSize: 11.5, color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.3,
              }}>{t.task}</div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 8,
                color: t.status === 'new' ? AMBER : CYAN_DIM,
                textAlign: 'right',
                textShadow: t.status === 'new' ? `0 0 4px ${AMBER}` : 'none',
              }}>{t.status === 'new' ? '● NEW' : t.time}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
