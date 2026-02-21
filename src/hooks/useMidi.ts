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
  onDeviceChange,
  type MidiDevice,
  type MidiChannel,
} from '@/lib/midi-engine';
import { playSound, getPadPanner } from '@/lib/audio-engine';
import { emitPadHit } from '@/components/MixerStrip';

export function useMidi() {
  const [supported, setSupported] = useState(false);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [channel, setChannelState] = useState<MidiChannel>(getChannel());
  const [mappings, setMappingsState] = useState<Record<number, string>>(getMappings());
  const [isLearning, setIsLearning] = useState(false);
  const [learnPadId, setLearnPadId] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    onDeviceChange((devs) => setDevices([...devs]));

    onNoteOn((padId, velocity) => {
      const panner = getPadPanner(padId);
      playSound(padId, velocity, panner);
      emitPadHit(padId);
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
