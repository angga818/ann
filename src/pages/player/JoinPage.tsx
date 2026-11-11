import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2, LogIn, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { apiErrorMessage, apiErrorCode, joinSession } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";
import {
  AVATARS,
  AvatarIcon,
  customAvatarRef,
  loadCustomAvatarChoice,
  saveCustomAvatarChoice,
  type CustomAvatar,
} from "@/lib/avatars";
import { AvatarUploadDialog, CustomAvatarTile } from "@/components/player/AvatarUploadDialog";
import { loadAvatarChoice, saveAvatarChoice, savePlayerCreds } from "@/lib/storage";
import { cn } from "@/lib/utils";

const FRIENDLY: Record<string, string> = {
  NOT_FOUND: "PIN tidak ditemukan atau sesi sudah kedaluwarsa.",
  GAME_ALREADY_STARTED: "Permainan sudah dimulai — join hanya bisa dilakukan di lobby.",
  NICKNAME_TAKEN: "Nickname itu sudah dipakai pemain lain. Pilih yang lain.",
  SESSION_FULL: "Sesi sudah penuh pemain.",
  INVALID_NICKNAME: "Nickname wajib diisi, maksimal 20 karakter.",
  VALIDATION_ERROR: "Periksa kembali PIN dan nickname Anda.",
};

export default function JoinPage() {
  const { pin: routePin } = useParams<{ pin?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pin, setPin] = React.useState(routePin ?? "");
  const [nickname, setNickname] = React.useState("");
  const [avatarId, setAvatarId] = React.useState(() => loadAvatarChoice() ?? 0);
  const [customAvatar, setCustomAvatar] = React.useState<CustomAvatar | null>(() => loadCustomAvatarChoice());
  const [useCustom, setUseCustom] = React.useState(() => loadCustomAvatarChoice() !== null);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pinRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    pinRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePin]);

  const pinValid = /^\d{6}$/.test(pin);
  const nickValid = nickname.trim().length >= 1 && nickname.trim().length <= 20;

  function chooseAvatar(id: number) {
    setAvatarId(id);
    setUseCustom(false);
    // Foto lama dihapus agar tidak menimpa karakter yang baru dipilih saat bermain.
    setCustomAvatar(null);
    saveCustomAvatarChoice(null);
    saveAvatarChoice(id);
  }

  /** Foto hasil crop sudah diunggah dialog ke storage backend (bila tersedia). */
  function applyCustomAvatar(avatar: CustomAvatar) {
    setCustomAvatar(avatar);
    setUseCustom(true);
    saveCustomAvatarChoice(avatar);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!pinValid || !nickValid) {
      setError(!pinValid ? "PIN harus 6 digit angka." : "Nickname wajib 1–20 karakter.");
      return;
    }
    setLoading(true);
    try {
      const res = await joinSession(pin, nickname.trim());
      savePlayerCreds(pin, res, undefined, avatarId);
      navigate(`/play/${pin}`);
    } catch (err) {
      const code = apiErrorCode(err);
      setError(FRIENDLY[code ?? ""] ?? apiErrorMessage(err));
      if (code === "GAME_ALREADY_STARTED") {
        toast("warning", "Terlambat bergabung", FRIENDLY[code]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
            >
              <LogIn className="size-8" strokeWidth={2.2} />
            </motion.div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Gabung Permainan</h1>
            <p className="mt-2 text-sm text-muted-foreground">Masukkan PIN 6 digit dari host Anda.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm"
          >
            {/* PIN */}
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Sesi</Label>
              <input
                ref={pinRef}
                id="pin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className={cn(
                  "w-full rounded-xl border border-input bg-card py-4 text-center font-display text-4xl font-bold tracking-[0.35em] tabular-nums outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-ring",
                  pin.length > 0 && !pinValid && "border-destructive",
                )}
              />
              <div className="flex justify-center gap-1.5 pt-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: pin.length > i ? 1 : 0.25, scale: pin.length === i ? 1.25 : 1 }}
                    className="size-1.5 rounded-full bg-primary"
                  />
                ))}
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nama Anda di permainan…"
                className="h-12 text-center font-display text-lg font-semibold"
              />
              <p className="text-right text-[11px] tabular-nums text-muted-foreground/70">
                {nickname.trim().length}/20
              </p>
            </div>

            {/* Pemilihan avatar */}
            <div className="space-y-2">
              <Label>Pilih avatar Anda</Label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((a, id) => {
                  const selected = !useCustom && id === avatarId;
                  return (
                    <motion.button
                      key={id}
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      onClick={() => chooseAvatar(id)}
                      title={a.name}
                      aria-label={`Avatar ${a.name}`}
                      aria-pressed={selected}
                      className={cn(
                        "relative grid aspect-square place-items-center rounded-xl border-2 transition-colors",
                        selected
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-background hover:border-foreground/25",
                      )}
                    >
                      <motion.span
                        animate={selected ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                        transition={{ duration: 0.32 }}
                        className="grid place-items-center"
                      >
                        <AvatarIcon id={id} className="size-9" />
                      </motion.span>
                      <AnimatePresence>
                        {selected && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm"
                          >
                            <Check className="size-3" strokeWidth={3.5} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
                <CustomAvatarTile
                  active={useCustom && customAvatar !== null}
                  avatar={customAvatar ? customAvatarRef(customAvatar) : undefined}
                  onClick={() => {
                    if (customAvatar) {
                      setUseCustom(true);
                      saveCustomAvatarChoice(customAvatar);
                    }
                    setUploadOpen(true);
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Pilih karakter atau unggah foto sendiri (JPG, PNG, WebP) — avatar menjadi identitas Anda
                selama permainan.
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-xl border border-destructive/30 bg-coral-soft px-4 py-3 text-sm font-medium text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button type="submit" size="xl" className="group w-full">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> Menghubungkan…
                </>
              ) : (
                <>
                  Masuk Lobby <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/70">
            <Users className="size-3.5" /> Tunggu semua pemain masuk, lalu host memulai permainan
          </p>
        </motion.div>
      </div>

      <AvatarUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSaved={applyCustomAvatar} />
    </div>
  );
}
