import * as React from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Dice1,
  LibraryBig,
  Play,
  RefreshCw,
  Rocket,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiErrorMessage, listQuizzes } from "@/lib/api";
import { HostShell } from "@/components/HostShell";
import { useToast } from "@/components/toast";
import { loadActivity, pushActivity } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

const ACTIVITY_ICON = {
  "quiz-created": { icon: Rocket, cls: "bg-primary-soft text-primary" },
  "quiz-updated": { icon: Clock, cls: "bg-primary-soft text-primary" },
  "session-hosted": { icon: Play, cls: "bg-success-soft text-success" },
  "game-ended": { icon: Users, cls: "bg-coral-soft text-coral" },
  "player-joined": { icon: Users, cls: "bg-warning-soft text-warning" },
} as const;

export default function UlarTanggaPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activity, setActivity] = useState(loadActivity);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load activity/stored state for ular tangga
    setActivity(loadActivity);
  }, []);

  function handleStartGame() {
    try {
      pushActivity({
        type: "session-hosted",
        label: "Memulai game Ular Tangga",
        detail: "Game Snakes & Ladders multiplayer",
      });
      navigate("/host/ular-tangga/live");
    } catch (e) {
      toast("error", "Gagal memulai game");
    }
  }

  return (
    <HostShell>
      <motion.div
        key="ular-tangga"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="space-y-8"
      >
        {/* Sapaan + aksi */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Selamat datang, Host 👋
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              Game Ular Tangga Edukasi PUSRI
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-transparent bg-primary-soft px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Rocket className="mr-2 size-4" /> Mainkan Sekarang
            </button>
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: LibraryBig, label: "Total Game", value: activity.length, tint: "bg-primary-soft text-primary" },
            { icon: Play, label: "Sesi Berjalan", value: activity.filter((a) => a.type === "session-hosted").length, tint: "bg-success-soft text-success" },
            { icon: Users, label: "Permainan Selesai", value: activity.filter((a) => a.type === "game-ended").length, tint: "bg-coral-soft text-coral" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={cn("mb-3 grid size-9 place-items-center rounded-xl", s.tint)}>
                <s.icon className="size-4.5" />
              </span>
              {s.value === null || s.value === undefined ? (
                <div className="h-8 w-12 skeleton-placeholder" />
              ) : (
                <p className="font-display text-2xl font-bold tabular-nums">{s.value.toLocaleString("id-ID")}</p>
              )}
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tombol mulai game baru */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="inline-block"
          >
            <div className="flex items-center gap-3 mb-4">
              <Dice1 className="size-6 text-primary" />
              <h2 className="font-display text-xl font-bold">Mulai Game Ular Tangga</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Organisasi: PT Pupuk Sriwijaja Palembang (PUSRI)
            </p>
            <button
              onClick={handleStartGame}
              className="rounded-full bg-primary px-8 py-3 text-lg font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Mulai Sekarang
            </button>
          </motion.div>
        </div>

        {/* Aktivitas terbaru */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Clock className="size-4 text-accent" /> Aktivitas Terbaru
            </h2>
          </div>
          {activity.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Belum ada aktivitas tercatat. Mulai game pertama Anda!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.slice(0, 6).map((a, i) => {
                const cfg = ACTIVITY_ICON[a.type] ?? ACTIVITY_ICON["player-joined"];
                return (
                  <motion.div
                    key={`${a.at}-${i}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-4"
                  >
                    <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", cfg.cls)}>
                      <cfg.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.label}</p>
                      {a.detail && <p className="truncate text-xs text-muted-foreground">{a.detail}</p>}
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        {timeAgo(new Date(a.at).toISOString())}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </HostShell>
  );
}

/** Placeholder skeleton component */
const skeletonPlaceholder = (size: number) => (
  <div
    className={`h-[${size}px] w-[${size}px] rounded bg-border animate-pulse`}
  />
);