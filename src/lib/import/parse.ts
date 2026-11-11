/**
 * Parser soal dari teks bebas (TXT, DOCX, PDF, dan baris spreadsheet).
 *
 * Mendeteksi penomoran soal (`1.` / `1)` / `Soal 1:`), opsi (`A.` / `a)` /
 * `(A)` / `1.` / `-` / `*` / `•`), dan kunci jawaban (`*` di depan opsi,
 * `(benar)` di belakang opsi, atau baris terpisah `Kunci: B` / `Jawaban: 2`).
 * Hasil selalu berupa data mentah yang bisa diedit — pengguna memeriksa dan
 * memperbaiki di preview sebelum soal masuk ke editor.
 *
 * Parser ini murni frontend dan tidak menyentuh kontrak API.
 */

export interface ParsedOption {
  text: string;
  isCorrect: boolean;
}

export interface ParsedQuestion {
  text: string;
  options: ParsedOption[];
  /** Diisi bila parser tidak yakin (mis. kunci tidak ditemukan). */
  warning?: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  /** Catatan global (format/struktur yang dilewati). */
  warnings: string[];
}

/** Soal layak diimpor: teks + 2–4 opsi terisi + tepat satu kunci. */
export function questionIsValid(q: ParsedQuestion): boolean {
  const opts = q.options.slice(0, 4);
  return (
    q.text.trim().length > 0 &&
    opts.length >= 2 &&
    opts.every((o) => o.text.trim().length > 0) &&
    opts.filter((o) => o.isCorrect).length === 1
  );
}

/* ------------------------------ pola baris ------------------------------ */

// Nomor soal: "1. x", "1) x", "12: x", "Soal 3 - x", "Pertanyaan 5: x", "Q7. x"
const RE_QUESTION_NUM = /^\s*(\d{1,3})\s*[.):\-]\s*(.*)$/;
const RE_QUESTION_WORD = /^\s*(?:soal|pertanyaan|question|q)\s*[#\-]?\s*(\d{1,3})\s*[.):\-]?\s*(.*)$/i;
// Opsi huruf: "A. x", "b) x", "d: x", "C - x" — delimiter WAJIB agar kalimat
// seperti "A boy walked" tidak salah dibaca opsi.
const RE_OPTION_LETTER = /^\s*\(?([a-hA-H])\)?\s*[.):\-]\s*(.+)$/;
// Opsi bullet: "- x", "* x" (bintang juga penanda benar), "• x" — ditangani inline.
// Kunci: "Kunci: B", "Jawaban: 2", "Jawaban benar: Jakarta", "Answer: C".
const RE_KEY_LINE = /^\s*(?:kunci(?:\s*jawaban)?|jawaban(?:\s+benar)?|answer(?:\s+key)?|key)\s*[:.\-)]\s*(.*)$/i;
// Penanda benar di akhir teks opsi: "Jakarta (benar)", "Bandung [benar]".
const RE_CORRECT_SUFFIX = /[({\[]\s*(benar|bener|correct|v|✓)\s*[)}\]]\s*$/i;

const isLetter = (c: string) => /^[a-hA-H]$/.test(c);
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Ubah nilai kunci ("B", "b)", "2", "B. Jakarta", "Jakarta") → indeks opsi. */
function resolveKeyIndex(value: string, optionCount: number): number {
  const v = value.trim();
  if (!v) return -1;

  // Bentuk "B. Jakarta" / "2. Medan" → ambil segmen pertama.
  const first = v.split(/[.):\s]/)[0]?.trim() ?? "";
  if (first && isLetter(first)) {
    const idx = first.toUpperCase().charCodeAt(0) - 65;
    return idx >= 0 && idx < optionCount ? idx : -1;
  }
  if (/^\d{1,2}$/.test(first)) {
    const n = Number(first);
    return n >= 1 && n <= optionCount ? n - 1 : -1;
  }
  // Teks persis sama dengan salah satu opsi (dicocokkan pemanggil).
  return -2; // sinyal: coba cocokkan teks
}

/* ------------------------------ parser teks ----------------------------- */

