import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

const FACTOR = 0.38;
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 360;

const TABLET_FACTOR = 0.32;
const TABLET_MIN_HEIGHT = 220;
const TABLET_MAX_HEIGHT = 380;

function calculate(screenHeight: number, screenWidth: number): number {
  const isTablet = screenWidth >= MOBILE_BREAKPOINT;
  if (isTablet) {
    return Math.min(TABLET_MAX_HEIGHT, Math.max(TABLET_MIN_HEIGHT, Math.floor(screenHeight * TABLET_FACTOR)));
  }
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.floor(screenHeight * FACTOR)));
}

export function useFooterHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? calculate(window.innerHeight, window.innerWidth) : 200
  );

  useEffect(() => {
    const onResize = () => setHeight(calculate(window.innerHeight, window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return height;
}
