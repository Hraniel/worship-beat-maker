import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Timer, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';

/* ─── Tap Tempo ─── */
const MAX_TAP_INTERVAL = 2000; // ms
const TAP_HISTORY_SIZE = 8;

const AUTO_APPLY_KEY = 'drum-pads-tap-auto-apply';
const AUTO_APPLY_TIMEOUT_KEY = 'drum-pads-tap-auto-apply-timeout';
const TAP_REDIRECT_KEY = 'drum-pads-tap-redirect-target';

export function isTapAutoApplyEnabled(): boolean {
  const v = localStorage.getItem(AUTO_APPLY_KEY);
  return v === null ? true : v === 'true';
}

export function setTapAutoApply(enabled: boolean) {
  localStorage.setItem(AUTO_APPLY_KEY, String(enabled));
}

export function getTapAutoApplyTimeout(): number {
  const v = Number(localStorage.getItem(AUTO_APPLY_TIMEOUT_KEY));
  return v >= 5 && v <= 30 ? v : 10;
}

export function setTapAutoApplyTimeout(seconds: number) {
  localStorage.setItem(AUTO_APPLY_TIMEOUT_KEY, String(seconds));
}

export type TapRedirectTarget = 'mix' | 'metronome' | 'pads';

export function getTapRedirectTarget(): TapRedirectTarget {
  const v = localStorage.getItem(TAP_REDIRECT_KEY) as TapRedirectTarget | null;
  return v === 'metronome' || v === 'pads' ? v : 'mix';
}

export function setTapRedirectTarget(target: TapRedirectTarget) {
  localStorage.setItem(TAP_REDIRECT_KEY, String(target));
}

interface ToolsPanelProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onAutoApplied?: () => void;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({ bpm, onBpmChange, onAutoApplied }) => {
  const { t } = useTranslation();
  const [taps, setTaps] = useState<number[]>([]);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [countdownProgress, setCountdownProgress] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const idleRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const countdownStartRef = useRef<number>(0);
  const autoApplyEnabled = useRef(isTapAutoApplyEnabled());
  const autoApplyTimeout = useRef(getTapAutoApplyTimeout());

  useEffect(() => {
    autoApplyEnabled.current = isTapAutoApplyEnabled();
    autoApplyTimeout.current = getTapAutoApplyTimeout();
  });

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (idleRef.current) clearTimeout(idleRef.current);
    if (countdownRef.current) cancelAnimationFrame(countdownRef.current);
    setShowCountdown(false);
    setCountdownProgress(0);
  }, []);

  const applyAndReturn = useCallback((bpmVal: number) => {
    onBpmChange(bpmVal);
    setTaps([]);
    setDetectedBpm(null);
    clearAllTimers();
    onAutoApplied?.();
  }, [onBpmChange, onAutoApplied, clearAllTimers]);

  const startCountdown = useCallback((bpmVal: number) => {
    const countdownMs = (autoApplyTimeout.current - 5) * 1000;
    setShowCountdown(true);
    countdownStartRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - countdownStartRef.current;
      const pct = Math.min(100, (elapsed / countdownMs) * 100);
      setCountdownProgress(pct);
      if (elapsed >= countdownMs) {
        applyAndReturn(bpmVal);
      } else {
        countdownRef.current = requestAnimationFrame(tick);
      }
    };
    countdownRef.current = requestAnimationFrame(tick);
  }, [applyAndReturn]);

  const scheduleAutoApply = useCallback((bpmVal: number) => {
    if (!autoApplyEnabled.current) return;
    if (idleRef.current) clearTimeout(idleRef.current);
    if (countdownRef.current) cancelAnimationFrame(countdownRef.current);
    setShowCountdown(false);
    setCountdownProgress(0);

    idleRef.current = window.setTimeout(() => {
      startCountdown(bpmVal);
    }, 5000);
  }, [startCountdown]);

  const handleTap = useCallback(() => {
    const now = performance.now();
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    if (idleRef.current) clearTimeout(idleRef.current);
    if (countdownRef.current) cancelAnimationFrame(countdownRef.current);
    setShowCountdown(false);
    setCountdownProgress(0);

    setTaps(prev => {
      const last = prev[prev.length - 1];
      if (last && now - last > MAX_TAP_INTERVAL) return [now];
      const next = [...prev, now].slice(-TAP_HISTORY_SIZE);
      if (next.length >= 2) {
        const intervals = [];
        for (let i = 1; i < next.length; i++) intervals.push(next[i] - next[i - 1]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpmVal = Math.round(60000 / avg);
        if (bpmVal >= 40 && bpmVal <= 240) {
          setDetectedBpm(bpmVal);
          scheduleAutoApply(bpmVal);
        }
      }
      return next;
    });
  }, [scheduleAutoApply]);

  const reset = useCallback(() => {
    setTaps([]);
    setDetectedBpm(null);
    clearAllTimers();
  }, [clearAllTimers]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 h-full relative">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5" />
        {t('tapTempo.title')}
      </div>

      <button
        type="button"
        onPointerDown={handleTap}
        className={`w-28 h-28 rounded-full border-2 transition-all flex flex-col items-center justify-center select-none active:scale-95 ${
          flash
            ? 'border-primary bg-primary/20 scale-105'
            : 'border-border bg-card hover:border-primary/50'
        }`}
      >
        <span className="text-3xl font-black tabular-nums text-foreground">
          {detectedBpm ?? bpm}
        </span>
        <span className="text-[10px] text-muted-foreground">BPM</span>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {taps.length < 2 ? t('toolsPanel.tapToDetect') : `${taps.length - 1} ${t('toolsPanel.taps')}`}
        </span>
        {taps.length > 0 && (
          <button onClick={reset} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="h-8">
        {detectedBpm && detectedBpm !== bpm ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 px-4"
            onClick={() => applyAndReturn(detectedBpm)}
          >
            {t('toolsPanel.applyBpm', { bpm: detectedBpm })}
          </Button>
        ) : null}
      </div>

      {showCountdown && (
        <div className="absolute bottom-0 left-0 right-0 h-1">
          <div
            className="h-full bg-destructive transition-none"
            style={{ width: `${countdownProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default ToolsPanel;
