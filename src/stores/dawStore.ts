import { create } from 'zustand';
import { DRUM_NAMES, playDrum, playSynthNote, midiToFreq, getAudioContext, type InstrumentType } from '../audio/engine';

export interface PianoNote {
  id: string;
  midi: number;
  step: number;
  duration: number;
  velocity: number;
  instrument?: InstrumentType;
}

export interface MixerChannel {
  name: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  color: string;
}

/** A single pattern: drums + melody, 16 steps */
export interface Pattern {
  name: string;
  label: string;        // display label e.g. "A - Intro"
  color: string;
  drums: boolean[][];    // 8 x 16
  notes: PianoNote[];
}

interface DAWState {
  // Transport
  isPlaying: boolean;
  bpm: number;
  currentStep: number;
  swing: number;

  // Song arrangement
  patterns: Record<string, Pattern>;     // pattern bank (keyed by name)
  arrangement: string[];                 // ordered list of pattern names
  currentArrangementIndex: number;       // which pattern in arrangement
  songMode: boolean;                     // true = play arrangement, false = loop current

  // Current editing pattern (what's shown in sequencer/piano roll)
  activePatternName: string;

  // Derived from active pattern (kept in sync)
  sequencerGrid: boolean[][];
  pianoNotes: PianoNote[];
  pianoOctaveOffset: number;

  // Mixer
  mixerChannels: MixerChannel[];
  masterVolume: number;

  // Active view
  activeView: 'sequencer' | 'pianoroll' | 'mixer';

  // Scheduler
  _schedulerInterval: ReturnType<typeof setInterval> | null;
  _nextStepTime: number;

  // Transport actions
  togglePlay: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;

  // Pattern actions
  toggleStep: (drum: number, step: number) => void;
  clearPattern: () => void;
  randomizePattern: () => void;
  setActiveView: (view: 'sequencer' | 'pianoroll' | 'mixer') => void;

  // Song arrangement actions
  loadSong: (patterns: Record<string, Pattern>, arrangement: string[], bpm?: number, swing?: number) => void;
  selectPattern: (name: string) => void;
  toggleSongMode: () => void;

  // Piano roll
  addNote: (note: PianoNote) => void;
  removeNote: (id: string) => void;
  setPianoOctaveOffset: (offset: number) => void;

  // Mixer
  setChannelVolume: (ch: number, vol: number) => void;
  setChannelPan: (ch: number, pan: number) => void;
  toggleChannelMute: (ch: number) => void;
  toggleChannelSolo: (ch: number) => void;
  setMasterVolume: (vol: number) => void;
}

const STEPS = 16;

const initialGrid = (): boolean[][] =>
  Array.from({ length: 8 }, () => Array(STEPS).fill(false));

const drumColors = ['#e94560', '#ffab00', '#00e676', '#66ffa6', '#448aff', '#e040fb', '#b388ff', '#ff6e40'];

const initialMixer = (): MixerChannel[] =>
  DRUM_NAMES.map((name, i) => ({
    name: name.toUpperCase(),
    volume: 0.75,
    pan: 0,
    mute: false,
    solo: false,
    color: drumColors[i],
  }));

const DEFAULT_PATTERN: Pattern = {
  name: 'default',
  label: 'Default',
  color: '#555570',
  drums: initialGrid(),
  notes: [],
};

