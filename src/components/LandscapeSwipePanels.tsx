import React, { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useIsLandscape } from '@/hooks/use-mobile';
import Metronome from '@/components/Metronome';
import PanControl from '@/components/PanControl';

interface LandscapeSwipePanelsProps {
  padGrid: React.ReactNode;
  ambientPads: React.ReactNode;
  mixer?: React.ReactNode;
  metronome?: React.ReactNode;
  focusMode?: boolean;
  // Metronome state passed from parent so landscape can control it
  bpm?: number;
  onBpmChange?: (bpm: number) => void;
  timeSignature?: string;
  onTimeSignatureChange?: (ts: string) => void;
  metronomeIsPlaying?: boolean;
  onTogglePlay?: () => void;
  spotifyKey?: string | null;
  onKeyChange?: (key: string) => void;
  metronomePan?: number;
  onMetronomePanChange?: (pan: number) => void;
  metronomePanDisabled?: boolean;
  spotifyTrackName?: string | null;
}

const LandscapeSwipePanels: React.FC<LandscapeSwipePanelsProps> = ({
  padGrid,
  ambientPads,
  mixer,
  metronome,
  focusMode,
  bpm = 120,
  onBpmChange,
  timeSignature = '4/4',
  onTimeSignatureChange,
  metronomeIsPlaying = false,
  onTogglePlay,
  spotifyKey,
  onKeyChange,
  metronomePan = 0,
  onMetronomePanChange,
  metronomePanDisabled = false,
  spotifyTrackName,
}) => {
  const isLandscape = useIsLandscape();
  const [landscapeTab, setLandscapeTab] = useState<0 | 1>(0); // 0=Mix, 1=Met

  // Portrait / desktop: pad grid with ambient pads below
  if (!isLandscape) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className={`flex-1 flex justify-center min-h-0 overflow-hidden ${focusMode ? 'items-start' : 'items-center'}`}>
          {padGrid}
        </div>
        <div className={`shrink-0 border-t border-border/30 ${focusMode ? 'px-2 py-0.5' : 'px-2 py-1'}`}>
          {ambientPads}
        </div>
      </div>
    );
  }

  // Landscape mobile: side-by-side layout
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: Pad Grid - full height, constrained */}
      <div className="flex-1 flex items-center justify-center min-h-0 min-w-0 overflow-hidden p-1">
        {padGrid}
      </div>

      {/* Right: Tab system (Mix / Met) */}
      <div className="w-[42%] max-w-[320px] shrink-0 flex flex-col min-h-0 border-l border-border/30">

        {focusMode ? (
          /* Focus mode: BPM bar + ultra-compact ambient pads */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
              <span className="text-sm font-bold text-foreground tabular-nums">{bpm}</span>
              <span className="text-[10px] text-muted-foreground">BPM</span>
              {spotifyKey && <span className="text-[10px] font-semibold text-primary">· {spotifyKey}</span>}
              <span className="text-[10px] text-muted-foreground">· {timeSignature}</span>
              <button
                type="button"
                onClick={onTogglePlay}
                className={`p-1.5 rounded-md transition-colors ${metronomeIsPlaying ? 'text-destructive hover:bg-destructive/10' : 'text-primary hover:bg-primary/10'}`}
              >
                {metronomeIsPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
            </div>
            {/* Ultra-compact ambient pads */}
            <div className="flex-1 min-h-0 px-1.5 py-1.5 overflow-hidden">
              {ambientPads}
            </div>
          </div>
        ) : (
          /* Tab buttons */
          <div className="flex items-center gap-1 px-2 pt-1 pb-0 shrink-0">
            {(['Mix', 'Met'] as const).map((label, i) => (
              <button
                key={i}
                onClick={() => setLandscapeTab(i as 0 | 1)}
                className={`relative px-2 h-5 rounded text-[9px] font-bold transition-colors flex items-center gap-1 ${
                  landscapeTab === i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
                {label === 'Met' && metronomeIsPlaying && (
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: 'hsl(142 71% 45%)' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {!focusMode && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

            {/* === MIX TAB === */}
            <div className={landscapeTab === 0 ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
              {/* Ambient pads (compact) */}
              <div className="shrink-0 px-1.5 py-1 border-b border-border/30">
                {ambientPads}
              </div>
              {/* Faders */}
              <div className="flex-1 min-h-0 px-1 pt-1 pb-0">
                {mixer}
              </div>
              {/* Metronome mini-bar */}
              <div className="flex items-center justify-center gap-2 px-3 py-1 shrink-0 border-t border-border/30">
                <span className="text-xs font-bold text-foreground tabular-nums">{bpm}</span>
                <span className="text-[10px] text-muted-foreground">BPM</span>
                {spotifyKey && <span className="text-[10px] font-semibold text-primary">· {spotifyKey}</span>}
                <span className="text-[10px] text-muted-foreground">· {timeSignature}</span>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className={`p-1.5 rounded-md transition-colors ${metronomeIsPlaying ? 'text-destructive hover:bg-destructive/10' : 'text-primary hover:bg-primary/10'}`}
                  title={metronomeIsPlaying ? 'Parar metrônomo' : 'Iniciar metrônomo'}
                >
                  {metronomeIsPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* === MET TAB === always mounted to keep audio alive */}
            <div className={landscapeTab === 1 ? 'flex-1 min-h-0 flex flex-col overflow-y-auto p-1.5' : 'hidden'}>
              {metronome}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default LandscapeSwipePanels;
