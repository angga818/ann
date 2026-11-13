/** Halaman login host/admin (PRD Auth §3.3). */
import * as React from "react";
import axios from "axios";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, RefreshCw } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UnsupportedRoleError, useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorCode, apiErrorMessage } from "@/lib/api";

function parseRetryAfter(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  const at = Date.parse(value);
  if (!Number.isNaN(at)) {
    const diff = Math.ceil((at - Date.now()) / 1000);
    return diff > 0 ? diff : undefined;
  }
  return undefined;
}

function describeLoginError(err: unknown): { message: string; retryAfter?: number } {
  const code = apiErrorCode(err);
  const retryAfter = axios.isAxiosError(err) ? parseRetryAfter(err.response?.headers?.["retry-after"]) : undefined;

  if (code === "INVALID_CREDENTIALS") return { message: "Username/email atau password salah." };
  if (code === "ACCOUNT_LOCKED") {
    return { message: "Akun terkunci sementara karena terlalu banyak percobaan login.", retryAfter };
  }
  if (code === "RATE_LIMITED") {
    return { message: "Terlalu banyak percobaan login. Coba lagi beberapa saat lagi.", retryAfter };
  }
  if (code === "AUTH_UNAVAILABLE") {
    return { message: "Layanan login sedang tidak tersedia. Coba lagi nanti." };
  }
  if (axios.isAxiosError(err) && (!err.response || err.response.status >= 500)) {
    return { message: "Layanan login tidak dapat dihubungi. Periksa koneksi Anda lalu coba lagi." };
  }
  return { message: apiErrorMessage(err) };
}

/** Tetap di area host setelah login (jangan redirect ke origin luar). */
function resolveTarget(from: unknown): string {
  return typeof from === "string" && (from === "/host" || from.startsWith("/host/")) ? from : "/host";
}

export default function LoginPage() {
  const { status, login, retry } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const target = resolveTarget((location.state as { from?: unknown } | null)?.from);

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [retryAfter, setRetryAfter] = React.useState(0);

  React.useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setTimeout(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  if (status === "authenticated") return <Navigate to={target} replace />;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || retryAfter > 0) return;
    setError(null);

    if (!username.trim() || !password) {
      setError("Isi username/email dan password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof UnsupportedRoleError) {
        setError(err.message);
      } else {
        const info = describeLoginError(err);
        setError(info.message);
        if (info.retryAfter) setRetryAfter(info.retryAfter);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link to="/">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h1 className="font-display text-2xl font-bold tracking-tight">Masuk sebagai Host</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola kuis dan sesi Anda. Pemain tidak perlu login — cukup lewat halaman join.
            </p>

            {status === "unsupported-role" && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-foreground">
                  Role ini tidak didukung di aplikasi ini. Hubungi admin utama untuk mengakses melalui aplikasi
                  yang sesuai.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                <div className="flex-1">
                  <p className="text-foreground">Tidak dapat memeriksa sesi yang tersimpan.</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <RefreshCw className="size-3" /> Coba lagi
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username atau email</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nama.host atau host@contoh.com"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="pr-11"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-coral-soft p-3 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting || retryAfter > 0}>
                {submitting ? <Loader2 className="animate-spin" /> : <LogIn />}
                {retryAfter > 0 ? `Coba lagi dalam ${retryAfter} detik` : submitting ? "Memproses…" : "Masuk"}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link to="/" className="font-semibold text-primary hover:underline">
              Kembali ke beranda
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
