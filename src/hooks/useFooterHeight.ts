import { useState, useEffect } from "react";

const FACTOR = 0.27;
const MIN_HEIGHT = 170;
const MAX_HEIGHT = 280;

function calculate(screenHeight: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.floor(screenHeight * FACTOR)));
}

export function useFooterHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? calculate(window.innerHeight) : 200
  );

  useEffect(() => {
    const onResize = () => setHeight(calculate(window.innerHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return height;
}
