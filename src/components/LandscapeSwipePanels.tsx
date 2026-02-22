import React from 'react';
import { Play, Pause } from 'lucide-react';
import { useIsLandscape, useIsDesktop, useIsTablet } from '@/hooks/use-mobile';

interface LandscapeSwipePanelsProps {
  padGrid: React.ReactNode;
  ambientPads: React.ReactNode;
  mixer?: React.ReactNode;
  metronome?: React.ReactNode;
  toolsPanel?: React.ReactNode;
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
  toolsPanel,
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
  const isDesktop = useIsDesktop();
  const isTablet = useIsTablet();
  

  // Portrait / desktop: pad grid with side panel
  if (!isLandscape) {
    // Tablet & Desktop portrait: full side panel with all controls (scrollable)
    if (isTablet || isDesktop) {
      return (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Pad grid — takes remaining space */}
          <div className="flex-1 flex justify-center items-center min-h-0 overflow-hidden">
            {padGrid}
          </div>
          {/* Right side panel — all controls stacked with scroll */}
          <div className={`${isDesktop ? 'w-[360px]' : 'w-[320px]'} shrink-0 flex flex-col min-h-0 border-l border-border/30`}>
            {focusMode ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="hidden">{metronome}</div>
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
                <div className="flex-1 min-h-0 px-1.5 py-1.5 overflow-hidden">
                  {ambientPads}
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                {/* Faders */}
                {mixer && (
                  <div className="shrink-0 px-1 pt-1 pb-1">
                    {mixer}
                  </div>
                )}
                {/* Metronome */}
                <div className="shrink-0 border-t border-border/30">
                  {metronome}
                </div>
                {/* Continuous Pads */}
                <div className="shrink-0 px-1.5 py-1 border-t border-border/30">
                  {ambientPads}
                </div>
                {/* Tap Tempo */}
                {toolsPanel && (
                  <div className="shrink-0 border-t border-border/30 px-1 py-1 min-h-[260px]">
                    {toolsPanel}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Mobile portrait (original)
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className={`flex-1 flex min-h-0 ${focusMode ? 'items-start' : 'items-center'}`}>
          {/* Pad grid — takes remaining space */}
          <div className="flex-1 flex justify-center min-h-0 overflow-hidden">
            {padGrid}
          </div>
        </div>
        {/* Mobile portrait: Continuous Pads below the grid */}
        <div className={`shrink-0 border-t border-border/30 ${focusMode ? 'px-1.5 py-0' : 'px-1.5 py-0.5'}`}>
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
      <div className="w-[42%] max-w-[320px] md:max-w-[400px] shrink-0 flex flex-col min-h-0 border-l border-border/30">

        {focusMode ? (
          /* Focus mode: BPM bar + ultra-compact ambient pads */
          <div className="flex flex-col flex-1 min-h-0">
            {/* Hidden metronome to keep audio alive */}
            <div className="hidden">{metronome}</div>
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
          /* No-focus mode: single Mix panel — Faders → Metronome → Tap Tempo → Continuous Pads */
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            {/* Faders */}
            <div className="shrink-0 px-1 pt-1 pb-1">
              {mixer}
            </div>
            {/* Metronome — full, below faders */}
            <div className="shrink-0 border-t border-border/30">
              {metronome}
            </div>
            {/* Continuous Pads */}
            <div className="shrink-0 px-1.5 py-1 border-t border-border/30">
              {ambientPads}
            </div>
            {/* Tap Tempo */}
            {toolsPanel && (
              <div className="shrink-0 border-t border-border/30 px-1 py-1 min-h-[260px]">
                {toolsPanel}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandscapeSwipePanels;
