/**
 * JARVIS Framework — public API.
 *
 * Import everything from here:
 *
 * ```ts
 * import { runBriefing, parseBriefing, type VoiceAdapter } from 'jarvis-home/core';
 * ```
 */
export * from './types';
export { parseBriefing, interpolate } from './parse-briefing';
export { runBriefing } from './briefing-engine';
