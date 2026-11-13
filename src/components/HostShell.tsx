import { AnimatePresence, motion } from "framer-motion";
import { ChartColumn, Gamepad2, Home, LibraryBig, Plus, Users } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/host", label: "Dashboard", icon: Home, end: true },
  { to: "/host/library", label: "Library Kuis", icon: LibraryBig, end: false },
  { to: "/host/reports", label: "Laporan Sesi", icon: ChartColumn, end: false },
];

/** Kerangka halaman host: sidebar di desktop, top-bar di mobile. */
export function HostShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Link user management hanya untuk admin (PRD Auth §3.5).
  const nav = user?.role === "admin" ? [...NAV, { to: "/host/users", label: "Kelola User", icon: Users, end: false }] : NAV;

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-5 md:flex">
        <Link to="/" className="mb-8 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  isActive && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
                )
              }
            >
              <n.icon className="size-4.5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="border-t border-border pt-3">
            <UserMenu placement="up" />
          </div>
          <Button asChild variant="soft" className="w-full justify-start">
            <Link to="/host/quiz/new">
              <Plus /> Kuis Baru
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground">
            <Link to="/join">
              <Gamepad2 /> Gabung Game
            </Link>
          </Button>
        </div>
      </aside>

      {/* Konten */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top-bar mobile */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
          <Link to="/">
            <Logo compact />
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors",
                    isActive && "bg-primary-soft text-primary",
                  )
                }
              >
                <n.icon className="size-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
          <UserMenu placement="down" />
        </header>

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10"
        >
          <AnimatePresence mode="wait">{children}</AnimatePresence>
        </motion.main>
      </div>
    </div>
  );
}
