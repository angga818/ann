import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChartColumn,
  FileDown,
  Flame,
  ListChecks,
  Loader2,
  Target,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HostShell } from "@/components/HostShell";
import { CorrectRateChart } from "@/components/game/CorrectRateChart";
import { AnswerBars } from "@/components/game/OptionGrid";
import { LeaderboardList } from "@/components/game/Leaderboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportReportPdf } from "@/lib/report-pdf";
import {
  avgCorrectRate,
  correctRate,
  deleteReport,
  formatReportDate,
  getReport,
  hardestQuestions,
  type SessionReport,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

export default function HostReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = React.useState<SessionReport | null>(() =>
    reportId ? getReport(reportId) : null,
  );
  const [exporting, setExporting] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  async function handleExport() {
    if (!report) return;
    setExporting(true);
    try {
      await exportReportPdf(report);
      toast("success", "PDF diunduh", `quizlive-laporan-${report.pin}.pdf`);
    } catch (e) {
      toast("error", "Gagal membuat PDF", e instanceof Error ? e.message : undefined);
    } finally {
      setExporting(false);
    }
  }

  function handleDelete() {
    if (!report) return;
    deleteReport(report.id);
    toast("success", "Laporan dihapus");
    navigate("/host/reports", { replace: true });
  }

  /* ----------------------- laporan tidak ditemukan ----------------------- */
  if (!report) {
    return (
      <HostShell>
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-secondary">
            <ChartColumn className="size-8 text-muted-foreground/50" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-lg font-bold">Laporan tidak ditemukan</p>
            <p className="text-sm text-muted-foreground">
              Laporan mungkin sudah dihapus atau tautannya tidak valid.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/host/reports">
              <ArrowLeft /> Semua Laporan
            </Link>
          </Button>
        </div>
      </HostShell>
    );
  }

  const winner = [...report.leaderboard].sort((a, b) => a.rank - b.rank)[0];
  const hardest = hardestQuestions(report.questions);
  const hardestIdx = new Set(hardest.map((q) => q.index));
  const avgRate = Math.round(avgCorrectRate(report.questions) * 100);

  return (
    <HostShell>
      <motion.div
        key={`report-${report.id}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        {/* Header + aksi */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Button asChild variant="ghost" size="icon" title="Kembali ke daftar laporan">
              <Link to="/host/reports">
                <ArrowLeft />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {report.quizTitle || "Sesi Live"}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="font-display tabular-nums">
                  PIN {report.pin}
                </Badge>
                <span>{formatReportDate(report.endedAtMs)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outlineDestructive" size="sm" onClick={() => setDeleteConfirm(true)}>
              <Trash2 /> Hapus
            </Button>
            <Button size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="animate-spin" /> : <FileDown />}
              {exporting ? "Menyiapkan…" : "Ekspor PDF"}
            </Button>
          </div>
        </div>

        {/* Statistik ringkas */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: Users, label: "Pemain", value: report.totalPlayers.toLocaleString("id-ID"), tint: "bg-primary-soft text-primary" },
            { icon: ListChecks, label: "Soal Dimainkan", value: String(report.questions.length), tint: "bg-accent-soft text-accent" },
            { icon: Target, label: "Rata-rata Benar", value: `${avgRate}%`, tint: "bg-success-soft text-success" },
            {
              icon: Trophy,
              label: winner ? `Juara: ${winner.nickname}` : "Juara",
              value: winner ? winner.score.toLocaleString("id-ID") : "-",
              tint: "bg-warning-soft text-warning",
            },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 22 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <span className={cn("mb-3 grid size-9 place-items-center rounded-xl", s.tint)}>
                <s.icon className="size-4.5" />
              </span>
              <p className="font-display text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-0.5 max-w-40 truncate text-xs font-medium text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Grafik persentase benar */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-5 flex items-center gap-2 font-display text-base font-bold">
            <ChartColumn className="size-4 text-primary" /> Persentase Jawaban Benar
          </h2>
          <CorrectRateChart questions={report.questions} />
        </section>

        {/* Soal tersulit */}
        {report.questions.length > 0 && (
          <section className="rounded-2xl border border-warning/25 bg-warning/[0.06] p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-warning">
              <Flame className="size-4" /> Soal Tersulit
            </h2>
            {hardest.map((q) => (
              <div key={q.index} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  Soal {q.index + 1}
                  <Badge variant="destructive">
                    <Target /> {Math.round(correctRate(q) * 100)}% benar
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{q.question_text}</p>
              </div>
            ))}
            {hardest.every((q) => correctRate(q) >= 1) && (
              <p className="text-sm text-muted-foreground">
                Semua pemain menjawab benar soal ini — coba tambah tantangan berikutnya!
              </p>
            )}
          </section>
        )}

        {/* Klasemen akhir */}
        {report.leaderboard.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 font-display text-base font-bold">
              <Trophy className="size-4 text-gold" /> Klasemen Akhir
            </h2>
            <LeaderboardList entries={report.leaderboard} maxRows={report.leaderboard.length} />
          </section>
        )}

        {/* Statistik per soal */}
        {report.questions.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-base font-bold">Statistik per Soal</h2>
            <div className="grid grid-cols-1 gap-4">
              {report.questions.map((q, i) => {
                const rate = Math.round(correctRate(q) * 100);
                return (
                  <motion.div
                    key={q.index}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.24), duration: 0.25 }}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary" className="font-display">
                        Soal {q.index + 1}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {hardestIdx.has(q.index) && (
                          <Badge variant="destructive">
                            <Flame /> Tersulit
                          </Badge>
                        )}
                        <Badge variant={rate >= 70 ? "success" : rate >= 40 ? "warning" : "destructive"}>
                          <Target /> {rate}% benar
                        </Badge>
                      </div>
                    </div>
                    <p className="mb-4 line-clamp-3 text-sm font-medium text-foreground/90">
                      {q.question_text}
                    </p>
                    <AnswerBars counts={q.counts} options={q.options} correctOptionId={q.correct_option_id} />
                    <p className="mt-3 text-[11px] text-muted-foreground/70">
                      {q.correct_count} dari {q.total_players} pemain menjawab benar · batas waktu{" "}
                      {q.time_limit_sec} detik
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </motion.div>

      {/* Konfirmasi hapus */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus laporan ini?</DialogTitle>
            <DialogDescription>
              Laporan sesi {report.pin} akan dihapus permanen dari perangkat ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HostShell>
  );
}