export function parseQuestionsText(raw: string): ParseResult {
  const warnings: string[] = [];
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");

  const questions: ParsedQuestion[] = [];
  let cur: { text: string[]; options: ParsedOption[]; lastOptNum: number } | null = null;
  let lastQuestionNum = 0; // nomor soal terakhir yang terlihat

  const finalize = () => {
    if (!cur) return;
    const text = clean(cur.text.join(" "));
    const options = cur.options
      .map((o) => ({ ...o, text: clean(o.text) }))
      .filter((o) => o.text.length > 0 || o.isCorrect);
    const q: ParsedQuestion = { text, options };
    if (!text) {
      return; // soal kosong — buang diam-diam (kemungkinan header dokumen)
    }
    if (options.length > 4) {
      q.warning = "Lebih dari 4 opsi — hanya 4 pertama yang diimpor.";
      q.options = options.slice(0, 4);
    } else q.options = options;
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (q.options.length < 2) q.warning = q.warning ?? "Opsi kurang dari 2 — tambahkan opsi atau hapus soal ini.";
    else if (correct === 0) q.warning = q.warning ?? "Kunci jawaban tidak terdeteksi — tandai jawaban benar.";
    else if (correct > 1) q.warning = q.warning ?? "Beberapa opsi ditandai benar — biarkan tepat satu.";
    questions.push(q);
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // ---- baris kunci jawaban (harus dicek sebelum pola lain) ----
    const mKey = t.match(RE_KEY_LINE);
    if (mKey && cur) {
      const value = mKey[1];
      // "benar" tanpa nilai → sudah ditangani penanda inline; abaikan.
      let idx = resolveKeyIndex(value, cur.options.length);
      if (idx === -2) {
        const want = clean(value).toLowerCase();
        idx = cur.options.findIndex((o) => clean(o.text).toLowerCase() === want || o.text.toLowerCase().startsWith(want));
      }
      if (idx >= 0 && !cur.options.some((o) => o.isCorrect)) {
        cur.options[idx] = { ...cur.options[idx], isCorrect: true };
      } else if (idx >= 0) {
        warnings.push(`Baris “${t.slice(0, 40)}…” mengabaikan kunci tambahan (sudah ada opsi benar).`);
      }
      continue;
    }

    // ---- nomor soal berbentuk kata ("Soal 3: …") ----
    const mWord = t.match(RE_QUESTION_WORD);
    if (mWord && mWord[2]) {
      finalize();
      lastQuestionNum = Number(mWord[1]);
      cur = { text: [mWord[2]], options: [], lastOptNum: 0 };
      continue;
    }

    // ---- nomor soal / opsi angka ("1. …") ----
    const mNum = t.match(RE_QUESTION_NUM);
    if (mNum && mNum[2]) {
      const n = Number(mNum[1]);
      const body = mNum[2];
      // Opsi numerik: angka kecil berurutan di dalam soal (1. Jakarta, 2. Bandung).
      // Nomor yang tidak NAIK dari soal terakhir pasti opsi, bukan soal baru.
      const looksLikeOption =
        !!cur &&
        n <= 9 &&
        n >= 1 &&
        (cur.options.length > 0
          ? n === cur.lastOptNum + 1 || n === 1
          : n <= lastQuestionNum);
      if (looksLikeOption && cur) {
        cur.lastOptNum = n;
        cur.options.push(parseOption(body));
        continue;
      }
      // Selain itu: baris soal baru (nomor biasanya berurutan naik).
      finalize();
      lastQuestionNum = n;
      cur = { text: [body], options: [], lastOptNum: 0 };
      continue;
    }

    // ---- opsi huruf ("A. …", "b) …", "d: x") ----
    const mLetter = t.match(RE_OPTION_LETTER);
    if (mLetter && mLetter[2] && cur) {
      cur.lastOptNum = 0;
      cur.options.push(parseOption(mLetter[2]));
      continue;
    }

    // ---- opsi bullet ("- …", "* …", "• …") ----
    const mBullet = t.match(/^\s*([-*•])\s*(.+)$/);
    if (mBullet && cur) {
      const isCorrect = mBullet[1] === "*";
      const opt = parseOption(mBullet[2]);
      cur.options.push(isCorrect ? { ...opt, isCorrect: true } : opt);
      continue;
    }

    // ---- lanjutan teks: tambah ke opsi terakhir atau teks soal ----
    if (cur) {
      if (cur.options.length > 0) {
        const last = cur.options[cur.options.length - 1];
        last.text = `${last.text} ${t}`.trim();
      } else {
        cur.text.push(t);
      }
    }
    // Baris sebelum soal pertama (judul dokumen dsb.) diabaikan.
  }
  finalize();

  if (questions.length === 0) {
    warnings.push("Tidak ada soal yang terdeteksi — periksa format penomoran (mis. “1.” untuk soal dan “A.” untuk opsi).");
  }
  return { questions, warnings };
}

/** Bersihkan satu teks opsi + deteksi penanda benar inline. */
function parseOption(raw: string): ParsedOption {
  let text = raw;
  let isCorrect = false;
  const mSuffix = text.match(RE_CORRECT_SUFFIX);
  if (mSuffix) {
    isCorrect = true;
    text = text.slice(0, mSuffix.index).trim();
  }
  if (/^\*{1,2}/.test(text.trim())) {
    isCorrect = true;
    text = text.replace(/^\*{1,2}\s*/, "");
  }
  return { text: clean(text), isCorrect };
}

/* ---------------------------- parser spreadsheet ------------------------- */

