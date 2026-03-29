import { useState, useRef, useEffect } from 'react';
import { useDAWStore, type PianoNote, type Pattern } from '../stores/dawStore';
import { DRUM_NAMES } from '../audio/engine';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// AI pattern generation — runs locally, no API needed.
// Interprets natural language commands to modify the DAW state.

const GENRE_PATTERNS: Record<string, boolean[][]> = {
  trap: [
    [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false],  // kick
    [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false], // snare
    [true,true,true,true, true,true,true,true, true,true,true,true, true,true,true,true],               // hihat-c
    [false,false,false,false, false,false,false,false, false,false,true,false, false,false,false,true],  // hihat-o
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false], // clap
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false], // tom-hi
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false], // tom-lo
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false], // rim
  ],
  house: [
    [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false],    // kick (4 on floor)
    [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],   // snare
    [false,false,true,false, false,false,true,false, false,false,true,false, false,false,true,false],     // hihat-c (offbeat)
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],   // clap on 2&4
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
  ],
  hiphop: [
    [true,false,false,false, false,false,false,false, true,false,true,false, false,false,false,false],   // kick
    [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],   // snare
    [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false],         // hihat
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,true],  // hihat-o
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,true, false,false,false,false, false,false,false,true, false,false,false,false],   // rim
  ],
  dnb: [
    [true,false,false,false, false,false,false,false, false,false,true,false, false,false,false,false],   // kick
    [false,false,false,false, true,false,false,false, false,false,false,false, false,true,false,false],   // snare
    [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false],         // hihat
    [false,false,false,false, false,false,false,true, false,false,false,false, false,false,false,true],   // hihat-o
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
  ],
  techno: [
    [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false],    // kick (4 on floor)
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [true,true,true,true, true,true,true,true, true,true,true,true, true,true,true,true],                 // hihat every step
    [false,false,false,false, false,false,false,true, false,false,false,false, false,false,false,true],
    [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],   // clap
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,true,false, false,false,true,false, false,false,true,false, false,false,true,false],     // rim
  ],
  jaychou: [
    [true,false,false,false, false,false,true,false, true,false,false,false, false,false,false,false],    // kick — light, syncopated
    [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],   // snare — 2 & 4
    [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false],         // hihat — steady 8ths
    [false,false,false,false, false,false,false,false, false,false,false,true, false,false,false,false],  // hihat-o — ghost
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    [false,false,false,true, false,false,false,false, false,false,false,true, false,false,false,false],   // rim — subtle ghost notes
  ],
};

const SCALE_NOTES: Record<string, number[]> = {
  'c minor':  [48, 50, 51, 53, 55, 56, 58, 60, 62, 63, 65, 67],
  'c major':  [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67],
  'a minor':  [45, 47, 48, 50, 52, 53, 55, 57, 59, 60, 62, 64],
  'd minor':  [50, 52, 53, 55, 57, 58, 60, 62, 64, 65, 67, 69],
  'e minor':  [52, 54, 55, 57, 59, 60, 62, 64, 66, 67, 69, 71],
  'g minor':  [43, 45, 46, 48, 50, 51, 53, 55, 57, 58, 60, 62],
  'f minor':  [41, 43, 44, 46, 48, 49, 51, 53, 55, 56, 58, 60],
};

/**
 * Generate a full Jay Chou style song — ~1.5 min at 88 BPM.
 * Structure: Intro(x2) Verse(x2) PreChorus(x2) Chorus(x2) Verse(x2) Chorus(x2) Bridge(x2) Chorus(x2) Outro(x2)
 * = 18 patterns x 16 steps = 288 steps = ~1:22 at 88 BPM
 *
 * Instruments: piano (melody), bass, strings (chords), pad (atmosphere), pluck (accents)
 */
