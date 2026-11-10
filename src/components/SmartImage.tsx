import { motion } from "framer-motion";
import { absoluteUrl } from "@/lib/api";
import { ImageOff } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Gambar dengan fallback placeholder bila gagal dimuat (PRD §9). */
export function SmartImage({
  url,
  alt,
  className,
  imgClassName,
  eager = false,
}: {
  url?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const abs = absoluteUrl(url);
  React.useEffect(() => setFailed(false), [abs]);

  if (!abs || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-foreground/15 bg-foreground/[0.03] text-muted-foreground/50",
          className,
        )}
      >
        <ImageOff className="size-6" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <motion.img
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        src={abs}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        className={cn("size-full object-cover", imgClassName)}
      />
    </div>
  );
}
