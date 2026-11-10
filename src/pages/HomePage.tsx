import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, MonitorPlay, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { PageTransition } from "@/components/common";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OPTION_STYLES } from "@/lib/option-colors";

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time tanpa jeda",
    desc: "Soal, timer, dan skor tersinkron lewat WebSocket — semua keputusan ada di server.",
  },
  {
    icon: Users,
    title: "Semua ikut main",
    desc: "Satu PIN untuk semua peserta. Skor dan streak dihitung adil untuk setiap orang.",
  },
  {
    icon: Sparkles,
    title: "Cepat = poin besar",
    desc: "Semakin cepat menjawab, semakin besar poinnya. Streak beruntun memberi bonus.",
  },
  {
    icon: Trophy,
    title: "Podium akhir",
    desc: "Tiga besar tampil di podium saat permainan berakhir.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/join">Masuk ke Game</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/host">Jadi Host</Link>
            </Button>
          </nav>
        </div>
      </header>

      <PageTransition className="flex-1">
        {/* Hero */}
        <section className="relative flex flex-col items-center pb-20 pt-16 text-center sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
          >
            <Badge variant="secondary" className="mb-6 px-3 py-1.5 text-xs">
              <Sparkles className="text-warning" />
              Kuis multiplayer real-time
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl text-balance font-display text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl"
          >
            Kuis seru,
            <span className="text-primary"> semua orang ikut</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
          >
            Host membuat kuis dan membagikan PIN 6 digit. Pemain bergabung dengan nickname, jawab secepat mungkin,
            dan panjat podium.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button asChild size="xl" className="group">
              <Link to="/join">
                <Gamepad2 className="transition-transform group-hover:-rotate-12" />
                Gabung sebagai Pemain
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link to="/host">
                <MonitorPlay />
                Buat & Host Kuis
              </Link>
            </Button>
          </motion.div>

          {/* Preview kartu PIN */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 20 }}
            transition={{ delay: 0.4, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 w-full max-w-2xl"
          >
            <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Masukkan PIN</p>
                  <p className="mt-2 font-display text-6xl font-black tracking-[0.14em] tabular-nums sm:text-7xl">
                    481926
                  </p>
                </div>
                <div className="hidden grid-cols-2 gap-2 sm:grid">
                  {OPTION_STYLES.map((st, i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 3 + i * 0.6, ease: "easeInOut", delay: i * 0.3 }}
                      className={`size-14 rounded-2xl ${st.base}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Fitur */}
        <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/25"
            >
              <div className="mb-4 inline-flex rounded-xl bg-secondary p-2.5 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-display font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </section>
      </PageTransition>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground/70">
          QuizLive — frontend untuk API <span className="font-mono">api.workilham.my.id</span>
        </p>
      </footer>
    </div>
  );
}
