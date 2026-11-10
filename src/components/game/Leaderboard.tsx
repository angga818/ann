import { motion } from "framer-motion";
import { Crown, Medal, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { AnimatedNumber } from "@/components/common";
import { cn } from "@/lib/utils";

/** Baris leaderboard dengan animasi layout. */
export function LeaderboardList({
  entries,
  highlightPlayerId,
  maxRows = 10,
}: {
  entries: LeaderboardEntry[];
  highlightPlayerId?: string;
  maxRows?: number;
}) {
  const rows = entries.slice(0, maxRows);
  return (
    <div className="space-y-2">
      {rows.map((e) => {
        const me = e.player_id === highlightPlayerId;
        return (
          <motion.div
            key={e.player_id}
            layout
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              me ? "border-primary/45 bg-primary/10" : "border-border bg-foreground/[0.03]",
            )}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg font-display text-sm font-extrabold tabular-nums",
                e.rank === 1 && "bg-gold text-gold-fg",
                e.rank === 2 && "bg-silver text-silver-fg",
                e.rank === 3 && "bg-bronze text-bronze-fg",
                e.rank > 3 && "bg-foreground/[0.07] text-muted-foreground",
              )}
            >
              {e.rank}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{e.nickname}</span>
            {me && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Anda
              </span>
            )}
            <AnimatedNumber value={e.score} className="font-display font-bold tabular-nums" />
          </motion.div>
        );
      })}
    </div>
  );
}

/** Podium 3 besar — blok flat: emas, perak, perunggu. */
const PODIUM_STYLE = [
  {
    icon: Trophy,
    height: "h-36",
    medal: "bg-gold text-gold-fg",
    iconColor: "text-gold",
    rankLabel: "1",
    big: true,
  },
  {
    icon: Medal,
    height: "h-28",
    medal: "bg-silver text-silver-fg",
    iconColor: "text-silver",
    rankLabel: "2",
    big: false,
  },
  {
    icon: Medal,
    height: "h-24",
    medal: "bg-bronze text-bronze-fg",
    iconColor: "text-bronze",
    rankLabel: "3",
    big: false,
  },
];

export function PodiumView({
  podium,
  highlightPlayerId,
}: {
  podium: LeaderboardEntry[];
  highlightPlayerId?: string;
}) {
  const entries = podium.slice(0, 3);
  if (entries.length === 0) return null;

  // Urutan render: 2, 1, 3
  const slots = [
    entries.find((e) => e.rank === 2) ?? entries[1],
    entries.find((e) => e.rank === 1) ?? entries[0],
    entries.find((e) => e.rank === 3) ?? entries[2],
  ].filter(Boolean);

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-5">
      {slots.map((entry, i) => {
        const cfg = PODIUM_STYLE[i];
        const me = entry.player_id === highlightPlayerId;
        return (
          <motion.div
            key={entry.player_id}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i === 1 ? 0.3 : i * 0.2, type: "spring", stiffness: 120, damping: 16 }}
            className={cn("flex w-28 flex-col items-center sm:w-40", i === 1 && "sm:w-48")}
          >
            <motion.div
              animate={i === 1 ? { y: [0, -8, 0] } : undefined}
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
              className={cn("mb-2 grid size-11 place-items-center rounded-full border-2 border-current sm:size-14", cfg.iconColor)}
            >
              <cfg.icon className={cn(i === 1 ? "size-6 sm:size-8" : "size-5 sm:size-7")} strokeWidth={2.2} />
            </motion.div>
            <p className={cn("max-w-full truncate px-1 font-display font-bold", i === 1 ? "text-base sm:text-xl" : "text-sm")}>
              {entry.nickname}
              {me && <Crown className="ml-1 inline size-4 text-primary" />}
            </p>
            <p className="mb-3 font-display text-sm font-extrabold tabular-nums text-muted-foreground">
              {entry.score.toLocaleString("id-ID")}
            </p>
            <div className={cn("flex w-full items-start justify-center rounded-t-2xl pt-3", cfg.medal, cfg.height)}>
              <span className={cn("font-display font-black tabular-nums", cfg.big ? "text-5xl" : "text-3xl")}>
                {cfg.rankLabel}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
