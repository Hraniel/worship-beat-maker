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
        "relative grow overflow-hidden rounded-full bg-secondary",
        isVertical ? "w-2 h-full" : "h-2 w-full"
      )}>
        <SliderPrimitive.Range className={cn(
          "absolute bg-primary",
          isVertical ? "w-full" : "h-full"
        )} />
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
