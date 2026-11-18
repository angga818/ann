import * as React from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Dices,
  FileUp,
  Gamepad2,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  Trophy,
  Upload,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiErrorMessage, createQuiz, getQuiz, updateQuiz, uploadImage } from "@/lib/api";
import { CHARACTERS, DEFAULT_SNAKES_CONFIG, MAP_THEMES } from "@/lib/snakes";
import { loadQuizGameMeta, saveQuizGameMeta } from "@/lib/snakes-meta";
import type {
  CharacterId,
  GameMode,
  MapThemeId,
  QuestionMode,
  QuizQuestionInput,
  SnakesGameConfig,
} from "@/types";
import { Logo } from "@/components/Logo";
import { PageTransition } from "@/components/common";
import { SmartImage } from "@/components/SmartImage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input, } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";
import { ImportQuestionsDialog } from "@/components/host/ImportQuestionsDialog";
import type { ParsedQuestion } from "@/lib/import/parse";
import { pushActivity } from "@/lib/storage";
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
          <SmartImage url={value || null} alt={label} className="h-24 w-40 shrink-0 border border-border" />
          {progress !== null && (
            <div className="absolute inset-0 flex items-end rounded-xl bg-black/60 p-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-primary transition-all"
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
    <motion.div layout className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <GripVertical className="size-5 shrink-0 cursor-grab text-muted-foreground/40 active:cursor-grabbing" />
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary font-display text-sm font-bold text-primary">
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
                    className="rounded-xl border border-border bg-foreground/[0.02] p-2.5"
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
                                active ? "scale-110 ring-2 ring-foreground/70" : "opacity-50 hover:opacity-90 hover:scale-105",
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
                          "ml-auto grid size-7 place-items-center rounded-lg border transition-colors",
                          opt.is_correct
                            ? "border-success/60 bg-success/15 text-success"
                            : "border-border text-muted-foreground/50 hover:border-foreground/30 hover:text-muted-foreground",
                        )}
                      >
                        <Check className="size-4" strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        title="Hapus opsi"
                        onClick={() => onChange({ options: q.options.filter((o) => o.key !== opt.key) })}
                        className="grid size-7 place-items-center rounded-lg text-muted-foreground/50 transition-colors hover:text-destructive"
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

/* -------------------- langkah 1: pilih mode permainan ------------------- */

function ModeSelection({ onSelect }: { onSelect: (mode: GameMode) => void }) {
  const cards = [
    {
      mode: "QUIZ" as GameMode,
      icon: Gamepad2,
      title: "QuizLive",
      subtitle: "Seperti Kahoot",
      description:
        "Kuis multiplayer klasik. Semua pemain menjawab soal yang sama secara bersamaan, lalu lihat papan peringkat.",
      points: ["Jawab serentak", "Countdown & poin", "Podium real-time"],
      accent: "text-primary",
      tint: "bg-primary-soft",
    },
    {
      mode: "SNAKES_AND_LADDERS" as GameMode,
      icon: Dices,
      title: "Ular Tangga",
      subtitle: "Edukasi bergiliran",
      description:
        "Lempar dadu, jawab soal sesuai tingkat kesulitan, lalu gerakkan karakter di papan ular tangga 100 kotak.",
      points: ["Dadu 1–6 = level soal", "5 tema papan & 3 karakter", "Tangga naik, ular turun"],
      accent: "text-accent",
      tint: "bg-accent-soft",
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/host" title="Kembali">
                <ArrowLeft />
              </Link>
            </Button>
            <Logo compact />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <PageTransition className="max-w-5xl">
        <div className="mb-9 text-center">
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="size-7" />
          </motion.span>
          <h1 className="font-display text-3xl font-bold tracking-tight">Buat Kuis Baru</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Pilih dulu mode permainannya. Setelah itu Anda akan diatur halaman pengisian soal untuk mode tersebut.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-primary">
            <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">1</span>
            Pilih Mode
            <span className="h-px w-8 bg-border" />
            <span className="grid size-6 place-items-center rounded-full bg-secondary text-muted-foreground">2</span>
            Isi Soal
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {cards.map((c, i) => (
            <motion.button
              key={c.mode}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 22 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(c.mode)}
              className="group flex flex-col rounded-3xl border border-border bg-card p-7 text-left shadow-sm transition-colors hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <span className={cn("grid size-14 place-items-center rounded-2xl", c.tint, c.accent)}>
                  <c.icon className="size-7" />
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-muted-foreground">
                  {c.subtitle}
                </span>
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold">{c.title}</h2>
              <p className="mt-2 min-h-16 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
              <ul className="mt-4 space-y-2 border-t border-border pt-4">
                {c.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Check className={cn("size-3.5", c.accent)} strokeWidth={3} /> {p}
                  </li>
                ))}
              </ul>
              <span className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">
                Pilih mode ini <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </span>
            </motion.button>
          ))}
        </div>
      </PageTransition>
    </div>
  );
}

