import React, { useState, useRef, useCallback, useEffect } from 'react';

interface LandscapeSwipePanelsProps {
  padGrid: React.ReactNode;
  ambientPads: React.ReactNode;
}

function useIsLandscapeMobile() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const check = () => {
      const landscape = window.innerWidth > window.innerHeight && window.innerHeight <= 500;
      setIsLandscape(landscape);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isLandscape;
}

const LandscapeSwipePanels: React.FC<LandscapeSwipePanelsProps> = ({ padGrid, ambientPads }) => {
  const isLandscape = useIsLandscapeMobile();
  const [page, setPage] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const threshold = 60;
    if (touchDeltaX.current < -threshold && page === 0) {
      setPage(1);
    } else if (touchDeltaX.current > threshold && page === 1) {
      setPage(0);
    }
    touchDeltaX.current = 0;
  }, [page]);

  // In portrait / desktop: show pad grid with ambient pads below
  if (!isLandscape) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 flex items-center justify-center min-h-0">
          {padGrid}
        </div>
        <div className="shrink-0 px-2 pb-1">
          {ambientPads}
        </div>
      </div>
    );
  }

  // Landscape mobile: swipeable horizontal pages
  return (
    <div className="relative flex-1 overflow-hidden" ref={containerRef}>
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${page * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Page 1: Pad Grid */}
        <div className="w-full h-full flex-shrink-0 flex items-center justify-center">
          {padGrid}
        </div>
        {/* Page 2: Continuous Pads */}
        <div className="w-full h-full flex-shrink-0 flex items-center justify-center">
          {ambientPads}
        </div>
      </div>

      {/* Page indicators */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        <button
          onClick={() => setPage(0)}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
            page === 0 ? 'bg-primary scale-125' : 'bg-muted-foreground/40'
          }`}
        />
        <button
          onClick={() => setPage(1)}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
            page === 1 ? 'bg-primary scale-125' : 'bg-muted-foreground/40'
          }`}
        />
      </div>
    </div>
  );
};

export default LandscapeSwipePanels;
