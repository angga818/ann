/** User management khusus admin: hanya role host yang dikelola (PRD Auth §3.6). */
import * as React from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Ban,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { HostShell } from "@/components/HostShell";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/toast";
import { apiErrorMessage } from "@/lib/api";
import {
  createUser,
  listUsers,
  resetUserPassword,
  revokeUserSessions,
  updateUser,
} from "@/lib/auth-api";
import { validateEmail, validatePassword, validateUsername } from "@/lib/auth-validation";
import type { ManagedUser } from "@/types";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-coral-soft p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function UsersPage() {
  const { user: me, logout } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = React.useState<ManagedUser[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ManagedUser | null>(null);
  const [resetTarget, setResetTarget] = React.useState<ManagedUser | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<ManagedUser | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setUsers(null);
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(apiErrorMessage(e));
      setUsers([]);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const activeCount = users?.filter((u) => u.is_active !== false).length ?? 0;

  /** Perubahan pada diri sendiri yang memutus akses → logout. */
  async function logoutIfSelf(target: ManagedUser) {
    if (me && target.id === me.id) {
      toast("info", "Sesi Anda berakhir", "Perubahan pada akun Anda mengharuskan login ulang.");
      await logout();
    }
  }

  async function handleEditSave(target: ManagedUser, isActive: boolean) {
    try {
      await updateUser(target.id, { role: "host", is_active: isActive });
      setEditTarget(null);
      toast("success", "User diperbarui", `Status “${target.username}” disimpan.`);
      await load();
      if (!isActive) await logoutIfSelf(target);
    } catch (e) {
      toast("error", "Gagal menyimpan", apiErrorMessage(e));
    }
  }

  async function handleResetPassword(target: ManagedUser, password: string) {
    try {
      await resetUserPassword(target.id, password);
      setResetTarget(null);
      toast("success", "Password direset", `Password baru berlaku untuk “${target.username}”.`);
    } catch (e) {
      toast("error", "Gagal reset password", apiErrorMessage(e));
    }
  }

  async function handleRevoke(target: ManagedUser) {
    try {
      await revokeUserSessions(target.id);
      setRevokeTarget(null);
      toast("success", "Sesi dicabut", `Semua sesi “${target.username}” telah diakhiri.`);
      await logoutIfSelf(target);
    } catch (e) {
      toast("error", "Gagal mencabut sesi", apiErrorMessage(e));
    }
  }

  return (
    <HostShell>
      <motion.div
        key="users"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
              <ShieldCheck className="size-7 text-primary" /> Kelola User
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola akun host. Role admin/superadmin tidak dapat dibuat dari sini.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari user…"
                className="w-48 pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={load} title="Muat ulang">
              <RefreshCw className={!users ? "animate-spin" : undefined} />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> <span className="hidden sm:inline">Tambah Host</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">
            <Users /> {users?.length ?? 0} host
          </Badge>
          <Badge variant="success">{activeCount} aktif</Badge>
          <Badge variant="outline">Role dikunci: host</Badge>
        </div>

        {!filtered && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {filtered && error && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-coral-soft p-12 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={load}>
              <RefreshCw /> Coba Lagi
            </Button>
          </div>
        )}

        {filtered && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <UserRound className="size-7" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">{query ? "Tidak ada hasil" : "Belum ada host"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {query ? "Coba kata kunci lain." : "Tambahkan akun host agar mereka bisa mengelola kuis sendiri."}
              </p>
            </div>
            {!query && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Tambah Host
              </Button>
            )}
          </div>
        )}

        {filtered && !error && filtered.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span className="text-right">Aksi</span>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                      {(u.username || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{u.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">Dibuat {formatDate(u.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <Badge variant="secondary" className="capitalize">
                      {u.role}
                    </Badge>
                  </div>

                  <div>
                    <Badge variant={u.is_active === false ? "destructive" : "success"}>
                      {u.is_active === false ? "Nonaktif" : "Aktif"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditTarget(u)}>
                      <Pencil /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setResetTarget(u)}>
                      <KeyRound /> Reset
                    </Button>
                    <Button size="sm" variant="outlineDestructive" onClick={() => setRevokeTarget(u)}>
                      <Ban /> Cabut Sesi
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async (username) => {
          setCreateOpen(false);
          toast("success", "Host ditambahkan", `Akun “${username}” siap dipakai.`);
          await load();
        }}
      />

      <EditUserDialog
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSave={handleEditSave}
        isSelf={!!me && editTarget?.id === me.id}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        onSubmit={handleResetPassword}
      />

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cabut semua sesi?</DialogTitle>
            <DialogDescription>
              Semua sesi login “{revokeTarget?.username}” akan diakhiri dan pengguna harus login ulang. Tindakan ini
              tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => revokeTarget && handleRevoke(revokeTarget)}>
              <Ban /> Cabut Sesi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HostShell>
  );
}