/* --------------- langkah 2a: konfigurasi khusus Ular Tangga ------------- */

function SnakesConfigPanel({
  config,
  onChange,
  quizId,
}: {
  config: SnakesGameConfig;
  onChange: (patch: Partial<SnakesGameConfig>) => void;
  quizId?: string;
}) {
  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold">
          <Settings2 className="size-4 text-accent" /> Konfigurasi Ular Tangga
        </h3>
        {quizId && (
          <Button asChild variant="soft" size="sm">
            <Link to={`/host/snakes/${quizId}`}>
              <Dices /> Buka Papan Game
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {/* Tema papan */}
        <div className="space-y-2">
          <Label>Tema Papan (Map) *</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {MAP_THEMES.map((m) => {
              const active = config.map_id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={m.description}
                  onClick={() => onChange({ map_id: m.id as MapThemeId })}
                  className={cn(
                    "overflow-hidden rounded-xl border-2 text-left transition-all",
                    active ? "border-primary shadow-sm" : "border-border hover:border-foreground/25",
                  )}
                >
                  <div className="relative aspect-[2400/1792] w-full bg-secondary">
                    <img src={m.asset} alt={`Papan ${m.name}`} className="size-full object-fill" draggable={false} />
                    {active && (
                      <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" strokeWidth={3.5} />
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-2">
                    <p className="truncate text-[11px] font-bold">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">Map {m.id}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Mode pertanyaan */}
          <div className="space-y-2">
            <Label>Mode Pertanyaan</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["CUSTOM", "RANDOM"] as QuestionMode[]).map((qm) => (
                <button
                  key={qm}
                  type="button"
                  onClick={() => onChange({ question_mode: qm })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors",
                    config.question_mode === qm
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {qm === "CUSTOM" ? "Custom (soal ini)" : "Random (dari bank)"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Mode Random mengambil soal secara acak dari kumpulan soal yang Anda buat.
            </p>
          </div>

          {/* Karakter host */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Karakter Anda (seluruh badan)</Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {CHARACTERS.map((c) => {
                const active = (config.character_id ?? 1) === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={`Pilih ${c.name}`}
                    onClick={() => onChange({ character_id: c.id as CharacterId })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all",
                      active
                        ? "border-primary bg-primary-soft shadow-sm"
                        : "border-border hover:-translate-y-0.5 hover:border-foreground/25",
                    )}
                  >
                    <img
                      src={c.asset}
                      alt={c.name}
                      className="h-20 w-full object-contain object-bottom"
                      draggable={false}
                    />
                    <span className="text-[10px] font-bold">{c.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Gunakan gambar karakter 1–7 milik Anda — ditampilkan utuh dengan badan, bukan foto profil.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Batas Waktu Jawab (detik)</Label>
            <Input
              type="number"
              min={5}
              max={120}
              value={config.answer_time_limit}
              onChange={(e) => onChange({ answer_time_limit: Number(e.target.value) || 20 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Batas Pemain</Label>
            <Input
              type="number"
              min={2}
              max={20}
              value={config.max_players}
              onChange={(e) => onChange({ max_players: Number(e.target.value) || 4 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Durasi Game (menit, opsional)</Label>
            <Input
              type="number"
              min={0}
              max={120}
              value={config.game_duration_minutes ?? 0}
              onChange={(e) =>
                onChange({ game_duration_minutes: Number(e.target.value) || undefined })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- halaman ------------------------------- */

export default function QuizEditorPage() {
  const { quizId } = useParams<{ quizId?: string }>();
  const isEdit = !!quizId;
  const navigate = useNavigate();
  const { toast } = useToast();

  // null = pengguna belum memilih mode (langkah pertama "Buat Kuis").
  const [mode, setMode] = React.useState<GameMode | null>(isEdit ? "QUIZ" : null);
  const [snakesConfig, setSnakesConfig] = React.useState<SnakesGameConfig>({
    ...DEFAULT_SNAKES_CONFIG,
  });

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [cover, setCover] = React.useState("");
  const [questions, setQuestions] = React.useState<FormQuestion[]>([]);
  const [issues, setIssues] = React.useState<ValidationIssue[]>([]);
  const [loading, setLoading] = React.useState(isEdit);
  const [saving, setSaving] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  /** Soal hasil impor (sudah tervalidasi dialog) → bentuk form editor. */
  function handleImportParsed(parsed: ParsedQuestion[]) {
    const slots = Math.max(0, 100 - questions.length);
    const take = parsed.slice(0, slots);
    if (take.length === 0) {
      toast("warning", "Tidak ada slot soal", "Kuis sudah berisi 100 soal.");
      return;
    }
    const added: FormQuestion[] = take.map((q) => {
      const options = q.options.slice(0, 4);
      const firstCorrect = Math.max(
        0,
        options.findIndex((o) => o.isCorrect),
      );
      return {
        key: nextKey(),
        question_text: q.text.trim(),
        image_url: "",
        time_limit_sec: 20,
        points_multiplier: 1000,
        options: options.map((o, i) => ({
          key: nextKey(),
          option_text: o.text.trim(),
          is_correct: i === firstCorrect,
          color_index: i,
        })),
      };
    });
    setQuestions((prev) => [...prev, ...added]);
    setIssues([]); // perbaiki masalah lama: daftar masalah akan dihitung ulang saat simpan
    toast(
      "success",
      `${added.length} soal diimpor`,
      parsed.length > take.length
        ? `${parsed.length - take.length} soal lain tidak dimuat (batas 100).`
        : "Periksa detail tiap soal sebelum menyimpan.",
    );
  }

  React.useEffect(() => {
    if (!quizId) return;
    let alive = true;
    (async () => {
      try {
        const quiz = await getQuiz(quizId);
        if (!alive) return;
        const meta = loadQuizGameMeta(quizId);
        setMode(meta?.game_mode ?? "QUIZ");
        if (meta?.config) setSnakesConfig(meta.config);
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
      const finalMode: GameMode = mode ?? "QUIZ";
      if (isEdit) {
        await updateQuiz(quizId!, payload);
        saveQuizGameMeta(quizId!, { game_mode: finalMode, config: snakesConfig });
        pushActivity({
          type: "quiz-updated",
          label: `Memperbarui kuis “${payload.title}”`,
          detail: `${payload.questions.length} soal`,
        });
        toast("success", "Kuis tersimpan", "Perubahan telah disimpan.");
      } else {
        const created = await createQuiz(payload);
        saveQuizGameMeta(created.id, { game_mode: finalMode, config: snakesConfig });
        pushActivity({
          type: "quiz-created",
          label: `Membuat kuis “${created.title}”`,
          detail: `${payload.questions.length} soal`,
        });
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
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Langkah pertama: pengguna belum memilih mode → tampilkan hanya pilihan mode.
  if (mode === null) return <ModeSelection onSelect={setMode} />;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/host" title="Kembali">
                <ArrowLeft />
              </Link>
            </Button>
            <Logo compact />
            <span className="hidden font-display text-sm font-bold text-muted-foreground sm:block">
              {isEdit ? "Edit Kuis" : "Kuis Baru"} · {mode === "QUIZ" ? "QuizLive" : "Ular Tangga"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant="secondary">{questions.length} soal</Badge>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {isEdit ? "Simpan" : "Buat"}
            </Button>
          </div>
        </div>
      </header>

      <PageTransition className="max-w-5xl">
        {/* Mode yang dipilih + konfigurasi khusus Ular Tangga */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-xl",
                  mode === "QUIZ" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent",
                )}
              >
                {mode === "QUIZ" ? <Gamepad2 className="size-5" /> : <Dices className="size-5" />}
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Mode permainan · langkah 1 dari 2
                </p>
                <p className="font-display text-base font-bold">
                  {mode === "QUIZ" ? "QuizLive (seperti Kahoot)" : "Ular Tangga Edukasi"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
              <RotateCcw /> Ganti Mode
            </Button>
          </div>

          {mode === "SNAKES_AND_LADDERS" && (
            <SnakesConfigPanel
              config={snakesConfig}
              onChange={(patch) => setSnakesConfig((prev) => ({ ...prev, ...patch }))}
              quizId={quizId}
            />
          )}
        </section>

        {/* Ringkasan masalah validasi */}
        <AnimatePresence>
          {issues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden rounded-xl border border-warning/25 bg-warning/10"
            >
              <div className="p-4">
                <p className="mb-1 text-sm font-semibold text-warning">Perlu perbaikan sebelum disimpan:</p>
                <ul className="ml-4 list-disc space-y-0.5 text-xs text-warning/90">
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
        <section className="mb-6 rounded-2xl border border-border bg-card p-6">
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Pertanyaan</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={questions.length >= 100}
              onClick={() => setImportOpen(true)}
            >
              <FileUp /> Impor Dokumen
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={questions.length >= 100}
              onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
            >
              <Plus /> Tambah Soal
            </Button>
          </div>
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
            className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.02] px-6 py-14 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ImagePlus className="size-8 opacity-50" />
            <span className="text-sm font-semibold">Belum ada pertanyaan — klik untuk menambah</span>
          </button>
        )}
      </PageTransition>

      {/* Dialog impor soal dari dokumen (Excel/Word/PDF/CSV/TXT) */}
      <ImportQuestionsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImportParsed}
        remaining={100 - questions.length}
      />
    </div>
  );
}
