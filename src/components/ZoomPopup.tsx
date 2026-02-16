import React from 'react';
import { createPortal } from 'react-dom';

interface ZoomPopupProps {
  visible: boolean;
  children: React.ReactNode;
}

/** Centered screen overlay popup for zoom feedback */
const ZoomPopup: React.FC<ZoomPopupProps> = ({ visible, children }) => {
  if (!visible) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 bg-card border border-border rounded-xl shadow-2xl p-4 animate-scale-in min-w-[120px]">
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ZoomPopup;
