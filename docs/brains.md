# Brains — LLM plugins

A brain answers questions and fills `{{variables}}` in your briefing scripts.
Brains are **optional** — JARVIS works without one, scripted only. Add a brain
when you want dynamic content: today's weather phrased as a sentence, a
one-line calendar summary, a market tone read.

## Interface

```ts
import type { BrainAdapter, BrainRequest, BrainStreamRequest } from 'jarvis-home/core';

export const myBrain: BrainAdapter = {
  name: 'my-brain',
  describe: () => 'one-liner',

  async ask({ system, user, maxTokens, temperature }: BrainRequest) {
    // ...call your provider, return the full response text
  },

  // optional — implement when your provider supports streaming
  async stream({ user, onToken }: BrainStreamRequest) {
    // ...emit tokens to onToken; return the full text at the end
  },

  available() {
    return Boolean(import.meta.env.VITE_MY_KEY);
  },
};
```

## Reference implementations

In `src/services/llm/`:

| Adapter      | Where it runs       | Latency | Cost            | Notes                              |
| ------------ | ------------------- | ------- | --------------- | ---------------------------------- |
| `ollama`     | local (your GPU)    | varies  | free            | Default for privacy-first installs |
| `groq`       | Groq cloud          | ~100ms  | very cheap      | Llama 3.3 70B, fastest hosted     |
| `anthropic`  | Anthropic cloud     | ~500ms  | mid             | Claude family                      |
| `openai`     | OpenAI cloud        | ~700ms  | mid             | GPT-4 family                       |

You can chain them — try local first, fall through to cloud on failure or empty
response. See `src/services/llm/capable.ts` for the reference probe logic.

## Patterns

### Filling briefing variables

The typical flow at runtime:

```ts
const summary = await brain.ask({
  user: 'Summarize today\'s calendar in one sentence: <events>',
  maxTokens: 40,
  temperature: 0.4,
});

await runBriefing({
  script,
  voice,
  data: { calendarSummary: summary, /* ... */ },
});
```

Keep prompts deterministic and short. The script is the personality; the brain
is the data layer.

### Streaming for low-latency UX

If your script has long beats and your provider supports streaming, use it —
`speak()` can begin as soon as the first sentence is complete, instead of
waiting for the whole reply.

```ts
let partial = '';
await brain.stream?.({
  user: prompt,
  onToken: (t) => {
    partial += t;
    if (partial.includes('.') && !speaking) {
      speaking = true;
      voice.speak(partial.split('.')[0] + '.');
    }
  },
});
```

## Things to get right

- **Bound your prompts.** A briefing variable line should be 5–15 words. Tell the
  model that explicitly.
- **Set temperature low (0.2–0.5).** You want consistency, not novelty, in
  ambient assistant speech.
- **Always have a fallback.** If the brain 401s, return an empty string —
  the engine collapses missing vars gracefully, the briefing degrades to the
  scripted skeleton without crashing.
