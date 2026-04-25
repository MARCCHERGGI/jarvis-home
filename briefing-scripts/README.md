# Briefing scripts

The soul of JARVIS. Each script is a sequence of **beats** — a labelled block
that drives one phase, speaks one line, then pauses.

## Format

```
# Title — optional H1, drives the script id when no fallback is given.

Free-form commentary up here is ignored.

[<id> | pause:<ms> | phase:<phase>]
Voice line. Supports {{variable}} placeholders.
```

- **`<id>`** — short label for the beat (`wake`, `situate`, `prompt`, …)
- **`pause:<ms>`** — silence to hold AFTER the line. Default `0`.
- **`phase:<phase>`** — phase to enter when this beat starts. One of:
  `sleep`, `waking`, `descending`, `briefing`, `ready`.

Multiple text lines under one beat are joined with spaces.

## Variables

`{{var}}` is interpolated against the `data` map you pass to `runBriefing`.
Missing keys collapse to empty string — degrade gracefully.

The reference scripts use these conventions (you can rename or skip any):

| Variable             | Example                                     |
| -------------------- | ------------------------------------------- |
| `{{firstName}}`      | `Marco`                                     |
| `{{city}}`           | `New York`                                  |
| `{{weatherLine}}`    | `clear, sixty-four degrees`                 |
| `{{calendarSummary}}`| `two meetings — both before noon`           |
| `{{marketTone}}`     | `mixed`, `green`, `sliding`                 |
| `{{accomplishments}}`| `shipped two PRs and the OG image`          |
| `{{notableEvent}}`   | `the JARVIS demo went viral`                |
| `{{tomorrowFirst}}`  | `the launch email at nine`                  |

Wire these via your brain adapter — see `docs/brains.md`.

## Forking

The fastest way to give your fork a personality:

1. Copy `morning.md` → `morning-friday.md`
2. Rewrite the lines in your voice
3. Point `runBriefing` at the new file

That's it. The framework does the rest.

## Style guide

- **Short.** One sentence per beat. Two max.
- **No filler.** "Just to let you know" / "I wanted to mention" — cut it.
- **Trust the silence.** A 1.4s pause says more than another sentence.
- **Honor the phase.** Don't speak about the city before the camera arrives there.
- **One question per script.** End on a prompt that gives the user something to answer.
