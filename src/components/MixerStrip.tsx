import React, { useState, useCallback, useRef, useEffect } from 'react';
import ZoomPopup from './ZoomPopup';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react';

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

const FADER_HEIGHT = 72; // px height of fader track
const VU_LINES = 10; // number of horizontal tick lines

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
        const val = Math.max(0, 1 - elapsed / 300);
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

/** VU tick lines on the right side of a fader */
const VuTicks: React.FC<{ volume: number; flash: number }> = ({ volume, flash }) => {
  const activeLevel = Math.max(volume, flash);
  return (
    <div
      className="flex flex-col-reverse justify-between"
      style={{ height: `${FADER_HEIGHT}px`, paddingTop: 0, paddingBottom: 0 }}
    >
      {Array.from({ length: VU_LINES }).map((_, i) => {
        const threshold = (i + 1) / VU_LINES;
        const isLit = activeLevel >= threshold * 0.9;
        const isTop = i >= VU_LINES - 2;
        const isMid = i >= VU_LINES - 4;
        return (
          <div
            key={i}
            className="transition-all duration-75"
            style={{
              width: '8px',
              height: '1.5px',
              borderRadius: '1px',
              backgroundColor: isLit
                ? 'hsl(0 0% 100%)'
                : 'hsl(var(--muted))',
              opacity: isLit ? (isTop ? 1 : isMid ? 0.8 : 0.6) : 0.3,
              boxShadow: isLit && flash > 0.1
                ? `0 0 4px hsl(0 0% 100% / 0.5)`
                : 'none',
            }}
          />
        );
      })}
    </div>
  );
};

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
  const fillOpacity = Math.min(1, 0.6 + flash * 0.4);
  const glowIntensity = flash * 10;

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* Label */}
      <span className="text-[6px] text-muted-foreground font-medium truncate w-full text-center leading-tight">
        {channel.shortLabel}
      </span>

      {/* Fader + VU ticks side by side */}
      <div className="flex items-stretch gap-[2px]">
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
              backgroundColor: 'hsl(0 0% 100%)',
              opacity: fillOpacity,
              boxShadow: flash > 0.05 ? `0 0 ${glowIntensity}px hsl(0 0% 100% / ${flash * 0.6})` : 'none',
            }}
          />
          {/* Thumb */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-2.5 h-[5px] rounded-[1px]"
            style={{
              bottom: `calc(${pct}% - 2.5px)`,
              backgroundColor: flash > 0.1 ? `hsl(0 0% 100%)` : 'hsl(0 0% 70%)',
              boxShadow: flash > 0.05
                ? `0 0 ${glowIntensity}px hsl(0 0% 100% / ${flash * 0.5})`
                : '0 1px 2px hsl(0 0% 0% / 0.5)',
            }}
          />
        </div>

        {/* VU tick lines on the right */}
        <VuTicks volume={channel.volume} flash={flash} />
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

const MOBILE_PAGE_SIZE = 4;

const MixerStrip: React.FC<MixerStripProps> = ({ channels }) => {
  const [page, setPage] = useState(0);

  // Fixed channels: first 2 (MET, PAD) + last 1 (MST) always visible
  // Paginated: pad channels in the middle
  const fixedStart = channels.slice(0, 2);
  const fixedEnd = channels.slice(-1);
  const padChannels = channels.slice(2, -1);

  const totalPages = Math.ceil(padChannels.length / MOBILE_PAGE_SIZE);
  const pagedPads = padChannels.slice(page * MOBILE_PAGE_SIZE, (page + 1) * MOBILE_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-[5px] px-2 py-1.5 bg-card rounded-lg border border-border">
        {/* Fixed: MET + PAD */}
        {fixedStart.map((ch) => (
          <div key={ch.id} style={{ minWidth: '16px' }}>
            <Fader channel={ch} />
          </div>
        ))}

        {/* Separator */}
        <div className="w-px self-stretch bg-border mx-0.5" />

        {/* Paginated pad channels */}
        {pagedPads.map((ch) => (
          <div key={ch.id} style={{ minWidth: '16px' }}>
            <Fader channel={ch} />
          </div>
        ))}

        {/* Separator */}
        <div className="w-px self-stretch bg-border mx-0.5" />

        {/* Fixed: MST */}
        {fixedEnd.map((ch) => (
          <div key={ch.id} style={{ minWidth: '16px' }}>
            <Fader channel={ch} />
          </div>
        ))}
      </div>

      {/* Page nav */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === page ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MixerStrip;
