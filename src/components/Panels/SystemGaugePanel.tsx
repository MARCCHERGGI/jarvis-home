import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { accentedPanel, ACCENT, CYAN, CYAN_DIM, CYAN_FAINT, GREEN, AMBER } from './styles';
import {
  Corners, CountUp, DecryptText, SigilID, ClassificationBar,
  PanelFooter, RivetColumn,
} from './primitives';

// TODAY panel — opens when JARVIS says:
//   "CALENDAR'S CLEAR UNTIL NOON. Here's your playbook for the day"
// Bottom strip shows live CPU/MEM pulled from electron main (every 2s).

const PRIORITIES = [
  { urgency: 'NOW',   text: 'Reply to Sarah K. · VC partner',   type: 'OUTREACH', urgent: true },
  { urgency: 'AM',    text: 'Review 2 founder DMs',             type: 'INBOX' },
  { urgency: 'AM',    text: 'Check overnight trading positions', type: 'MARKETS' },
  { urgency: 'TODAY', text: 'Ship JARVIS_HOME to production',    type: 'BUILD' },
  { urgency: 'TODAY', text: 'Record LinkShield demo video',      type: 'PRODUCT' },
];

type SysStats = { cpu: number; mem: number; cpuCount: number; memTotalGB: string; memFreeGB: string; uptimeHours: number };

function useSysStats(): SysStats | null {
  const [s, setS] = useState<SysStats | null>(null);
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const r = await window.jarvis?.getSystem?.().catch(() => null);
      if (alive && r && typeof r.cpu === 'number') setS(r);
    };
    pull();
    const id = setInterval(pull, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return s;
}

