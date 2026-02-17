import React, { useState, useCallback, useRef, useEffect } from 'react';
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

// Global event emitter for pad hits
const padHitListeners = new Map<string, Set<() => void>>();

export function emitPadHit(channelId: string) {
  const listeners = padHitListeners.get(channelId);
  if (listeners) {
    listeners.forEach(cb => cb());
  }
}

function usePadHitFlash(channelId: string): number {
  const [flash, setFlash] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const cb = () => {
      setFlash(1);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      const start = performance.now();
      const decay = () => {
        const elapsed = performance.now() - start;
        const val = Math.max(0, 1 - elapsed / 300); // 300ms decay
        setFlash(val);
        if (val > 0) {
          timerRef.current = requestAnimationFrame(decay);
        }
      };
      timerRef.current = requestAnimationFrame(decay);
    };

    if (!padHitListeners.has(channelId)) {
      padHitListeners.set(channelId, new Set());
    }
    padHitListeners.get(channelId)!.add(cb);

    return () => {
      padHitListeners.get(channelId)?.delete(cb);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [channelId]);

  return flash;
}

const Fader: React.FC<{ channel: FaderChannel }> = ({ channel }) => {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const flash = usePadHitFlash(channel.id);

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
  // Flash glow: blend green fill with brighter flash
  const fillOpacity = Math.min(1, 0.6 + flash * 0.4);
  const glowIntensity = flash * 12;

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
        style={{ height: `${FADER_HEIGHT}px`, backgroundColor: 'hsl(var(--muted))' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 w-full rounded-full transition-opacity duration-75"
          style={{
            height: `${pct}%`,
            backgroundColor: 'hsl(140 60% 45%)',
            opacity: fillOpacity,
            boxShadow: flash > 0.05 ? `0 0 ${glowIntensity}px hsl(140 60% 50% / ${flash * 0.6})` : 'none',
          }}
        />
        {/* Thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-2.5 h-[5px] rounded-[1px]"
          style={{
            bottom: `calc(${pct}% - 2.5px)`,
            backgroundColor: flash > 0.1 ? `hsl(140 60% ${70 + flash * 20}%)` : 'hsl(0 0% 70%)',
            boxShadow: flash > 0.05
              ? `0 0 ${glowIntensity}px hsl(140 60% 50% / ${flash * 0.5})`
              : '0 1px 2px hsl(0 0% 0% / 0.5)',
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

const MixerStrip: React.FC<MixerStripProps> = ({ channels }) => {
  return (
    <div className="flex items-end gap-[6px] px-2 py-1.5 bg-card rounded-lg border border-border overflow-x-auto">
      {channels.map((ch) => (
        <div key={ch.id} className="flex flex-col items-center" style={{ minWidth: '18px' }}>
          <Fader channel={ch} />
        </div>
      ))}
    </div>
  );
};

export default MixerStrip;
