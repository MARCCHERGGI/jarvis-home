// Morning Ritual — the two questions Jarvis asks after the briefing.
// Designed for the hands-full, teeth-brushing moment: no keyboard, pure voice,
// questions that land instead of help.
//
// Question 1 (priming):  reframes the day, hits the mind before the mouth.
// Question 2 (action):   converts that state into one concrete move.
//
// Brain:
//   - Groq Llama-3.3-70B is primary (see services/llm/capable.ts).
//   - Context is injected from Marco's mind_intelligence, war_plan, and
//     latest OpenClaw note — so the questions reference his actual life.
//   - Falls back to a curated pool if both LLMs are offline.

import { askCapable } from '@/services/llm/capable';

// ── Curated fallback pool ────────────────────────────────────────────────
// Hand-written, sci-fi future-human grade. The kind of question that stops
// you mid-brush. Every line is <22 words, said out loud.
const CURATED = {
  priming: [
    "If today went perfectly, what does it look like the moment you close your laptop tonight?",
    "What do you want to feel by the end of today, Marco — and what's quietly blocking it?",
    "Picture the version of you a year from now. What is he quietly begging you to do today?",
    "What's the story you want to tell yourself at midnight tonight?",
    "If only one thing from today survives the week, what is it?",
    "Who is waking up this morning — which version of Marco — and what does he need first?",
    "What did yesterday try to teach you that you almost missed?",
    "What's the quiet thing that's been following you for days? Today's the day, isn't it?",
    "What would today look like if you trusted yourself completely?",
    "If I could give you one feeling for the next twelve hours, what would you pick?",
  ],
  action: [
    "What's the one move today that makes the rest of the week easier?",
    "If you only had three hours of real focus today, where do they go?",
    "What's the bravest thing on your plate — and when exactly are you doing it?",
    "If you could only ship one thing today, which one is it?",
    "What's the smallest move that would actually change the trajectory?",
    "What are you pretending not to know about today's priorities?",
    "If you had to stake your whole day on a single output, what is it?",
    "What's the move that future-you would thank today-you for?",
    "Who do you need to talk to today before anything else gets real?",
    "What would you do in the next hour if nobody was watching?",
  ],
};

function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type MorningQuestionSet = {
  priming: string;
  action: string;
  source: 'groq' | 'ollama' | 'curated';
};

export type RitualContext = {
  dayName: string;
  stripeTodayUsd?: number;
  btcPrice?: number;
  weatherCond?: string;
};

function cleanLine(raw: string): string {
  return raw
    .trim()
    .replace(/^[-*\d.)\s]+/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(priming|action|question\s*\d?)\s*[:\-—]\s*/i, '')
    .trim();
}

// Pull Marco's memory snippets (mind, war plan, latest note) via the
// Electron main-process IPC we added. Returns empty strings when unavailable
// (e.g. running plain Vite in a browser tab).
async function fetchMarcoContext(): Promise<{
  mind: string; warPlan: string; latestNote: string; frontier: string;
}> {
  try {
    const ctx = await (window as any).jarvis?.getMorningContext?.();
    return {
      mind:       ctx?.mind       ?? '',
      warPlan:    ctx?.warPlan    ?? '',
      latestNote: ctx?.latestNote ?? '',
      frontier:   ctx?.frontier   ?? '',
    };
  } catch {
    return { mind: '', warPlan: '', latestNote: '', frontier: '' };
  }
}

const SYSTEM_PROMPT = `You are JARVIS — Marco Hergi's personal AI, the operator in his life.
Not an assistant, not a chatbot. Think Tony Stark's JARVIS after ten years together.
You know him: solo builder in NYC, loops between starting and finishing, 30-day war plan
focused on agent consolidation and real revenue. You cut through his noise with surgical
warmth. You never flatter. You ask the question the great coach would ask. You speak with
the British-exec cadence of someone who has seen him do this before and believes in him.

Rules, absolute:
- Plain spoken English. No markdown. No emojis. No lists. No preamble.
- Short. Each line you produce under 22 words.
- Second person. Address him "Marco" or not at all.
- You are never a helper. You are a peer who has his back.`;

