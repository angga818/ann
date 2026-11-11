import { Circle, Diamond, Square, Triangle, type LucideIcon } from "lucide-react";

/**
 * Opsi jawaban dipetakan dari color_index 0–3 → token warna flat
 * (merah, biru, kuning, hijau) yang didefinisikan di index.css
 * dan konsisten di mode terang/gelap.
 */
export interface OptionStyle {
  name: string;
  base: string;
  hover: string;
  text: string;
  barTrack: string;
  barFill: string;
  icon: LucideIcon;
}

export const OPTION_STYLES: OptionStyle[] = [
  {
    name: "merah",
    base: "bg-opt-0",
    hover: "hover:brightness-95",
    text: "text-opt-0-fg",
    barTrack: "bg-opt-0/15",
    barFill: "bg-opt-0",
    icon: Triangle,
  },
  {
    name: "biru",
    base: "bg-opt-1",
    hover: "hover:brightness-95",
    text: "text-opt-1-fg",
    barTrack: "bg-opt-1/15",
    barFill: "bg-opt-1",
    icon: Diamond,
  },
  {
    name: "kuning",
    base: "bg-opt-2",
    hover: "hover:brightness-95",
    text: "text-opt-2-fg",
    barTrack: "bg-opt-2/25",
    barFill: "bg-opt-2",
    icon: Circle,
  },
  {
    name: "hijau",
    base: "bg-opt-3",
    hover: "hover:brightness-95",
    text: "text-opt-3-fg",
    barTrack: "bg-opt-3/15",
    barFill: "bg-opt-3",
    icon: Square,
  },
];

export function optionStyle(colorIndex: number): OptionStyle {
  return OPTION_STYLES[colorIndex] ?? OPTION_STYLES[0];
}
