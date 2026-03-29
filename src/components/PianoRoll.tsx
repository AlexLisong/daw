import { useCallback, useRef } from 'react';
import { useDAWStore, type PianoNote } from '../stores/dawStore';
import { midiToName, playSynthNote, midiToFreq } from '../audio/engine';

const VISIBLE_NOTES = 25;   // 2 octaves + 1
const STEPS = 16;
const ROW_H = 18;
const COL_W = 40;

export function PianoRoll() {
  const { pianoNotes, addNote, removeNote, pianoOctaveOffset, setPianoOctaveOffset, currentStep, isPlaying } = useDAWStore();
  const gridRef = useRef<HTMLDivElement>(null);

  // MIDI range: C3 (48) to C5 (72) shifted by octave offset
  const baseMidi = 48 + pianoOctaveOffset * 12;
  const notes = Array.from({ length: VISIBLE_NOTES }, (_, i) => baseMidi + VISIBLE_NOTES - 1 - i);

  const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    const grid = gridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    const x = e.clientX - rect.left + grid.scrollLeft;
    const y = e.clientY - rect.top + grid.scrollTop;

    const step = Math.floor(x / COL_W);
    const noteRow = Math.floor(y / ROW_H);
    const midi = notes[noteRow];

    if (step < 0 || step >= STEPS || !midi) return;

    // Check if note exists here — if so, remove it
    const existing = pianoNotes.find((n) => n.midi === midi && n.step === step);
    if (existing) {
      removeNote(existing.id);
      return;
    }

    // Preview sound
    playSynthNote(midiToFreq(midi), 0, 0.2, 0.5);

    // Add note
    addNote({
      id: `${midi}-${step}-${Date.now()}`,
      midi,
      step,
      duration: 1,
      velocity: 0.7,
    });
  }, [notes, pianoNotes, addNote, removeNote]);

  const noteMap = new Map<string, PianoNote>();
  for (const n of pianoNotes) {
    noteMap.set(`${n.midi}-${n.step}`, n);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-bg-panel">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Piano Roll</span>
        <div className="flex-1" />
        <button
          onClick={() => setPianoOctaveOffset(pianoOctaveOffset - 1)}
          className="px-2 py-0.5 text-xs bg-bg-surface hover:bg-bg-hover border border-border rounded transition-colors text-text-secondary"
        >
          Oct -
        </button>
        <span className="text-xs font-mono text-text-dim">Oct {3 + pianoOctaveOffset}</span>
        <button
          onClick={() => setPianoOctaveOffset(pianoOctaveOffset + 1)}
          className="px-2 py-0.5 text-xs bg-bg-surface hover:bg-bg-hover border border-border rounded transition-colors text-text-secondary"
        >
          Oct +
        </button>
      </div>

      {/* Piano + Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Piano keys */}
        <div className="w-16 shrink-0 border-r border-border bg-bg-panel overflow-y-auto">
          {notes.map((midi) => {
            const black = isBlackKey(midi);
            return (
              <div
                key={midi}
                onClick={() => playSynthNote(midiToFreq(midi), 0, 0.2, 0.5)}
                className={`h-[18px] flex items-center px-1 text-[10px] font-mono cursor-pointer border-b border-border/30 transition-colors ${
                  black
                    ? 'bg-[#1a1a30] text-text-dim hover:bg-bg-hover'
                    : 'bg-bg-surface text-text-secondary hover:bg-bg-hover'
                } ${midi % 12 === 0 ? 'text-accent font-bold' : ''}`}
              >
                {midiToName(midi)}
              </div>
            );
          })}
        </div>

        {/* Note grid */}
        <div className="flex-1 overflow-auto" ref={gridRef} onClick={handleGridClick}>
          <div style={{ width: STEPS * COL_W, position: 'relative' }}>
            {notes.map((midi) => {
              const black = isBlackKey(midi);
              return (
                <div
                  key={midi}
                  className={`flex border-b border-border/20 ${black ? 'bg-[#12122a]' : 'bg-bg-primary'}`}
                  style={{ height: ROW_H }}
                >
                  {Array.from({ length: STEPS }, (_, step) => {
                    const note = noteMap.get(`${midi}-${step}`);
                    const isCurrent = isPlaying && step === currentStep;
                    return (
                      <div
                        key={step}
                        className={`border-r transition-colors ${
                          step % 4 === 0 ? 'border-border/40' : 'border-border/15'
                        } ${isCurrent ? 'bg-accent/8' : ''}`}
                        style={{ width: COL_W, height: ROW_H, position: 'relative' }}
                      >
                        {note && (
                          <div
                            className="absolute inset-0.5 rounded-sm bg-accent hover:brightness-125 transition-all"
                            style={{
                              width: note.duration * COL_W - 4,
                              opacity: note.velocity,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead */}
            {isPlaying && currentStep >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-accent/60 pointer-events-none z-10"
                style={{ left: currentStep * COL_W + COL_W / 2 }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
