export type CueKey = 'chorus' | 'verse' | 'bridge' | 'down' | 'up' | 'cut' | 'worship';

export type HolyricsTargetScreen = 'stage' | 'front' | 'all';

export interface HolyricsConfig {
  enabled: boolean;
  host: string;
  token: string;
  targetScreen: HolyricsTargetScreen;
}

export const DEFAULT_HOLYRICS_CONFIG: HolyricsConfig = {
  enabled: false,
  host: '',
  token: '',
  targetScreen: 'stage',
};

export interface PerformanceSettings {
  cueDisplaySeconds: number;
  quickCueButtonsVisible: boolean;
  keepPanelOpenAfterSend: boolean;
  vibrateOnCue: boolean;
  soundOnCue: boolean;
  cueLabels: Partial<Record<CueKey, string>>;
  holyrics: HolyricsConfig;
}

const STORAGE_KEY = 'glory-performance-settings';

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  cueDisplaySeconds: 5,
  quickCueButtonsVisible: true,
  keepPanelOpenAfterSend: false,
  vibrateOnCue: true,
  soundOnCue: false,
  cueLabels: {},
  holyrics: DEFAULT_HOLYRICS_CONFIG,
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

    const rawHolyrics = parsed.holyrics || {};
    const safeHolyrics: HolyricsConfig = {
      enabled: Boolean((rawHolyrics as any).enabled),
      host: typeof (rawHolyrics as any).host === 'string' ? (rawHolyrics as any).host.trim() : '',
      token: typeof (rawHolyrics as any).token === 'string' ? (rawHolyrics as any).token.trim() : '',
    };

    return {
      cueDisplaySeconds: clampSeconds(Number(parsed.cueDisplaySeconds ?? DEFAULT_PERFORMANCE_SETTINGS.cueDisplaySeconds)),
      quickCueButtonsVisible: parsed.quickCueButtonsVisible !== false,
      keepPanelOpenAfterSend: Boolean(parsed.keepPanelOpenAfterSend),
      vibrateOnCue: parsed.vibrateOnCue !== false,
      soundOnCue: Boolean(parsed.soundOnCue),
      cueLabels: safeLabels,
      holyrics: safeHolyrics,
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
    holyrics: settings.holyrics || DEFAULT_HOLYRICS_CONFIG,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('glory-performance-settings-updated', { detail: next }));
}

export function getCueLabel(cueKey: CueKey, fallbackLabel: string, settings: PerformanceSettings) {
  const custom = settings.cueLabels?.[cueKey]?.trim();
  return custom || fallbackLabel;
}
