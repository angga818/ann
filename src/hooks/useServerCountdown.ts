import * as React from "react";
import { nowServerMs } from "@/lib/time";

/**
 * Countdown berbasis jam server (offset dari STATE_SYNC).
 * Mengembalikan sisa milidetik, diperbarui tiap frame yang masuk akal (60fps ringan: 100ms).
 */
export function useServerCountdown(targetMs?: number | null, tick = 100): number {
  const [remaining, setRemaining] = React.useState(() => (targetMs ? Math.max(0, targetMs - nowServerMs()) : 0));

  React.useEffect(() => {
    if (!targetMs) {
      setRemaining(0);
      return;
    }
    const update = () => setRemaining(Math.max(0, targetMs - nowServerMs()));
    update();
    const id = setInterval(update, tick);
    return () => clearInterval(id);
  }, [targetMs, tick]);

  return remaining;
}
