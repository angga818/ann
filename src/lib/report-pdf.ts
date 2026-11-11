/**
 * Ekspor laporan sesi ke PDF (jsPDF, digambar programatik — tanpa
 * html2canvas). jsPDF di-import dinamis agar pustaka besar ini hanya
 * dimuat saat tombol ekspor benar-benar diklik.
 */
import type { SessionReport } from "@/lib/reports";
import { avgCorrectRate, correctRate, formatReportDate, hardestQuestions } from "@/lib/reports";

/** Warna brand (hex → rgb komponen). */
const PRIMARY: [number, number, number] = [28, 95, 230];
const MUTED: [number, number, number] = [110, 118, 132];
const DARK: [number, number, number] = [32, 41, 54];
const LIGHT: [number, number, number] = [243, 245, 249];
const SUCCESS: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];

/** Font standar PDF hanya Latin-1 — normalisasi tipografi unicode. */
function latin(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00B7\u2022]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/[^\x00-\xFF]/g, "?");
}

const pctText = (v: number) => `${Math.round(v * 100)}%`;

export async function exportReportPdf(report: SessionReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16; // margin
  const CW = W - M * 2; // lebar konten
  let y = M;

  const ensure = (need: number) => {
    if (y + need > H - M) {
      doc.addPage();
      y = M;
    }
  };

  /* ------------------------------- header ------------------------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("QuizLive", M, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Laporan Hasil Permainan", W - M, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...DARK);
  const titleLines = doc.splitTextToSize(latin(report.quizTitle || "Sesi Live"), CW).slice(0, 2);
  for (const line of titleLines) {
    doc.text(line, M, y);
    y += 7.5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    latin(
      `${formatReportDate(report.endedAtMs)}  |  PIN ${report.pin}  |  ${report.totalPlayers} pemain  |  ` +
        `${report.questions.length} soal dimainkan`,
    ),
    M,
    y,
  );
  y += 5;
  doc.setDrawColor(228, 232, 240);
  doc.line(M, y, W - M, y);
  y += 8;

  /* ------------------------- statistik ringkas -------------------------- */
  const stats: { label: string; value: string; color?: [number, number, number] }[] = [
    { label: "Pemain", value: String(report.totalPlayers) },
    { label: "Soal dimainkan", value: String(report.questions.length) },
    { label: "Rata-rata benar", value: pctText(avgCorrectRate(report.questions)), color: SUCCESS },
    {
      label: "Skor juara",
      value: report.leaderboard[0]
        ? `${report.leaderboard[0].score.toLocaleString("id-ID")}`
        : "-",
      color: PRIMARY,
    },
  ];
  const boxW = (CW - 9) / 4;
  stats.forEach((s, i) => {
    const x = M + i * (boxW + 3);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, boxW, 17, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(s.label.toUpperCase(), x + 3, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...(s.color ?? DARK));
    doc.text(s.value, x + 3, y + 13);
    doc.setFont("helvetica", "normal");
  });
  y += 25;

  /* --------------------------- klasemen akhir --------------------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Klasemen Akhir", M, y);
  y += 6;

  const colRank = M + 2;
  const colName = M + 14;
  const colScore = W - M - 2;
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, CW, 7, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("#", colRank, y + 5);
  doc.text("Nama", colName, y + 5);
  doc.text("Skor", colScore, y + 5, { align: "right" });
  y += 7;

  doc.setFontSize(9.5);
  report.leaderboard.forEach((e, i) => {
    ensure(7);
    const medal = e.rank <= 3;
    doc.setFont("helvetica", medal ? "bold" : "normal");
    doc.setTextColor(...(e.rank === 1 ? PRIMARY : DARK));
    doc.text(String(e.rank), colRank, y + 5);
    doc.setTextColor(...DARK);
    const name = doc.splitTextToSize(latin(e.nickname), CW - 40)[0] ?? "";
    doc.text(name, colName, y + 5);
    doc.setTextColor(...DARK);
    doc.text(e.score.toLocaleString("id-ID"), colScore, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    if (i % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(M, y, CW, 6.5, "F");
    }
    y += 6.5;
  });
  y += 6;

  /* ---------------------- grafik % benar per soal ------------------------ */
  ensure(60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Persentase Jawaban Benar per Soal", M, y);
  y += 6;

  if (report.questions.length > 0) {
    const hardest = new Set(hardestQuestions(report.questions).map((q) => q.index));
    const chartH = 38;
    const gap = 1.6;
    const barW = Math.max(5, Math.min(12, (CW - gap * (report.questions.length - 1)) / report.questions.length));
    report.questions.forEach((q, i) => {
      const rate = correctRate(q);
      const barH = Math.max(1.5, rate * chartH);
      const x = M + i * (barW + gap);
      doc.setFontSize(5.5);
      doc.setTextColor(...MUTED);
      doc.text(pctText(rate), x + barW / 2, y + 3.2, { align: "center" });
      doc.setFillColor(...(hardest.has(q.index) ? RED : PRIMARY));
      doc.rect(x, y + 4.5, barW, barH, "F");
      doc.setTextColor(...MUTED);
      doc.text(String(q.index + 1), x + barW / 2, y + 4.5 + chartH + 3.5, { align: "center" });
    });
    y += 4.5 + chartH + 7;
  }

  /* ------------------------ statistik per soal --------------------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Statistik per Soal", M, y);
  y += 6;

  const hardest = new Set(hardestQuestions(report.questions).map((q) => q.index));
  report.questions.forEach((q) => {
    ensure(34);
    const rate = correctRate(q);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...(hardest.has(q.index) ? RED : DARK));
    doc.text(`Soal ${q.index + 1} - ${pctText(rate)} benar (${q.correct_count}/${q.total_players})`, M, y);
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    if (hardest.has(q.index)) {
      doc.text("TERSULIT", W - M, y, { align: "right" });
    }
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(latin(q.question_text), CW).slice(0, 2);
    for (const line of lines) {
      doc.text(line, M, y);
      y += 4.4;
    }

    q.options.forEach((opt, oi) => {
      ensure(5);
      const count = q.counts[opt.id] ?? 0;
      const isCorrect = opt.id === q.correct_option_id;
      const letter = String.fromCharCode(65 + oi);
      const text = doc.splitTextToSize(latin(opt.text), CW - 42)[0] ?? "";
      doc.setFont("helvetica", isCorrect ? "bold" : "normal");
      doc.setTextColor(...(isCorrect ? SUCCESS : MUTED));
      doc.text(`${letter}) ${text} (${count})${isCorrect ? " [benar]" : ""}`, M + 3, y);
      y += 4.2;
    });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    y += 2.5;
    doc.setDrawColor(238, 240, 246);
    doc.line(M, y, W - M, y);
    y += 6;
  });

  /* ------------------------------- footer -------------------------------- */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(latin(`Dihasilkan oleh QuizLive - ${formatReportDate(report.endedAtMs)}`), M, H - 8);
    doc.text(`Hal. ${p}/${pages}`, W - M, H - 8, { align: "right" });
  }

  doc.save(`quizlive-laporan-${report.pin}.pdf`);
}
