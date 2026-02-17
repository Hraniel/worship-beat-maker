import React, { useState, useCallback, useRef } from 'react';
import ZoomPopup from './ZoomPopup';
import { Volume2 } from 'lucide-react';

interface FaderChannel {
  id: string;
  label: string;
  shortLabel: string;
  volume: number;
  onChange: (v: number) => void;
}

interface MixerStripProps {
  channels: FaderChannel[];
}

const FADER_HEIGHT = 64; // px

const Fader: React.FC<{ channel: FaderChannel }> = ({ channel }) => {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const updateVolume = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    channel.onChange(y);
  }, [channel]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateVolume(e.clientY);
  }, [updateVolume]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    updateVolume(e.clientY);
  }, [dragging, updateVolume]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const pct = channel.volume * 100;

  return (
    <div className="flex flex-col items-center gap-0.5 w-full">
      {/* Label */}
      <span className="text-[6px] text-muted-foreground font-medium truncate w-full text-center leading-tight">
        {channel.shortLabel}
      </span>

      {/* Fader track */}
      <div
        ref={trackRef}
        className="relative w-[3px] rounded-full touch-none cursor-pointer"
        style={{ height: `${FADER_HEIGHT}px`, backgroundColor: 'hsl(0 0% 18%)' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 w-full rounded-full"
          style={{
            height: `${pct}%`,
            backgroundColor: 'hsl(140 60% 45%)',
          }}
        />
        {/* Thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-2.5 h-[5px] rounded-[1px]"
          style={{
            bottom: `calc(${pct}% - 2.5px)`,
            backgroundColor: 'hsl(0 0% 70%)',
            boxShadow: '0 1px 2px hsl(0 0% 0% / 0.5)',
          }}
        />
      </div>

      {/* Volume % */}
      <span className="text-[6px] text-muted-foreground tabular-nums leading-tight">
        {Math.round(pct)}
      </span>

      <ZoomPopup visible={dragging}>
        <Volume2 className="h-5 w-5 text-foreground" />
        <span className="text-lg font-bold text-foreground tabular-nums">{channel.label}</span>
        <span className="text-2xl font-bold text-foreground tabular-nums">{Math.round(pct)}%</span>
        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-75" style={{ width: `${pct}%` }} />
        </div>
      </ZoomPopup>
    </div>
  );
};

/** VU meter bars between faders */
const VuBar: React.FC<{ level: number }> = ({ level }) => {
  const barCount = 6;
  return (
    <div className="flex flex-col-reverse gap-[1px] w-[2px] shrink-0" style={{ height: `${FADER_HEIGHT}px`, marginTop: '10px' }}>
      {Array.from({ length: barCount }).map((_, i) => {
        const threshold = (i + 1) / barCount;
        const isLit = level >= threshold * 0.8;
        const isTop = i >= barCount - 1;
        const isMid = i >= barCount - 2;
        return (
          <div
            key={i}
            className="flex-1 rounded-[0.5px] transition-all duration-100"
            style={{
              backgroundColor: isLit
                ? isTop
                  ? 'hsl(0 70% 50%)'
                  : isMid
                  ? 'hsl(45 80% 50%)'
                  : 'hsl(140 60% 45%)'
                : 'hsl(0 0% 12%)',
              opacity: isLit ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
};

const MixerStrip: React.FC<MixerStripProps> = ({ channels }) => {
  // Simple level simulation based on volume (no real analyser per channel)
  // Shows volume level as a static VU indication
  return (
    <div className="flex items-end gap-[2px] px-2 py-1.5 bg-card rounded-lg border border-border overflow-x-auto">
      {channels.map((ch, i) => (
        <React.Fragment key={ch.id}>
          <div className="flex flex-col items-center" style={{ minWidth: '20px' }}>
            <Fader channel={ch} />
          </div>
          {/* VU bar between faders */}
          {i < channels.length - 1 && (
            <VuBar level={ch.volume} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default MixerStrip;
