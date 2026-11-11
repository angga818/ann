/**
 * Utilitas crop avatar: memotong area persegi pilihan pengguna (react-easy-crop)
 * menjadi data URL siap simpan, lalu mengubahnya menjadi File untuk diunggah ke
 * `POST /media/images`.
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Format gambar yang didukung backend (`MEDIA` menerima JPEG/PNG/WebP). */
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_MB = 4;
/** Ukuran sisi avatar hasil crop (px) — cukup tajam di retina, file kecil. */
const OUTPUT_SIZE = 320;

export function isSupportedAvatarMime(type: string): boolean {
  return (AVATAR_MIME_TYPES as readonly string[]).includes(type);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
    img.src = src;
  });
}

/**
 * Potong gambar sesuai area yang dipilih lalu kembalikan data URL persegi
 * (WebP, jatuh ke PNG bila browser tidak mendukung).
 */
export async function cropToDataUrl(
  src: string,
  crop: PixelCrop,
  outputSize = OUTPUT_SIZE,
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");

  // Area crop bisa melewati tepi gambar (pembulatan react-easy-crop) — clamp.
  const sx = Math.max(0, Math.min(crop.x, img.naturalWidth - 1));
  const sy = Math.max(0, Math.min(crop.y, img.naturalHeight - 1));
  const sw = Math.max(1, Math.min(crop.width, img.naturalWidth - sx));
  const sh = Math.max(1, Math.min(crop.height, img.naturalHeight - sy));

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize);

  const webp = canvas.toDataURL("image/webp", 0.9);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

/** Konversi data URL hasil crop menjadi File untuk diunggah ke backend. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64 = ""] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(meta)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = mime === "image/webp" ? "webp" : mime === "image/jpeg" ? "jpg" : "png";
  return new File([bytes], `${filename}.${ext}`, { type: mime });
}
