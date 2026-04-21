import { motion } from 'framer-motion';
import { accentedPanel, ACCENT, CYAN, CYAN_DIM, CYAN_FAINT, AMBER, VIOLET, GREEN } from './styles';
import { Corners } from './primitives';

// NYC EVENTS panel — opens when JARVIS says:
//   "New York is moving today. Cornell Tech is running an AI agents symposium..."
// Visually: today's NYC events with AI happenings highlighted.

type Tag = 'AI' | 'TECH' | 'CULTURE' | 'FINANCE';

const TAG_COLOR: Record<Tag, string> = {
  AI: '#ff6bc4',
  TECH: CYAN,
  CULTURE: VIOLET,
  FINANCE: AMBER,
};

const EVENTS: {
  title: string; venue: string; time: string; tag: Tag; price: string; priority?: boolean;
}[] = [
  {
    title: 'AI Agents Symposium',
    venue: 'Cornell Tech · Roosevelt Island',
    time: '16:00',
    tag: 'AI',
    price: 'RSVP',
    priority: true,
  },
  {
    title: 'Foundation Models in Production',
    venue: 'NYU AI Lab · Washington Square',
    time: '18:30',
    tag: 'AI',
    price: 'FREE',
    priority: true,
  },
  {
    title: 'GenAI Founders Meetup',
    venue: 'Brooklyn Navy Yard · Bldg 77',
    time: '19:00',
    tag: 'AI',
    price: 'FREE',
    priority: true,
  },
  {
    title: 'Stripe Press: Scaling Teams',
    venue: 'Soho House · Meatpacking',
    time: '19:30',
    tag: 'TECH',
    price: 'INVITE',
  },
  {
    title: 'Whitney · Digital Frontier',
    venue: 'Whitney Museum · Chelsea',
    time: '18:00 — 22:00',
    tag: 'CULTURE',
    price: '$25',
  },
];

const AI_COUNT = EVENTS.filter((e) => e.tag === 'AI').length;

export function NYCEventsPanel({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={accentedPanel(ACCENT.magenta, { width: 460 })}
    >
      <div className="jv-grid" />
      <div className="jv-scanline" />
      <div className="jv-running-border" />
      <Corners />
      <div style={{ padding: '14px 18px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.28em',
            color: CYAN, textShadow: `0 0 8px ${CYAN}`,
          }}>◉ NEW YORK · TODAY</span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, color: '#ff6bc4',
            textShadow: '0 0 6px #ff6bc4',
            animation: 'jv-blink 1.5s ease-in-out infinite',
          }}>● {AI_COUNT} AI EVENTS LIVE</span>
        </div>

        {/* HERO STRIP: events / AI / venues */}
        <div style={{
          display: 'flex', gap: 10,
          padding: '8px 0 14px',
          borderBottom: `1px solid ${CYAN_FAINT}`,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--display)', fontSize: 40, fontWeight: 200,
              color: CYAN, lineHeight: 1,
              textShadow: `0 0 20px ${CYAN}`,
            }}>{EVENTS.length}</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 8, color: CYAN_DIM,
              letterSpacing: '0.2em', marginTop: 4,
            }}>EVENTS · TODAY</div>
          </div>
          <div style={{ width: 1, background: CYAN_FAINT }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--display)', fontSize: 40, fontWeight: 200,
              color: '#ff6bc4', lineHeight: 1,
              textShadow: '0 0 20px rgba(255,107,196,0.4)',
            }}>{AI_COUNT}</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 8, color: '#ff6bc4',
              letterSpacing: '0.2em', marginTop: 4,
              textShadow: `0 0 4px #ff6bc4`,
            }}>AI · PRIORITY</div>
          </div>
          <div style={{ width: 1, background: CYAN_FAINT }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--display)', fontSize: 40, fontWeight: 200,
              color: GREEN, lineHeight: 1,
              textShadow: `0 0 20px ${GREEN}`,
            }}>5</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 8, color: GREEN,
              letterSpacing: '0.2em', marginTop: 4,
              textShadow: `0 0 3px ${GREEN}`,
            }}>BOROUGHS</div>
          </div>
        </div>

        {/* Event rows */}
        {EVENTS.map((e, i) => {
          const color = TAG_COLOR[e.tag];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 + i * 0.05, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{
                padding: '9px 12px',
                borderBottom: i < EVENTS.length - 1 ? `1px solid ${CYAN_FAINT}` : 'none',
                borderLeft: `3px solid ${color}`,
                paddingLeft: 12,
                marginTop: i === 0 ? 10 : 0,
                background: e.priority ? 'rgba(255,107,196,0.04)' : 'transparent',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 3,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 7.5,
                    padding: '2px 6px',
                    background: `${color}22`,
                    border: `1px solid ${color}`,
                    color: color,
                    letterSpacing: '0.15em',
                    borderRadius: 2,
                    textShadow: `0 0 3px ${color}`,
                    flexShrink: 0,
                  }}>{e.tag}</span>
                  <span style={{
                    fontSize: 12.5, color: '#fff', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{e.title}</span>
                </div>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 9, color: CYAN,
                  textShadow: `0 0 4px ${CYAN}`, flexShrink: 0, marginLeft: 8,
                }}>{e.time}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 8.5, color: CYAN_DIM,
                  letterSpacing: '0.08em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{e.venue}</div>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 8, color: AMBER,
                  letterSpacing: '0.15em',
                  textShadow: `0 0 3px ${AMBER}`, flexShrink: 0, marginLeft: 8,
                }}>{e.price}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
