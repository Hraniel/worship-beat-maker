import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  onReset?: () => void;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, onReset, orientation, ...props }, ref) => {
  const longPressRef = React.useRef<number | null>(null);
  const isVertical = orientation === 'vertical';

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
      orientation={orientation}
      className={cn(
        "relative flex touch-none select-none",
        isVertical ? "flex-col h-full w-4 items-center" : "w-full items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className={cn(
        "relative grow overflow-hidden rounded-full bg-muted-foreground/20",
        isVertical ? "w-1.5 h-full" : "h-1.5 w-full"
      )}>
        <SliderPrimitive.Range className={cn(
          "absolute bg-foreground",
          isVertical ? "w-full" : "h-full"
        )} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-6 w-6 md:h-4 md:w-4 rounded-full border border-foreground/20 bg-foreground shadow-[0_0_6px_hsl(0_0%_100%/0.3)] ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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