/**
 * Baris spreadsheet → soal. Mendukung:
 * 1. Baris header ("Pertanyaan | Opsi A | Opsi B | … | Kunci") — kolom dipetakan
 *    dari nama header;
 * 2. Tanpa header: kolom pertama = soal, kolom berikut = opsi, kolom terakhir
 *    yang ber-pola kunci (huruf/angka/"benar"/sama dengan salah satu opsi)
 *    dianggap kunci.
 */
export function rowsToQuestions(rows: unknown[][]): ParseResult {
  const warnings: string[] = [];
  const norm = rows
    .map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c).replace(/\s+/g, " ").trim())))
    .filter((r) => r.some((c) => c.length > 0));
  if (norm.length === 0) {
    return { questions: [], warnings: ["File kosong atau tidak ada baris terbaca."] };
  }

  // Deteksi baris header.
  const headerIdx = norm.findIndex((r) => r.some((c) => /^(pertanyaan|soal|question|teks)$/i.test(c)));
  let questionCol = 0;
  let optionCols: number[] = [];
  let keyCol = -1;
  let dataStart = 0;

  if (headerIdx >= 0) {
    const header = norm[headerIdx];
    header.forEach((h, i) => {
      const t = h.toLowerCase();
      if (/^(pertanyaan|soal|question|teks)$/.test(t)) questionCol = i;
      else if (/^(kunci|jawaban benar|jawaban|answer|correct|benar)$/.test(t)) keyCol = i;
      else {
        // "Opsi A", "Pilihan B", "Option C", "Jawaban A", "A", "B" → kolom opsi.
        const m = t.match(/^(?:opsi|pilihan|option|jawaban)\s*[:\-]?\s*([a-h])$/) ?? /^([a-h])$/.exec(t);
        if (m) optionCols.push(i);
      }
    });
    // Pastikan kolom kunci bukan salah satu kolom opsi.
    if (keyCol >= 0 && optionCols.includes(keyCol)) {
      optionCols = optionCols.filter((c) => c !== keyCol);
    }
    if (optionCols.length === 0) {
      // Header ada tapi kolom opsi tak dikenali → fallback posisi.
      optionCols = header.map((_, i) => i).filter((i) => i !== questionCol && i !== keyCol);
      warnings.push("Kolom opsi tidak dikenali dari header — memakai urutan kolom.");
    }
    optionCols.sort((a, b) => (header[a] ?? "").localeCompare(header[b] ?? "", "id"));
    dataStart = headerIdx + 1;
  }

  const questions: ParsedQuestion[] = [];
  for (let r = dataStart; r < norm.length; r++) {
    const row = norm[r];
    const text = row[questionCol] ?? "";
    if (!text) continue;

    let cells = optionCols.length > 0 ? optionCols.map((c) => row[c] ?? "") : row.slice(1).filter((c) => c.length > 0);
    let keyVal = keyCol >= 0 ? row[keyCol] ?? "" : "";

    if (keyCol < 0 && cells.length >= 2) {
      // Heuristik tanpa header: kolom terakhir ber-pola kunci → anggap kunci.
      const last = cells[cells.length - 1];
      const looksKey =
        /^([a-hA-H]|[1-9])$/.test(last) ||
        /^(benar|bener|true|✓)$/i.test(last) ||
        cells.slice(0, -1).some((c) => c.toLowerCase() === last.toLowerCase());
      if (looksKey) {
        keyVal = last;
        cells = cells.slice(0, -1);
      }
    }

    const options: ParsedOption[] = cells.filter((c) => c.length > 0).map((c) => parseOption(c));
    if (keyVal) {
      let idx = resolveKeyIndex(keyVal, options.length);
      if (idx === -2) {
        const want = clean(keyVal).toLowerCase();
        idx = options.findIndex((o) => o.text.toLowerCase() === want || o.text.toLowerCase().startsWith(want));
      }
      if (idx >= 0 && !options.some((o) => o.isCorrect)) options[idx] = { ...options[idx], isCorrect: true };
    }

    const q: ParsedQuestion = { text, options };
    if (options.length > 4) {
      q.options = options.slice(0, 4);
      q.warning = "Lebih dari 4 opsi — hanya 4 pertama yang diimpor.";
    }
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (q.options.length < 2) q.warning = q.warning ?? "Opsi kurang dari 2 — tambahkan opsi atau hapus soal ini.";
    else if (correct === 0) q.warning = q.warning ?? "Kunci jawaban tidak terdeteksi — tandai jawaban benar.";
    else if (correct > 1) q.warning = q.warning ?? "Beberapa opsi ditandai benar — biarkan tepat satu.";
    questions.push(q);
  }

  if (questions.length === 0) {
    warnings.push("Tidak ada soal terbaca dari baris file.");
  }
  return { questions, warnings };
}
