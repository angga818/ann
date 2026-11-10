import * as React from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiErrorMessage, createQuiz, getQuiz, updateQuiz, uploadImage } from "@/lib/api";
import type { QuizQuestionInput } from "@/types";
import { Logo } from "@/components/Logo";
import { PageTransition } from "@/components/common";
import { SmartImage } from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import { Input, } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";
import { OPTION_STYLES, optionStyle } from "@/lib/option-colors";
import { cn } from "@/lib/utils";

/* ------------------------- tipe form internal ------------------------- */

interface FormOption {
  key: string;
  option_text: string;
  is_correct: boolean;
  color_index: number;
}

interface FormQuestion {
  key: string;
  question_text: string;
  image_url: string;
  time_limit_sec: number;
  points_multiplier: number;
  options: FormOption[];
}

let uid = 0;
const nextKey = () => `k${++uid}`;

function emptyOption(colorIndex: number): FormOption {
  return { key: nextKey(), option_text: "", is_correct: false, color_index: colorIndex };
}

function emptyQuestion(): FormQuestion {
  return {
    key: nextKey(),
    question_text: "",
    image_url: "",
    time_limit_sec: 20,
    points_multiplier: 1000,
    options: [0, 1, 2, 3].slice(0, 4).map(emptyOption).map((o, i) => ({ ...o, color_index: i })),
  };
}

/* ----------------------------- validasi ------------------------------- */

interface ValidationIssue {
  questionIndex?: number;
  message: string;
}

function validate(
  title: string,
  questions: FormQuestion[],
): { ok: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  if (title.trim().length < 1 || title.trim().length > 150) {
    issues.push({ message: "Judul kuis wajib 1–150 karakter." });
  }
  if (questions.length < 1 || questions.length > 100) {
    issues.push({ message: "Jumlah pertanyaan harus 1–100." });
  }
  questions.forEach((q, qi) => {
    if (!q.question_text.trim()) issues.push({ questionIndex: qi, message: "Teks soal wajib diisi (maks. 2000 karakter)." });
    if (q.time_limit_sec < 5 || q.time_limit_sec > 300)
      issues.push({ questionIndex: qi, message: "Batas waktu harus 5–300 detik." });
    if (q.points_multiplier < 100 || q.points_multiplier > 5000)
      issues.push({ questionIndex: qi, message: "Pengali poin harus 100–5000." });
    if (q.options.length < 2 || q.options.length > 4)
      issues.push({ questionIndex: qi, message: "Setiap soal punya 2–4 opsi." });
    const correct = q.options.filter((o) => o.is_correct).length;
    if (correct !== 1)
      issues.push({ questionIndex: qi, message: "Pilih tepat satu jawaban benar." });
    const colors = new Set<number>();
    q.options.forEach((o) => {
      if (!o.option_text.trim())
        issues.push({ questionIndex: qi, message: "Teks opsi wajib diisi (maks. 500 karakter)." });
      if (colors.has(o.color_index))
        issues.push({ questionIndex: qi, message: `Warna opsi duplikat (${optionStyle(o.color_index).name}).` });
      colors.add(o.color_index);
    });
  });
  return { ok: issues.length === 0, issues };
}

