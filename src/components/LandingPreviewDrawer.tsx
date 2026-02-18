import React, { useState, useRef, useCallback } from 'react';
import { X, Monitor, Smartphone, RotateCcw, ExternalLink } from 'lucide-react';

interface LandingPreviewDrawerProps {
  open: boolean;
  onClose: () => void;
  previewUrl: string;
}

type ViewMode = 'desktop' | 'mobile';

const LandingPreviewDrawer: React.FC<LandingPreviewDrawerProps> = ({ open, onClose, previewUrl }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const reload = useCallback(() => setKey(k => k + 1), []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 'min(calc(100vw - 300px), 1100px)',
          background: 'hsl(0 0% 8%)',
          borderLeft: '1px solid hsl(0 0% 100% / 0.08)',
          boxShadow: '-8px 0 40px hsl(0 0% 0% / 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.08)' }}
        >
          {/* View mode toggles */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'hsl(0 0% 100% / 0.06)' }}>
            <button
              onClick={() => setViewMode('desktop')}
              title="Desktop"
              className="flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-all"
              style={viewMode === 'desktop'
                ? { background: 'hsl(262 75% 55%)', color: 'hsl(0 0% 100%)' }
                : { color: 'hsl(0 0% 100% / 0.45)' }}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              title="Mobile"
              className="flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-all"
              style={viewMode === 'mobile'
                ? { background: 'hsl(262 75% 55%)', color: 'hsl(0 0% 100%)' }
                : { color: 'hsl(0 0% 100% / 0.45)' }}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* URL hint */}
          <span
            className="flex-1 truncate text-[11px] font-mono px-2"
            style={{ color: 'hsl(0 0% 100% / 0.25)' }}
          >
            {previewUrl}
          </span>

          {/* Actions */}
          <button
            onClick={reload}
            title="Recarregar preview"
            className="h-7 w-7 flex items-center justify-center rounded-lg transition"
            style={{ color: 'hsl(0 0% 100% / 0.4)', background: 'hsl(0 0% 100% / 0.05)' }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir em nova aba"
            className="h-7 w-7 flex items-center justify-center rounded-lg transition"
            style={{ color: 'hsl(0 0% 100% / 0.4)', background: 'hsl(0 0% 100% / 0.05)' }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg transition"
            style={{ color: 'hsl(0 0% 100% / 0.5)', background: 'hsl(0 0% 100% / 0.05)' }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden flex items-start justify-center p-4" style={{ background: 'hsl(0 0% 5%)' }}>
          {viewMode === 'desktop' ? (
            /* Full-width desktop preview */
            <iframe
              key={`desktop-${key}`}
              ref={iframeRef}
              src={previewUrl}
              title="Landing Page Preview"
              className="w-full h-full rounded-xl"
              style={{ border: '1px solid hsl(0 0% 100% / 0.08)', background: '#fff' }}
            />
          ) : (
            /* Centered mobile frame */
            <div
              className="relative shrink-0 rounded-[2.5rem] overflow-hidden"
              style={{
                width: 390,
                height: '100%',
                maxHeight: 844,
                border: '8px solid hsl(0 0% 18%)',
                boxShadow: '0 0 0 1px hsl(0 0% 30%), 0 24px 48px hsl(0 0% 0% / 0.6)',
                background: '#fff',
              }}
            >
              {/* Phone notch */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 z-10 rounded-b-xl"
                style={{ width: 120, height: 28, background: 'hsl(0 0% 18%)' }}
              />
              <iframe
                key={`mobile-${key}`}
                src={previewUrl}
                title="Landing Page Preview Mobile"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LandingPreviewDrawer;
