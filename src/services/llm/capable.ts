// Capable LLM — the big brain behind the morning ritual.
//
// Priority:
//   1. Groq Llama-3.3-70B — 500 tok/s, frontier quality, feels instant.
//   2. Ollama (local) — fallback if Groq key missing / network down.
//
// Returns a plain string; the caller parses. Never throws — returns '' on failure.

import { CONFIG } from '@/config';

const GROQ_KEY    = (import.meta as any).env?.VITE_GROQ_API_KEY ?? '';
const GROQ_MODEL  = (import.meta as any).env?.VITE_GROQ_MODEL ?? 'llama-3.3-70b-versatile';
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const OLLAMA_URL  = 'http://127.0.0.1:11434/api/chat';

export type CapableOpts = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type CapableReply = {
  ok: boolean;
  text: string;
  provider: 'groq' | 'ollama' | 'none';
  error?: string;
};

/** Try Groq first, fall back to Ollama. Never throws. */
export async function askCapable(opts: CapableOpts): Promise<CapableReply> {
  const timeoutMs   = opts.timeoutMs ?? 9000;
  const temperature = opts.temperature ?? 0.75;
  const maxTokens   = opts.maxTokens ?? 220;

  if (GROQ_KEY) {
    const r = await callGroq(opts, timeoutMs, temperature, maxTokens);
    if (r.ok) return r;
    console.warn('[capable] groq failed, falling back to ollama:', r.error);
  }

  const r = await callOllama(opts, timeoutMs, temperature, maxTokens);
  return r;
}

async function callGroq(
  opts: CapableOpts, timeoutMs: number, temperature: number, maxTokens: number,
): Promise<CapableReply> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user',   content: opts.user   },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 180);
      return { ok: false, text: '', provider: 'none', error: `groq ${res.status}: ${body}` };
    }
    const json = await res.json();
    const text = (json.choices?.[0]?.message?.content ?? '').trim();
    if (!text) return { ok: false, text: '', provider: 'none', error: 'groq empty' };
    return { ok: true, text, provider: 'groq' };
  } catch (err: any) {
    return {
      ok: false, text: '', provider: 'none',
      error: err?.name === 'AbortError' ? 'groq timeout' : err?.message ?? 'groq network',
    };
  } finally {
    clearTimeout(t);
  }
}

async function callOllama(
  opts: CapableOpts, timeoutMs: number, temperature: number, maxTokens: number,
): Promise<CapableReply> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.ollamaModel,
        stream: false,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user',   content: opts.user   },
        ],
        options: { temperature, num_predict: maxTokens },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, text: '', provider: 'none', error: `ollama ${res.status}` };
    const json = await res.json();
    const text = (json.message?.content ?? '').trim();
    if (!text) return { ok: false, text: '', provider: 'none', error: 'ollama empty' };
    return { ok: true, text, provider: 'ollama' };
  } catch (err: any) {
    return {
      ok: false, text: '', provider: 'none',
      error: err?.name === 'AbortError' ? 'ollama timeout' : err?.message ?? 'ollama network',
    };
  } finally {
    clearTimeout(t);
  }
}
