import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChartColumn,
  ChevronRight,
  ListChecks,
  Play,
  Target,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { HostShell } from "@/components/HostShell";
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
import {
  avgCorrectRate,
  deleteReport,
  formatReportDate,
  loadSessionReports,
  type SessionReport,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

/** Baris satu laporan sesi — seluruh kartu bisa diklik ke detail. */
function ReportRow({ report, onDelete }: { report: SessionReport; onDelete: (r: SessionReport) => void }) {
  const winner = [...report.leaderboard].sort((a, b) => a.rank - b.rank)[0];
  const rate = Math.round(avgCorrectRate(report.questions) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <Link
        to={`/host/reports/${report.id}`}
        className="group flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50 sm:p-5"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <ChartColumn className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold">{report.quizTitle || "Sesi Live"}</p>
            <Badge variant="secondary" className="font-display tabular-nums">
              PIN {report.pin}
            </Badge>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatReportDate(report.endedAtMs)}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" /> {report.totalPlayers} pemain
            </span>
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3" /> {report.questions.length} soal
            </span>
            <span className="inline-flex items-center gap-1">
              <Target className="size-3" /> {rate}% benar
            </span>
            {winner && (
              <span className="inline-flex items-center gap-1 font-semibold text-gold">
                <Trophy className="size-3" /> {winner.nickname}
              </span>
            )}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-muted-foreground" />
      </Link>
      <button
        type="button"
        title="Hapus laporan"
        onClick={(e) => {
          e.preventDefault();
          onDelete(report);
        }}
        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-lg p-2 text-muted-foreground/50 transition-colors hover:bg-coral-soft hover:text-destructive group-hover:block sm:right-14"
      >
        <Trash2 className="size-4" />
      </button>
    </motion.div>
  );
}

export default function HostReportsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = React.useState<SessionReport[]>(() => loadSessionReports());
  const [pendingDelete, setPendingDelete] = React.useState<SessionReport | null>(null);

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteReport(pendingDelete.id);
    setReports((prev) => prev.filter((r) => r.id !== pendingDelete.id));
    toast("success", "Laporan dihapus", `Sesi ${pendingDelete.pin} dihapus dari perangkat ini.`);
    setPendingDelete(null);
  }

  return (
    <HostShell>
      <motion.div
        key="reports"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        {/* Judul halaman */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Riwayat & analitik</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Laporan Sesi</h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Rekap hasil tiap permainan yang Anda host — direkam otomatis di perangkat ini saat permainan
              berakhir.
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1 font-display text-sm">
            {reports.length} laporan
          </Badge>
        </div>

        {/* Daftar laporan */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-foreground/15 px-6 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-secondary">
              <ChartColumn className="size-8 text-muted-foreground/50" />
            </span>
            <div className="max-w-sm space-y-1">
              <p className="font-display font-bold">Belum ada laporan</p>
              <p className="text-sm text-muted-foreground">
                Laporan muncul di sini setelah Anda mem-host permainan hingga selesai (minimal satu soal
                dimainkan).
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/host">
                <Play /> Host Kuis
              </Link>
            </Button>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {reports.map((r) => (
                  <ReportRow key={r.id} report={r} onDelete={setPendingDelete} />
                ))}
              </AnimatePresence>
            </div>
            <p className={cn("border-t border-border px-5 py-3 text-[11px] text-muted-foreground/70")}>
              Hanya 30 laporan terakhir yang disimpan di perangkat ini.
            </p>
          </section>
        )}
      </motion.div>

      {/* Konfirmasi hapus */}
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus laporan ini?</DialogTitle>
            <DialogDescription>
              Laporan sesi {pendingDelete?.pin} (“{pendingDelete?.quizTitle}”) akan dihapus permanen dari
              perangkat ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HostShell>
  );
}
