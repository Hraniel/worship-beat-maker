import { useState, useCallback, useRef, useEffect } from "react";
import { getAudioContext } from "@/lib/audio-engine";

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function useSilentModeDetector() {
  const [isSilent, setIsSilent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isIOS = isIOSDevice();
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const checkSilentMode = useCallback(async () => {
    if (!isIOS || checkingRef.current) return;

    // Cooldown: skip if last check was less than 5s ago
    const now = Date.now();
    if (now - lastCheckRef.current < 5000) return;

    checkingRef.current = true;
    lastCheckRef.current = now;

    try {
      const ctx = getAudioContext();

      // Context must be running (called after user interaction)
      if (ctx.state !== "running") {
        checkingRef.current = false;
        return;
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.frequency.value = 200;
      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);

      await new Promise((resolve) => setTimeout(resolve, 100));

      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);

      setIsSilent(sum === 0);

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
    // Auto-reset dismissed after 10s so banner can reappear
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
        // Reset cooldown on visibility change so check runs
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
