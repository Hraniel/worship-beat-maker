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
}

interface MixerStripProps {
  channels: FaderChannel[];
  showAll?: boolean;
  compactFaderHeight?: number;
  /** When provided, page is controlled externally (e.g. buttons 1/2 in footer) */
  controlledPage?: number;
  onControlledPageChange?: (page: number) => void;
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


/** VU tick lines on the right side of a fader */
const VuTicks: React.FC<{ volume: number; flash: number; height?: number }> = ({ volume, flash, height = FADER_HEIGHT }) => {
  // Flash is capped at the volume level
  const activeLevel = Math.min(Math.max(volume, flash * volume), volume);
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex flex-col-reverse justify-between"
        style={{ height: `${height}px` }}
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
                  ? 'hsl(var(--fader-vu-lit))'
                  : 'hsl(var(--muted))',
                opacity: isLit ? (isTop ? 1 : isMid ? 0.8 : 0.6) : 0.3,
                boxShadow: isLit && flash > 0.1
                  ? `0 0 4px hsl(var(--fader-vu-lit) / 0.5)`
                  : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};


const Fader: React.FC<{ channel: FaderChannel; faderHeight?: number }> = ({ channel, faderHeight = FADER_HEIGHT }) => {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const onChangeRef = useRef(channel.onChange);
  const flash = usePadHitFlash(channel.id);

  // Keep ref in sync so callbacks always call latest onChange without stale closure
  useEffect(() => { onChangeRef.current = channel.onChange; }, [channel.onChange]);

  const updateVolume = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    onChangeRef.current(y);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateVolume(e.clientY);
  }, [updateVolume]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateVolume(e.clientY);
  }, [updateVolume]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }, []);

  const pct = channel.volume * 100;
  const fillOpacity = Math.min(1, 0.6 + Math.min(flash, channel.volume) * 0.4);
  const glowIntensity = Math.min(flash, channel.volume) * 10;

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      {/* Fader + VU ticks side by side */}
      <div className="flex items-stretch gap-[3px]">
        {/* Fader track */}
        <div
          ref={trackRef}
          className="relative z-10 w-[5px] rounded-full touch-none cursor-pointer"
          style={{ height: `${faderHeight}px`, backgroundColor: 'hsl(var(--muted))' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 w-full rounded-full transition-opacity duration-75"
            style={{
              height: `${pct}%`,
              backgroundColor: 'hsl(var(--fader-fill))',
              opacity: fillOpacity,
              boxShadow: flash > 0.05 ? `0 0 ${glowIntensity}px hsl(var(--fader-fill) / ${Math.min(flash, channel.volume) * 0.6})` : 'none',
            }}
          />
          {/* Thumb */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-7 h-[12px] rounded-[3px]"
            style={{
              bottom: `calc(${pct}% - 6px)`,
              backgroundColor: flash > 0.1 ? `hsl(var(--fader-thumb-active))` : 'hsl(var(--fader-thumb))',
              boxShadow: flash > 0.05
                ? `0 0 ${glowIntensity}px hsl(var(--fader-fill) / ${Math.min(flash, channel.volume) * 0.5})`
                : '0 1px 3px hsl(0 0% 0% / 0.6)',
            }}
          />
        </div>

        {/* VU tick lines on the right */}
        <VuTicks volume={channel.volume} flash={flash} height={faderHeight} />
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

const MixerStrip: React.FC<MixerStripProps> = ({ channels, showAll, compactFaderHeight, controlledPage, onControlledPageChange }) => {
  const [internalPage, setInternalPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use external page when controlled, otherwise internal
  const isControlled = controlledPage !== undefined;
  const page = isControlled ? controlledPage : internalPage;

  const fixedStart = channels.slice(0, 2);
  const fixedEnd = channels.slice(-1);
  const padChannels = channels.slice(2, -1);

  const totalPages = Math.ceil(padChannels.length / MOBILE_PAGE_SIZE);
  const pagedPads = padChannels.slice(page * MOBILE_PAGE_SIZE, (page + 1) * MOBILE_PAGE_SIZE);

  const goToPage = useCallback((newPage: number) => {
    setDirection(newPage > page ? 1 : -1);
    if (isControlled) {
      onControlledPageChange?.(newPage);
    } else {
      setInternalPage(newPage);
    }
  }, [page, isControlled, onControlledPageChange]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const fHeight = compactFaderHeight || FADER_HEIGHT;

  // Show all channels in a single row (tablet mode)
  if (showAll) {
    return (
      <div className="flex flex-col gap-1">
        <div ref={containerRef} className="flex items-start gap-0.5 px-1 pt-2 pb-1 bg-card rounded-lg border border-border overflow-visible">
          {channels.map((ch) => (
            <div key={ch.id} className="flex-1 min-w-0">
              <Fader channel={ch} faderHeight={fHeight} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div ref={containerRef} className="flex items-start gap-1 px-2 pt-2 pb-1 bg-card rounded-lg border border-border overflow-visible">
        {/* Fixed: MET + PAD */}
        {fixedStart.map((ch) => (
          <div key={ch.id} className="flex-1 min-w-0">
            <Fader channel={ch} />
          </div>
        ))}

        {/* Separator */}
        <div className="w-px self-stretch bg-border mx-0.5" />

        {/* Paginated pad channels — no swipe, only button navigation to prevent fader conflicts */}
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

      {/* Page nav — only shown when NOT controlled externally (buttons 1/2 handle it in that case) */}
      {!isControlled && totalPages > 1 && (
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
