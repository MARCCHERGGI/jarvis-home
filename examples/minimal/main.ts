/**
 * Minimal JARVIS — runs a briefing script with a console "voice".
 *
 *   npx tsx examples/minimal/main.ts
 *
 * No Electron, no GPU, no API keys. This is the smallest possible
 * demonstration of the framework — useful as a test harness when you're
 * writing your own voice or brain adapter.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runBriefing, parseBriefing } from '../../src/core';
import type { VoiceAdapter, BrainAdapter } from '../../src/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, '..', '..', 'briefing-scripts', 'morning.md');

const consoleVoice: VoiceAdapter = {
  name: 'console',
  describe: () => 'prints lines to stdout instead of speaking',
  async speak(text) {
    process.stdout.write(`\x1b[36m🗣  ${text}\x1b[0m\n`);
    // simulate speech duration: ~3 chars per 100ms, min 600ms
    const duration = Math.max(600, Math.min(4000, text.length * 33));
    await new Promise((r) => setTimeout(r, duration));
  },
  stop() {
    /* nothing in flight to stop */
  },
};

const mockBrain: BrainAdapter = {
  name: 'mock',
  describe: () => 'returns canned responses — useful for offline testing',
  async ask({ user }) {
    return `[mock reply to: ${user}]`;
  },
};

async function main() {
  const md = readFileSync(scriptPath, 'utf8');
  const script = parseBriefing(md, 'morning');

  console.log(`\x1b[2m── ${script.title ?? script.id} ──────────────\x1b[0m\n`);

  await runBriefing({
    script,
    voice: consoleVoice,
    brain: mockBrain,
    data: {
      firstName: 'Marco',
      city: 'New York',
      weatherLine: 'clear, sixty-four degrees',
      calendarSummary: 'two meetings — both before noon',
      marketTone: 'mixed',
    },
    onPhase: (phase, beatId) => {
      process.stdout.write(`\x1b[2m   ↳ phase: ${phase}  (beat: ${beatId})\x1b[0m\n`);
    },
  });

  console.log('\n\x1b[2m── briefing complete ──\x1b[0m');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
