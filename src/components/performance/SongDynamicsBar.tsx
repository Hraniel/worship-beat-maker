import React from 'react';
import type { SongSection, DynamicsIntensity } from '@/lib/sounds';

interface SongDynamicsBarProps {
  sections: SongSection[];
  totalMeasures: number;
  currentMeasure: number;
}

const INTENSITY_COLORS: Record<DynamicsIntensity, string> = {
  'pp': 'bg-blue-600/70',
  'p': 'bg-sky-500/70',
  'mp': 'bg-teal-500/70',
  'mf': 'bg-yellow-500/70',
  'f': 'bg-orange-500/70',
  'ff': 'bg-red-500/70',
};

const INTENSITY_LABELS: Record<DynamicsIntensity, string> = {
  'pp': 'pp', 'p': 'p', 'mp': 'mp', 'mf': 'mf', 'f': 'f', 'ff': 'ff',
};

const SongDynamicsBar: React.FC<SongDynamicsBarProps> = ({ sections, totalMeasures, currentMeasure }) => {
  if (!sections.length || totalMeasures <= 0) return null;

  return (
    <div className="w-full max-w-2xl px-4">
      <div className="relative flex h-8 rounded-lg overflow-hidden bg-muted/20 border border-border/30">
        {sections.map((section) => {
          const width = ((section.endMeasure - section.startMeasure + 1) / totalMeasures) * 100;
          const left = ((section.startMeasure - 1) / totalMeasures) * 100;
          const isActive = currentMeasure >= section.startMeasure && currentMeasure <= section.endMeasure;

          return (
            <div
              key={section.id}
              className={`absolute top-0 bottom-0 flex items-center justify-center transition-all duration-300 ${INTENSITY_COLORS[section.intensity]} ${
                isActive ? 'ring-2 ring-white/60 z-10 brightness-125' : 'opacity-70'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <div className="flex flex-col items-center leading-none">
                <span className={`text-[10px] font-bold text-white truncate px-1 ${isActive ? '' : 'opacity-80'}`}>
                  {section.name}
                </span>
                <span className="text-[8px] text-white/70 font-medium italic">
                  {INTENSITY_LABELS[section.intensity]}
                </span>
              </div>
            </div>
          );
        })}
        {/* Playhead */}
        {currentMeasure > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] z-20 transition-all duration-300"
            style={{ left: `${((currentMeasure - 0.5) / totalMeasures) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default SongDynamicsBar;
