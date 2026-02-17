import React, { useState, useCallback, useRef, useEffect } from 'react';
import ZoomPopup from './ZoomPopup';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface FaderChannel {
  id: string;
  label: string;
  shortLabel: string;
  volume: number;
  onChange: (v: number) => void;
  isMuted?: boolean;
  isSoloed?: boolean;
  onToggleMute?: () => void;
  onToggleSolo?: () => void;
}

interface MixerStripProps {
  channels: FaderChannel[];
}

const FADER_HEIGHT = 110;
const VU_LINES = 12;

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

/** Clipping indicator dot above VU ticks */
const ClipIndicator: React.FC<{ flash: number; volume: number }> = ({ flash, volume }) => {
  if (flash <= 0.05 || flash <= volume) return null;
  const overflow = flash - volume;
  const isRed = overflow > 0.2;
  const isYellow = !isRed && overflow > 0;
  if (!isYellow && !isRed) return null;
  return (
    <div
      className="rounded-full mb-0.5"
      style={{
        width: '4px',
        height: '4px',
        backgroundColor: isRed ? 'hsl(0 80% 50%)' : 'hsl(45 90% 55%)',
        boxShadow: isRed
          ? '0 0 6px hsl(0 80% 50% / 0.7)'
          : '0 0 4px hsl(45 90% 55% / 0.5)',
      }}
    />
  );
};

/** VU tick lines on the right side of a fader */
const VuTicks: React.FC<{ volume: number; flash: number }> = ({ volume, flash }) => {
  // Flash is capped at the volume level
  const activeLevel = Math.min(Math.max(volume, flash * volume), volume);
  return (
    <div className="flex flex-col items-center">
      <ClipIndicator flash={flash} volume={volume} />
      <div
        className="flex flex-col-reverse justify-between"
        style={{ height: `${FADER_HEIGHT}px` }}
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
                width: '10px',
                height: '2px',
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
    </div>
  );
};

/** Solo and Mute buttons */
const SoloMuteButtons: React.FC<{
  isSoloed?: boolean;
  isMuted?: boolean;
  onToggleSolo?: () => void;
  onToggleMute?: () => void;
}> = ({ isSoloed, isMuted, onToggleSolo, onToggleMute }) => (
  <div className="flex flex-col gap-[1px]">
    <button
      onClick={(e) => { e.stopPropagation(); onToggleSolo?.(); }}
      className="flex items-center justify-center rounded-[2px] transition-colors"
      style={{
        width: '14px',
        height: '14px',
        fontSize: '7px',
        fontWeight: 700,
        backgroundColor: isSoloed ? 'hsl(45 90% 55%)' : 'hsl(var(--muted))',
        color: isSoloed ? 'hsl(0 0% 0%)' : 'hsl(var(--muted-foreground))',
      }}
      title="Solo"
    >
      S
    </button>
    <button
      onClick={(e) => { e.stopPropagation(); onToggleMute?.(); }}
      className="flex items-center justify-center rounded-[2px] transition-colors"
      style={{
        width: '14px',
        height: '14px',
        fontSize: '7px',
        fontWeight: 700,
        backgroundColor: isMuted ? 'hsl(0 70% 50%)' : 'hsl(var(--muted))',
        color: isMuted ? 'hsl(0 0% 100%)' : 'hsl(var(--muted-foreground))',
      }}
      title="Mute"
    >
      M
    </button>
  </div>
);

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
  const fillOpacity = Math.min(1, 0.6 + Math.min(flash, channel.volume) * 0.4);
  const glowIntensity = Math.min(flash, channel.volume) * 10;
  const isMuted = channel.isMuted;

  return (
    <div className={`flex flex-col items-center gap-1 flex-1 min-w-0 ${isMuted ? 'opacity-30' : ''}`}>
      {/* S/M buttons */}
      <SoloMuteButtons
        isSoloed={channel.isSoloed}
        isMuted={channel.isMuted}
        onToggleSolo={channel.onToggleSolo}
        onToggleMute={channel.onToggleMute}
      />

      {/* Fader + VU ticks side by side */}
      <div className="flex items-stretch gap-[3px]">
        {/* Fader track */}
        <div
          ref={trackRef}
          className="relative w-[5px] rounded-full touch-none cursor-pointer"
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
              boxShadow: flash > 0.05 ? `0 0 ${glowIntensity}px hsl(0 0% 100% / ${Math.min(flash, channel.volume) * 0.6})` : 'none',
            }}
          />
          {/* Thumb */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-3.5 h-[6px] rounded-[1px]"
            style={{
              bottom: `calc(${pct}% - 2.5px)`,
              backgroundColor: flash > 0.1 ? `hsl(0 0% 100%)` : 'hsl(0 0% 70%)',
              boxShadow: flash > 0.05
                ? `0 0 ${glowIntensity}px hsl(0 0% 100% / ${Math.min(flash, channel.volume) * 0.5})`
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

      {/* Label below */}
      <span className="text-[9px] text-muted-foreground font-medium truncate w-full text-center leading-tight">
        {channel.shortLabel}
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
  const [direction, setDirection] = useState(0);

  const fixedStart = channels.slice(0, 2);
  const fixedEnd = channels.slice(-1);
  const padChannels = channels.slice(2, -1);

  const totalPages = Math.ceil(padChannels.length / MOBILE_PAGE_SIZE);
  const pagedPads = padChannels.slice(page * MOBILE_PAGE_SIZE, (page + 1) * MOBILE_PAGE_SIZE);

  const goToPage = useCallback((newPage: number) => {
    setDirection(newPage > page ? 1 : -1);
    setPage(newPage);
  }, [page]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-1 px-2 py-2 bg-card rounded-lg border border-border">
        {/* Fixed: MET + PAD */}
        {fixedStart.map((ch) => (
          <div key={ch.id} className="flex-1 min-w-0">
            <Fader channel={ch} />
          </div>
        ))}

        {/* Separator */}
        <div className="w-px self-stretch bg-border mx-0.5" />

        {/* Paginated pad channels with slide animation */}
        <div className="flex-[4] min-w-0 overflow-hidden relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={page}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="flex gap-1"
            >
              {pagedPads.map((ch) => (
                <div key={ch.id} className="min-w-0" style={{ width: `calc(${100 / MOBILE_PAGE_SIZE}% - ${((MOBILE_PAGE_SIZE - 1) * 4) / MOBILE_PAGE_SIZE}px)` }}>
                  <Fader channel={ch} />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Separator */}
        <div className="w-px self-stretch bg-border mx-0.5" />

        {/* Fixed: MST */}
        {fixedEnd.map((ch) => (
          <div key={ch.id} className="flex-1 min-w-0">
            <Fader channel={ch} />
          </div>
        ))}
      </div>

      {/* Page nav */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === page ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => goToPage(Math.min(totalPages - 1, page + 1))}
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
