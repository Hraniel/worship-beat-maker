import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'app_pad_onboarding_seen';

const PadOnboardingTip: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Wait for pad grid to render
    const timer = setTimeout(() => {
      const el = document.querySelector('[data-tutorial="pad-grid"]');
      if (el) {
        setRect(el.getBoundingClientRect());
        setVisible(true);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!visible || !rect) return null;

  const balloonTop = rect.bottom + 12;
  const balloonLeft = Math.max(16, rect.left + rect.width / 2 - 150);

  return createPortal(
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[200] bg-black/50 animate-in fade-in-0 duration-300" onClick={dismiss} />

      {/* Highlight ring */}
      <div
        className="fixed rounded-lg border-2 border-primary z-[201] pointer-events-none animate-in fade-in-0 duration-300"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: '0 0 0 4px hsl(var(--primary) / 0.3)',
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[202] w-[300px] bg-card border border-border rounded-xl shadow-2xl p-4 animate-in fade-in-0 zoom-in-95 duration-300"
        style={{ top: `${balloonTop}px`, left: `${Math.min(balloonLeft, window.innerWidth - 316)}px` }}
      >
        <button onClick={dismiss} className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Hand className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Dica rápida</h3>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Segure um pad para acessar suas configurações: volume, pan, cor, efeitos de áudio e importar sons da Glory Store.
        </p>

        <div className="flex justify-end">
          <Button size="sm" onClick={dismiss} className="h-7 px-3 text-xs">
            Entendi!
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default PadOnboardingTip;