/* ----------------------------- Create dialog ----------------------------- */

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (username: string) => void | Promise<void>;
}) {
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setUsername("");
      setEmail("");
      setPassword("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const issue =
      validateUsername(username.trim()) ??
      validateEmail(email.trim()) ??
      validatePassword(password, username.trim(), email.trim());
    if (issue) {
      setError(issue);
      return;
    }

    setSubmitting(true);
    try {
      await createUser({ username: username.trim(), email: email.trim(), password, role: "host" });
      await onCreated(username.trim());
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah host</DialogTitle>
          <DialogDescription>Buat akun host baru. Role selalu host.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="new-username">Username</Label>
            <Input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nama.host"
              autoComplete="off"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="host@contoh.com"
              autoComplete="off"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-password">Password</Label>
            <Input
              id="new-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 12 karakter"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-role">Role</Label>
            <Input id="new-role" value="host" readOnly disabled className="capitalize" />
          </div>

          {error && <ErrorNote message={error} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              {submitting ? "Menyimpan…" : "Tambah Host"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Edit dialog ------------------------------ */

function EditUserDialog({
  target,
  onOpenChange,
  onSave,
  isSelf,
}: {
  target: ManagedUser | null;
  onOpenChange: (open: boolean) => void;
  onSave: (target: ManagedUser, isActive: boolean) => Promise<void>;
  isSelf: boolean;
}) {
  const [isActive, setIsActive] = React.useState(true);
  const [confirmingDeactivate, setConfirmingDeactivate] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!target) return;
    setIsActive(target.is_active !== false);
    setConfirmingDeactivate(false);
    setSubmitting(false);
  }, [target]);

  if (!target) return null;

  const deactivating = target.is_active !== false && !isActive;

  async function handleSave() {
    if (!target || submitting) return;
    if (deactivating && !confirmingDeactivate) {
      setConfirmingDeactivate(true);
      return;
    }
    setSubmitting(true);
    try {
      await onSave(target, isActive);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Ubah status akun “{target.username}”. Role terkunci sebagai host.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={target.username} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={target.email} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input value="host" readOnly disabled className="capitalize" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Akun aktif</p>
              <p className="text-xs text-muted-foreground">
                Akun nonaktif tidak bisa login dan sesinya dicabut.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => {
                setIsActive((v) => !v);
                setConfirmingDeactivate(false);
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                isActive ? "bg-success" : "bg-muted-foreground/40"
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                  isActive ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {isSelf && (
            <p className="text-xs text-muted-foreground">
              Ini akun Anda sendiri. Perubahan yang memutus akses akan mengakhiri sesi Anda.
            </p>
          )}

          {confirmingDeactivate && (
            <div className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
              <p className="font-semibold text-foreground">Nonaktifkan “{target.username}”?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pengguna akan langsung kehilangan akses dan semua sesinya dicabut.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmingDeactivate(false)} disabled={submitting}>
                  Batal
                </Button>
                <Button size="sm" variant="destructive" onClick={handleSave} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" /> : <Ban />}
                  Ya, nonaktifkan
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={submitting || confirmingDeactivate}>
              {submitting ? <Loader2 className="animate-spin" /> : <Pencil />}
              {submitting ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------- Reset password dialog ------------------------ */

function ResetPasswordDialog({
  target,
  onOpenChange,
  onSubmit,
}: {
  target: ManagedUser | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (target: ManagedUser, password: string) => Promise<void>;
}) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!target) {
      setPassword("");
      setConfirm("");
      setError(null);
      setSubmitting(false);
    }
  }, [target]);

  if (!target) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const issue = validatePassword(password, target ? target.username : undefined, target ? target.email : undefined);
    if (issue) {
      setError(issue);
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(target!, password);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Tetapkan password baru untuk “{target.username}”. Sesi yang sedang berjalan tidak otomatis dicabut.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">Password baru</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <p className="text-[11px] text-muted-foreground">12–128 karakter, tidak sama dengan username/email.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-password-confirm">Konfirmasi password</Label>
            <Input
              id="reset-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && <ErrorNote message={error} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {submitting ? "Menyimpan…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
