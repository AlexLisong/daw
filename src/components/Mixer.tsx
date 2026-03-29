import { useDAWStore } from '../stores/dawStore';

export function Mixer() {
  const { mixerChannels, masterVolume, setChannelVolume, setChannelPan, toggleChannelMute, toggleChannelSolo, setMasterVolume } = useDAWStore();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-bg-panel">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Mixer</span>
      </div>

      {/* Channels */}
      <div className="flex-1 flex overflow-x-auto p-2 gap-1">
        {mixerChannels.map((ch, i) => (
          <ChannelStrip
            key={i}
            channel={ch}
            onVolume={(v) => setChannelVolume(i, v)}
            onPan={(p) => setChannelPan(i, p)}
            onMute={() => toggleChannelMute(i)}
            onSolo={() => toggleChannelSolo(i)}
          />
        ))}

        {/* Divider */}
        <div className="w-px bg-border shrink-0 mx-1" />

        {/* Master */}
        <div className="w-20 shrink-0 flex flex-col items-center bg-bg-surface rounded border border-border px-2 py-2">
          <span className="text-[10px] font-bold text-accent mb-1 tracking-wider">MASTER</span>

          {/* Volume fader (vertical) */}
          <div className="flex-1 flex flex-col items-center justify-center relative w-full">
            <input
              type="range"
              min={0}
              max={100}
              value={masterVolume * 100}
              onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
              className="h-full writing-mode-bt"
              style={{
                writingMode: 'vertical-lr' as any,
                direction: 'rtl',
                width: '20px',
                height: '120px',
              }}
            />
          </div>

          <span className="text-[10px] font-mono text-text-dim mt-1">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function ChannelStrip({
  channel,
  onVolume,
  onPan,
  onMute,
  onSolo,
}: {
  channel: { name: string; volume: number; pan: number; mute: boolean; solo: boolean; color: string };
  onVolume: (v: number) => void;
  onPan: (p: number) => void;
  onMute: () => void;
  onSolo: () => void;
}) {
  return (
    <div
      className={`w-20 shrink-0 flex flex-col items-center bg-bg-surface rounded border px-2 py-2 transition-colors ${
        channel.mute ? 'border-border opacity-50' : 'border-border'
      }`}
    >
      {/* Channel name */}
      <span
        className="text-[10px] font-bold mb-1 truncate w-full text-center"
        style={{ color: channel.color }}
      >
        {channel.name}
      </span>

      {/* Pan knob (simplified as slider) */}
      <div className="flex items-center gap-0.5 mb-1 w-full">
        <span className="text-[8px] text-text-dim">L</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={channel.pan * 100}
          onChange={(e) => onPan(Number(e.target.value) / 100)}
          className="flex-1"
          style={{ height: '10px' }}
        />
        <span className="text-[8px] text-text-dim">R</span>
      </div>

      {/* Volume fader (vertical) */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full">
        <input
          type="range"
          min={0}
          max={100}
          value={channel.volume * 100}
          onChange={(e) => onVolume(Number(e.target.value) / 100)}
          style={{
            writingMode: 'vertical-lr' as any,
            direction: 'rtl',
            width: '20px',
            height: '100px',
          }}
        />
      </div>

      {/* Volume display */}
      <span className="text-[10px] font-mono text-text-dim my-0.5">
        {Math.round(channel.volume * 100)}
      </span>

      {/* Mute / Solo buttons */}
      <div className="flex gap-1 mt-1">
        <button
          onClick={onMute}
          className={`w-7 h-5 text-[9px] font-bold rounded transition-colors ${
            channel.mute ? 'bg-accent text-white' : 'bg-bg-hover text-text-dim hover:text-text-secondary'
          }`}
        >
          M
        </button>
        <button
          onClick={onSolo}
          className={`w-7 h-5 text-[9px] font-bold rounded transition-colors ${
            channel.solo ? 'bg-amber text-black' : 'bg-bg-hover text-text-dim hover:text-text-secondary'
          }`}
        >
          S
        </button>
      </div>
    </div>
  );
}
