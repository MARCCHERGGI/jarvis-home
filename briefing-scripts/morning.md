# Morning briefing

A 4-beat script. Wake, situate, brief, prompt.

Variables filled at runtime by your brain layer — see `briefing-scripts/README.md`
for the full list. Anything in `{{double-braces}}` gets interpolated.

[wake | pause:800 | phase:waking]
Good morning, {{firstName}}.

[situate | pause:1400 | phase:descending]
The sun is up over {{city}}. {{weatherLine}}.

[brief | pause:1200 | phase:briefing]
You have {{calendarSummary}}. The market is {{marketTone}}.

[prompt | pause:600 | phase:ready]
What are we building today?
