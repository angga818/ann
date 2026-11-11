import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Sistem avatar frontend-only.
 * Backend tidak memiliki field avatar (join hanya menerima nickname), jadi:
 * - avatar pemain lain ditentukan deterministik dari player_id (hash) —
 *   konsisten di semua layar & semua peserta tanpa mengubah kontrak API;
 * - avatar sendiri dipilih di halaman join dan disimpan lokal.
 */

export interface AvatarDef {
  name: string;
  bg: string;
  face: React.ReactNode;
}

const EYE = "#2b2f36";
const BLUSH = "rgb(226 61 61 / 0.18)";

/** 10 karakter dengan gaya flat konsisten (viewBox 48). */
export const AVATARS: AvatarDef[] = [
  {
    name: "Rubah",
    bg: "#ffe8d9",
    face: (
      <>
        <path d="M10 20 L16 8 L20 18 Z" fill="#e8944a" />
        <path d="M38 20 L32 8 L28 18 Z" fill="#e8944a" />
        <circle cx="24" cy="28" r="13" fill="#f2a35e" />
        <ellipse cx="24" cy="33" rx="7" ry="5.5" fill="#fff6ee" />
        <circle cx="19" cy="26" r="1.8" fill={EYE} />
        <circle cx="29" cy="26" r="1.8" fill={EYE} />
        <path d="M24 31 l-1.6 1.6 1.6 1.6 1.6-1.6 Z" fill={EYE} />
      </>
    ),
  },
  {
    name: "Panda",
    bg: "#e4e9ef",
    face: (
      <>
        <circle cx="13" cy="14" r="5" fill="#3a4250" />
        <circle cx="35" cy="14" r="5" fill="#3a4250" />
        <circle cx="24" cy="27" r="13" fill="#f7f9fb" stroke="#3a4250" strokeWidth="1.6" />
        <ellipse cx="18.5" cy="26" rx="3.6" ry="4.4" fill="#3a4250" />
        <ellipse cx="29.5" cy="26" rx="3.6" ry="4.4" fill="#3a4250" />
        <circle cx="18.5" cy="25" r="1.2" fill="#fff" />
        <circle cx="29.5" cy="25" r="1.2" fill="#fff" />
        <ellipse cx="24" cy="33" rx="2.2" ry="1.5" fill="#3a4250" />
      </>
    ),
  },
  {
    name: "Kucing",
    bg: "#fff3c9",
    face: (
      <>
        <path d="M12 21 L15 9 L22 15 Z" fill="#f2c66d" />
        <path d="M36 21 L33 9 L26 15 Z" fill="#f2c66d" />
        <circle cx="24" cy="28" r="13" fill="#f2c66d" />
        <circle cx="19" cy="26" r="1.8" fill={EYE} />
        <circle cx="29" cy="26" r="1.8" fill={EYE} />
        <path d="M24 30 l-1.4 1.4 1.4 1.4 1.4-1.4 Z" fill="#c98a2e" />
        <path d="M24 33 q1.8 2 3.6 0" stroke="#c98a2e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M8 27 h6 M8 31 h6 M34 27 h6 M34 31 h6" stroke="#c98a2e" strokeWidth="1.1" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "Burung Hantu",
    bg: "#ece8fa",
    face: (
      <>
        <path d="M12 22 q-4 -12 6 -12 q14 0 18 12 q-2 12 -12 12 q-10 0 -12 -12 Z" fill="#8b72d9" />
        <circle cx="18.5" cy="26" r="5" fill="#fff" stroke="#2b2f36" strokeWidth="1.2" />
        <circle cx="29.5" cy="26" r="5" fill="#fff" stroke="#2b2f36" strokeWidth="1.2" />
        <circle cx="18.5" cy="26" r="2.2" fill={EYE} />
        <circle cx="29.5" cy="26" r="2.2" fill={EYE} />
        <path d="M24 29 l-2.4 3 h4.8 Z" fill="#f2c66d" />
      </>
    ),
  },
  {
    name: "Katak",
    bg: "#dcf2e5",
    face: (
      <>
        <circle cx="15" cy="17" r="6" fill="#69bfa3" />
        <circle cx="33" cy="17" r="6" fill="#69bfa3" />
        <circle cx="15" cy="17" r="3" fill="#fff" />
        <circle cx="33" cy="17" r="3" fill="#fff" />
        <circle cx="15" cy="17" r="1.4" fill={EYE} />
        <circle cx="33" cy="17" r="1.4" fill={EYE} />
        <ellipse cx="24" cy="29" rx="13" ry="10" fill="#69bfa3" />
        <path d="M16 31 q8 5 16 0" stroke="#2b2f36" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="28" r="1.4" fill="#2b2f36" />
      </>
    ),
  },
  {
    name: "Penguin",
    bg: "#dce8fc",
    face: (
      <>
        <ellipse cx="24" cy="26" rx="13" ry="14" fill="#3a4250" />
        <ellipse cx="24" cy="29" rx="8.5" ry="9.5" fill="#fff" />
        <circle cx="20" cy="25" r="1.8" fill="#fff" />
        <circle cx="28" cy="25" r="1.8" fill="#fff" />
        <path d="M24 28 l-2 2.6 2 2.6 2-2.6 Z" fill="#f2a35e" />
        <ellipse cx="15" cy="30" rx="2" ry="1.4" fill={BLUSH} />
        <ellipse cx="33" cy="30" rx="2" ry="1.4" fill={BLUSH} />
      </>
    ),
  },
  {
    name: "Kelinci",
    bg: "#fde7e7",
    face: (
      <>
        <ellipse cx="18" cy="14" rx="3.6" ry="9" fill="#f28f8f" />
        <ellipse cx="30" cy="14" rx="3.6" ry="9" fill="#f28f8f" />
        <ellipse cx="18" cy="14" rx="1.7" ry="6" fill="#f7c6c6" />
        <ellipse cx="30" cy="14" rx="1.7" ry="6" fill="#f7c6c6" />
        <circle cx="24" cy="30" r="12" fill="#f28f8f" />
        <circle cx="19.5" cy="28" r="1.8" fill={EYE} />
        <circle cx="28.5" cy="28" r="1.8" fill={EYE} />
        <path d="M24 31.5 l-1.3 1.3 1.3 1.3 1.3-1.3 Z" fill="#d96b6b" />
        <path d="M22 36 q2 1.8 4 0" stroke="#d96b6b" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "Beruang",
    bg: "#f5e3d3",
    face: (
      <>
        <circle cx="14" cy="16" r="5" fill="#c9915e" />
        <circle cx="34" cy="16" r="5" fill="#c9915e" />
        <circle cx="24" cy="29" r="13" fill="#c9915e" />
        <ellipse cx="24" cy="33" rx="6.5" ry="5" fill="#f5e3d3" />
        <circle cx="19" cy="25" r="1.8" fill={EYE} />
        <circle cx="29" cy="25" r="1.8" fill={EYE} />
        <ellipse cx="24" cy="31" rx="2.6" ry="1.9" fill="#3a2f26" />
      </>
    ),
  },
  {
    name: "Singa",
    bg: "#fdf0d3",
    face: (
      <>
        <circle cx="24" cy="27" r="15" fill="#e8944a" />
        <circle cx="24" cy="28" r="10" fill="#f2c66d" />
        <circle cx="20" cy="25" r="1.8" fill={EYE} />
        <circle cx="28" cy="25" r="1.8" fill={EYE} />
        <path d="M24 29 l-1.4 1.4 1.4 1.4 1.4-1.4 Z" fill="#3a2f26" />
        <path d="M20 33 q4 2.4 8 0" stroke="#3a2f26" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: "Koala",
    bg: "#e4e9ef",
    face: (
      <>
        <circle cx="12" cy="20" r="7" fill="#aab8c9" />
        <circle cx="36" cy="20" r="7" fill="#aab8c9" />
        <circle cx="12" cy="20" r="3.4" fill="#dce4ee" />
        <circle cx="36" cy="20" r="3.4" fill="#dce4ee" />
        <ellipse cx="24" cy="28" rx="12" ry="11" fill="#c3cfdd" />
        <circle cx="19" cy="26" r="1.8" fill={EYE} />
        <circle cx="29" cy="26" r="1.8" fill={EYE} />
        <ellipse cx="24" cy="31.5" rx="3.2" ry="2.4" fill="#3a4250" />
      </>
    ),
  },
];

/** Hash string sederhana (FNV-1a). */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Avatar deterministik seorang pemain (fallback bila tidak memilih sendiri). */
export function avatarForPlayer(playerId: string): number {
  return hashString(playerId) % AVATARS.length;
}

/** Ikon avatar dalam lingkaran latar pastel. */
export function AvatarIcon({
  id,
  className,
  ring = false,
}: {
  id: number;
  className?: string;
  ring?: boolean;
}) {
  const def = AVATARS[((id % AVATARS.length) + AVATARS.length) % AVATARS.length] ?? AVATARS[0];
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full",
        ring && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 48 48" className="size-full">
        <rect width="48" height="48" rx="9999" fill={def.bg} />
        {def.face}
      </svg>
    </span>
  );
}
