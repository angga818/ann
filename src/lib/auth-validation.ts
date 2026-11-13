/** Aturan validasi user mengikuti backend (PRD Auth §3.6). */

export function validateUsername(value: string): string | null {
  if (value.length < 3 || value.length > 50) return "Username harus 3–50 karakter.";
  if (!/^[A-Za-z0-9._-]+$/.test(value)) return "Username hanya boleh huruf, angka, titik, underscore, atau strip.";
  return null;
}

export function validateEmail(value: string): string | null {
  if (value.length > 255) return "Email maksimal 255 karakter.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Format email tidak valid.";
  return null;
}

export function validatePassword(password: string, username?: string, email?: string): string | null {
  if (password.length < 12 || password.length > 128) return "Password harus 12–128 karakter.";
  const lower = password.toLowerCase();
  if (username && lower === username.toLowerCase()) return "Password tidak boleh sama dengan username.";
  if (email && lower === email.toLowerCase()) return "Password tidak boleh sama dengan email.";
  return null;
}
