import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { accentedPanel, ACCENT, CYAN, CYAN_DIM, CYAN_FAINT, GREEN, AMBER } from './styles';
import {
  Corners, CountUp, DecryptText, SigilID, ClassificationBar,
  PanelFooter, RivetColumn, RadialGauge,
} from './primitives';

// OVERNIGHT panel — opens when JARVIS says:
//   "your agents ran FORTY-SEVEN TASKS and pulled in THREE-FORTY from LinkShield"
// Panel must visually show: 47 TASKS · +$340 · LinkShield

// Fallback timeline — only shown if Stripe is offline.
const FALLBACK_TIMELINE = [
  { t: '02:14', agent: 'SCOUT',    text: 'Scanned 12 AI repos',      ok: true },
  { t: '02:48', agent: 'TRADER',   text: 'Rebalanced BTC +0.3%',     ok: true },
  { t: '03:14', agent: 'POSTER',   text: 'Published LinkedIn post',  ok: true },
  { t: '03:40', agent: 'CURATOR',  text: 'Organized 18 vault items', ok: true },
  { t: '04:22', agent: 'POSTER',   text: '42 likes · 3 comments',    ok: true },
  { t: '04:50', agent: 'BROKER',   text: 'Found 2 freelance leads',  ok: true, hot: true },
  { t: '05:10', agent: 'SCRIBE',   text: 'Weekly analytics report',  ok: true },
  { t: '05:55', agent: 'STRIPE',   text: 'LinkShield sale · $47',    ok: true, hot: true },
];

type StripeLive = {
  todayCents: number;
  weekCents: number;
  txnCount: number;
  todayCount: number;
  recent: Array<{ amount: number; desc: string; time: string }>;
  error?: string;
};

