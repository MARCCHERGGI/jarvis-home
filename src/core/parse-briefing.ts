import type { BriefingBeat, BriefingScript, Phase } from './types';

/**
 * Parses a JARVIS briefing-script Markdown file into a {@link BriefingScript}.
 *
 * Format — each beat is a `[meta]` line followed by one or more text lines:
 *
 * ```
 * # Morning briefing                       ← optional title (first H1)
 *
 * [wake | pause:800 | phase:waking]
 * Good morning, {{firstName}}.
 *
 * [situate | pause:1400 | phase:descending]
 * The sun is up over {{city}}. {{weatherLine}}.
 * ```
 *
 * The meta line carries: beat id, optional `pause:<ms>`, optional `phase:<phase>`.
 * Anything between two meta lines (until the next blank line) is the spoken text.
 */
export function parseBriefing(markdown: string, fallbackId = 'briefing'): BriefingScript {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  let title: string | undefined;
  const beats: BriefingBeat[] = [];

  let currentMeta: BeatMeta | null = null;
  let currentText: string[] = [];

  const flush = () => {
    if (!currentMeta) return;
    const text = currentText.join(' ').trim();
    if (text.length === 0) return;
    beats.push({
      id: currentMeta.id,
      text,
      pauseAfterMs: currentMeta.pauseAfterMs,
      phase: currentMeta.phase,
    });
    currentMeta = null;
    currentText = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Skip code fences and HTML comments
    if (line.startsWith('```') || line.startsWith('<!--')) continue;

    // Title
    if (!title && line.startsWith('# ')) {
      title = line.slice(2).trim();
      continue;
    }

    // Skip plain commentary paragraphs (anything that's not a meta marker
    // or text immediately following one) by treating blank lines as separators.
    if (line === '') {
      if (currentMeta && currentText.length > 0) flush();
      continue;
    }

    // Beat meta marker: [id | pause:800 | phase:waking]
    if (line.startsWith('[') && line.endsWith(']')) {
      // close any in-flight beat first
      if (currentMeta) flush();
      currentMeta = parseMeta(line.slice(1, -1));
      currentText = [];
      continue;
    }

    // Otherwise, collect text under the active meta.
    if (currentMeta) currentText.push(line);
  }
  flush();

  return {
    id: titleToId(title) ?? fallbackId,
    title,
    beats,
  };
}

interface BeatMeta {
  id: string;
  pauseAfterMs?: number;
  phase?: Phase;
}

function parseMeta(input: string): BeatMeta {
  const parts = input.split('|').map((p) => p.trim()).filter(Boolean);
  const meta: BeatMeta = { id: parts[0] ?? 'beat' };
  for (let i = 1; i < parts.length; i++) {
    const [key, val] = parts[i].split(':').map((s) => s.trim());
    if (!key || !val) continue;
    if (key === 'pause' || key === 'pauseAfterMs') {
      const n = parseInt(val.replace(/[^\d]/g, ''), 10);
      if (Number.isFinite(n)) meta.pauseAfterMs = n;
    } else if (key === 'phase') {
      if (isPhase(val)) meta.phase = val;
    }
  }
  return meta;
}

function isPhase(v: string): v is Phase {
  return v === 'sleep' || v === 'waking' || v === 'descending' || v === 'briefing' || v === 'ready';
}

function titleToId(title?: string): string | undefined {
  if (!title) return;
  const slug = title
    .toLowerCase()
    .replace(/briefing$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || undefined;
}

/** Interpolate `{{var}}` placeholders against a data map. Missing keys → ''. */
export function interpolate(text: string, data: Record<string, string> = {}): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => data[key] ?? '');
}
