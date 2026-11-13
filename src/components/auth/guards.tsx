/** Route guard area host/admin (PRD Auth §3.4). */
import { Loader2, RefreshCw, ShieldX } from "lucide-react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";

function currentPath(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function AuthLoadingScreen({ message = "Memeriksa sesi…" }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {message}
      </p>
    </div>
  );
}

export function AuthErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <div className="max-w-sm">
        <h1 className="font-display text-xl font-bold">Tidak dapat memeriksa sesi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Server auth tidak dapat dihubungi. Periksa koneksi Anda, lalu coba lagi. Anda tidak dikeluarkan dari akun.
        </p>
      </div>
      <Button onClick={onRetry}>
        <RefreshCw /> Coba Lagi
      </Button>
    </div>
  );
}

export function AccessDeniedScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      <span className="grid size-14 place-items-center rounded-2xl bg-coral-soft text-destructive">
        <ShieldX className="size-7" />
      </span>
      <div className="max-w-sm">
        <h1 className="font-display text-xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman ini hanya untuk admin. Hubungi admin jika Anda memerlukan akses.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/host">Kembali ke Dashboard</Link>
      </Button>
    </div>
  );
}

/** Wajib login sebagai host atau admin. */
export function RequireAuth() {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthLoadingScreen />;
  if (status === "error") return <AuthErrorScreen onRetry={retry} />;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: currentPath(location.pathname, location.search) }} />;
  }
  return <Outlet />;
}

/** Wajib login sebagai admin (backend tetap menolak 403). */
export function RequireAdmin() {
  const { status, user, retry } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthLoadingScreen />;
  if (status === "error") return <AuthErrorScreen onRetry={retry} />;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: currentPath(location.pathname, location.search) }} />;
  }
  if (user?.role !== "admin") return <AccessDeniedScreen />;
  return <Outlet />;
}
