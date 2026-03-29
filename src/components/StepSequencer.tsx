import { useDAWStore } from '../stores/dawStore';
import { DRUM_NAMES, getDrumColor, playDrum } from '../audio/engine';

export function StepSequencer() {
  const { sequencerGrid, currentStep, isPlaying, toggleStep, clearPattern, randomizePattern } = useDAWStore();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-bg-panel">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Channel Rack</span>
        <div className="flex-1" />
        <button
          onClick={randomizePattern}
          className="px-2 py-0.5 text-xs bg-bg-surface hover:bg-bg-hover border border-border rounded transition-colors text-text-secondary"
        >
          Random
        </button>
        <button
          onClick={clearPattern}
          className="px-2 py-0.5 text-xs bg-bg-surface hover:bg-bg-hover border border-border rounded transition-colors text-text-secondary"
        >
          Clear
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {DRUM_NAMES.map((drum, drumIdx) => (
          <div key={drum} className="flex items-center gap-1 mb-1">
            {/* Drum label */}
            <button
              onClick={() => playDrum(drum)}
              className="w-20 shrink-0 px-2 py-1.5 text-xs font-mono text-left rounded hover:bg-bg-hover transition-colors truncate"
              style={{ color: getDrumColor(drum) }}
              title={`Preview ${drum}`}
            >
              {drum.toUpperCase()}
            </button>

            {/* Steps */}
            <div className="flex gap-0.5 flex-1">
              {Array.from({ length: 16 }, (_, stepIdx) => {
                const active = sequencerGrid[drumIdx][stepIdx];
                const isCurrent = isPlaying && stepIdx === currentStep;
                const isDownbeat = stepIdx % 4 === 0;

                return (
                  <button
                    key={stepIdx}
                    onClick={() => toggleStep(drumIdx, stepIdx)}
                    className={`flex-1 h-7 rounded-sm transition-all duration-75 border ${
                      active
                        ? isCurrent
                          ? 'border-white/50 scale-105 brightness-125'
                          : 'border-transparent'
                        : isCurrent
                          ? 'border-accent/50 bg-accent/10'
                          : isDownbeat
                            ? 'border-border/50 bg-bg-surface'
                            : 'border-transparent bg-bg-surface/60'
                    }`}
                    style={active ? {
                      backgroundColor: getDrumColor(drum),
                      opacity: isCurrent ? 1 : 0.75,
                    } : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
