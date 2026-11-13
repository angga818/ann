/** Menu user area host: identitas, role, ganti password, logout (PRD Auth §3.5/§3.7). */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronDown, KeyRound, Loader2, LogOut, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";
import { apiErrorMessage } from "@/lib/api";
import { validatePassword } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";

export function UserMenu({ placement = "down" }: { placement?: "up" | "down" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  if (!user) return null;

  const initial = (user.username || user.email || "?").charAt(0).toUpperCase();
  const isAdmin = user.role === "admin";

  async function handleLogout() {
    setLoggingOut(true);
    setOpen(false);
    await logout();
    toast("info", "Anda telah keluar");
    navigate("/login", { replace: true });
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary"
          aria-label="Menu akun"
          aria-expanded={open}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {initial}
          </span>
          <span className="hidden min-w-0 flex-1 md:block">
            <span className="block truncate text-xs font-semibold">{user.username}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: placement === "up" ? 6 : -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: placement === "up" ? 6 : -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute right-0 z-40 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lg",
                  placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
                )}
              >
                <div className="border-b border-border px-3 pb-2.5 pt-1.5">
                  <p className="truncate text-sm font-semibold">{user.username}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  <Badge variant={isAdmin ? "accent" : "secondary"} className="mt-2 capitalize">
                    {user.role}
                  </Badge>
                </div>

                {isAdmin && (
                  <Link
                    to="/host/users"
                    onClick={() => setOpen(false)}
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
                  >
                    <Users className="size-3.5" /> Kelola User
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setPasswordOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
                >
                  <KeyRound className="size-3.5" /> Ganti Password
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-coral-soft disabled:opacity-60"
                >
                  {loggingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
                  Keluar
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (!currentPassword) {
      setError("Masukkan password lama.");
      return;
    }
    const issue = validatePassword(newPassword, user?.username, user?.email);
    if (issue) {
      setError(issue);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Password baru harus berbeda dari password lama.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      onOpenChange(false);
      toast("success", "Password diubah", "Silakan login kembali dengan password baru.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ganti password</DialogTitle>
          <DialogDescription>
            Setelah password diubah, semua sesi dicabut dan Anda harus login ulang.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Password lama</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Password baru</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
            />
            <p className="text-[11px] text-muted-foreground">12–128 karakter, tidak sama dengan username/email.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Konfirmasi password baru</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-coral-soft p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {submitting ? "Menyimpan…" : "Simpan Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
