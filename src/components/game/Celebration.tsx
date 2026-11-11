import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#1c5fe6", "#8b72d9", "#f2c66d", "#69bfa3", "#f28f8f", "#5b8af0"];

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  rotate: number;
  delay: number;
  duration: number;
  shape: "rect" | "circle";
}

/**
 * Ledakan confetti untuk momen perayaan (podium, jawaban benar).
 * Partikel hanya transformasi + opacity (hemat GPU), sekali jalan lalu hilang,
 * dan otomatis dihentikan oleh MotionConfig reducedMotion="user".
 */
export function CelebrationBurst({
  count = 28,
  origin = "center",
  className,
  spread = 150,
}: {
  count?: number;
  origin?: "top" | "center";
  className?: string;
  spread?: number;
}) {
  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
      const dist = spread * (0.55 + Math.random() * 0.6);
      arr.push({
        id: i,
        angle,
        distance: dist,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        rotate: (Math.random() - 0.5) * 540,
        delay: Math.random() * 0.35,
        duration: 0.9 + Math.random() * 0.7,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }
    return arr;
  }, [count, spread]);

  return (
    <div
      aria-hidden
      className={className ?? "pointer-events-none absolute inset-0 z-10 overflow-visible"}
      style={{ transformOrigin: origin === "top" ? "50% 0%" : "50% 50%" }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance + 40, // gravitasi lembut
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1, 1, 0.7],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.15, 0.7, 1],
          }}
          className="absolute left-1/2 top-1/2"
          style={{
            width: p.shape === "rect" ? p.size : p.size,
            height: p.shape === "rect" ? p.size * 0.6 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

/** Confetti berulang dari atas podium saat pemenang ditampilkan. */
export function CelebrationRain({ className }: { className?: string }) {
  const drops = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.2,
        duration: 2 + Math.random() * 1.6,
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        drift: (Math.random() - 0.5) * 90,
      })),
    [],
  );

  return (
    <div aria-hidden className={className ?? "pointer-events-none absolute inset-0 z-10 overflow-hidden"}>
      {drops.map((d) => (
        <motion.span
          key={d.id}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: "105%", x: [0, d.drift, 0], opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{
            duration: d.duration,
            delay: d.delay,
            repeat: Infinity,
            repeatDelay: 0.6,
            ease: "linear",
            times: [0, 0.2, 0.8, 1],
          }}
          className="absolute top-0"
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size * 0.62,
            backgroundColor: d.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
