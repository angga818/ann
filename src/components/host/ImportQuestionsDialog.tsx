import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileUp,
  Loader2,
  Plus,
  TriangleAlert,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ACCEPTED_EXTENSIONS,
  ACCEPT_ATTR,
  extractQuestionsFromFile,
  MAX_FILE_MB,
  type ImportProgress,
} from "@/lib/import/loaders";
import { questionIsValid, type ParsedQuestion } from "@/lib/import/parse";
import { cn } from "@/lib/utils";

/** Alasan soal belum layak diimpor (untuk chip peringatan). */
function invalidReason(q: ParsedQuestion): string | null {
  const opts = q.options.slice(0, 4);
  if (!q.text.trim()) return "Teks soal kosong";
  if (opts.length < 2) return "Opsi kurang dari 2";
  if (opts.some((o) => !o.text.trim())) return "Ada teks opsi kosong";
  const c = opts.filter((o) => o.isCorrect).length;
  if (c === 0) return "Belum ada kunci jawaban";
  if (c > 1) return "Kunci jawaban lebih dari satu";
  return null;
}

type Phase = "idle" | "loading" | "preview";

const FORMAT_ICONS = [
  { icon: FileSpreadsheet, label: "Excel / CSV" },
  { icon: FileText, label: "Word / TXT" },
  { icon: FileType2, label: "PDF (+OCR)" },
];

/**
 * Dialog impor soal dari dokumen: pilih file → ekstraksi (dengan progress,
 * OCR untuk PDF scan bila perlu) → preview yang bisa diedit → tambahkan
 * soal valid ke editor. Soal yang bermasalah tetap tampil dengan chip
 * peringatan agar bisa diperbaiki langsung di preview.
 */
