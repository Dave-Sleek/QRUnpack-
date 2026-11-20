const SOUND_PREF_KEY = 'qrunpack_sound';

let sharedAudioCtx: AudioContext | null = null;
let lastChimeTime = 0;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext || win.webkitAudioContext || null;
}

function getOrCreateAudioContext(): AudioContext | null {
  const AudioCtx = getAudioContextConstructor();
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

export function isSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    return saved !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabledPref(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore storage failures
  }
}

/**
 * Call synchronously inside user gestures (file pick, drop, paste, camera button)
 * so subsequent async/camera decodes are permitted to play audio on mobile browsers.
 */
export function unlockAudio(): void {
  try {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    // ignore
  }
}

function scheduleChimeNotes(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // Gentle two-note ascending chime (G5 -> C6) with soft sine envelope
  const notes = [
    { freq: 783.99, delay: 0, peak: 0.06, duration: 0.14 },
    { freq: 1046.5, delay: 0.065, peak: 0.07, duration: 0.22 },
  ];

  notes.forEach(({ freq, delay, peak, duration }) => {
    const start = now + delay;
    const stop = start + duration + 0.02;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(stop);
  });
}

/**
 * Plays a subtle, pleasant two-note chime when a QR code is successfully decoded.
 */
export function playDecodeChime(force = false): void {
  if (!force && !isSoundEnabled()) return;

  const nowMs = Date.now();
  if (!force && nowMs - lastChimeTime < 300) return;
  lastChimeTime = nowMs;

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          scheduleChimeNotes(ctx);
        })
        .catch(() => {
          // Audio blocked by browser policy
        });
    } else {
      scheduleChimeNotes(ctx);
    }
  } catch {
    // Ignore audio synthesis errors on unsupported devices
  }
}
