import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import type { SongMarker } from '@/lib/sounds';

interface RehearsalCounterProps {
  currentMeasure: number;
  totalMeasures: number;
  currentBeat: number;
  beatsPerMeasure: number;
  markers: SongMarker[];
  isPlaying: boolean;
}

const RehearsalCounter: React.FC<RehearsalCounterProps> = ({
  currentMeasure, totalMeasures, currentBeat, beatsPerMeasure, markers, isPlaying,
}) => {
  const { t } = useTranslation();
  const [alertMarker, setAlertMarker] = useState<SongMarker | null>(null);
  const alertTimerRef = useRef<number | null>(null);

  // Check for upcoming markers (2 measures ahead)
  useEffect(() => {
    if (!isPlaying || !markers.length) return;
    const upcoming = markers.find(m => m.measure - currentMeasure === 2);
    if (upcoming) {
      setAlertMarker(upcoming);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      alertTimerRef.current = window.setTimeout(() => setAlertMarker(null), 3000);
    }
  }, [currentMeasure, markers, isPlaying]);

  useEffect(() => {
    return () => { if (alertTimerRef.current) clearTimeout(alertTimerRef.current); };
  }, []);

  if (!totalMeasures || totalMeasures <= 0) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Measure counter */}
      <div className="flex items-baseline gap-1">
        <span className="text-5xl sm:text-6xl font-black text-foreground tabular-nums leading-none">
          {currentMeasure || 1}
        </span>
        <span className="text-lg text-muted-foreground font-medium">/</span>
        <span className="text-lg text-muted-foreground font-bold tabular-nums">
          {totalMeasures}
        </span>
      </div>

      {/* Beat dots */}
      {isPlaying && (
        <div className="flex gap-1.5">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all duration-100 ${
                i < currentBeat
                  ? 'bg-primary scale-110'
                  : i === currentBeat
                  ? 'bg-primary animate-pulse scale-125'
                  : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      )}

      {/* Marker alert */}
      {alertMarker && (
        <div className="animate-pulse mt-1 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40">
          <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> {alertMarker.label} {t('performance.inMeasures', { count: 2 })}
          </span>
        </div>
      )}
    </div>
  );
};

export default RehearsalCounter;
