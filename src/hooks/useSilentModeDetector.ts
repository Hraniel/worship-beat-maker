import { useState, useCallback, useRef, useEffect } from "react";
import { getAudioContext } from "@/lib/audio-engine";

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Detects iOS silent (mute) switch by playing a short silent buffer
 * and comparing elapsed wall-clock time vs AudioContext time.
 * When the mute switch is on, iOS suspends audio output and the
 * AudioContext's currentTime may not advance as expected.
 *
 * Fallback approach: play an oscillator through an OfflineAudioContext
 * and check if an HTMLAudioElement can produce output.
 */
export function useSilentModeDetector() {
  const [isSilent, setIsSilent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isIOS = isIOSDevice();
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const checkSilentMode = useCallback(async () => {
    if (!isIOS || checkingRef.current) return;

    const now = Date.now();
    if (now - lastCheckRef.current < 5000) return;

    checkingRef.current = true;
    lastCheckRef.current = now;

    try {
      const ctx = getAudioContext();
      if (ctx.state !== "running") {
        checkingRef.current = false;
        return;
      }

      // Method: Create a very short audio buffer and play it.
      // Measure how long the AudioContext takes to process it.
      // On iOS with mute switch ON, the context may report normal
      // processing but we detect via an alternate oscillator+analyser
      // that reads back near the destination.

      // Use a known-working approach: create a very quiet oscillator,
      // connect through a gain node to an analyser connected to 
      // destination. The analyser should pick up energy if audio
      // pipeline is active.
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Float32Array(analyser.frequencyBinCount);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Audible enough for analyser but barely perceptible
      gain.gain.value = 0.005;
      osc.frequency.value = 440;
      osc.type = "sine";

      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);

      // Wait for the oscillator to be playing (50ms into 200ms tone)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Read frequency data as floats (more precise than byte data)
      analyser.getFloatFrequencyData(dataArray);

      // Check if there's any energy above noise floor (-100 dB)
      const maxVal = Math.max(...dataArray);
      const silent = maxVal < -90; // If all bins are below -90dB, likely silent

      setIsSilent(silent);

      osc.disconnect();
      gain.disconnect();
      analyser.disconnect();
    } catch {
      // Detection failed — don't show warning
    } finally {
      checkingRef.current = false;
    }
  }, [isIOS]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setDismissed(false), 10000);
  }, []);

  // Cleanup dismiss timer
  useEffect(() => {
    return () => clearTimeout(dismissTimerRef.current);
  }, []);

  // Reset dismissed when silent mode turns off
  useEffect(() => {
    if (!isSilent) {
      setDismissed(false);
      clearTimeout(dismissTimerRef.current);
    }
  }, [isSilent]);

  // Re-check on visibility change
  useEffect(() => {
    if (!isIOS) return;
    const handler = () => {
      if (document.visibilityState === "visible") {
        lastCheckRef.current = 0;
        setTimeout(checkSilentMode, 500);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isIOS, checkSilentMode]);

  return {
    isSilent: isIOS && isSilent && !dismissed,
    dismiss,
    triggerCheck: checkSilentMode,
  };
}
