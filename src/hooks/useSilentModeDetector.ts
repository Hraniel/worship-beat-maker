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
      // Resume context first — on iOS, first user interaction may leave it suspended
      if (ctx.state === "suspended") {
        await ctx.resume();
        // Wait extra time after resume for iOS audio pipeline to stabilize
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (ctx.state !== "running") {
        checkingRef.current = false;
        return;
      }

      // Wait a bit more after returning from background to let audio pipeline warm up
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Run detection twice to avoid false positives after background resume
      let silentCount = 0;
      const attempts = 2;

      for (let i = 0; i < attempts; i++) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const dataArray = new Float32Array(analyser.frequencyBinCount);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.005;
        osc.frequency.value = 440;
        osc.type = "sine";

        osc.connect(gain);
        gain.connect(analyser);
        analyser.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);

        await new Promise((resolve) => setTimeout(resolve, 120));

        analyser.getFloatFrequencyData(dataArray);
        const maxVal = Math.max(...dataArray);
        if (maxVal < -90) silentCount++;

        osc.disconnect();
        gain.disconnect();
        analyser.disconnect();

        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // Only flag silent if ALL attempts detected silence
      setIsSilent(silentCount === attempts);
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
        // Wait longer after returning from background to avoid false positives
        setTimeout(checkSilentMode, 1500);
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
