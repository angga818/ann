import { motion } from "framer-motion";
import { ListChecks } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { cn } from "@/lib/utils";

const PASTELS = ["#dce8fc", "#ece8fa", "#fdf0d3", "#dcf2e5", "#fde7e7", "#e4e9ef"];
const ICON_COLORS = ["#1c5fe6", "#8b72d9", "#b98514", "#2fa37c", "#e5484d", "#667181"];

/** Thumbnail kuis: cover asli, atau ilustrasi pastel sederhana bila tidak ada. */
export function QuizThumb({
  url,
  title,
  className,
  iconSize = "size-8",
}: {
  url?: string | null;
  title: string;
  className?: string;
  iconSize?: string;
}) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = PASTELS[h % PASTELS.length];
  const color = ICON_COLORS[h % ICON_COLORS.length];

  if (url) {
    return <SmartImage url={url} alt={title} className={cn("rounded-xl border border-border bg-card", className)} />;
  }
  return (
    <div
      className={cn("flex items-center justify-center rounded-xl border border-border", className)}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      <motion.span
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <ListChecks className={cn(iconSize, "opacity-80")} color={color} />
      </motion.span>
    </div>
  );
}
