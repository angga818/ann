import * as React from "react";
import { nowServerMs } from "@/lib/time";

/**
 * Countdown berbasis jam server (offset dari STATE_SYNC).
 *
 * Sumber tick sengaja HANYA `setInterval` (bukan requestAnimationFrame):
 * rAF bisa berhenti total di beberapa kondisi browser (tab background, iframe
 * yang belum pernah di-composite, hemat baterai, driver GPU bermasalah) dan
 * itulah yang membuat angka/bar countdown terlihat beku. Interval tetap
 * dijalankan browser (walau di-throttle) sehingga nilai selalu maju.
 *
 * - Nilai selalu dihitung ulang dari `nowServerMs()` — tidak pernah
 *   mengakumulasi selisih, jadi tidak ada drift maupun "ketinggalan".
 * - `visibilitychange`/`focus`/`pageshow` memaksa pembaruan instan saat tab
 *   kembali aktif, sehingga tampilan langsung menyusul.
 * - State hanya di-emit bila berubah (dibulatkan 50 ms) → hemat render, sisa
 *   gerakan halus ditangani animasi UI.
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
      const rem = Math.max(0, Math.round((targetMs - nowServerMs()) / 50) * 50);
      if (force || rem !== lastEmitted) {
        lastEmitted = rem;
        setRemaining(rem);
      }
    };

    // Emit awal sinkron agar tidak ada frame kosong saat soal muncul.
    update(true);

    const intervalId = setInterval(() => update(), tick);

    const catchUp = () => update(true);
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("focus", catchUp);
    window.addEventListener("pageshow", catchUp);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("focus", catchUp);
      window.removeEventListener("pageshow", catchUp);
    };
  }, [targetMs, tick]);

  return remaining;
}

/**
 * True bila deadline sudah lewat — dipakai untuk mengunci input tanpa
 * menunggu event penutup dari server.
 */
export function useDeadlinePassed(deadlineMs?: number | null, graceMs = 0): boolean {
  const remaining = useServerCountdown(deadlineMs);
  return !!deadlineMs && remaining <= graceMs;
}
