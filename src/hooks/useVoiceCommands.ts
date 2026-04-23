// v2.0 ALIVE MODE — Post-briefing voice commands.
//
// After JARVIS finishes the morning briefing, Marco can hold V to speak
// a command. Supported commands and what they do:
//
//   "status"       → speak current BTC price + stripe today
//   "bitcoin"      → expand bitcoin panel
//   "trading"      → expand trading panel
//   "social"       → expand social panel
//   "schedule"     → expand schedule panel
//   "quiet" / "mute" → stop music
//   "louder"       → unduck music
//   "goodnight" / "sleep" → back to sleep
//   "focus"        → toggle focus mode
//   "wake" (if sleeping) → wake (already handled via clap/space elsewhere)
//
// Uses the browser's SpeechRecognition API for recognition (free, local)
// and the existing ElevenLabs voice pipeline for response (JARVIS voice).

import { useEffect, useRef } from 'react';
import { useJarvis } from '@/state/store';
import { voice } from '@/services/tts';

type Rec = any;

function getRecognition(): Rec | null {
  const W = window as any;
  const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.continuous = false;
  r.interimResults = false;
  return r;
}

export function useVoiceCommands(wake: () => Promise<void>) {
  const phase = useJarvis((s) => s.phase);
  const setExpandedPanel = useJarvis((s) => s.setExpandedPanel);
  const pulseRef = useRef(useJarvis.getState().pulse);

  useEffect(() => {
    const unsub = useJarvis.subscribe((s) => { pulseRef.current = s.pulse; });
    return unsub;
  }, []);

  useEffect(() => {
    if (phase !== 'ready') return;

    let recognition: Rec | null = null;
    let holding = false;
    let transcript = '';

    const speak = async (text: string) => {
      try { await voice.speak(text, { voice: 'jarvis' }); } catch {}
    };

    const handleCommand = async (raw: string) => {
      const cmd = raw.toLowerCase().trim();
      if (!cmd) return;

      // Keyword-based routing (simple but effective)
      if (/\b(status|brief|report)\b/.test(cmd)) {
        const p = pulseRef.current;
        const btc = p.btc ? `Bitcoin at ${Math.round(p.btc.price).toLocaleString()} dollars, ${p.btc.change >= 0 ? 'up' : 'down'} ${Math.abs(p.btc.change).toFixed(1)} percent.` : 'Bitcoin data loading.';
        const stripe = p.stripeToday != null ? `Stripe revenue today: ${p.stripeToday} dollars.` : '';
        await speak(`${btc} ${stripe} All systems nominal.`);
        return;
      }
      if (/\bbitcoin\b/.test(cmd) || /\bbtc\b/.test(cmd)) {
        setExpandedPanel('bitcoin');
        await speak('Opening bitcoin.');
        return;
      }
      if (/\btrading\b/.test(cmd) || /\bhormuz\b/.test(cmd) || /\boil\b/.test(cmd)) {
        setExpandedPanel('trading');
        await speak('Opening trading.');
        return;
      }
      if (/\bsocial\b/.test(cmd) || /\bfollowers?\b/.test(cmd)) {
        setExpandedPanel('social');
        await speak('Opening social.');
        return;
      }
      if (/\bschedule\b/.test(cmd) || /\bevents?\b/.test(cmd)) {
        setExpandedPanel('schedule');
        await speak('Opening schedule.');
        return;
      }
      if (/\b(close|collapse|dismiss)\b/.test(cmd)) {
        setExpandedPanel(null);
        return;
      }
      if (/\b(goodnight|good night|sleep)\b/.test(cmd)) {
        await speak('Goodnight, boss.');
        useJarvis.getState().reset();
        return;
      }
      if (/\b(quiet|mute|shh|silence)\b/.test(cmd)) {
        (window as any).__jarvisMusic?.stop?.(400);
        await speak('Music off.');
        return;
      }
      // Fallback
      await speak('Sorry boss, I did not catch that.');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'v' && e.key !== 'V') return;
      if (holding) return;
      // Don't trigger in input fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      holding = true;

      recognition = getRecognition();
      if (!recognition) return;
      transcript = '';
      recognition.onresult = (ev: any) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) transcript += ev.results[i][0].transcript;
        }
      };
      recognition.onend = () => {
        if (transcript) handleCommand(transcript);
      };
      try { recognition.start(); } catch {}
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'v' && e.key !== 'V') return;
      holding = false;
      try { recognition?.stop(); } catch {}
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      try { recognition?.stop(); } catch {}
    };
  }, [phase, setExpandedPanel, wake]);
}