export const useDAWStore = create<DAWState>((set, get) => ({
  isPlaying: false,
  bpm: 128,
  currentStep: -1,
  swing: 0,

  patterns: { default: DEFAULT_PATTERN },
  arrangement: ['default'],
  currentArrangementIndex: 0,
  songMode: false,
  activePatternName: 'default',

  sequencerGrid: initialGrid(),
  pianoNotes: [],
  pianoOctaveOffset: 0,
  mixerChannels: initialMixer(),
  masterVolume: 0.8,
  activeView: 'sequencer',
  _schedulerInterval: null,
  _nextStepTime: 0,

  togglePlay: () => {
    const state = get();
    if (state.isPlaying) {
      if (state._schedulerInterval) clearInterval(state._schedulerInterval);
      set({ isPlaying: false, currentStep: -1, _schedulerInterval: null });
    } else {
      const ctx = getAudioContext();
      const nextTime = ctx.currentTime + 0.05;
      set({ isPlaying: true, currentStep: 0, currentArrangementIndex: 0, _nextStepTime: nextTime });

      // If song mode, load first pattern
      if (state.songMode && state.arrangement.length > 0) {
        const firstPattern = state.patterns[state.arrangement[0]];
        if (firstPattern) {
          set({
            sequencerGrid: firstPattern.drums.map(r => [...r]),
            pianoNotes: [...firstPattern.notes],
            activePatternName: firstPattern.name,
          });
        }
      }

      const interval = setInterval(() => scheduleStep(), 25);
      set({ _schedulerInterval: interval });
    }
  },

  stop: () => {
    const state = get();
    if (state._schedulerInterval) clearInterval(state._schedulerInterval);
    set({ isPlaying: false, currentStep: -1, currentArrangementIndex: 0, _schedulerInterval: null });
  },

  setBpm: (bpm) => set({ bpm: Math.max(40, Math.min(300, bpm)) }),
  setSwing: (swing) => set({ swing: Math.max(0, Math.min(100, swing)) }),

  toggleStep: (drum, step) => {
    const state = get();
    const grid = state.sequencerGrid.map((row) => [...row]);
    grid[drum][step] = !grid[drum][step];
    set({ sequencerGrid: grid });
    // Sync back to pattern bank
    const p = state.patterns[state.activePatternName];
    if (p) {
      const updated = { ...p, drums: grid };
      set({ patterns: { ...state.patterns, [state.activePatternName]: updated } });
    }
  },

  clearPattern: () => {
    set({ sequencerGrid: initialGrid(), pianoNotes: [] });
  },

  randomizePattern: () => {
    const grid = Array.from({ length: 8 }, (_, drum) =>
      Array.from({ length: STEPS }, () => {
        const chance = drum <= 1 ? 0.25 : drum <= 3 ? 0.35 : 0.15;
        return Math.random() < chance;
      })
    );
    set({ sequencerGrid: grid });
  },

  setActiveView: (view) => set({ activeView: view }),

  // --- Song arrangement ---
  loadSong: (patterns, arrangement, bpm, swing) => {
    const first = patterns[arrangement[0]];
    set({
      patterns,
      arrangement,
      songMode: true,
      currentArrangementIndex: 0,
      activePatternName: arrangement[0],
      sequencerGrid: first ? first.drums.map(r => [...r]) : initialGrid(),
      pianoNotes: first ? [...first.notes] : [],
      ...(bpm !== undefined ? { bpm } : {}),
      ...(swing !== undefined ? { swing } : {}),
    });
  },

  selectPattern: (name) => {
    const p = get().patterns[name];
    if (p) {
      set({
        activePatternName: name,
        sequencerGrid: p.drums.map(r => [...r]),
        pianoNotes: [...p.notes],
      });
    }
  },

  toggleSongMode: () => set((s) => ({ songMode: !s.songMode })),

  addNote: (note) => set((s) => ({ pianoNotes: [...s.pianoNotes, note] })),
  removeNote: (id) => set((s) => ({ pianoNotes: s.pianoNotes.filter((n) => n.id !== id) })),
  setPianoOctaveOffset: (offset) => set({ pianoOctaveOffset: offset }),

  setChannelVolume: (ch, vol) =>
    set((s) => ({
      mixerChannels: s.mixerChannels.map((c, i) => (i === ch ? { ...c, volume: vol } : c)),
    })),
  setChannelPan: (ch, pan) =>
    set((s) => ({
      mixerChannels: s.mixerChannels.map((c, i) => (i === ch ? { ...c, pan } : c)),
    })),
  toggleChannelMute: (ch) =>
    set((s) => ({
      mixerChannels: s.mixerChannels.map((c, i) => (i === ch ? { ...c, mute: !c.mute } : c)),
    })),
  toggleChannelSolo: (ch) =>
    set((s) => ({
      mixerChannels: s.mixerChannels.map((c, i) => (i === ch ? { ...c, solo: !c.solo } : c)),
    })),
  setMasterVolume: (vol) => set({ masterVolume: vol }),
}));

// --- Look-ahead scheduler ---

function scheduleStep() {
  const state = useDAWStore.getState();
  if (!state.isPlaying) return;

  const ctx = getAudioContext();
  const stepDuration = 60 / state.bpm / 4;
  const lookAhead = 0.1;

  while (state._nextStepTime < ctx.currentTime + lookAhead) {
    const step = state.currentStep;
    const time = state._nextStepTime;

    // Play drums
    const { sequencerGrid, mixerChannels } = state;
    const hasSolo = mixerChannels.some((c) => c.solo);
    for (let drum = 0; drum < 8; drum++) {
      if (!sequencerGrid[drum][step]) continue;
      const ch = mixerChannels[drum];
      if (ch.mute) continue;
      if (hasSolo && !ch.solo) continue;
      playDrum(DRUM_NAMES[drum], time);
    }

    // Play piano roll notes (with instrument type)
    for (const note of state.pianoNotes) {
      if (note.step === step) {
        playSynthNote(midiToFreq(note.midi), time, note.duration * stepDuration, note.velocity, note.instrument || 'lead');
      }
    }

    // Advance step
    let nextStep = (step + 1) % STEPS;
    let nextTime = time + stepDuration;

    // Swing
    if (nextStep % 2 === 1 && state.swing > 0) {
      nextTime += stepDuration * (state.swing / 200);
    }

    // If we wrapped around to step 0, check song mode for next pattern
    if (nextStep === 0 && state.songMode && state.arrangement.length > 1) {
      const nextIdx = state.currentArrangementIndex + 1;
      if (nextIdx < state.arrangement.length) {
        // Advance to next pattern in arrangement
        const nextPatternName = state.arrangement[nextIdx];
        const nextPattern = state.patterns[nextPatternName];
        if (nextPattern) {
          useDAWStore.setState({
            currentArrangementIndex: nextIdx,
            activePatternName: nextPatternName,
            sequencerGrid: nextPattern.drums.map(r => [...r]),
            pianoNotes: [...nextPattern.notes],
            currentStep: 0,
            _nextStepTime: nextTime,
          });
          Object.assign(state, useDAWStore.getState());
          continue;
        }
      } else {
        // Song finished — loop back to beginning
        const firstName = state.arrangement[0];
        const firstPattern = state.patterns[firstName];
        if (firstPattern) {
          useDAWStore.setState({
            currentArrangementIndex: 0,
            activePatternName: firstName,
            sequencerGrid: firstPattern.drums.map(r => [...r]),
            pianoNotes: [...firstPattern.notes],
            currentStep: 0,
            _nextStepTime: nextTime,
          });
          Object.assign(state, useDAWStore.getState());
          continue;
        }
      }
    }

    useDAWStore.setState({ currentStep: nextStep, _nextStepTime: nextTime });
    Object.assign(state, useDAWStore.getState());
  }
}