export function ImportQuestionsDialog({
  open,
  onOpenChange,
  onImport,
  remaining,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Menerima soal valid hasil preview. */
  onImport: (questions: ParsedQuestion[]) => void;
  /** Slot soal yang masih tersedia di editor (maks. 100). */
  remaining: number;
}) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState<ImportProgress | null>(null);
  const [questions, setQuestions] = React.useState<ParsedQuestion[]>([]);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Mulai sesi baru setiap kali dialog dibuka.
  React.useEffect(() => {
    if (open) {
      setPhase("idle");
      setProgress(null);
      setQuestions([]);
      setWarnings([]);
      setError(null);
      setDragOver(false);
    }
  }, [open]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPhase("loading");
    setProgress({ stage: "Membaca file…" });
    try {
      const result = await extractQuestionsFromFile(file, setProgress);
      setQuestions(result.questions);
      setWarnings(result.warnings);
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membaca file.");
      setPhase("idle");
    } finally {
      setProgress(null);
    }
  }

  /* ------------------------------ edit preview ------------------------------ */

  const patchQuestion = (i: number, patch: Partial<ParsedQuestion>) =>
    setQuestions((prev) => prev.map((q, qi) => (qi === i ? { ...q, ...patch } : q)));

  const patchOption = (qi: number, oi: number, patch: Partial<{ text: string; isCorrect: boolean }>) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : q,
      ),
    );

  /** Tandai tepat satu kunci jawaban (perilaku sama dengan editor soal). */
  const setCorrect = (qi: number, oi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) } : q,
      ),
    );

  const addOption = (qi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi && q.options.length < 4 ? { ...q, options: [...q.options, { text: "", isCorrect: false }] } : q)),
    );

  const removeOption = (qi: number, oi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q)),
    );

  const valid = questions.filter(questionIsValid);
  const importCount = Math.min(valid.length, Math.max(remaining, 0));

  function confirmImport() {
    onImport(valid.slice(0, Math.max(remaining, 0)));
    onOpenChange(false);
  }

  /* --------------------------------- render --------------------------------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impor Soal dari Dokumen</DialogTitle>
          <DialogDescription>
            Excel, Word, PDF, CSV, atau TXT — soal tampil di preview dan bisa diedit sebelum masuk ke
            kuis.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {/* ------------------------------ pemilihan file ------------------------------ */}
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
                  dragOver
                    ? "border-primary bg-primary-soft"
                    : "border-foreground/15 bg-foreground/[0.02] hover:border-primary/40",
                )}
              >
                <motion.span
                  animate={dragOver ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                  className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
                >
                  <FileUp className="size-7" />
                </motion.span>
                <span className="text-sm font-semibold">
                  {dragOver ? "Lepaskan file di sini" : "Klik untuk memilih atau jatuhkan file di sini"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ACCEPTED_EXTENSIONS.join(", ")} · maksimal {MAX_FILE_MB} MB
                </span>
              </button>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {FORMAT_ICONS.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    <f.icon className="size-3.5 text-primary" /> {f.label}
                  </span>
                ))}
              </div>

              <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
                Format teks bebas didukung: soal bernomor (“1.” atau “Soal 1:”), opsi “A.”, “a)”, “1.”,
                atau “-”, kunci jawaban via baris “Kunci: B”, tanda “*” di depan opsi, atau akhiran
                “(benar)”.
              </p>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden rounded-xl border border-destructive/30 bg-coral-soft px-4 py-3 text-sm font-medium text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ---------------------------------- loading --------------------------------- */}
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-14 text-center"
            >
              <Loader2 className="size-8 animate-spin text-primary" />
              <div>
                <p className="text-sm font-semibold">{progress?.stage ?? "Memproses…"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  File besar dan PDF hasil scan bisa memakan waktu beberapa menit.
                </p>
              </div>
              {typeof progress?.pct === "number" && (
                <div className="h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${progress.pct}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* ---------------------------------- preview ---------------------------------- */}
          {phase === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {questions.length} soal terdeteksi ·{" "}
                  <span className={valid.length > 0 ? "text-success" : "text-destructive"}>
                    {valid.length} valid
                  </span>
                </p>
                <Button variant="ghost" size="sm" onClick={() => setPhase("idle")}>
                  <FileUp /> Impor file lain
                </Button>
              </div>

              {warnings.length > 0 && (
                <div className="mb-4 space-y-1.5 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3">
                  {warnings.slice(0, 3).map((w, i) => (
                    <p key={i} className="flex items-start gap-2 text-xs font-medium text-warning">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {w}
                    </p>
                  ))}
                  {warnings.length > 3 && (
                    <p className="text-xs text-warning/70">+{warnings.length - 3} catatan lain…</p>
                  )}
                </div>
              )}

              <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
                {questions.map((q, qi) => {
                  const reason = invalidReason(q);
                  return (
                    <motion.div
                      key={qi}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className={cn(
                        "rounded-2xl border p-4",
                        reason ? "border-warning/30 bg-warning/[0.04]" : "border-border bg-background",
                      )}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary font-display text-xs font-bold text-primary">
                          {qi + 1}
                        </span>
                        {reason && (
                          <span className="truncate rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                            {reason}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="iconSm"
                          className="ml-auto text-muted-foreground/60 hover:text-destructive"
                          title="Hapus soal ini"
                          onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <Textarea
                        value={q.text}
                        maxLength={2000}
                        rows={2}
                        placeholder="Teks soal…"
                        onChange={(e) => patchQuestion(qi, { text: e.target.value })}
                        className="mb-3 text-sm"
                      />

                      <div className="space-y-2">
                        {q.options.slice(0, 4).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button
                              type="button"
                              title="Tandai sebagai jawaban benar"
                              onClick={() => setCorrect(qi, oi)}
                              className={cn(
                                "grid size-7 shrink-0 place-items-center rounded-lg border transition-colors",
                                opt.isCorrect
                                  ? "border-success/60 bg-success/15 text-success"
                                  : "border-border text-muted-foreground/50 hover:border-foreground/30 hover:text-muted-foreground",
                              )}
                            >
                              <Check className="size-4" strokeWidth={3} />
                            </button>
                            <Input
                              value={opt.text}
                              maxLength={500}
                              placeholder={`Opsi ${oi + 1}`}
                              onChange={(e) => patchOption(qi, oi, { text: e.target.value })}
                              className="h-9 flex-1 text-sm"
                            />
                            <button
                              type="button"
                              title="Hapus opsi"
                              onClick={() => removeOption(qi, oi)}
                              className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground/50 transition-colors hover:text-destructive"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        {q.options.length > 4 && (
                          <p className="text-[11px] text-muted-foreground/70">
                            {q.options.length - 4} opsi lainnya diabaikan (maksimal 4).
                          </p>
                        )}
                        {q.options.length < 4 && (
                          <Button variant="ghost" size="sm" onClick={() => addOption(qi)}>
                            <Plus /> Opsi
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          {phase === "preview" && (
            <Button onClick={confirmImport} disabled={importCount === 0}>
              {importCount === 0 ? (
                "Tidak ada soal valid"
              ) : remaining <= 0 ? (
                "Kuis sudah penuh (100 soal)"
              ) : (
                <>
                  <Plus /> Tambahkan {importCount} Soal
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
