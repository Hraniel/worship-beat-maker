import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Volume2, StopCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  ALL_NOTES,
  type NoteName,
  toggleAmbientNote,
  stopAllAmbient,
  isAmbientNoteActive,
  setAmbientVolume,
  getAmbientVolume,
} from '@/lib/ambient-engine';

const NOTE_COLORS: Record<NoteName, string> = {
  C: '0 70% 55%', 'C#': '20 65% 50%', D: '35 70% 55%', 'D#': '50 65% 50%',
  E: '80 60% 50%', F: '140 55% 45%', 'F#': '170 60% 45%', G: '200 65% 50%',
  'G#': '230 60% 55%', A: '260 65% 55%', 'A#': '290 60% 50%', B: '320 65% 50%',
};

const AmbientPads: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<NoteName>>(new Set());
  const [volume, setVolume] = useState(getAmbientVolume);

  const handleToggle = useCallback((note: NoteName) => {
    const isNowActive = toggleAmbientNote(note);
    setActiveNotes(prev => {
      const next = new Set(prev);
      if (isNowActive) next.add(note);
      else next.delete(note);
      return next;
    });
  }, []);

  const handleStopAll = useCallback(() => {
    stopAllAmbient();
    setActiveNotes(new Set());
  }, []);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0] / 100;
    setVolume(v);
    setAmbientVolume(v);
  }, []);

  const hasActive = activeNotes.size > 0;

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">🎹 Ambient Pads</span>
          {hasActive && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {activeNotes.size} ativa{activeNotes.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {/* Volume control */}
          <div className="flex items-center gap-2 px-1">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Slider
              value={[volume * 100]}
              onValueChange={handleVolumeChange}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{Math.round(volume * 100)}%</span>
            {hasActive && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleStopAll}>
                <StopCircle className="h-3 w-3" />
                Parar
              </Button>
            )}
          </div>

          {/* Note grid */}
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {ALL_NOTES.map((note) => {
              const isActive = activeNotes.has(note);
              const color = NOTE_COLORS[note];
              const isSharp = note.includes('#');
              return (
                <button
                  key={note}
                  onClick={() => handleToggle(note)}
                  className={`
                    relative flex items-center justify-center rounded-md
                    border transition-all duration-200 select-none cursor-pointer
                    h-10 sm:h-12 text-xs font-bold
                    ${isSharp ? 'text-[10px]' : ''}
                  `}
                  style={{
                    backgroundColor: `hsl(${color} / ${isActive ? 0.5 : 0.15})`,
                    borderColor: `hsl(${color} / ${isActive ? 0.8 : 0.25})`,
                    boxShadow: isActive ? `0 0 12px hsl(${color} / 0.3)` : 'none',
                    color: `hsl(${color})`,
                  }}
                >
                  {note}
                  {isActive && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: `hsl(${color})` }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Toque para ativar/desativar acordes sustentados
          </p>
        </div>
      )}
    </div>
  );
};

export default AmbientPads;