function StatCell({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 7.5, color: CYAN_DIM,
          letterSpacing: '0.2em',
        }}>{label}</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 12, color,
          textShadow: `0 0 4px ${color}`,
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
      </div>
      <div style={{
        height: 2, background: CYAN_FAINT, marginTop: 4,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${Math.min(100, Math.max(0, pct * 100))}%`,
          background: color, boxShadow: `0 0 6px ${color}`,
          transition: 'width 500ms cubic-bezier(0.22,1,0.36,1)',
        }} />
      </div>
    </div>
  );
}

export function SystemGaugePanel({ delay = 0 }: { delay?: number }) {
  const sys = useSysStats();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={accentedPanel(ACCENT.violet, { width: 460 })}
    >
      <div className="jv-grid" />
      <div className="jv-scanline" />
      <div className="jv-running-border" />
      <div className="jv-dust" />
      <div className="jv-crt-noise" />
      <div className="jv-hud-scan" style={{ animationDelay: `${delay + 1.2}s` }} />
      <Corners />
      <RivetColumn side="left" count={5} />
      <RivetColumn side="right" count={5} />

      <ClassificationBar code="PLY-005-DAY" classification="SCHEDULE.OPEN" status="CLEAR" color={GREEN} />

      <div style={{ padding: '10px 18px 12px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SigilID code="PLY-005" variant="chevron" color={AMBER} size={22} />
            <DecryptText
              text="TODAY · YOUR PLAYBOOK"
              delay={delay * 1000 + 80}
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.3em',
                color: CYAN, textShadow: `0 0 8px ${CYAN}`,
              }}
            />
          </div>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, color: GREEN,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="jv-dot" style={{ color: GREEN }} />
            CLEAR · 12:00
          </span>
        </div>

        {/* HERO: CLEAR UNTIL NOON */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '8px 0 14px',
          borderBottom: `1px solid ${CYAN_FAINT}`,
        }}>
          <div>
            <div data-text="CLEAR" className="jv-chromatic" style={{
              fontSize: 44, fontWeight: 200,
              color: GREEN, lineHeight: 1,
              textShadow: `0 0 22px ${GREEN}`,
            }}>CLEAR</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 8, color: CYAN_DIM,
              letterSpacing: '0.2em', marginTop: 4,
            }}>CALENDAR · UNTIL 12:00</div>
            <span className="jv-barcode" style={{ width: 120, marginTop: 4 }} />
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--display)', fontSize: 24, fontWeight: 300,
              color: '#fff',
              display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 4,
            }}>
              <CountUp to={5} duration={900} />
              <span style={{ fontSize: 12, color: CYAN_DIM, letterSpacing: '0.1em' }}>HRS</span>
              <CountUp to={12} duration={1100} />
              <span style={{ fontSize: 12, color: CYAN_DIM, letterSpacing: '0.1em' }}>M</span>
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 8, color: CYAN_DIM,
              letterSpacing: '0.18em', marginTop: 2,
            }}>DEEP WORK WINDOW</div>
            {/* progress bar */}
            <div style={{
              height: 3, background: CYAN_FAINT, marginTop: 6,
              position: 'relative', overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '78%' }}
                transition={{ delay: delay + 0.4, duration: 1.2, ease: 'easeOut' }}
                style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0,
                  background: `linear-gradient(90deg, ${GREEN}, ${CYAN})`,
                  boxShadow: `0 0 8px ${CYAN}`,
                }} />
            </div>
          </div>
        </div>

        {/* Priority playbook */}
        <div style={{ marginTop: 10 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 8, color: AMBER,
            letterSpacing: '0.25em', marginBottom: 8,
            textShadow: `0 0 4px ${AMBER}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ▸ 5 PRIORITIES · QUEUED FOR DEEP WORK
            <span className="jv-barcode" style={{ flex: 1, marginLeft: 4, height: 6 }} />
          </div>
          {PRIORITIES.slice(0, 5).map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.35 + i * 0.07, duration: 0.35 }}
              className="jv-row"
              style={{
                display: 'grid', gridTemplateColumns: '26px 46px 1fr 66px',
                gap: 8, padding: '6px 2px',
                borderBottom: `1px solid rgba(108,244,255,0.05)`,
                alignItems: 'center',
              }}
            >
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 7, color: CYAN_DIM,
                letterSpacing: '0.12em',
              }}>{String(i + 1).padStart(3, '0')}</span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 8,
                color: p.urgent ? '#ff6b6b' : p.urgency === 'AM' ? AMBER : CYAN_DIM,
                letterSpacing: '0.15em',
                textShadow: p.urgent ? '0 0 6px #ff6b6b' : 'none',
                animation: p.urgent ? 'jv-blink 1.2s ease-in-out infinite' : undefined,
              }}>{p.urgency}</span>
              <span style={{
                fontSize: 11,
                color: p.urgent ? '#fff' : 'rgba(255,255,255,0.78)',
                fontWeight: p.urgent ? 500 : 400,
              }}>{p.text}</span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 7, color: CYAN_DIM,
                letterSpacing: '0.12em',
                padding: '2px 6px',
                border: `1px solid ${CYAN_FAINT}`,
                background: 'rgba(108,244,255,0.04)',
                textAlign: 'center',
              }}>{p.type}</span>
            </motion.div>
          ))}
        </div>

        {/* LIVE MACHINE TELEMETRY — real CPU/MEM/uptime from main process */}
        <div style={{
          marginTop: 10, padding: '8px 10px',
          borderTop: `1px solid ${CYAN_FAINT}`,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10,
          alignItems: 'center',
        }}>
          <StatCell
            label="CPU"
            value={sys ? `${Math.round(sys.cpu * 100)}%` : '—'}
            pct={sys ? sys.cpu : 0}
            color={sys && sys.cpu > 0.8 ? '#ff6b6b' : CYAN}
          />
          <StatCell
            label="MEM"
            value={sys ? `${Math.round(sys.mem * 100)}%` : '—'}
            pct={sys ? sys.mem : 0}
            color={sys && sys.mem > 0.85 ? AMBER : CYAN}
          />
          <StatCell
            label="FREE"
            value={sys ? `${sys.memFreeGB}G` : '—'}
            pct={sys ? Math.max(0, 1 - sys.mem) : 0}
            color={GREEN}
          />
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, color: sys ? GREEN : CYAN_DIM,
              letterSpacing: '0.18em',
              textShadow: sys ? `0 0 4px ${GREEN}` : 'none',
            }}>
              {sys ? '● LIVE' : '○ ...'}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 7, color: CYAN_DIM,
              letterSpacing: '0.18em', marginTop: 2,
            }}>
              UP {sys?.uptimeHours ?? 0}H
            </div>
          </div>
        </div>

        <PanelFooter code="PLY-005-DAY.BOARD" meta="FOCUS.MODE" color={AMBER} />
      </div>

      <div className="jv-vignette" />
    </motion.div>
  );
}
