import { Transport } from './components/Transport';
import { StepSequencer } from './components/StepSequencer';
import { PianoRoll } from './components/PianoRoll';
import { Mixer } from './components/Mixer';
import { AIAssistant } from './components/AIAssistant';
import { useDAWStore } from './stores/dawStore';

function App() {
  const { activeView, setActiveView } = useDAWStore();

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* Transport bar */}
      <Transport />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: View tabs + content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View tabs */}
          <div className="flex bg-bg-panel border-b border-border">
            {(['sequencer', 'pianoroll', 'mixer'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  activeView === view
                    ? 'text-accent border-accent bg-bg-primary'
                    : 'text-text-dim border-transparent hover:text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {view === 'sequencer' ? 'Channel Rack' : view === 'pianoroll' ? 'Piano Roll' : 'Mixer'}
              </button>
            ))}
          </div>

          {/* Active view */}
          <div className="flex-1 overflow-hidden">
            {activeView === 'sequencer' && <StepSequencer />}
            {activeView === 'pianoroll' && <PianoRoll />}
            {activeView === 'mixer' && <Mixer />}
          </div>
        </div>

        {/* Right: AI Assistant */}
        <div className="w-72 shrink-0">
          <AIAssistant />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-bg-panel border-t border-border text-[10px] text-text-dim">
        <span>Isaac Studio v1.0</span>
        <span>Web Audio API | 44.1kHz</span>
      </div>
    </div>
  );
}

export default App;