/* -------------------------- upload gambar ------------------------------ */

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const { toast } = useToast();
  const [progress, setProgress] = React.useState<number | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast("error", "File terlalu besar", "Ukuran maksimum 5 MB.");
      return;
    }
    setProgress(0);
    try {
      const res = await uploadImage(file, label.includes("Cover") ? "quiz-cover" : "question", setProgress);
      onChange(res.url);
      toast("success", "Gambar terunggah");
    } catch (e) {
      toast("error", "Upload gagal", apiErrorMessage(e));
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative">
          <SmartImage url={value || null} alt={label} className="h-24 w-40 shrink-0 border border-white/10" />
          {progress !== null && (
            <div className="absolute inset-0 flex items-end rounded-xl bg-black/60 p-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex min-w-52 flex-1 flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={progress !== null}
              onClick={() => fileRef.current?.click()}
            >
              {progress !== null ? <Loader2 className="animate-spin" /> : <Upload />}
              {progress !== null ? `${progress}%` : "Upload"}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
                <Trash2 /> Hapus
              </Button>
            )}
          </div>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="atau tempel URL gambar…"
            className="h-9 text-xs"
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            JPEG/PNG/WebP, maks. 5 MB. Kolom URL juga menerima gambar eksternal.
          </p>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- kartu soal -------------------------------- */

function QuestionCard({
  q,
  index,
  total,
  onChange,
  onDelete,
}: {
  q: FormQuestion;
  index: number;
  total: number;
  onChange: (patch: Partial<FormQuestion>) => void;
  onDelete: () => void;
}) {
  const usedColors = new Set(q.options.map((o) => o.color_index));

  return (
    <motion.div layout className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="mb-4 flex items-center gap-3">
        <GripVertical className="size-5 shrink-0 cursor-grab text-muted-foreground/40 active:cursor-grabbing" />
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 font-display text-sm font-bold text-violet-200">
          {index + 1}
        </span>
        <Badge variant="outline" className="ml-auto">
          {total} total
        </Badge>
        <Button variant="outlineDestructive" size="iconSm" onClick={onDelete} title="Hapus soal">
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Teks pertanyaan *</Label>
          <Textarea
            value={q.question_text}
            maxLength={2000}
            onChange={(e) => onChange({ question_text: e.target.value })}
            placeholder="Tulis pertanyaan Anda di sini…"
          />
        </div>

        <ImageField label="Gambar soal (opsional)" value={q.image_url} onChange={(url) => onChange({ image_url: url })} />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Batas waktu (detik)</Label>
            <Input
              type="number"
              min={5}
              max={300}
              value={q.time_limit_sec}
              onChange={(e) => onChange({ time_limit_sec: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Pengali poin</Label>
            <Input
              type="number"
              min={100}
              max={5000}
              step={100}
              value={q.points_multiplier}
              onChange={(e) => onChange({ points_multiplier: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Opsi jawaban (2–4) *</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={q.options.length >= 4}
                onClick={() => {
                  const free = [0, 1, 2, 3].find((c) => !usedColors.has(c)) ?? q.options.length;
                  onChange({ options: [...q.options, emptyOption(free)] });
                }}
              >
                <Plus /> Opsi
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {q.options.map((opt, oi) => {
                const st = optionStyle(opt.color_index);
                const freeColors = [0, 1, 2, 3].filter(
                  (c) => c === opt.color_index || !usedColors.has(c),
                );
                return (
                  <motion.div
                    key={opt.key}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {/* pilihan warna */}
                      <div className="flex items-center gap-1">
                        {freeColors.map((c) => {
                          const cst = optionStyle(c);
                          const active = c === opt.color_index;
                          return (
                            <button
                              key={c}
                              type="button"
                              title={`Warna ${cst.name}`}
                              onClick={() =>
                                onChange({
                                  options: q.options.map((o) => (o.key === opt.key ? { ...o, color_index: c } : o)),
                                })
                              }
                              className={cn(
                                "size-5 rounded-md transition-transform",
                                cst.base,
                                active ? "scale-110 ring-2 ring-white/70" : "opacity-50 hover:opacity-90 hover:scale-105",
                              )}
                            />
                          );
                        })}
                      </div>
                      {/* tandai benar */}
                      <button
                        type="button"
                        title="Tandai sebagai jawaban benar"
                        onClick={() =>
                          onChange({
                            options: q.options.map((o) => ({
                              ...o,
                              is_correct: o.key === opt.key ? !o.is_correct : false,
                            })),
                          })
                        }
                        className={cn(
                          "ml-auto grid size-7 place-items-center rounded-lg border transition-all",
                          opt.is_correct
                            ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
                            : "border-white/10 text-muted-foreground/40 hover:border-white/25 hover:text-muted-foreground",
                        )}
                      >
                        <Check className="size-4" strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        title="Hapus opsi"
                        onClick={() => onChange({ options: q.options.filter((o) => o.key !== opt.key) })}
                        className="grid size-7 place-items-center rounded-lg text-muted-foreground/40 transition-colors hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <input
                      value={opt.option_text}
                      maxLength={500}
                      onChange={(e) =>
                        onChange({
                          options: q.options.map((o) =>
                            o.key === opt.key ? { ...o, option_text: e.target.value } : o,
                          ),
                        })
                      }
                      placeholder={`Opsi ${oi + 1}${opt.is_correct ? " (benar)" : ""}`}
                      className="mt-2 w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Klik ikon <Check className="inline size-3" strokeWidth={3} /> pada opsi untuk menandai jawaban benar (wajib
            tepat satu).
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------- halaman ------------------------------- */

export default function QuizEditorPage() {
  const { quizId } = useParams<{ quizId?: string }>();
  const isEdit = !!quizId;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [cover, setCover] = React.useState("");
  const [questions, setQuestions] = React.useState<FormQuestion[]>([]);
  const [issues, setIssues] = React.useState<ValidationIssue[]>([]);
  const [loading, setLoading] = React.useState(isEdit);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!quizId) return;
    let alive = true;
    (async () => {
      try {
        const quiz = await getQuiz(quizId);
        if (!alive) return;
        setTitle(quiz.title);
        setDescription(quiz.description ?? "");
        setCover(quiz.cover_image_url ?? "");
        setQuestions(
          [...quiz.questions]
            .sort((a, b) => a.order_index - b.order_index)
            .map((q) => ({
              key: nextKey(),
              question_text: q.question_text,
              image_url: q.image_url ?? "",
              time_limit_sec: q.time_limit_sec || 20,
              points_multiplier: q.points_multiplier || 1000,
              options: [...q.options]
                .sort((a, b) => a.order_index - b.order_index)
                .map((o) => ({
                  key: nextKey(),
                  option_text: o.option_text,
                  is_correct: o.is_correct,
                  color_index: o.color_index,
                })),
            })),
        );
      } catch (e) {
        if (alive) toast("error", "Gagal memuat kuis", apiErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [quizId, toast]);

  async function handleSave() {
    const v = validate(title, questions);
    setIssues(v.issues);
    if (!v.ok) {
      toast("warning", "Belum bisa disimpan", v.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        cover_image_url: cover.trim() || undefined,
        questions: questions.map<QuizQuestionInput>((q) => ({
          question_text: q.question_text.trim(),
          image_url: q.image_url.trim() || undefined,
          time_limit_sec: q.time_limit_sec || 20,
          points_multiplier: q.points_multiplier || 1000,
          options: q.options.map((o) => ({
            option_text: o.option_text.trim(),
            is_correct: o.is_correct,
            color_index: o.color_index,
          })),
        })),
      };
      if (isEdit) {
        await updateQuiz(quizId!, payload);
        toast("success", "Kuis tersimpan", "Perubahan telah disimpan.");
      } else {
        const created = await createQuiz(payload);
        toast("success", "Kuis dibuat", `“${created.title}” siap digunakan.`);
        navigate(`/host/quiz/${created.id}`, { replace: true });
      }
    } catch (e) {
      toast("error", "Gagal menyimpan", apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/host" title="Kembali">
                <ArrowLeft />
              </Link>
            </Button>
            <Logo compact />
            <span className="hidden font-display text-sm font-bold text-muted-foreground sm:block">
              {isEdit ? "Edit Kuis" : "Kuis Baru"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{questions.length} soal</Badge>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {isEdit ? "Simpan" : "Buat"}
            </Button>
          </div>
        </div>
      </header>

      <PageTransition className="max-w-5xl">
        {/* Ringkasan masalah validasi */}
        <AnimatePresence>
          {issues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden rounded-xl border border-amber-500/25 bg-amber-500/5"
            >
              <div className="p-4">
                <p className="mb-1 text-sm font-semibold text-amber-300">Perlu perbaikan sebelum disimpan:</p>
                <ul className="ml-4 list-disc space-y-0.5 text-xs text-amber-200/80">
                  {issues.slice(0, 6).map((it, i) => (
                    <li key={i}>
                      {it.questionIndex !== undefined && `Soal ${it.questionIndex + 1}: `}
                      {it.message}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail kuis */}
        <section className="mb-6 rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="mb-5 font-display text-lg font-bold">Detail Kuis</h2>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Judul *</Label>
                <Input
                  value={title}
                  maxLength={150}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="mis. Pengetahuan Umum Kelas Dunia"
                  className="font-display text-base font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat kuis (opsional)"
                  className="min-h-[72px]"
                />
              </div>
            </div>
            <div className="w-full lg:w-72">
              <ImageField label="Cover" value={cover} onChange={setCover} />
            </div>
          </div>
        </section>

        {/* Daftar soal */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Pertanyaan</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={questions.length >= 100}
            onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
          >
            <Plus /> Tambah Soal
          </Button>
        </div>

        <Reorder.Group
          axis="y"
          values={questions}
          onReorder={setQuestions}
          className="space-y-4 pb-8"
          layoutScroll
        >
          {questions.map((q, i) => (
            <Reorder.Item key={q.key} value={q} className="list-none">
              <QuestionCard
                q={q}
                index={i}
                total={questions.length}
                onChange={(patch) =>
                  setQuestions((prev) => prev.map((x) => (x.key === q.key ? { ...x, ...patch } : x)))
                }
                onDelete={() => setQuestions((prev) => prev.filter((x) => x.key !== q.key))}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {questions.length === 0 && (
          <button
            onClick={() => setQuestions([emptyQuestion()])}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-muted-foreground transition-colors hover:border-violet-400/40 hover:text-foreground"
          >
            <ImagePlus className="size-8 opacity-50" />
            <span className="text-sm font-semibold">Belum ada pertanyaan — klik untuk menambah</span>
          </button>
        )}
      </PageTransition>
    </div>
  );
}
