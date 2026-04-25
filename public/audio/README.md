# JARVIS_HOME — Background Music

Drop an MP3 here named `workshop.mp3` and it plays on wake.

Suggested tracks (you already own these if you have an Apple Music / Spotify subscription — just buy the MP3):

- **Iron Man (2008) OST — Ramin Djawadi**
  - "Driving With the Top Down" (1:13) — workshop build scenes
  - "Arc Reactor"
  - "Mark II"
  - "Iron Man"

- **Iron Man 2 OST — John Debney**
  - "Making a New Element"

Any MP3/WAV/OGG will work. File path is configurable via `VITE_MUSIC_TRACK` in `.env`:

```
VITE_MUSIC_TRACK=/audio/my-custom-track.mp3
# or absolute (replace with your own path):
# Windows:  VITE_MUSIC_TRACK=file:///C:/Users/you/Music/workshop.mp3
# macOS:    VITE_MUSIC_TRACK=file:///Users/you/Music/workshop.mp3
# Linux:    VITE_MUSIC_TRACK=file:///home/you/Music/workshop.mp3
```

If no file is found, the app falls back to the built-in procedural score.
