import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  onReset?: () => void;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, onReset, ...props }, ref) => {
  const longPressRef = React.useRef<number | null>(null);

  const handleThumbPointerDown = React.useCallback(() => {
    if (!onReset) return;
    longPressRef.current = window.setTimeout(() => {
      onReset();
      longPressRef.current = null;
    }, 400);
  }, [onReset]);

  const handleThumbPointerUp = React.useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        onDoubleClick={onReset}
        onPointerDown={handleThumbPointerDown}
        onPointerUp={handleThumbPointerUp}
        onPointerLeave={handleThumbPointerUp}
      />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
