// Inline Web Worker timer — significantly less throttled in background on iOS Safari
// compared to main-thread setInterval/setTimeout.

let worker: Worker | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let tickCallback: (() => void) | null = null;

const WORKER_SCRIPT = `
  let timerId = null;
  self.onmessage = function(e) {
    if (e.data.cmd === 'start') {
      if (timerId !== null) clearInterval(timerId);
      timerId = setInterval(function() { self.postMessage('tick'); }, e.data.interval || 25);
    } else if (e.data.cmd === 'stop') {
      if (timerId !== null) { clearInterval(timerId); timerId = null; }
    }
  };
`;

function createWorker(): Worker | null {
  try {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const w = new Worker(url);
    URL.revokeObjectURL(url);
    return w;
  } catch {
    return null;
  }
}

export function startWorkerTimer(callback: () => void, interval: number = 25) {
  stopWorkerTimer();
  tickCallback = callback;

  worker = createWorker();
  if (worker) {
    worker.onmessage = () => { tickCallback?.(); };
    worker.postMessage({ cmd: 'start', interval });
  } else {
    // Fallback to main-thread setInterval
    fallbackTimer = setInterval(() => { tickCallback?.(); }, interval);
  }
}

export function stopWorkerTimer() {
  if (worker) {
    worker.postMessage({ cmd: 'stop' });
    worker.terminate();
    worker = null;
  }
  if (fallbackTimer !== null) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  tickCallback = null;
}
