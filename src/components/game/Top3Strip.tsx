import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { AnimatedNumber } from "@/components/common";
import { PlayerAvatar, avatarForPlayer, type AvatarRef } from "@/lib/avatars";
import { cn } from "@/lib/utils";

/** Gaya kartu per peringkat (1–3) — emas/perak/perunggu. */
const STRIP_STYLE: Record<number, { card: string; medal: string }> = {
  1: { card: "border-gold/50 bg-gold/10", medal: "bg-gold text-gold-fg" },
  2: { card: "border-silver/50 bg-silver/10", medal: "bg-silver text-silver-fg" },
  3: { card: "border-bronze/50 bg-bronze/10", medal: "bg-bronze text-bronze-fg" },
};

const FALLBACK = { card: "border-border bg-card", medal: "bg-secondary text-muted-foreground" };

/**
 * Strip 3 besar untuk fase hasil antar-soal — versi ringkas podium (yang penuh
 * dengan perayaan hanya untuk akhir permainan). Skor dianimasikan naik saat
 * klasemen diperbarui, kartu muncul bertahap 3 → 2 → 1.
 */
export function Top3Strip({
  entries,
  highlightPlayerId,
  getAvatar,
}: {
  entries: LeaderboardEntry[];
  highlightPlayerId?: string;
  /** Override avatar (mis. untuk avatar unggahan sendiri). */
  getAvatar?: (playerId: string) => AvatarRef;
}) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;

  const byRank = (rank: number) => top.find((e) => e.rank === rank);
  // Urutan visual slot: 2 — 1 — 3 (pemenang selalu di tengah).
  const slots = [byRank(2) ?? top[1], byRank(1) ?? top[0], byRank(3) ?? top[2]].filter(Boolean);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {slots.map((entry, i) => {
        const cfg = STRIP_STYLE[entry.rank] ?? FALLBACK;
        const me = entry.player_id === highlightPlayerId;
        const isWinner = entry.rank === 1;
        return (
          <motion.div
            key={entry.player_id}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.25 - i * 0.1, type: "spring", stiffness: 320, damping: 24 }}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3",
              cfg.card,
              me && "ring-2 ring-primary/50",
            )}
          >
            {isWinner && (
              <motion.span
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 15 }}
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-gold"
                aria-hidden
              >
                <Crown className="size-5 drop-shadow-sm" strokeWidth={2.2} />
              </motion.span>
            )}
            <div className="relative">
              <PlayerAvatar
                avatar={getAvatar ? getAvatar(entry.player_id) : avatarForPlayer(entry.player_id)}
                className={isWinner ? "size-12" : "size-10"}
              />
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full font-display text-[10px] font-bold",
                  cfg.medal,
                )}
              >
                {entry.rank}
              </span>
            </div>
            <p className="w-full truncate text-center text-xs font-bold">{entry.nickname}</p>
            <AnimatedNumber
              value={entry.score}
              className={cn("font-display font-bold tabular-nums", isWinner ? "text-sm" : "text-xs")}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