function generateJayChouSong(): { patterns: Record<string, Pattern>; arrangement: string[] } {
  const ts = Date.now();
  const n = (midi: number, step: number, dur: number, vel: number, inst: string): PianoNote => ({
    id: `jc-${inst}-${midi}-${step}-${ts}-${Math.random().toString(36).slice(2, 6)}`,
    midi, step, duration: dur, velocity: vel + (Math.random() * 0.08 - 0.04),
    instrument: inst as any,
  });

  // D minor scale: D E F G A Bb C
  // Pentatonic: D F G A C

  // === INTRO — Piano only, sparse and beautiful ===
  const introNotes: PianoNote[] = [
    n(62, 0, 3, 0.4, 'piano'), n(65, 3, 2, 0.35, 'piano'), n(69, 6, 2, 0.3, 'piano'),
    n(67, 8, 4, 0.4, 'piano'), n(65, 12, 2, 0.35, 'piano'), n(62, 14, 2, 0.3, 'piano'),
    // Low pad
    n(50, 0, 16, 0.15, 'pad'), n(57, 0, 16, 0.12, 'pad'),
  ];
  const introDrums = emptyDrums();

  // === VERSE A — Piano melody + light drums + bass ===
  const verseANotes: PianoNote[] = [
    // Piano melody
    n(62, 0, 2, 0.45, 'piano'), n(65, 2, 1, 0.4, 'piano'), n(67, 3, 2, 0.5, 'piano'),
    n(69, 6, 1, 0.4, 'piano'), n(67, 7, 1, 0.35, 'piano'), n(65, 8, 2, 0.45, 'piano'),
    n(62, 10, 1, 0.4, 'piano'), n(60, 11, 2, 0.45, 'piano'), n(62, 14, 2, 0.4, 'piano'),
    // Bass
    n(38, 0, 4, 0.5, 'bass'), n(41, 4, 4, 0.45, 'bass'),
    n(43, 8, 4, 0.5, 'bass'), n(38, 12, 4, 0.45, 'bass'),
    // Strings pad
    n(50, 0, 8, 0.12, 'strings'), n(53, 0, 8, 0.1, 'strings'),
    n(55, 8, 8, 0.12, 'strings'), n(50, 8, 8, 0.1, 'strings'),
  ];
  const verseADrums = parseDrums([
    'k...k.......k...', // kick
    '....s.......s...', // snare
    'h.h.h.h.h.h.h.h', // hihat
    '................', // hihat-o
    '................', // clap
    '................', // tom-hi
    '................', // tom-lo
    '...r.......r....', // rim
  ]);

  // === VERSE B — Variation, higher melody ===
  const verseBNotes: PianoNote[] = [
    n(67, 0, 2, 0.45, 'piano'), n(69, 2, 1, 0.5, 'piano'), n(72, 3, 2, 0.55, 'piano'),
    n(69, 6, 1, 0.4, 'piano'), n(67, 7, 2, 0.45, 'piano'),
    n(65, 10, 1, 0.4, 'piano'), n(62, 11, 2, 0.45, 'piano'), n(60, 13, 1, 0.4, 'piano'), n(62, 14, 2, 0.45, 'piano'),
    // Bass
    n(41, 0, 4, 0.5, 'bass'), n(43, 4, 4, 0.45, 'bass'),
    n(38, 8, 4, 0.5, 'bass'), n(36, 12, 4, 0.45, 'bass'),
    // Strings
    n(53, 0, 8, 0.15, 'strings'), n(57, 0, 8, 0.12, 'strings'),
    n(50, 8, 8, 0.15, 'strings'), n(55, 8, 8, 0.12, 'strings'),
  ];

  // === PRE-CHORUS — Building energy, add pluck arps ===
  const preChorusNotes: PianoNote[] = [
    // Piano chords
    n(62, 0, 4, 0.5, 'piano'), n(65, 0, 4, 0.45, 'piano'), n(69, 0, 4, 0.4, 'piano'),
    n(60, 4, 4, 0.5, 'piano'), n(65, 4, 4, 0.45, 'piano'), n(67, 4, 4, 0.4, 'piano'),
    n(58, 8, 4, 0.5, 'piano'), n(62, 8, 4, 0.45, 'piano'), n(65, 8, 4, 0.4, 'piano'),
    n(55, 12, 4, 0.5, 'piano'), n(60, 12, 4, 0.45, 'piano'), n(67, 12, 4, 0.4, 'piano'),
    // Pluck arps
    n(74, 0, 1, 0.3, 'pluck'), n(72, 2, 1, 0.25, 'pluck'), n(69, 4, 1, 0.3, 'pluck'),
    n(72, 6, 1, 0.25, 'pluck'), n(74, 8, 1, 0.3, 'pluck'), n(76, 10, 1, 0.3, 'pluck'),
    n(74, 12, 1, 0.25, 'pluck'), n(72, 14, 1, 0.3, 'pluck'),
    // Bass
    n(38, 0, 4, 0.55, 'bass'), n(36, 4, 4, 0.5, 'bass'),
    n(34, 8, 4, 0.55, 'bass'), n(31, 12, 4, 0.5, 'bass'),
  ];
  const preChorusDrums = parseDrums([
    'k...k..kk...k...', // kick — busier
    '....s.......s...',
    'hhhhhhhhhhhhhhhh', // hihat every step
    '................',
    '....c.......c...', // clap
    '................',
    '................',
    '..r...r...r...r.',
  ]);

  // === CHORUS — Full energy, all instruments ===
  const chorusNotes: PianoNote[] = [
    // Lead melody — soaring
    n(72, 0, 2, 0.6, 'lead'), n(74, 2, 1, 0.55, 'lead'), n(76, 3, 3, 0.65, 'lead'),
    n(74, 6, 1, 0.5, 'lead'), n(72, 7, 1, 0.5, 'lead'),
    n(74, 8, 2, 0.6, 'lead'), n(72, 10, 2, 0.55, 'lead'),
    n(69, 12, 2, 0.55, 'lead'), n(67, 14, 2, 0.5, 'lead'),
    // Piano chords
    n(62, 0, 4, 0.4, 'piano'), n(65, 0, 4, 0.35, 'piano'),
    n(60, 4, 4, 0.4, 'piano'), n(65, 4, 4, 0.35, 'piano'),
    n(58, 8, 4, 0.4, 'piano'), n(62, 8, 4, 0.35, 'piano'),
    n(55, 12, 4, 0.4, 'piano'), n(60, 12, 4, 0.35, 'piano'),
    // Bass
    n(38, 0, 2, 0.6, 'bass'), n(38, 4, 2, 0.55, 'bass'),
    n(34, 8, 2, 0.6, 'bass'), n(31, 12, 2, 0.55, 'bass'),
    // Strings
    n(50, 0, 16, 0.18, 'strings'), n(53, 0, 16, 0.15, 'strings'), n(57, 0, 16, 0.12, 'strings'),
  ];
  const chorusDrums = parseDrums([
    'k..kk..kk..kk..k', // kick — driving
    '....s.......s...',
    'hhhhhhhhhhhhhhhh',
    '.......o.......o', // open hat
    '....c.......c...',
    '................',
    '................',
    '..r...r...r...r.',
  ]);

  // === BRIDGE — Breakdown, strings + pad, sparse drums ===
  const bridgeNotes: PianoNote[] = [
    // Pad atmosphere
    n(50, 0, 16, 0.2, 'pad'), n(57, 0, 16, 0.18, 'pad'), n(62, 0, 16, 0.15, 'pad'),
    // Sparse piano
    n(74, 0, 4, 0.35, 'piano'), n(72, 6, 2, 0.3, 'piano'), n(69, 10, 2, 0.3, 'piano'), n(67, 14, 2, 0.3, 'piano'),
    // Pluck accents
    n(74, 4, 1, 0.2, 'pluck'), n(76, 8, 1, 0.2, 'pluck'), n(79, 12, 1, 0.25, 'pluck'),
    // Bass
    n(38, 0, 8, 0.4, 'bass'), n(34, 8, 8, 0.35, 'bass'),
  ];
  const bridgeDrums = parseDrums([
    'k...............', // minimal kick
    '........s.......',
    'h...h...h...h...',
    '................',
    '................',
    '................',
    '................',
    '................',
  ]);

  // === OUTRO — Piano fading out ===
  const outroNotes: PianoNote[] = [
    n(62, 0, 4, 0.35, 'piano'), n(67, 4, 4, 0.3, 'piano'),
    n(65, 8, 4, 0.25, 'piano'), n(62, 12, 4, 0.2, 'piano'),
    n(50, 0, 16, 0.1, 'pad'), n(57, 0, 16, 0.08, 'pad'),
  ];
  const outroDrums = emptyDrums();

  const SECTION_COLORS: Record<string, string> = {
    intro: '#448aff', verseA: '#00e676', verseB: '#66ffa6',
    preChorus: '#ffab00', chorus: '#e94560', bridge: '#b388ff', outro: '#555570',
  };

  const patterns: Record<string, Pattern> = {
    intro:      { name: 'intro',      label: 'Intro',       color: SECTION_COLORS.intro,      drums: introDrums,      notes: introNotes },
    verseA:     { name: 'verseA',     label: 'Verse A',     color: SECTION_COLORS.verseA,     drums: verseADrums,     notes: verseANotes },
    verseB:     { name: 'verseB',     label: 'Verse B',     color: SECTION_COLORS.verseB,     drums: verseADrums,     notes: verseBNotes },
    preChorus:  { name: 'preChorus',  label: 'Pre-Chorus',  color: SECTION_COLORS.preChorus,  drums: preChorusDrums,  notes: preChorusNotes },
    chorus:     { name: 'chorus',     label: 'Chorus',      color: SECTION_COLORS.chorus,     drums: chorusDrums,     notes: chorusNotes },
    bridge:     { name: 'bridge',     label: 'Bridge',      color: SECTION_COLORS.bridge,     drums: bridgeDrums,     notes: bridgeNotes },
    outro:      { name: 'outro',      label: 'Outro',       color: SECTION_COLORS.outro,      drums: outroDrums,      notes: outroNotes },
  };

  // Song structure: ~18 patterns = ~1:22 at 88 BPM
  const arrangement = [
    'intro', 'intro',
    'verseA', 'verseA',
    'verseB', 'verseB',
    'preChorus', 'preChorus',
    'chorus', 'chorus',
    'verseA', 'verseB',
    'chorus', 'chorus',
    'bridge', 'bridge',
    'chorus', 'chorus',
    'outro', 'outro',
  ];

  return { patterns, arrangement };
}

