# Security policy

JARVIS runs locally and ships your input straight to whichever provider keys you put in `.env`. Most "security" issues are really configuration mistakes — but if you find a real one, please report it privately first.

## Reporting a vulnerability

**Do not open a public issue for security bugs.**

Email the maintainer: hergienterprises@gmail.com

Include:
- A clear description of the issue
- Reproduction steps
- The version / commit you tested against
- Your suggested fix if you have one

You'll get an acknowledgement within 72 hours. Coordinated disclosure preferred — give us a reasonable window to ship a patch before going public.

## Out of scope

- Issues caused by user-provided keys leaking from your own machine (rotate them)
- Vulnerabilities in upstream dependencies (please report those upstream first)
- Findings against modified forks

## What's in scope

- Bypass of the renderer ↔ main IPC contract
- Code execution from untrusted JARVIS configuration files
- Leaks of environment variables to the renderer or to logs
- Path traversal in the file-loading code
- Anything that lets a malicious server control the desktop client beyond what's documented

## Default configuration

JARVIS does not phone home. It does not transmit telemetry. The only outbound calls happen when:
- You configure ElevenLabs / OpenAI / Groq keys → those services see your prompts
- You enable the optional `data:morningContext` source → it reads files you point it at
- The auto-updater (when enabled) checks GitHub Releases for new versions

If you find any other outbound traffic in the default build, that's a bug — report it.
