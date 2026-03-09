export type CueKey = 'chorus' | 'verse' | 'bridge' | 'down' | 'up' | 'cut' | 'worship';

export interface PerformanceSettings {
  cueDisplaySeconds: number;
  quickCueButtonsVisible: boolean;
  keepPanelOpenAfterSend: boolean;
  vibrateOnCue: boolean;
  soundOnCue: boolean;
  cueLabels: Partial<Record<CueKey, string>>;
}

const STORAGE_KEY = 'glory-performance-settings';

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  cueDisplaySeconds: 5,
  quickCueButtonsVisible: true,
  keepPanelOpenAfterSend: false,
  vibrateOnCue: true,
  soundOnCue: false,
  cueLabels: {},
};

const CUE_KEYS: CueKey[] = ['chorus', 'verse', 'bridge', 'down', 'up', 'cut', 'worship'];

function clampSeconds(value: number) {
  return Math.max(1, Math.min(15, value));
}

export function loadPerformanceSettings(): PerformanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERFORMANCE_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<PerformanceSettings>;
    const safeLabels: Partial<Record<CueKey, string>> = {};

    const rawLabels = parsed.cueLabels || {};
    for (const key of CUE_KEYS) {
      const value = (rawLabels as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        safeLabels[key] = value.slice(0, 24).trim();
      }
    }

    return {
      cueDisplaySeconds: clampSeconds(Number(parsed.cueDisplaySeconds ?? DEFAULT_PERFORMANCE_SETTINGS.cueDisplaySeconds)),
      quickCueButtonsVisible: Boolean(parsed.quickCueButtonsVisible),
      keepPanelOpenAfterSend: Boolean(parsed.keepPanelOpenAfterSend),
      vibrateOnCue: parsed.vibrateOnCue !== false,
      pinCueByDefault: Boolean(parsed.pinCueByDefault),
      soundOnCue: Boolean(parsed.soundOnCue),
      cueLabels: safeLabels,
    };
  } catch {
    return DEFAULT_PERFORMANCE_SETTINGS;
  }
}

export function savePerformanceSettings(settings: PerformanceSettings) {
  const next: PerformanceSettings = {
    ...DEFAULT_PERFORMANCE_SETTINGS,
    ...settings,
    cueDisplaySeconds: clampSeconds(settings.cueDisplaySeconds),
    cueLabels: settings.cueLabels || {},
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('glory-performance-settings-updated', { detail: next }));
}

export function getCueLabel(cueKey: CueKey, fallbackLabel: string, settings: PerformanceSettings) {
  const custom = settings.cueLabels?.[cueKey]?.trim();
  return custom || fallbackLabel;
}
