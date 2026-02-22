import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initMidi,
  getConnectedDevices,
  getChannel,
  setChannel as engineSetChannel,
  getMappings,
  resetMappings as engineResetMappings,
  startLearn as engineStartLearn,
  stopLearn as engineStopLearn,
  onNoteOn,
  onCC,
  onDeviceChange,
  type MidiDevice,
  type MidiChannel,
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
  const [mappings, setMappingsState] = useState<Record<number, string>>(getMappings());
  const [isLearning, setIsLearning] = useState(false);
  const [learnPadId, setLearnPadId] = useState<string | null>(null);
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
      // Multiply MIDI velocity by fader volume (default 0.7)
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

    // CC mapping: use standard CC numbers
    // CC 7 = Master Volume, CC 1-9 mapped to pad faders, CC 10 = Metronome Vol
    // CC 20 = BPM (coarse, mapped 40-240), CC 21 = Metronome start/stop toggle (value >= 64 = on)
    onCC((cc, value, _ch) => {
      const cbs = ccCallbacksRef.current;
      if (!cbs) return;
      const normalized = value / 127;

      // CC 7: Master volume
      if (cc === 7) {
        cbs.onMasterVolumeCC?.(normalized);
        return;
      }
      // CC 1-9: Pad fader volumes (mapped to pad indices)
      if (cc >= 1 && cc <= 9) {
        // Map CC 1-9 to pad IDs from current mappings
        const padIds = ['kick', 'snare', 'hihat-closed', 'hihat-open', 'crash', 'clap', 'ride', 'loop-worship-1', 'loop-worship-2'];
        const padId = padIds[cc - 1];
        if (padId) {
          cbs.onPadVolumeCC?.(padId, normalized);
        }
        return;
      }
      // CC 10: Metronome volume
      if (cc === 10) {
        cbs.onMetronomeVolumeCC?.(normalized);
        return;
      }
      // CC 20: BPM (map 0-127 to 40-240)
      if (cc === 20) {
        const bpm = Math.round(40 + (value / 127) * 200);
        cbs.onBpmCC?.(bpm);
        return;
      }
      // CC 21: Metronome toggle (>= 64 = trigger toggle)
      if (cc === 21 && value >= 64) {
        cbs.onMetronomeToggleCC?.();
        return;
      }
      // CC 22: Previous song (>= 64 = trigger)
      if (cc === 22 && value >= 64) {
        cbs.onPrevSongCC?.();
        return;
      }
      // CC 23: Next song (>= 64 = trigger)
      if (cc === 23 && value >= 64) {
        cbs.onNextSongCC?.();
        return;
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

  return {
    isMidiSupported: supported,
    connectedDevices: devices,
    channel,
    setChannel,
    mappings,
    isLearning,
    learnPadId,
    startLearn,
    stopLearn,
    resetMappings,
  };
}