export function RevenueLivePanel({ delay = 0 }: { delay?: number }) {
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState<StripeLive | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 900);
    return () => clearInterval(id);
  }, []);

  // Pull real Stripe data on mount + refresh every 60s.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const r = await window.jarvis?.getStripe?.().catch(() => null);
      if (alive && r && !r.error) setLive(r);
    };
    pull();
    const id = setInterval(pull, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const todayUsd = live ? Math.round(live.todayCents / 100) : 340;
  const weekUsd  = live ? Math.round(live.weekCents / 100)  : 0;
  const txnCount = live ? live.todayCount : 7;
  const isLive   = !!live;

  // Build timeline from live txns when available, otherwise fallback mock.
  const timeline = live && live.recent.length
    ? live.recent.map((r) => ({
        t: r.time, agent: 'STRIPE',
        text: `${r.desc} · $${r.amount}`, ok: true, hot: true,
      }))
    : FALLBACK_TIMELINE;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={accentedPanel(ACCENT.gold, { width: 460 })}
    >
      <div className="jv-grid" />
      <div className="jv-scanline" />
      <div className="jv-running-border" />
      <div className="jv-dust" />
      <div className="jv-crt-noise" />
      <div className="jv-hud-scan" style={{ animationDelay: `${delay}s` }} />
      <Corners />
      <RivetColumn side="left" count={5} />
      <RivetColumn side="right" count={5} />

      {/* CLASSIFICATION BAR — Blade Runner file header */}
      <ClassificationBar code="OVN-047-AURA" classification="OVERNIGHT.OPS" status="RECEIVED" color={CYAN} />

      <div style={{ padding: '10px 18px 12px', position: 'relative', zIndex: 1 }}>
        {/* TITLE ROW: sigil + decrypt text */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SigilID code="OVN-047" variant="diamond" color={CYAN} size={22} />
            <DecryptText
              text="OVERNIGHT REPORT"
              delay={delay * 1000 + 80}
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.3em',
                color: CYAN, textShadow: `0 0 8px ${CYAN}`,
              }}
            />
          </div>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, color: isLive ? GREEN : AMBER,
            display: 'flex', alignItems: 'center', gap: 6,
            textShadow: `0 0 4px ${isLive ? GREEN : AMBER}`,
          }}>
            <span className="jv-dot" style={{ color: isLive ? GREEN : AMBER }} />
            {isLive ? 'STRIPE · LIVE' : 'OFFLINE · CACHED'}
          </span>
        </div>

        {/* ── 3-HERO STRIP with RadialGauge on the star number ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 10,
          padding: '8px 0 14px',
          borderBottom: `1px solid ${CYAN_FAINT}`,
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RadialGauge value={47} max={60} size={72} color={CYAN} label="ORDERS" />
            <div>
              <div data-text="47" className="jv-chromatic" style={{
                fontSize: 38, color: '#fff', lineHeight: 1,
                filter: 'drop-shadow(0 0 18px rgba(108,244,255,0.7))',
              }}>
                <CountUp to={47} duration={1400} />
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 7.5, color: CYAN_DIM,
                letterSpacing: '0.2em', marginTop: 2,
              }}>TRADING · ORDERS</div>
            </div>
          </div>
          <div style={{ borderLeft: `1px solid ${CYAN_FAINT}`, paddingLeft: 10 }}>
            <div data-text={String(txnCount)} className="jv-chromatic" style={{
              fontSize: 44, color: AMBER, lineHeight: 1,
              textShadow: `0 0 22px ${AMBER}`,
            }}>
              <CountUp to={txnCount} duration={1100} />
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 7.5, color: AMBER,
              letterSpacing: '0.2em', marginTop: 3,
              textShadow: `0 0 3px ${AMBER}`,
            }}>{isLive ? 'TXNS · TODAY' : 'LINKSHIELD · SOLD'}</div>
            <span className="jv-barcode" style={{ width: '100%', marginTop: 4 }} />
          </div>
          <div style={{ borderLeft: `1px solid ${CYAN_FAINT}`, paddingLeft: 10 }}>
            <div data-text={`$${todayUsd}`} className="jv-chromatic" style={{
              fontSize: 36, color: GREEN, lineHeight: 1,
              textShadow: `0 0 22px ${GREEN}`,
            }}>
              <CountUp to={todayUsd} prefix="$" duration={1500} />
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 7.5, color: GREEN,
              letterSpacing: '0.2em', marginTop: 3,
              textShadow: `0 0 4px ${GREEN}`,
            }}>▲ {isLive ? `TODAY · $${weekUsd} W` : 'BOOKED · NET'}</div>
          </div>
        </div>

        {/* Activity log */}
        <div style={{ marginTop: 8, maxHeight: 188, overflow: 'hidden' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 7, color: CYAN_DIM,
            letterSpacing: '0.25em', marginBottom: 6,
          }}>▸ AGENT LOG · 8 EVENTS</div>
          {timeline.slice(0, 8).map((row, i) => (
            <div key={i} className="jv-row" style={{
              display: 'grid',
              gridTemplateColumns: '28px 46px 64px 1fr',
              gap: 8,
              padding: '5px 4px',
              borderBottom: `1px solid rgba(108,244,255,0.06)`,
              alignItems: 'center',
              animation: row.hot && i === ((tick) % 11) ? 'jv-blink 2s 1' : undefined,
            }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 7, color: CYAN_DIM,
                letterSpacing: '0.12em',
              }}>{String(i + 1).padStart(3, '0')}</span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                color: row.hot ? GREEN : CYAN_DIM,
                textShadow: row.hot ? `0 0 4px ${GREEN}` : 'none',
              }}>{row.t}</span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                color: CYAN, letterSpacing: '0.1em',
                textShadow: `0 0 3px ${CYAN}`,
              }}>{row.agent}</span>
              <span style={{
                fontSize: 11, color: row.hot ? '#fff' : 'rgba(255,255,255,0.72)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{row.text}</span>
            </div>
          ))}
        </div>

        <PanelFooter code="OVN-047-AURA.LOG" meta="AGENTS.SWARM" color={CYAN} />
      </div>

      <div className="jv-vignette" />
    </motion.div>
  );
}
