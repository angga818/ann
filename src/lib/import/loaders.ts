/**
 * Loader soal per format file: TXT, CSV, XLSX/XLS (SheetJS), DOCX (Mammoth),
 * PDF (PDF.js + OCR Tesseract untuk hasil scan).
 *
 * Semua pustaka berat di-import dinamis — chunk utama tetap kecil, pustaka
 * hanya dimuat saat pengguna benar-benar mengimpor format terkait.
 * Hasil akhir selalu ParseResult yang bisa diedit di preview (lihat parse.ts).
 */
import { parseQuestionsText, rowsToQuestions, type ParseResult } from "./parse";

export interface ImportProgress {
  stage: string;
  /** 0–100 bila tersedia. */
  pct?: number;
}

export const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".txt", ".docx", ".pdf"] as const;
export const ACCEPT_ATTR = ".xlsx,.xls,.csv,.txt,.docx,.pdf";
/** Batas ukuran file — OCR/render PDF besar sangat berat di browser. */
export const MAX_FILE_MB = 15;
/** PDF hasil scan: maksimal halaman yang di-OCR (agar tidak menggantung). */
const MAX_OCR_PAGES = 20;
/** Halaman dianggap "hasil scan" bila teks yang terekstrak sangat sedikit. */
const SPARSE_TEXT_THRESHOLD = 40;

export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

async function readWorkbook(file: File, onProgress: (p: ImportProgress) => void): Promise<ParseResult> {
  onProgress({ stage: "Membaca spreadsheet…" });
  const XLSX = await import("xlsx");
  const buf = new Uint8Array(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "array" });

  let best: ParseResult | null = null;
  const notes: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" });
    const r = rowsToQuestions(rows);
    if (r.questions.length > 0) {
      best = r;
      best.warnings = [...notes, ...r.warnings];
      break;
    }
    notes.push(`Sheet “${name}” tidak berisi soal yang terbaca.`);
  }
  return (
    best ?? {
      questions: [],
      warnings: ["Tidak ada soal terbaca dari file spreadsheet ini.", ...notes],
    }
  );
}

async function readDocx(file: File, onProgress: (p: ImportProgress) => void): Promise<ParseResult> {
  onProgress({ stage: "Membaca dokumen Word…" });
  const mammoth = await import("mammoth");
  const { value: text } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return parseQuestionsText(text);
}

/** PDF.js dengan worker dari bundel (bukan CDN) — sekali set, dipakai ulang. */
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }
  return pdfjs;
}

/**
 * Engine OCR — worker Tesseract dibuat sekali (lazy) dan dipakai ulang untuk
 * semua halaman hasil scan. Membuat worker + model bahasa membutuhkan koneksi
 * (dimuat dari CDN oleh tesseract.js); bahasa Indonesia dicoba dulu, jatuh ke
 * Inggris bila modelnya gagal diunduh.
 */
interface OcrEngine {
  recognize: (dataUrl: string) => Promise<string>;
}

let ocrEngine: Promise<OcrEngine> | null = null;
/** Callback progress terakhir — logger worker membaca variabel ini. */
let ocrProgressCb: ((p: ImportProgress) => void) | null = null;

function getOcrEngine(onProgress: (p: ImportProgress) => void): Promise<OcrEngine> {
  ocrProgressCb = onProgress;
  if (!ocrEngine) {
    ocrEngine = (async () => {
      const { createWorker } = await import("tesseract.js");
      let lastError: unknown = null;
      for (const lang of ["ind", "eng"]) {
        try {
          const w = await createWorker(lang, undefined, {
            logger: (m: { status?: string; progress?: number }) => {
              if (m.status === "recognizing text" && typeof m.progress === "number") {
                ocrProgressCb?.({ stage: "Mengenali teks…", pct: Math.round(m.progress * 100) });
              }
            },
          });
          return { recognize: async (dataUrl: string) => (await w.recognize(dataUrl)).data.text ?? "" };
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("Gagal memuat engine OCR — periksa koneksi internet Anda.");
    })();
    // Gagal dibuat → reset agar impor berikutnya mencoba lagi dari awal.
    ocrEngine.catch(() => {
      ocrEngine = null;
    });
  }
  return ocrEngine;
}

async function readPdf(file: File, onProgress: (p: ImportProgress) => void): Promise<ParseResult> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const total = doc.numPages;
  const warnings: string[] = [];
  const pageTexts: string[] = [];
  let ocrCount = 0;

  for (let p = 1; p <= total; p++) {
    onProgress({ stage: `Halaman ${p}/${total}…`, pct: Math.round(((p - 1) / total) * 100) });
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let text = "";
    for (const item of tc.items) {
      if ("str" in item) {
        text += item.str;
        if ("hasEOL" in item && item.hasEOL) text += "\n";
      }
    }

    // Teks sangat sedikit → kemungkinan PDF hasil scan → OCR gambar halaman.
    if (text.replace(/\s/g, "").length < SPARSE_TEXT_THRESHOLD) {
      if (ocrCount >= MAX_OCR_PAGES) {
        warnings.push(`Halaman ${p} dilewati — maksimal ${MAX_OCR_PAGES} halaman hasil scan di-OCR.`);
        pageTexts.push("");
        continue;
      }
      ocrCount++;
      onProgress({ stage: `OCR halaman ${p} (${ocrCount}. hasil scan)…`, pct: undefined });
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      // pdf.js v6: properti `canvas` adalah API yang direkomendasikan
      // (canvasContext hanya untuk kompatibilitas mundur).
      await page.render({ canvas, viewport }).promise;
      try {
        const engine = await getOcrEngine(onProgress);
        const ocrText = await engine.recognize(canvas.toDataURL("image/png"));
        pageTexts.push(ocrText);
      } catch (e) {
        warnings.push(
          `OCR halaman ${p} gagal (${e instanceof Error ? e.message : "kesalahan tidak diketahui"}).`,
        );
        pageTexts.push("");
      }
    } else {
      pageTexts.push(text);
    }
  }

  onProgress({ stage: "Menyusun hasil…" });
  const result = parseQuestionsText(pageTexts.join("\n\n"));
  if (ocrCount > 0) {
    result.warnings.unshift(`${ocrCount} halaman dibaca lewat OCR — periksa hasilnya dengan teliti.`);
  }
  return result;
}

/** Entri utama: ekstrak soal dari file apa pun yang didukung. */
export async function extractQuestionsFromFile(
  file: File,
  onProgress: (p: ImportProgress) => void,
): Promise<ParseResult> {
  const ext = fileExtension(file.name);
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`Ukuran file maksimal ${MAX_FILE_MB} MB.`);
  }

  switch (ext) {
    case ".txt":
      onProgress({ stage: "Membaca teks…" });
      return parseQuestionsText(await file.text());
    case ".csv":
    case ".xlsx":
    case ".xls":
      return readWorkbook(file, onProgress);
    case ".docx":
      return readDocx(file, onProgress);
    case ".pdf":
      return readPdf(file, onProgress);
    default:
      throw new Error(`Format “${ext || "tidak dikenal"}” belum didukung. Gunakan ${ACCEPTED_EXTENSIONS.join(", ")}.`);
  }
}
