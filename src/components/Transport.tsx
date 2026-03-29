import { useState } from 'react';
import { useDAWStore } from '../stores/dawStore';
import { exportToWav } from '../audio/engine';

export function Transport() {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const {
    isPlaying, bpm, swing, togglePlay, stop, setBpm, currentStep,
    songMode, toggleSongMode, arrangement, currentArrangementIndex, patterns, activePatternName,
  } = useDAWStore();

  const currentPattern = patterns[activePatternName];

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-bg-panel border-b border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center text-white font-bold text-xs">IS</div>
        <span className="font-bold text-sm tracking-wide text-text-primary">Isaac Studio</span>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Transport controls */}
      <button
        onClick={stop}
        className="w-8 h-8 rounded bg-bg-surface hover:bg-bg-hover flex items-center justify-center transition-colors"
        title="Stop"
      >
        <div className="w-3 h-3 bg-text-secondary rounded-sm" />
      </button>

      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          isPlaying ? 'bg-accent text-white' : 'bg-bg-surface hover:bg-bg-hover text-green'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-current rounded-sm" />
            <div className="w-1 h-3 bg-current rounded-sm" />
          </div>
        ) : (
          <div className="w-0 h-0 border-l-[8px] border-l-current border-y-[5px] border-y-transparent ml-0.5" />
        )}
      </button>

      {/* Song mode toggle */}
      <button
        onClick={toggleSongMode}
        className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
          songMode
            ? 'bg-green/20 text-green border border-green/40'
            : 'bg-bg-surface text-text-dim border border-border hover:text-text-secondary'
        }`}
        title={songMode ? 'Song mode (plays arrangement)' : 'Pattern mode (loops current)'}
      >
        {songMode ? 'SONG' : 'PAT'}
      </button>

      <div className="w-px h-6 bg-border" />

      {/* BPM */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">BPM</span>
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-14 bg-bg-surface border border-border rounded px-2 py-1 text-center text-sm text-amber font-mono focus:border-accent outline-none"
          min={40}
          max={300}
        />
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Swing */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-secondary">SWG</span>
        <span className="text-xs font-mono text-text-dim w-7">{swing}%</span>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Song arrangement progress */}
      {songMode && arrangement.length > 1 ? (
        <div className="flex gap-0.5 items-center">
          {arrangement.map((name, i) => {
            const p = patterns[name];
            const isCurrent = isPlaying && i === currentArrangementIndex;
            return (
              <div
                key={`${name}-${i}`}
                className={`h-5 px-1.5 rounded-sm text-[9px] font-bold flex items-center transition-all ${
                  isCurrent ? 'scale-110 ring-1 ring-white/40' : 'opacity-60'
                }`}
                style={{ backgroundColor: p?.color || '#555' }}
                title={p?.label || name}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            );
          })}
        </div>
      ) : (
        /* Step indicator (pattern mode) */
        <div className="flex gap-0.5">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 h-3 rounded-sm transition-colors ${
                i === currentStep ? 'bg-accent' : i % 4 === 0 ? 'bg-text-dim' : 'bg-border'
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Export button */}
      <button
        onClick={async () => {
          if (exporting) return;
          setExporting(true);
          setExportProgress(0);
          try {
            const state = useDAWStore.getState();
            let exportPatterns;

            if (state.songMode && state.arrangement.length > 1) {
              // Export full song arrangement
              exportPatterns = state.arrangement.map(name => {
                const p = state.patterns[name];
                return { drums: p.drums, notes: p.notes };
              });
            } else {
              // Export current pattern (loop it 4 times for a reasonable length)
              const single = { drums: state.sequencerGrid, notes: state.pianoNotes };
              exportPatterns = [single, single, single, single];
            }

            const blob = await exportToWav(exportPatterns, state.bpm, state.swing, setExportProgress);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `isaac-studio-${new Date().toISOString().slice(0, 16).replace(/[:-]/g, '')}.wav`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error('Export failed:', e);
          }
          setExporting(false);
        }}
        disabled={exporting}
        className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
          exporting
            ? 'bg-amber/20 text-amber border border-amber/40'
            : 'bg-bg-surface text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary'
        }`}
        title="Export to WAV"
      >
        {exporting ? `${exportProgress}%` : 'EXPORT'}
      </button>

      {/* Current section + step */}
      <div className="font-mono text-sm text-text-secondary flex items-center gap-2">
        {songMode && currentPattern && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: currentPattern.color, color: '#fff' }}
          >
            {currentPattern.label || currentPattern.name}
          </span>
        )}
        <span>
          <span className="text-accent">{currentStep >= 0 ? currentStep + 1 : '-'}</span>
          <span className="text-text-dim"> / 16</span>
        </span>
      </div>
    </div>
  );
}
