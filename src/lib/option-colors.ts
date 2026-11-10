import { Circle, Diamond, Square, Triangle, type LucideIcon } from "lucide-react";

/** Palet jawaban ala platform kuis live — dipetakan dari color_index 0–3. */
export interface OptionStyle {
  name: string;
  base: string;
  hover: string;
  active: string;
  ring: string;
  text: string;
  glow: string;
  icon: LucideIcon;
  iconColor: string;
}

export const OPTION_STYLES: OptionStyle[] = [
  {
    name: "merah",
    base: "bg-gradient-to-br from-rose-500 to-red-600",
    hover: "hover:from-rose-400 hover:to-red-500",
    active: "from-rose-500 to-red-600",
    ring: "ring-rose-300/60",
    text: "text-rose-50",
    glow: "shadow-[0_8px_40px_-8px_rgba(244,63,94,0.55)]",
    icon: Triangle,
    iconColor: "text-rose-200",
  },
  {
    name: "biru",
    base: "bg-gradient-to-br from-sky-500 to-blue-600",
    hover: "hover:from-sky-400 hover:to-blue-500",
    active: "from-sky-500 to-blue-600",
    ring: "ring-sky-300/60",
    text: "text-sky-50",
    glow: "shadow-[0_8px_40px_-8px_rgba(14,165,233,0.55)]",
    icon: Diamond,
    iconColor: "text-sky-200",
  },
  {
    name: "kuning",
    base: "bg-gradient-to-br from-amber-400 to-orange-500",
    hover: "hover:from-amber-300 hover:to-orange-400",
    active: "from-amber-400 to-orange-500",
    ring: "ring-amber-200/60",
    text: "text-amber-950",
    glow: "shadow-[0_8px_40px_-8px_rgba(245,158,11,0.55)]",
    icon: Circle,
    iconColor: "text-amber-200",
  },
  {
    name: "hijau",
    base: "bg-gradient-to-br from-emerald-400 to-green-600",
    hover: "hover:from-emerald-300 hover:to-green-500",
    active: "from-emerald-400 to-green-600",
    ring: "ring-emerald-300/60",
    text: "text-emerald-50",
    glow: "shadow-[0_8px_40px_-8px_rgba(16,185,129,0.55)]",
    icon: Square,
    iconColor: "text-emerald-200",
  },
];

export function optionStyle(colorIndex: number): OptionStyle {
  return OPTION_STYLES[colorIndex] ?? OPTION_STYLES[0];
}
