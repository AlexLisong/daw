/**
 * Core audio engine — manages AudioContext, scheduling, routing, and export.
 * Uses look-ahead scheduling for sample-accurate timing.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

/** Optional render target — when set, all sounds route here instead of live output */
interface RenderTarget {
  ctx: BaseAudioContext;
  dest: AudioNode;
}
let renderTarget: RenderTarget | null = null;

export function getAudioContext(): BaseAudioContext {
  if (renderTarget) return renderTarget.ctx;
  if (!ctx) {
    ctx = new AudioContext({ sampleRate: 44100 });
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

export function getMasterGain(): AudioNode {
  if (renderTarget) return renderTarget.dest;
  getAudioContext();
  return masterGain!;
}

export function setRenderTarget(target: RenderTarget | null) {
  renderTarget = target;
}

// --- Drum synthesis ---

type DrumType = 'kick' | 'snare' | 'hihat-c' | 'hihat-o' | 'clap' | 'tom-hi' | 'tom-lo' | 'rim';

const DRUM_COLORS: Record<DrumType, string> = {
  'kick': '#e94560', 'snare': '#ffab00', 'hihat-c': '#00e676', 'hihat-o': '#66ffa6',
  'clap': '#448aff', 'tom-hi': '#e040fb', 'tom-lo': '#b388ff', 'rim': '#ff6e40',
};

export function getDrumColor(drum: DrumType | string): string {
  return DRUM_COLORS[drum as DrumType] || '#888';
}

export const DRUM_NAMES: DrumType[] = ['kick', 'snare', 'hihat-c', 'hihat-o', 'clap', 'tom-hi', 'tom-lo', 'rim'];

export function playDrum(drum: DrumType | string, time?: number) {
  const c = getAudioContext();
  const t = time ?? c.currentTime;
  const master = getMasterGain();

  switch (drum) {
    case 'kick': {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(master);
      osc.start(t); osc.stop(t + 0.3);
      break;
    }
    case 'snare': {
      const bufSize = c.sampleRate * 0.15;
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = c.createBufferSource();
      noise.buffer = buf;
      const nGain = c.createGain();
      nGain.gain.setValueAtTime(0.6, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      const filter = c.createBiquadFilter();
      filter.type = 'highpass'; filter.frequency.value = 1000;
      noise.connect(filter).connect(nGain).connect(master);
      noise.start(t); noise.stop(t + 0.15);
      const osc = c.createOscillator();
      const oGain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
      oGain.gain.setValueAtTime(0.5, t);
      oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(oGain).connect(master);
      osc.start(t); osc.stop(t + 0.1);
      break;
    }
    case 'hihat-c': {
      const bufSize = c.sampleRate * 0.05;
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = c.createBufferSource();
      noise.buffer = buf;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 7000;
      noise.connect(hp).connect(gain).connect(master);
      noise.start(t); noise.stop(t + 0.05);
      break;
    }
    case 'hihat-o': {
      const bufSize = c.sampleRate * 0.2;
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = c.createBufferSource();
      noise.buffer = buf;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 6000;
      noise.connect(hp).connect(gain).connect(master);
      noise.start(t); noise.stop(t + 0.2);
      break;
    }
    case 'clap': {
      for (let i = 0; i < 3; i++) {
        const offset = t + i * 0.01;
        const bufSize = c.sampleRate * 0.02;
        const buf = c.createBuffer(1, bufSize, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;
        const noise = c.createBufferSource();
        noise.buffer = buf;
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.4, offset);
        gain.gain.exponentialRampToValueAtTime(0.001, offset + 0.08);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 2500;
        noise.connect(bp).connect(gain).connect(master);
        noise.start(offset); noise.stop(offset + 0.08);
      }
      break;
    }
    case 'tom-hi': {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain).connect(master);
      osc.start(t); osc.stop(t + 0.2);
      break;
    }
    case 'tom-lo': {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(master);
      osc.start(t); osc.stop(t + 0.25);
      break;
    }
    case 'rim': {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc.connect(gain).connect(master);
      osc.start(t); osc.stop(t + 0.03);
      break;
    }
  }
}

// --- Multi-instrument synth engine ---

export type InstrumentType = 'lead' | 'bass' | 'piano' | 'strings' | 'pad' | 'pluck' | 'arp';

export function playSynthNote(
  frequency: number,
  startTime: number,
  duration: number,
  velocity: number = 0.5,
  instrument: InstrumentType = 'lead',
) {
  const c = getAudioContext();
  const master = getMasterGain();

  switch (instrument) {
    case 'lead': {
      const osc1 = c.createOscillator();
      const osc2 = c.createOscillator();
      const gain = c.createGain();
      const filter = c.createBiquadFilter();
      osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(frequency, startTime);
      osc2.type = 'sawtooth'; osc2.frequency.setValueAtTime(frequency * 1.005, startTime);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(3000, startTime);
      filter.frequency.exponentialRampToValueAtTime(800, startTime + duration); filter.Q.value = 2;
      const vol = velocity * 0.25;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      gain.gain.setValueAtTime(vol, startTime + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc1.connect(filter); osc2.connect(filter); filter.connect(gain).connect(master);
      osc1.start(startTime); osc1.stop(startTime + duration);
      osc2.start(startTime); osc2.stop(startTime + duration);
      break;
    }
    case 'bass': {
      const osc = c.createOscillator();
      const osc2 = c.createOscillator();
      const gain = c.createGain();
      const filter = c.createBiquadFilter();
      osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, startTime);
      osc2.type = 'triangle'; osc2.frequency.setValueAtTime(frequency, startTime);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(600, startTime); filter.Q.value = 1;
      const vol = velocity * 0.35;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
      gain.gain.setValueAtTime(vol * 0.8, startTime + duration * 0.7);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(filter); osc2.connect(filter); filter.connect(gain).connect(master);
      osc.start(startTime); osc.stop(startTime + duration);
      osc2.start(startTime); osc2.stop(startTime + duration);
      break;
    }
    case 'piano': {
      const carrier = c.createOscillator();
      const modulator = c.createOscillator();
      const modGain = c.createGain();
      const gain = c.createGain();
      carrier.type = 'sine'; carrier.frequency.setValueAtTime(frequency, startTime);
      modulator.type = 'sine'; modulator.frequency.setValueAtTime(frequency * 2, startTime);
      modGain.gain.setValueAtTime(frequency * 1.5, startTime);
      modGain.gain.exponentialRampToValueAtTime(frequency * 0.1, startTime + duration);
      const vol = velocity * 0.25;
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      modulator.connect(modGain).connect(carrier.frequency);
      carrier.connect(gain).connect(master);
      carrier.start(startTime); carrier.stop(startTime + duration);
      modulator.start(startTime); modulator.stop(startTime + duration);
      break;
    }
    case 'strings': {
      const oscs: OscillatorNode[] = [];
      const gain = c.createGain();
      const filter = c.createBiquadFilter();
      for (const d of [-7, -3, 0, 3, 7]) {
        const osc = c.createOscillator();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(frequency, startTime);
        osc.detune.setValueAtTime(d, startTime); osc.connect(filter); oscs.push(osc);
      }
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(2000, startTime); filter.Q.value = 0.5;
      const vol = velocity * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + Math.min(0.3, duration * 0.3));
      gain.gain.setValueAtTime(vol, startTime + duration - 0.2);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      filter.connect(gain).connect(master);
      for (const osc of oscs) { osc.start(startTime); osc.stop(startTime + duration); }
      break;
    }
    case 'pad': {
      const osc1 = c.createOscillator();
      const osc2 = c.createOscillator();
      const gain = c.createGain();
      const filter = c.createBiquadFilter();
      osc1.type = 'triangle'; osc1.frequency.setValueAtTime(frequency, startTime);
      osc2.type = 'sine'; osc2.frequency.setValueAtTime(frequency * 2.01, startTime);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(1500, startTime);
      const vol = velocity * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + Math.min(0.5, duration * 0.4));
      gain.gain.setValueAtTime(vol * 0.7, startTime + duration - 0.3);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc1.connect(filter); osc2.connect(filter); filter.connect(gain).connect(master);
      osc1.start(startTime); osc1.stop(startTime + duration + 0.1);
      osc2.start(startTime); osc2.stop(startTime + duration + 0.1);
      break;
    }
    case 'pluck': {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const filter = c.createBiquadFilter();
      osc.type = 'square'; osc.frequency.setValueAtTime(frequency, startTime);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(4000, startTime);
      filter.frequency.exponentialRampToValueAtTime(400, startTime + 0.15); filter.Q.value = 3;
      const vol = velocity * 0.2;
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(0.3, duration));
      osc.connect(filter).connect(gain).connect(master);
      osc.start(startTime); osc.stop(startTime + duration);
      break;
    }
    case 'arp': {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(frequency, startTime);
      const vol = velocity * 0.18;
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.8);
      osc.connect(gain).connect(master);
      osc.start(startTime); osc.stop(startTime + duration);
      break;
    }
  }
}