// Helper: create empty 8x16 drum grid
function emptyDrums(): boolean[][] {
  return Array.from({ length: 8 }, () => Array(16).fill(false));
}

// Helper: parse drum pattern from string notation
function parseDrums(rows: string[]): boolean[][] {
  return rows.map(row => {
    const result = Array(16).fill(false);
    for (let i = 0; i < 16 && i < row.length; i++) {
      result[i] = row[i] !== '.';
    }
    return result;
  });
}

function processCommand(input: string): string {
  const lower = input.toLowerCase().trim();
  const store = useDAWStore.getState();

  // Chinese / alias keyword mapping (checked before genre patterns)
  const aliases: [string, string][] = [
    ['周杰伦', 'jaychou'], ['杰伦', 'jaychou'], ['jay chou', 'jaychou'],
    ['中国风', 'jaychou'], ['华语', 'jaychou'], ['cpop', 'jaychou'], ['c-pop', 'jaychou'],
    ['陷阱', 'trap'], ['嘻哈', 'hiphop'], ['电子', 'techno'],
  ];
  for (const [alias, genre] of aliases) {
    if (lower.includes(alias)) {
      if (genre === 'jaychou') {
        // Generate full song
        const { patterns, arrangement } = generateJayChouSong();
        store.loadSong(patterns, arrangement, 88, 12);
        store.setActiveView('sequencer');
        return `Loaded **Jay Chou** style full song (20 sections, ~1:30 at 88 BPM).

**Structure:** Intro > Verse > Pre-Chorus > Chorus > Verse > Chorus > Bridge > Chorus > Outro

**Instruments:** Piano, Bass, Strings, Pad, Lead, Pluck

Toggle **SONG** mode in transport bar, then hit **Play**!`;
      }
      if (GENRE_PATTERNS[genre]) {
        const pattern = GENRE_PATTERNS[genre];
        useDAWStore.setState({ sequencerGrid: pattern.map(r => [...r]), songMode: false });
        const bpms: Record<string, number> = { trap: 140, house: 126, hiphop: 90, dnb: 174, techno: 130 };
        if (bpms[genre]) store.setBpm(bpms[genre]);
        return `Loaded **${genre}** pattern at ${bpms[genre] || store.bpm} BPM. Hit play to listen!`;
      }
    }
  }

  // Chinese action keywords
  if (lower.includes('清除')) { store.clearPattern(); useDAWStore.setState({ pianoNotes: [] }); return 'Cleared all patterns and notes.'; }
  if (lower.includes('随机')) { store.randomizePattern(); return 'Generated a random drum pattern!'; }
  if (lower.includes('播放')) { if (!store.isPlaying) store.togglePlay(); return 'Playing!'; }
  if (lower.includes('停止') || lower.includes('暂停')) { store.stop(); return 'Stopped.'; }
  if (lower.includes('快一点')) { store.setBpm(store.bpm + 10); return `BPM increased to **${store.bpm + 10}**.`; }
  if (lower.includes('慢一点')) { store.setBpm(store.bpm - 10); return `BPM decreased to **${store.bpm - 10}**.`; }
  if (lower.includes('帮助')) { return processCommand('help'); }

  // Genre patterns (non-alias genres like trap, house, etc typed directly)
  for (const genre of Object.keys(GENRE_PATTERNS)) {
    if (genre === 'jaychou') continue; // handled by alias above
    if (lower.includes(genre)) {
      const pattern = GENRE_PATTERNS[genre];
      useDAWStore.setState({ sequencerGrid: pattern.map(r => [...r]), songMode: false });
      const bpms: Record<string, number> = { trap: 140, house: 126, hiphop: 90, dnb: 174, techno: 130 };
      if (bpms[genre]) store.setBpm(bpms[genre]);
      return `Loaded **${genre}** pattern at ${bpms[genre] || store.bpm} BPM. Hit play to listen!`;
    }
  }

  // BPM commands
  const bpmMatch = lower.match(/(?:set\s+)?bpm\s*(?:to\s+)?(\d+)/);
  if (bpmMatch) {
    const bpm = parseInt(bpmMatch[1]);
    store.setBpm(bpm);
    return `BPM set to **${bpm}**.`;
  }

  // Faster/slower
  if (lower.includes('faster') || lower.includes('speed up')) {
    store.setBpm(store.bpm + 10);
    return `BPM increased to **${store.bpm + 10}**.`;
  }
  if (lower.includes('slower') || lower.includes('slow down')) {
    store.setBpm(store.bpm - 10);
    return `BPM decreased to **${store.bpm - 10}**.`;
  }

  // Clear
  if (lower.includes('clear') && (lower.includes('pattern') || lower.includes('all') || lower.includes('everything'))) {
    store.clearPattern();
    useDAWStore.setState({ pianoNotes: [] });
    return 'Cleared all patterns and notes.';
  }

  // Random
  if (lower.includes('random') || lower.includes('surprise')) {
    store.randomizePattern();
    return 'Generated a random drum pattern. Try hitting play!';
  }

  // Bass line generation
  if (lower.includes('bass') || lower.includes('bassline') || lower.includes('melody')) {
    const isBass = lower.includes('bass');

    // Find scale
    let scale = SCALE_NOTES['c minor']; // default
    for (const [name, notes] of Object.entries(SCALE_NOTES)) {
      if (lower.includes(name)) { scale = notes; break; }
    }

    // Generate notes
    const notes = [];
    for (let step = 0; step < 16; step++) {
      if (Math.random() < (isBass ? 0.4 : 0.35)) {
        const idx = Math.floor(Math.random() * (isBass ? 5 : scale.length));
        const midi = scale[idx] + (isBass ? 0 : 12);
        notes.push({
          id: `ai-${midi}-${step}-${Date.now()}`,
          midi,
          step,
          duration: Math.random() < 0.3 ? 2 : 1,
          velocity: 0.5 + Math.random() * 0.3,
        });
      }
    }
    useDAWStore.setState({ pianoNotes: notes });
    store.setActiveView('pianoroll');
    return `Generated a ${isBass ? 'bass line' : 'melody'} in the piano roll. Switched to piano roll view.`;
  }

  // Mute/unmute
  const muteMatch = lower.match(/(?:un)?mute\s+(kick|snare|hihat|clap|tom|rim)/);
  if (muteMatch) {
    const drum = muteMatch[1];
    const idx = DRUM_NAMES.findIndex(d => d.startsWith(drum));
    if (idx >= 0) {
      store.toggleChannelMute(idx);
      return `Toggled mute on **${DRUM_NAMES[idx]}**.`;
    }
  }

  // Play/stop
  if (lower === 'play' || lower === 'start') {
    if (!store.isPlaying) store.togglePlay();
    return 'Playing!';
  }
  if (lower === 'stop' || lower === 'pause') {
    store.stop();
    return 'Stopped.';
  }

  // Help
  if (lower.includes('help') || lower.includes('what can')) {
    return `Here's what I can do:

- **"周杰伦"** / **"jay chou"** — Light R&B with pentatonic melody
- **"trap"** / **"house"** / **"hiphop"** / **"dnb"** / **"techno"** — Genre patterns
- **"bass line in C minor"** / **"melody in A minor"** — Piano roll notes
- **"set bpm to 140"** / **"快一点"** / **"慢一点"** — Tempo
- **"random"** / **"随机"** — Random drum pattern
- **"clear all"** / **"清除"** — Clear everything
- **"play"** / **"播放"** / **"stop"** / **"停止"** — Transport

Also supports: 中国风, 华语, 嘻哈, 电子, 陷阱`;
  }

  return `Try **"help"** or **"帮助"** to see commands. Examples: **"周杰伦"**, **"trap beat"**, **"bass line in C minor"**`;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to Isaac Studio AI. Try "trap beat", "bass line in C minor", or "help" to see all commands.',
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: input.trim() };
    const response = processCommand(input);
    const aiMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: response };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-bg-panel">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
        <div className="w-4 h-4 rounded-full bg-accent/30 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        </div>
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">AI Assistant</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-xs leading-relaxed rounded px-2 py-1.5 ${
              msg.role === 'user'
                ? 'bg-accent/15 text-text-primary ml-4'
                : 'bg-bg-surface text-text-secondary mr-4'
            }`}
          >
            <span
              dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary">$1</strong>')
                  .replace(/\n/g, '<br/>'),
              }}
            />
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border">
        <div className="flex gap-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Try 'trap beat' or 'help'..."
            className="flex-1 bg-bg-surface border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:border-accent outline-none"
          />
          <button
            onClick={handleSend}
            className="px-3 py-1.5 bg-accent hover:bg-accent-dim rounded text-xs font-bold text-white transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