/**
 * Ask the capable LLM for two morning questions, personalized to Marco's
 * real life (mind, war plan, latest note). Falls back to curated picks
 * if the LLM can't reach us.
 */
export async function generateMorningQuestions(
  ctx: RitualContext,
): Promise<MorningQuestionSet> {
  const marco = await fetchMarcoContext();

  const contextBits: string[] = [`It's ${ctx.dayName} morning in NYC`];
  if (ctx.stripeTodayUsd && ctx.stripeTodayUsd > 0) {
    contextBits.push(`Stripe already booked $${ctx.stripeTodayUsd} today`);
  }
  if (ctx.btcPrice) {
    contextBits.push(`Bitcoin is near $${Math.round(ctx.btcPrice / 1000)}k`);
  }

  const marcoBrief = [
    marco.mind       && `# Who Marco is\n${marco.mind}`,
    marco.warPlan    && `# His current 30-day war plan\n${marco.warPlan}`,
    marco.latestNote && `# What he worked on most recently\n${marco.latestNote}`,
    marco.frontier   && `# Relevant AI frontier intel\n${marco.frontier}`,
  ].filter(Boolean).join('\n\n').trim();

  const userPrompt = (
    `${marcoBrief ? marcoBrief + '\n\n' : ''}` +
    `# Situation\n${contextBits.join('. ')}.\n\n` +
    `# Your task\n` +
    `Marco is brushing his teeth. His hands are full. You are about to speak two ` +
    `questions out loud, back to back, that he will answer with his voice.\n\n` +
    `The two questions must be:\n` +
    `  Line 1 — a priming/state question. What he wants to feel, who he's becoming, ` +
    `what perfect looks like tonight. Something that stops him mid-brush.\n` +
    `  Line 2 — an action question. The one move today. The bravest thing. Where ` +
    `the best three hours go. Must convert Line 1 into motion.\n\n` +
    `Reference his real life — the war plan, the products, the loops — but never ` +
    `read them back at him. Ask like a friend who remembers.\n\n` +
    `Output format: EXACTLY TWO LINES. No numbering, labels, quotes, preamble. ` +
    `Each under 22 words. End each with a question mark.`
  );

  const reply = await askCapable({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    temperature: 0.85,
    maxTokens: 180,
    timeoutMs: 8000,
  });

  if (reply.ok) {
    const lines = reply.text
      .split(/\n+/)
      .map(cleanLine)
      .filter((l) => l.length > 12 && l.length < 260 && /\?/.test(l));
    if (lines.length >= 2) {
      return {
        priming: lines[0],
        action: lines[1],
        source: reply.provider === 'groq' ? 'groq' : 'ollama',
      };
    }
  }

  return {
    priming: randFrom(CURATED.priming),
    action:  randFrom(CURATED.action),
    source:  'curated',
  };
}

/**
 * Reflect on Marco's answer — one sharp sentence that lands.
 * Tuned to sound like JARVIS noticed what he actually said, not just that he said something.
 */
export async function reflectOnAnswer(question: string, answer: string): Promise<string> {
  const a = (answer || '').trim();
  if (a.length < 2) {
    return randFrom([
      "Noted. We'll come back to it.",
      "Hold the thought. I'll surface it later.",
      "Okay. Moving on — it'll keep.",
    ]);
  }

  const userPrompt =
    `I just asked Marco: "${question}"\n` +
    `Marco answered: "${a}"\n\n` +
    `Respond in ONE sentence, under 18 words. No preamble. No quoting him. ` +
    `No "great answer" / "I love that" / any flattery. ` +
    `Reflect back what you actually heard so it lands harder in his head. ` +
    `End on a beat that locks it in for the day — a quiet commitment, not a cheer.`;

  const reply = await askCapable({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    temperature: 0.7,
    maxTokens: 80,
    timeoutMs: 6000,
  });

  if (reply.ok && reply.text.length > 3) {
    return reply.text.replace(/^["'`]+|["'`]+$/g, '').trim();
  }

  return randFrom([
    "Locking that in.",
    "Good. Holding you to it.",
    "Copy. Writing it on today.",
    "Understood. Let's make it real.",
  ]);
}
