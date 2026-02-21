import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Detects iOS silent mode by playing a tiny OscillatorNode and measuring
 * whether the AudioContext destination actually produced output.
 * 
 * The trick: on iOS, when the physical silent switch is ON, Web Audio
 * output is suppressed. We detect this by scheduling a very short tone
 * and checking if `audioContext.currentTime` advances while base time
 * stays consistent — combined with a user-interaction requirement.
 * 
 * Fallback: we simply check if the platform is iOS and periodically
 * test a silent oscillator.
 */

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function useSilentModeDetector() {
  const [isSilent, setIsSilent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const isIOS = isIOSDevice();

  const checkSilentMode = useCallback(async () => {
    if (!isIOS) return;

    try {
      // Create a temporary audio context for detection
      // @ts-ignore
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC() as AudioContext;

      // If context is suspended, user hasn't interacted yet — skip
      if (ctx.state === "suspended") {
        ctx.close();
        return;
      }

      // Create an analyser to measure actual output
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Play a very short, inaudible-frequency oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001; // Nearly silent but enough to register
      osc.frequency.value = 200;
      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);

      // Wait a bit then check if analyser registered anything
      await new Promise((resolve) => setTimeout(resolve, 100));

      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);

      // On silent mode, sum will be 0 because iOS suppresses output
      setIsSilent(sum === 0);

      osc.disconnect();
      gain.disconnect();
      analyser.disconnect();
      ctx.close();
    } catch {
      // If detection fails, don't show the warning
    }
  }, [isIOS]);

  useEffect(() => {
    if (!isIOS) return;

    // Check after a short delay (user needs to have interacted first)
    const initialTimeout = setTimeout(checkSilentMode, 2000);

    // Re-check periodically (user might toggle switch)
    intervalRef.current = setInterval(checkSilentMode, 5000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isIOS, checkSilentMode]);

  // Also re-check on visibility change (user returns to app)
  useEffect(() => {
    if (!isIOS) return;
    const handler = () => {
      if (document.visibilityState === "visible") {
        setTimeout(checkSilentMode, 500);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isIOS, checkSilentMode]);

  const dismiss = useCallback(() => setDismissed(true), []);

  // Reset dismissed state if silent mode is turned off and back on
  useEffect(() => {
    if (!isSilent) setDismissed(false);
  }, [isSilent]);

  return {
    isSilent: isIOS && isSilent && !dismissed,
    dismiss,
  };
}
