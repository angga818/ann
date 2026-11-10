import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, MonitorPlay, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { PageTransition } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time tanpa jeda",
    desc: "Soal, timer, dan skor tersinkron langsung lewat WebSocket — semua keputusan ada di server.",
  },
  {
    icon: Users,
    title: "Hingga ratusan pemain",
    desc: "Satu PIN, semua bergabung. Skor dan streak dihitung adil untuk semua orang.",
  },
  {
    icon: Gamepad2,
    title: "Cepat & seru",
    desc: "Semakin cepat menjawab, semakin besar poinnya. Streak beruntun memberi bonus.",
  },
  {
    icon: Trophy,
    title: "Podium akhir",
    desc: "Tiga besar tampil di podium megah saat permainan berakhir.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-3">
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 px-3 py-1.5 text-xs">
              <Sparkles className="text-amber-300" />
              Kuis multiplayer real-time
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl text-balance font-display text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl"
          >
            Kuis seru,
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              {" "}
              semua orang ikut
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5 }}
            className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
          >
            Host membuat kuis dan membagikan PIN 6 digit. Pemain bergabung dengan nickname, jawab secepat mungkin,
            dan panjat podium.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
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
            initial={{ opacity: 0, y: 40, rotateX: 12 }}
            animate={{ opacity: 1, y: 24, rotateX: 0 }}
            transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-20 w-full max-w-2xl"
            style={{ perspective: 900 }}
          >
            <div className="glass rounded-3xl p-8 shadow-2xl shadow-violet-950/30">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Masukkan PIN</p>
                  <p className="mt-2 font-display text-6xl font-black tracking-[0.15em] tabular-nums text-white sm:text-7xl">
                    4<span className="text-violet-400">8</span>1<span className="text-fuchsia-400">9</span>
                    <span className="text-cyan-300">2</span>6
                  </p>
                </div>
                <div className="hidden grid-cols-2 gap-2 sm:grid">
                  {["bg-gradient-to-br from-rose-500 to-red-600", "bg-gradient-to-br from-sky-500 to-blue-600", "bg-gradient-to-br from-amber-400 to-orange-500", "bg-gradient-to-br from-emerald-400 to-green-600"].map(
                    (bg, i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 3 + i * 0.7, ease: "easeInOut", delay: i * 0.35 }}
                        className={`size-16 rounded-2xl ${bg} opacity-90 shadow-lg`}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
            {/* refleksi */}
            <div
              aria-hidden
              className="glass pointer-events-none absolute inset-x-8 top-full h-24 rounded-b-3xl opacity-30 blur-md [mask-image:linear-gradient(to_bottom,black,transparent)]"
            />
          </motion.div>
        </section>

        {/* Fitur */}
        <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5 transition-colors hover:border-white/15"
            >
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-2.5 text-violet-300 transition-transform duration-300 group-hover:scale-110">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-display font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </section>
      </PageTransition>

      <footer className="border-t border-white/5 py-6">
        <p className="text-center text-xs text-muted-foreground/60">
          QuizLive — frontend untuk API <span className="font-mono">api.workilham.my.id</span>
        </p>
      </footer>
    </div>
  );
}
