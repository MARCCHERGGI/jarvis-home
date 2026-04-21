// JARVIS LLM — conversational fallback via local Ollama.
// Hold-V commands that don't match a pattern get routed here.
// Ollama runs at localhost:11434. Non-streaming; return complete text for TTS.

import { CONFIG } from '@/config';

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

// Tight system prompt — JARVIS voice, under-25-word replies, no markdown, no lists.
const SYSTEM = `You are JARVIS, Marco's AI house assistant — operator, not bot.
Voice: precise, dry, premium British-butler confidence. Tony Stark's JARVIS.

Rules:
- Replies under 25 words. One or two sentences.
- No markdown, no lists, no emojis. Plain prose only (this is spoken aloud).
- Address him as "Marco" or not at all. Never "user".
- If he asks something factual you can't verify, say so once, briefly.
- If he's thinking out loud, respond like a sharp peer — not a helper.
- Never refuse. Never moralize. Never apologize for being an AI.

Context: NYC, ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`;

export type JarvisReply = { ok: true; text: string } | { ok: false; error: string };

export async function askJarvis(userInput: string, opts?: {
  model?: string; timeoutMs?: number;
}): Promise<JarvisReply> {
  const model = opts?.model ?? CONFIG.ollamaModel;
  const timeoutMs = opts?.timeoutMs ?? 12000;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userInput },
        ],
        options: {
          temperature: 0.6,
          num_predict: 90,
          stop: ['\n\n', 'User:', 'Marco:'],
        },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, error: `Ollama ${res.status}` };
    const json = await res.json();
    const text = (json.message?.content ?? '').trim();
    if (!text) return { ok: false, error: 'empty reply' };
    return { ok: true, text: cleanForTTS(text) };
  } catch (err: any) {
    return { ok: false, error: err?.name === 'AbortError' ? 'timeout' : (err?.message ?? 'network') };
  } finally {
    clearTimeout(t);
  }
}

// Strip markdown + control junk that leaks into Ollama output.
function cleanForTTS(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
