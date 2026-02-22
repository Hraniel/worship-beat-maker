import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initMidi,
  getConnectedDevices,
  getChannel,
  setChannel as engineSetChannel,
  getCCChannel,
  setCCChannel as engineSetCCChannel,
  getMappings,
  resetMappings as engineResetMappings,
  removeMapping as engineRemoveMapping,
  removeCCMapping as engineRemoveCCMapping,
  startLearn as engineStartLearn,
  stopLearn as engineStopLearn,
  getCCMappings,
  resetCCMappings as engineResetCCMappings,
  startCCLearn as engineStartCCLearn,
  stopCCLearn as engineStopCCLearn,
  getCCFunctionForCC,
  onNoteOn,
  onCC,
  onDeviceChange,
  type MidiDevice,
  type MidiChannel,
  type CCFunctionId,
} from '@/lib/midi-engine';
import { playSound, getPadPanner } from '@/lib/audio-engine';
import { applyEffects, getEffectInput, hasActiveEffects, type PadEffects } from '@/lib/audio-effects';
import { emitPadHit } from '@/components/MixerStrip';

export interface MidiCCCallbacks {
  onPadVolumeCC?: (padId: string, volume: number) => void;
  onMasterVolumeCC?: (volume: number) => void;
  onMetronomeVolumeCC?: (volume: number) => void;
  onBpmCC?: (bpm: number) => void;
  onMetronomeToggleCC?: () => void;
  onPrevSongCC?: () => void;
  onNextSongCC?: () => void;
}

export function useMidi(
  padEffects?: Record<string, PadEffects>,
  isMasterTier?: boolean,
  padVolumes?: Record<string, number>,
  ccCallbacks?: MidiCCCallbacks,
) {
  const [supported, setSupported] = useState(false);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [channel, setChannelState] = useState<MidiChannel>(getChannel());
  const [ccChannelState, setCCChannelState] = useState<MidiChannel>(getCCChannel());
  const [mappings, setMappingsState] = useState<Record<number, string>>(getMappings());
  const [ccMappingsState, setCCMappingsState] = useState<Record<number, CCFunctionId>>(getCCMappings());
  const [isLearning, setIsLearning] = useState(false);
  const [learnPadId, setLearnPadId] = useState<string | null>(null);
  const [isCCLearning, setIsCCLearning] = useState(false);
  const [ccLearnFunctionId, setCCLearnFunctionId] = useState<CCFunctionId | null>(null);
  const initRef = useRef(false);
  const padEffectsRef = useRef(padEffects);
  const isMasterRef = useRef(isMasterTier);
  const padVolumesRef = useRef(padVolumes);
  const ccCallbacksRef = useRef(ccCallbacks);

  // Keep refs in sync
  padEffectsRef.current = padEffects;
  isMasterRef.current = isMasterTier;
  padVolumesRef.current = padVolumes;
  ccCallbacksRef.current = ccCallbacks;

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    onDeviceChange((devs) => setDevices([...devs]));

    onNoteOn((padId, velocity) => {
      const fx = padEffectsRef.current?.[padId];
      const master = isMasterRef.current ?? false;
      const faderVol = padVolumesRef.current?.[padId] ?? 0.7;
      const finalVol = velocity * faderVol;

      if (master && fx && hasActiveEffects(fx)) {
        applyEffects(padId, fx);
        const dest = getEffectInput(padId);
        playSound(padId, finalVol, dest);
      } else {
        const panner = getPadPanner(padId);
        playSound(padId, finalVol, panner);
      }
      emitPadHit(padId);
    });

    onCC((cc, value, _ch) => {
      const cbs = ccCallbacksRef.current;
      if (!cbs) return;
      const normalized = value / 127;

      const fn = getCCFunctionForCC(cc);
      if (!fn) return;

      switch (fn) {
        case 'master-volume':
          cbs.onMasterVolumeCC?.(normalized);
          break;
        case 'metronome-volume':
          cbs.onMetronomeVolumeCC?.(normalized);
          break;
        case 'bpm': {
          const bpm = Math.round(40 + (value / 127) * 200);
          cbs.onBpmCC?.(bpm);
          break;
        }
        case 'metronome-toggle':
          if (value >= 64) cbs.onMetronomeToggleCC?.();
          break;
        case 'prev-song':
          if (value >= 64) cbs.onPrevSongCC?.();
          break;
        case 'next-song':
          if (value >= 64) cbs.onNextSongCC?.();
          break;
        default:
          // pad-volume-{padId}
          if (fn.startsWith('pad-volume-')) {
            const padId = fn.replace('pad-volume-', '');
            cbs.onPadVolumeCC?.(padId, normalized);
          }
          break;
      }
    });

    initMidi().then((success) => {
      setSupported(success);
      if (success) {
        setDevices(getConnectedDevices());
      }
    });
  }, []);

  const setChannel = useCallback((ch: MidiChannel) => {
    engineSetChannel(ch);
    setChannelState(ch);
  }, []);

  const setCCChannel = useCallback((ch: MidiChannel) => {
    engineSetCCChannel(ch);
    setCCChannelState(ch);
  }, []);

  const startLearn = useCallback((padId: string) => {
    setIsLearning(true);
    setLearnPadId(padId);
    engineStartLearn(padId, () => {
      setMappingsState(getMappings());
      setIsLearning(false);
      setLearnPadId(null);
    });
  }, []);

  const stopLearn = useCallback(() => {
    engineStopLearn();
    setIsLearning(false);
    setLearnPadId(null);
  }, []);

  const resetMappings = useCallback(() => {
    engineResetMappings();
    setMappingsState(getMappings());
  }, []);

  const removeNoteMapping = useCallback((note: number) => {
    engineRemoveMapping(note);
    setMappingsState(getMappings());
  }, []);

  const removeSingleCCMapping = useCallback((cc: number) => {
    engineRemoveCCMapping(cc);
    setCCMappingsState(getCCMappings());
  }, []);

  const startCCLearn = useCallback((functionId: CCFunctionId) => {
    setIsCCLearning(true);
    setCCLearnFunctionId(functionId);
    engineStartCCLearn(functionId, () => {
      setCCMappingsState(getCCMappings());
      setIsCCLearning(false);
      setCCLearnFunctionId(null);
    });
  }, []);

  const stopCCLearn = useCallback(() => {
    engineStopCCLearn();
    setIsCCLearning(false);
    setCCLearnFunctionId(null);
  }, []);

  const resetCCMappings = useCallback(() => {
    engineResetCCMappings();
    setCCMappingsState(getCCMappings());
  }, []);

  return {
    isMidiSupported: supported,
    connectedDevices: devices,
    channel,
    setChannel,
    ccChannel: ccChannelState,
    setCCChannel,
    mappings,
    isLearning,
    learnPadId,
    startLearn,
    stopLearn,
    resetMappings,
    removeNoteMapping,
    removeSingleCCMapping,
    ccMappings: ccMappingsState,
    isCCLearning,
    ccLearnFunctionId,
    startCCLearn,
    stopCCLearn,
    resetCCMappings,
  };
}
