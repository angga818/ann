/**
 * Efek suara opsional (frontend-only) memakai Web Audio API — tanpa aset audio
 * dan tanpa dependensi tambahan, jadi tidak menambah berat bundle. Preferensi
 * bunyi disimpan lokal dan bisa dimatikan kapan saja oleh pemain.
 */

const SOUND_KEY = "quizlive.sound";
/** AudioContext dibuat sekali saat pertama dibutuhkan (butuh gesture user). */
let ctx: AudioContext | null = null;
let enabledCache: boolean | null = null;

type AudioContextCtor = typeof AudioContext;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function loadSoundEnabled(): boolean {
  if (enabledCache !== null) return enabledCache;
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    enabledCache = raw === null ? true : raw === "1";
  } catch {
    enabledCache = true;
  }
  return enabledCache;
}

export function saveSoundEnabled(enabled: boolean) {
  enabledCache = enabled;
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Nada tunggal dengan envelope singkat agar tidak terdengar terpotong. */
function tone(
  ac: AudioContext,
  {
    freq,
    endFreq,
    start,
    duration,
    type = "sine",
    gain = 0.14,
  }: {
    freq: number;
    endFreq?: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
  },
) {
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  vol.gain.setValueAtTime(0, start);
  vol.gain.linearRampToValueAtTime(gain, start + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function play(build: (ac: AudioContext, now: number) => void) {
  if (!loadSoundEnabled()) return;
  const ac = audioContext();
  if (!ac) return;
  // Browser men-suspend context sampai ada interaksi — lanjutkan bila mungkin.
  if (ac.state === "suspended") void ac.resume().catch(() => undefined);
  try {
    build(ac, ac.currentTime + 0.01);
  } catch {
    /* audio tidak tersedia — abaikan */
  }
}

/** Jawaban benar: dua nada naik (C6 → E6). */
export function playCorrect() {
  play((ac, now) => {
    tone(ac, { freq: 1046.5, start: now, duration: 0.12, type: "sine" });
    tone(ac, { freq: 1318.5, start: now + 0.1, duration: 0.2, type: "sine" });
  });
}

/** Jawaban salah: nada turun pendek (buzz lembut). */
export function playWrong() {
  play((ac, now) => {
    tone(ac, { freq: 240, endFreq: 150, start: now, duration: 0.28, type: "triangle", gain: 0.12 });
  });
}

/** Jawaban tidak sempat dikirim (waktu habis). */
export function playTimeUp() {
  play((ac, now) => {
    tone(ac, { freq: 392, start: now, duration: 0.16, type: "sine" });
    tone(ac, { freq: 330, start: now + 0.16, duration: 0.22, type: "sine" });
  });
}

/** Jawaban terkirim: klik singkat. */
export function playClick() {
  play((ac, now) => {
    tone(ac, { freq: 720, start: now, duration: 0.05, type: "square", gain: 0.05 });
  });
}
