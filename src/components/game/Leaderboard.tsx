import { AnimatePresence, motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { AnimatedNumber } from "@/components/common";
import { CelebrationBurst, CelebrationRain } from "@/components/game/Celebration";
import { AvatarIcon, avatarForPlayer } from "@/lib/avatars";
import { cn } from "@/lib/utils";

/**
 * Baris leaderboard: avatar, peringkat, nickname, skor dengan animasi.
 * Reorder (perubahan posisi) dianimasikan lewat layout transition.
 */
export function LeaderboardList({
  entries,
  highlightPlayerId,
  maxRows = 10,
  getAvatar,
}: {
  entries: LeaderboardEntry[];
  highlightPlayerId?: string;
  maxRows?: number;
  /** Override avatar (mis. untuk avatar pilihan sendiri). */
  getAvatar?: (playerId: string) => number;
}) {
  const rows = entries.slice(0, maxRows);
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false} mode="popLayout">
        {rows.map((e) => {
          const me = e.player_id === highlightPlayerId;
          return (
            <motion.div
              key={e.player_id}
              layout
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3.5 py-2.5",
                me ? "border-primary/40 bg-primary-soft" : "border-border bg-card",
              )}
            >
              {/* badge peringkat pop saat rank berubah */}
              <motion.span
                key={e.rank}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg font-display text-xs font-bold tabular-nums",
                  e.rank === 1 && "bg-gold text-gold-fg",
                  e.rank === 2 && "bg-silver text-silver-fg",
                  e.rank === 3 && "bg-bronze text-bronze-fg",
                  e.rank > 3 && "bg-secondary text-muted-foreground",
                )}
              >
                {e.rank}
              </motion.span>
              <AvatarIcon id={getAvatar ? getAvatar(e.player_id) : avatarForPlayer(e.player_id)} className="size-8" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.nickname}</span>
              {me && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  Anda
                </span>
              )}
              <AnimatedNumber value={e.score} className="font-display text-sm font-bold tabular-nums" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Gaya blok podium berdasarkan PERINGKAT sebenarnya (bukan posisi slot). */
const RANK_STYLE: Record<number, { height: string; medal: string; big: boolean }> = {
  1: { height: "h-32 sm:h-36", medal: "bg-gold text-gold-fg", big: true },
  2: { height: "h-24 sm:h-28", medal: "bg-silver text-silver-fg", big: false },
  3: { height: "h-20 sm:h-24", medal: "bg-bronze text-bronze-fg", big: false },
};

const FALLBACK_STYLE = { height: "h-20", medal: "bg-secondary text-muted-foreground", big: false };

/** Reveal bertahap: peringkat 3 dulu, lalu 2, pemenang terakhir + perayaan. */
const REVEAL_DELAY = (rank: number) => (rank === 1 ? 0.55 : rank === 2 ? 0.3 : 0.05);

/**
 * Podium 3 besar: avatar pemenang di atas blok emas/perak/perunggu.
 * Perbaikan bug: blok emas/badge "1" selalu milik entry dengan rank 1,
 * meskipun urutan visual slotnya 2–1–3.
 */
export function PodiumView({
  podium,
  highlightPlayerId,
  getAvatar,
}: {
  podium: LeaderboardEntry[];
  highlightPlayerId?: string;
  getAvatar?: (playerId: string) => number;
}) {
  const entries = podium.slice(0, 3);
  if (entries.length === 0) return null;

  const byRank = (rank: number) => entries.find((e) => e.rank === rank);
  // Urutan visual slot: 2 — 1 — 3 (pemenang selalu di tengah).
  const slots = [
    byRank(2) ?? entries[1],
    byRank(1) ?? entries[0],
    byRank(3) ?? entries[2],
  ].filter(Boolean);

  return (
    <div className="relative overflow-x-clip px-2 pb-2 pt-8">
      {/* Hujan confetti di atas podium */}
      <CelebrationRain className="pointer-events-none absolute inset-x-0 top-0 z-20 h-56" />

      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {slots.map((entry) => {
          const rank = entry.rank;
          const isWinner = rank === 1;
          const cfg = RANK_STYLE[rank] ?? FALLBACK_STYLE;
          const me = entry.player_id === highlightPlayerId;
          const avatarId = getAvatar ? getAvatar(entry.player_id) : avatarForPlayer(entry.player_id);
          return (
            <motion.div
              key={entry.player_id}
              initial={{ opacity: 0, y: 70, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: REVEAL_DELAY(rank), type: "spring", stiffness: 140, damping: 16 }}
              className={cn("relative flex w-24 flex-col items-center sm:w-36", isWinner && "sm:w-44")}
            >
              <motion.div
                animate={isWinner ? { y: [0, -7, 0] } : undefined}
                transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
                className={cn(
                  "relative grid place-items-center rounded-full border-4 border-card bg-card shadow-sm",
                  isWinner ? "size-20 sm:size-24" : "size-14 sm:size-16",
                  me && "border-primary",
                )}
              >
                {/* ledakan confetti di sekitar pemenang */}
                {isWinner && <CelebrationBurst count={26} spread={130} className="pointer-events-none absolute inset-0 z-10" />}
                <AvatarIcon id={avatarId} className="size-full" />
                <span
                  className={cn(
                    "absolute -bottom-1.5 grid place-items-center rounded-full font-display text-xs font-bold",
                    cfg.medal,
                    isWinner ? "size-8" : "size-6 text-[11px]",
                  )}
                >
                  {rank}
                </span>
              </motion.div>
              <p
                className={cn(
                  "mt-3 flex max-w-full items-center gap-1 truncate px-1 font-display font-bold",
                  isWinner ? "text-base sm:text-lg" : "text-sm",
                )}
              >
                {entry.nickname}
                {me && <Crown className="size-4 shrink-0 text-primary" />}
              </p>
              <p className="mb-3 font-display text-sm font-bold tabular-nums text-muted-foreground">
                {entry.score.toLocaleString("id-ID")}
              </p>
              <div className={cn("flex w-full items-start justify-center rounded-t-xl pt-2.5", cfg.medal, cfg.height)}>
                <span
                  className={cn(
                    "font-display font-extrabold tabular-nums drop-shadow-sm",
                    cfg.big ? "text-4xl" : "text-2xl",
                  )}
                >
                  {rank}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mahkota melayang di atas pemenang — muncul setelah podium terreveal */}
      {slots.some((e) => e.rank === 1) && (
        <motion.div
          initial={{ opacity: 0, y: -26, rotate: -18, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          transition={{ delay: 0.95, type: "spring", stiffness: 260, damping: 13 }}
          className="pointer-events-none absolute left-1/2 top-0 z-20 hidden -translate-x-1/2 text-gold sm:block"
          aria-hidden
        >
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}>
            <Trophy className="size-8 drop-shadow-sm" strokeWidth={1.8} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
