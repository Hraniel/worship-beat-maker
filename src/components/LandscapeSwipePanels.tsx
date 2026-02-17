import React from 'react';
import { useIsLandscape } from '@/hooks/use-mobile';

interface LandscapeSwipePanelsProps {
  padGrid: React.ReactNode;
  ambientPads: React.ReactNode;
  mixer?: React.ReactNode;
  metronome?: React.ReactNode;
  focusMode?: boolean;
}

const LandscapeSwipePanels: React.FC<LandscapeSwipePanelsProps> = ({ padGrid, ambientPads, mixer, metronome, focusMode }) => {
  const isLandscape = useIsLandscape();

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

  // Landscape mobile/tablet: side-by-side layout
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: Pad Grid - full height */}
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
        {padGrid}
      </div>

      {/* Right: Ambient + Mixer + Metronome stacked */}
      <div
        className="w-[45%] max-w-[340px] flex flex-col min-h-0 border-l border-border/30 overflow-y-auto"
        style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
      >
        <div className="shrink-0 px-1.5 py-1">
          {ambientPads}
        </div>
        {mixer && (
          <div className="shrink-0 px-1.5 py-1 border-t border-border/30">
            {mixer}
          </div>
        )}
        {metronome && (
          <div className="shrink-0 px-1.5 py-1 border-t border-border/30">
            {metronome}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandscapeSwipePanels;
