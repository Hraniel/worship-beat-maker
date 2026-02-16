import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ZoomPopup from './ZoomPopup';

interface PanKnobProps {
  pan: number;
  onChange: (p: number) => void;
}

const PanKnob: React.FC<PanKnobProps> = ({ pan, onChange }) => {
  const angle = pan * 135;
  const displayValue = pan === 0 ? 'C' : pan < 0 ? `L${Math.round(Math.abs(pan) * 100)}` : `R${Math.round(pan * 100)}`;
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div
        className="relative w-8 h-8 landscape:w-12 landscape:h-12 rounded-full border border-border bg-muted/50 cursor-pointer"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const el = e.currentTarget;
          el.setPointerCapture(e.pointerId);
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          let moved = false;
          const pid = e.pointerId;
          const longPress = window.setTimeout(() => {
            if (!moved) onChange(0);
          }, 400);

          const move = (ev: PointerEvent) => {
            moved = true;
            clearTimeout(longPress);
            if (!dragging) setDragging(true);
            const dx = ev.clientX - cx;
            const raw = Math.max(-1, Math.min(1, dx / 16));
            let snapped: number;
            if (Math.abs(raw) < 0.06) snapped = 0;
            else if (raw > 0.92) snapped = 1;
            else if (raw < -0.92) snapped = -1;
            else snapped = Math.round(raw * 20) / 20;
            onChange(snapped);
          };
          const up = () => {
            clearTimeout(longPress);
            setDragging(false);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('lostpointercapture', up);
            el.releasePointerCapture(pid);
          };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerup', up);
          el.addEventListener('lostpointercapture', up);
        }}
        onDoubleClick={() => onChange(0)}
        title={`Pan: ${displayValue}`}
      >
        <div
          className="absolute top-1 left-1/2 w-0.5 h-2.5 landscape:h-4 bg-foreground rounded-full origin-bottom"
          style={{
            transform: `translateX(-50%) rotate(${angle}deg)`,
            transformOrigin: '50% 100%',
            top: '4px',
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-muted-foreground/40" />
      </div>
      <span className="text-[8px] landscape:text-[10px] text-muted-foreground tabular-nums leading-none">{displayValue}</span>

      <ZoomPopup visible={dragging}>
        <div className="relative w-20 h-20 rounded-full border-2 border-border bg-muted/50">
          <div
            className="absolute top-2 left-1/2 w-1 h-6 bg-foreground rounded-full origin-bottom"
            style={{
              transform: `translateX(-50%) rotate(${angle}deg)`,
              transformOrigin: '50% 100%',
              top: '10px',
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-muted-foreground/40" />
        </div>
        <span className="text-sm font-bold text-foreground tabular-nums">{displayValue}</span>
      </ZoomPopup>
    </div>
  );
};

export default PanKnob;
