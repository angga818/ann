import * as React from "react";
import { nowServerMs } from "@/lib/time";

/**
 * Countdown berbasis jam server (offset dari STATE_SYNC).
 *
 * Perbaikan bug "angka beku":
 * - rAF menggerakkan pembaruan halus saat tab terlihat; interval tetap jalan
 *   sebagai fallback (browser mem-throttle rAF & interval di tab tersembunyi).
 * - `visibilitychange`/`focus` langsung memaksa pembaruan saat kembali ke tab,
 *   sehingga tampilan menyusul realita seketika, bukan menunggu tick berikutnya.
 * - State hanya di-emit ketika nilainya berubah — hemat render.
 */
export function useServerCountdown(targetMs?: number | null, tick = 100): number {
  const [remaining, setRemaining] = React.useState(() =>
    targetMs ? Math.max(0, targetMs - nowServerMs()) : 0,
  );

  React.useEffect(() => {
    if (!targetMs) {
      setRemaining(0);
      return;
    }

    let lastEmitted = -1;
    const update = (force = false) => {
      const rem = Math.max(0, targetMs - nowServerMs());
      if (force || rem !== lastEmitted) {
        lastEmitted = rem;
        setRemaining(rem);
      }
      return rem;
    };

    // Emit awal sinkron.
    update(true);

    // rAF: pembaruan halus saat terlihat (berhenti otomatis saat tab hidden).
    let rafId = 0;
    let rafAlive = true;
    const loop = () => {
      if (!rafAlive) return;
      update();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    // Interval fallback: tetap berjalan (meski di-throttle) saat tab hidden.
    const intervalId = setInterval(() => update(true), tick);

    // Catch-up instan saat tab kembali terlihat / window fokus.
    const catchUp = () => {
      if (!document.hidden) update(true);
    };
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("focus", catchUp);
    window.addEventListener("pageshow", catchUp);

    return () => {
      rafAlive = false;
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("focus", catchUp);
      window.removeEventListener("pageshow", catchUp);
    };
  }, [targetMs, tick]);

  return remaining;
}
