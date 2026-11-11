import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, ImagePlus, Info, Loader2, RotateCcw, TriangleAlert, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadImage, apiErrorMessage } from "@/lib/api";
import {
  AVATAR_MAX_MB,
  AVATAR_MIME_TYPES,
  cropToDataUrl,
  dataUrlToFile,
  isSupportedAvatarMime,
} from "@/lib/image-crop";
import { PlayerAvatar, type AvatarRef, type CustomAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type Phase = "pick" | "crop" | "saving";

/**
 * Dialog unggah avatar: pilih file (JPG/PNG/WebP) → crop bulat + zoom →
 * simpan. Hasil crop disimpan sebagai data URL lokal supaya avatar tetap
 * tampil tanpa jaringan, dan diunggah ke storage gambar backend
 * (`POST /media/images`) agar punya URL persisten. Bila upload gagal, avatar
 * lokal tetap dipakai.
 */
export function AvatarUploadDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: (avatar: CustomAvatar) => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = React.useState<Phase>("pick");
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [areaPixels, setAreaPixels] = React.useState<Area | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Mulai bersih setiap dialog dibuka.
  React.useEffect(() => {
    if (open) {
      setPhase("pick");
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAreaPixels(null);
      setError(null);
    }
  }, [open]);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!isSupportedAvatarMime(file.type)) {
      setError("Format harus JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
      setError(`Ukuran gambar maksimal ${AVATAR_MAX_MB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(typeof reader.result === "string" ? reader.result : null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setPhase("crop");
    };
    reader.onerror = () => setError("Gambar tidak dapat dibaca. Coba file lain.");
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!imageSrc || !areaPixels) return;
    setPhase("saving");
    try {
      const dataUrl = await cropToDataUrl(imageSrc, areaPixels);
      let remoteUrl: string | undefined;
      try {
        const res = await uploadImage(dataUrlToFile(dataUrl, "avatar"), "general");
        remoteUrl = res.url;
      } catch (e) {
        // Storage backend mati/limit — avatar lokal tetap bisa dipakai.
        toast(
          "warning",
          "Avatar disimpan lokal",
          `Upload ke server gagal (${apiErrorMessage(e)}). Avatar tetap dipakai di perangkat ini.`,
        );
      }
      const avatar: CustomAvatar = { dataUrl, remoteUrl };
      onSaved(avatar);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses gambar.");
      setPhase("crop");
    }
  }

  const canCrop = phase === "crop" && !!imageSrc;

  return (
    <Dialog open={open} onOpenChange={(o) => phase !== "saving" && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unggah Avatar</DialogTitle>
          <DialogDescription>
            Pilih foto dari perangkat, atur posisi &amp; zoom, lalu gunakan sebagai avatar Anda.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept={AVATAR_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <AnimatePresence mode="wait" initial={false}>
          {/* ----------------------------- pilih file ----------------------------- */}
          {phase === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/15 bg-foreground/[0.02] px-6 py-10 text-center transition-colors hover:border-primary/40"
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <ImagePlus className="size-7" />
                </span>
                <span className="text-sm font-semibold">Klik untuk memilih foto</span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG, atau WebP · maksimal {AVATAR_MAX_MB} MB
                </span>
              </button>
              <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => fileRef.current?.click()}>
                <Camera /> Buka kamera / galeri
              </Button>
            </motion.div>
          )}

          {/* ------------------------------- crop ------------------------------- */}
          {(phase === "crop" || phase === "saving") && imageSrc && (
            <motion.div key="crop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="relative h-64 overflow-hidden rounded-2xl bg-foreground/90">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  minZoom={1}
                  maxZoom={3}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setAreaPixels(pixels)}
                  classes={{
                    cropAreaClassName: "border-4 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]",
                  }}
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  disabled={phase === "saving"}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="Zoom avatar"
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                />
                <Button
                  variant="ghost"
                  size="iconSm"
                  title="Reset posisi"
                  disabled={phase === "saving"}
                  onClick={() => {
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                >
                  <RotateCcw />
                </Button>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={phase === "saving"}>
                  <Camera /> Ganti Foto
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={!areaPixels || phase === "saving"}>
                  {phase === "saving" ? (
                    <>
                      <Loader2 className="animate-spin" /> Menyimpan…
                    </>
                  ) : (
                    <>
                      <Check /> Gunakan Foto
                    </>
                  )}
                </Button>
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
                <Info className="mt-0.5 size-3 shrink-0" />
                Foto yang diunggah hanya tampil sebagai avatar Anda di perangkat ini — backend belum
                menyimpan avatar pemain.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-coral-soft px-4 py-3 text-sm font-medium text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Tombol kecil di grid avatar: memilih avatar unggahan atau membuka dialog. */
export function CustomAvatarTile({
  active,
  avatar,
  onClick,
}: {
  active: boolean;
  /** Avatar kustom tersimpan (bila ada) untuk pratinjau di dalam tile. */
  avatar?: AvatarRef;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      title="Unggah foto sendiri"
      aria-label="Unggah foto avatar"
      aria-pressed={active}
      className={cn(
        "relative grid aspect-square place-items-center overflow-hidden rounded-xl border-2 transition-colors",
        active ? "border-primary bg-primary-soft" : "border-dashed border-foreground/25 bg-background hover:border-foreground/40",
      )}
    >
      {avatar !== undefined ? (
        <PlayerAvatar avatar={avatar} className="absolute inset-0 size-full rounded-none" />
      ) : (
        <Camera className="size-5 text-muted-foreground" />
      )}
      {active && (
        <span className="absolute -right-1.5 -top-1.5 z-10 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Check className="size-3" strokeWidth={3.5} />
        </span>
      )}
    </motion.button>
  );
}
