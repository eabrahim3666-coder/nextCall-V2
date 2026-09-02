// Shared single AudioContext for UI beeps. Creating a new AudioContext per
// beep (the old pattern) leaks contexts — browsers cap concurrent instances
// (~6 in Chrome), after which sounds silently stop working.

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedCtx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      sharedCtx = new Ctor();
    }
    // Chrome suspends contexts created before a user gesture; resume is a
    // no-op when already running.
    if (sharedCtx.state === "suspended") void sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Short UI beep. frequency in Hz; volume 0–1; duration in seconds. */
export function playBeep(frequency = 740, volume = 0.08, duration = 0.3) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    // Stop sources auto-detach; no per-beep teardown needed on a shared ctx.
  } catch {
    // Never let a UI beep break a feature.
  }
}
