# Isaac Studio

A browser-based digital audio workstation (DAW) built with React, TypeScript, and the Web Audio API.

## Features

- **Step Sequencer** - 8-channel, 16-step drum sequencer with color-coded rows and real-time playback highlighting
- **Piano Roll** - 2-octave note editor with clickable grid, octave offset controls, and live key preview
- **Mixer** - Per-channel volume/pan faders with mute/solo and master volume control
- **Audio Engine** - Drum synthesis (kick, snare, hihats, clap, toms, rim), multi-instrument synth (lead, bass, piano, strings, pad, pluck, arp), and look-ahead scheduling
- **Song Mode** - Pattern sequencing with auto-advancing arrangement playback
- **AI Assistant** - Natural language commands for generating genre patterns (trap, house, hip-hop, DnB, techno), adjusting BPM, and creating bass/melody lines
- **WAV Export** - Offline rendering to downloadable WAV files

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Zustand (state management)
- Web Audio API

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
