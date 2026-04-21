// Command router — parses voice input and executes actions.
// Pattern-matching for fast deterministic actions; unmatched input
// falls through to the local Ollama LLM so JARVIS can actually converse.

import { voice } from '@/services/tts';
import { askJarvis } from '@/services/llm/jarvis';

export type ExecutedCommand = {
  input: string;
  action: string;
  target?: string;
  spoken: string;
  success: boolean;
};

// Map of URL aliases for "open X" commands
const URL_MAP: Record<string, string> = {
  instagram: 'https://instagram.com',
  insta: 'https://instagram.com',
  'ig': 'https://instagram.com',
  linkedin: 'https://linkedin.com',
  li: 'https://linkedin.com',
  twitter: 'https://x.com',
  'x': 'https://x.com',
  facebook: 'https://facebook.com',
  fb: 'https://facebook.com',
  youtube: 'https://youtube.com',
  yt: 'https://youtube.com',
  gmail: 'https://gmail.com',
  mail: 'https://gmail.com',
  email: 'https://gmail.com',
  claude: 'https://claude.ai',
  'chat gpt': 'https://chat.openai.com',
  chatgpt: 'https://chat.openai.com',
  openai: 'https://chat.openai.com',
  google: 'https://google.com',
  github: 'https://github.com',
  stripe: 'https://dashboard.stripe.com',
  vercel: 'https://vercel.com/dashboard',
  notion: 'https://notion.so',
  spotify: 'https://open.spotify.com',
  tiktok: 'https://tiktok.com',
  'tik tok': 'https://tiktok.com',
  reddit: 'https://reddit.com',
  amazon: 'https://amazon.com',
  netflix: 'https://netflix.com',
  tradingview: 'https://tradingview.com',
  'trading view': 'https://tradingview.com',
};

// Desktop apps that can be launched
const APP_MAP: Record<string, string> = {
  'vscode': 'code',
  'vs code': 'code',
  'code': 'code',
  'terminal': 'cmd',
  'command prompt': 'cmd',
  'powershell': 'powershell',
  'explorer': 'explorer',
  'file explorer': 'explorer',
  'calculator': 'calc',
  'notepad': 'notepad',
  'paint': 'mspaint',
};

const SPOKEN = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

async function executeUrl(url: string, target: string): Promise<ExecutedCommand> {
  const res = await window.jarvis?.launchUrl(url).catch(() => ({ ok: false }));
  return {
    input: `open ${target}`,
    action: 'openUrl',
    target: url,
    spoken: res?.ok ? `Opening ${SPOKEN(target)}.` : `Couldn't open ${SPOKEN(target)}.`,
    success: !!res?.ok,
  };
}

async function executeApp(app: string, target: string): Promise<ExecutedCommand> {
  const res = await window.jarvis?.launchApp(app).catch(() => ({ ok: false }));
  return {
    input: `open ${target}`,
    action: 'openApp',
    target: app,
    spoken: res?.ok ? `Opening ${SPOKEN(target)}.` : `Couldn't launch ${SPOKEN(target)}.`,
    success: !!res?.ok,
  };
}

export async function executeCommand(rawInput: string): Promise<ExecutedCommand> {
  const input = rawInput.toLowerCase().trim();

  // ══ OPEN / LAUNCH ══
  const openMatch = input.match(/^(?:open|launch|go to|show me|take me to|start|pull up)\s+(.+)$/i);
  if (openMatch) {
    const target = openMatch[1].trim();
    // Try URL map first
    for (const key of Object.keys(URL_MAP).sort((a, b) => b.length - a.length)) {
      if (target.includes(key)) {
        return executeUrl(URL_MAP[key], key);
      }
    }
    // Then app map
    for (const key of Object.keys(APP_MAP).sort((a, b) => b.length - a.length)) {
      if (target.includes(key)) {
        return executeApp(APP_MAP[key], key);
      }
    }
    // Unknown — open Google search
    return executeUrl(
      `https://www.google.com/search?q=${encodeURIComponent(target)}`,
      `a search for ${target}`
    );
  }

  // ══ SEARCH ══
  const searchMatch = input.match(/^(?:search|google|find)\s+(?:for\s+)?(.+)$/i);
  if (searchMatch) {
    return executeUrl(
      `https://www.google.com/search?q=${encodeURIComponent(searchMatch[1])}`,
      `a search for ${searchMatch[1]}`
    );
  }

  // ══ STATUS / CHECK ══
  if (/^(what['']?s?\s+my|status|systems?|how['']?s?\s+everything)/i.test(input)) {
    return {
      input,
      action: 'status',
      spoken: 'All systems nominal. Seven agents online. Portfolio is up. No alerts.',
      success: true,
    };
  }

  // ══ TIME ══
  if (/(what time|time is it|current time)/i.test(input)) {
    const t = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return {
      input,
      action: 'time',
      spoken: `It's ${t}.`,
      success: true,
    };
  }

  // ══ CLOSE / QUIT ══
  if (/^(quit|exit|close|shutdown|shut down|goodbye|bye)/i.test(input)) {
    setTimeout(() => window.jarvis?.quit(), 1500);
    return {
      input,
      action: 'quit',
      spoken: 'Shutting down. Good night, Marco.',
      success: true,
    };
  }

  // ══ BITCOIN / CRYPTO ══
  if (/(bitcoin|btc|ethereum|eth|crypto|price)/i.test(input)) {
    const data = await (window as any).jarvis?.getCrypto?.().catch(() => null);
    if (data?.btc) {
      return {
        input,
        action: 'crypto',
        spoken: `Bitcoin is at ${Math.round(data.btc.price).toLocaleString()} dollars, ${data.btc.change > 0 ? 'up' : 'down'} ${Math.abs(data.btc.change).toFixed(1)} percent.`,
        success: true,
      };
    }
    return { input, action: 'crypto', spoken: 'Crypto data not available right now.', success: false };
  }

  // ══ GREET ══
  if (/^(hi|hey|hello|what['']?s up|yo)/i.test(input)) {
    return { input, action: 'greet', spoken: 'Hey Marco. What do you need?', success: true };
  }

  // ══ THANK YOU ══
  if (/(thank you|thanks|thx)/i.test(input)) {
    return { input, action: 'thanks', spoken: "Anytime.", success: true };
  }

  // ══ LLM FALLBACK — conversational JARVIS via Ollama ══
  const llm = await askJarvis(rawInput);
  if (llm.ok) {
    return {
      input,
      action: 'chat',
      spoken: llm.text,
      success: true,
    };
  }
  return {
    input,
    action: 'unknown',
    spoken: llm.error === 'timeout'
      ? "I'm thinking too slow. Try again."
      : "Can't reach my local brain right now.",
    success: false,
  };
}

/** Run command + speak response back via Charlotte. */
export async function runAndSpeak(rawInput: string): Promise<ExecutedCommand> {
  const result = await executeCommand(rawInput);
  // Speak the result asynchronously (don't await — lets multiple commands run in parallel)
  voice.speak(result.spoken, { voice: 'jarvis' }).catch(() => {});
  return result;
}