// --- Note helpers ---

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

// --- Offline render + WAV export ---

interface ExportPattern {
  drums: boolean[][];
  notes: { midi: number; step: number; duration: number; velocity: number; instrument?: InstrumentType }[];
}

export async function exportToWav(
  patterns: ExportPattern[],
  bpm: number,
  swing: number,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const STEPS = 16;
  const stepDuration = 60 / bpm / 4;
  const totalSteps = patterns.length * STEPS;
  const totalDuration = totalSteps * stepDuration + 2; // +2s tail for reverb/release
  const sampleRate = 44100;

  const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
  const offlineMaster = offline.createGain();
  offlineMaster.gain.value = 0.8;
  offlineMaster.connect(offline.destination);

  // Redirect all synth calls to offline context
  setRenderTarget({ ctx: offline, dest: offlineMaster });

  // Schedule all patterns
  let time = 0;
  for (let pi = 0; pi < patterns.length; pi++) {
    const pat = patterns[pi];

    for (let step = 0; step < STEPS; step++) {
      let stepTime = time;

      // Swing on odd steps
      if (step % 2 === 1 && swing > 0) {
        stepTime += stepDuration * (swing / 200);
      }

      // Drums
      for (let drum = 0; drum < 8; drum++) {
        if (pat.drums[drum]?.[step]) {
          playDrum(DRUM_NAMES[drum], stepTime);
        }
      }

      // Notes
      for (const note of pat.notes) {
        if (note.step === step) {
          const freq = midiToFreq(note.midi);
          const dur = note.duration * stepDuration;
          playSynthNote(freq, stepTime, dur, note.velocity, note.instrument || 'lead');
        }
      }

      time += stepDuration;
    }

    onProgress?.(Math.round(((pi + 1) / patterns.length) * 50));
  }

  // Render
  const audioBuffer = await offline.startRendering();
  onProgress?.(80);

  // Restore live context
  setRenderTarget(null);

  // Encode to WAV
  const wav = encodeWav(audioBuffer);
  onProgress?.(100);

  return new Blob([wav], { type: 'audio/wav' });
}

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // chunk size
  view.setUint16(20, 1, true);            // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);           // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write samples
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = headerSize;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
