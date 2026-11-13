# ann

**QuizLive** — frontend untuk backend kuis multiplayer real-time bergaya Kahoot, sesuai `PRD-FRONTEND.md`.

## Stack

- **React 19 + Vite + TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **Komponen ala shadcn/ui** (Radix UI + CVA + tailwind-merge) di `src/components/ui/`
- **Axios** untuk REST
- **Framer Motion** untuk animasi
- **React Router** (HashRouter — cocok untuk hosting statis)

## Konfigurasi API

Semua request REST dan WebSocket mengarah ke origin `API_BASE_URL` di
`src/lib/api.ts`, yang bisa diatur lewat env **`VITE_API_BASE_URL`**
(nilai bawaan: `https://api.workilham.my.id`).

```bash
cp .env.example .env
# lalu ubah VITE_API_BASE_URL, mis. http://localhost:8080
```

Ini berguna bila domain API diblokir jaringan kantor atau backend sedang
pindah host: cukup ganti env / build arg, tanpa mengubah kode. Saat build
Docker, kirim sebagai build arg:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api-baru.contoh.com -t quizlive-frontend .
```

Path relatif dari backend (mis. `ws_url`, `cover_image_url`) otomatis
digabungkan ke origin tersebut, sesuai aturan URL pada PRD §3.

> Pastikan origin frontend Anda dimasukkan ke `CORS_ORIGINS` di backend,
> termasuk allowlist origin WebSocket.

### Jika domain API diblokir jaringan kantor

Gejala umum: request gagal dengan `net::ERR_CERT_AUTHORITY_INVALID`,
`ERR_CONNECTION_RESET`, `403`, atau halaman host menampilkan "Tidak dapat
memeriksa sesi". Sertifikat yang diterbitkan Fortinet/bukan penerbit publik
menandakan firewall kantor melakukan **SSL inspection**, bukan masalah kode.

Pilihan yang bisa dipakai:

1. **Jaringan lain** — hotspot seluler atau VPN yang diizinkan; paling cepat.
2. **Allowlist IT** — minta domain frontend dan `api.workilham.my.id`
   dikecualikan dari SSL inspection/blokir kategori.
3. **Domain baru** — pindahkan backend ke domain lain, lalu build frontend
   dengan `VITE_API_BASE_URL` (atau build arg Docker) tanpa mengubah kode.
   Jangan lupa perbarui `CORS_ORIGINS` dan setelan cookie refresh.
4. **Reverse proxy same-origin** — sajikan frontend dan API di satu domain
   (mis. Nginx/Cloudflare di `/api`), lalu set `VITE_API_BASE_URL` ke origin
   tersebut. Ini juga menghindari masalah cookie lintas situs.

## Autentikasi (host/admin)

Area `/host` dilindungi login; halaman pemain (`/join`, `/play/:pin`) dan
landing tetap publik. Detail kontrak ada di `PRD-AUTH-INTEGRATION.md`.

- `access_token` disimpan **hanya di memory** (`src/lib/auth-store.ts`).
- `refresh_token` adalah cookie `HttpOnly` milik browser; semua request auth
  memakai `withCredentials`.
- Saat aplikasi dibuka, `POST /auth/refresh` mencoba memulihkan sesi; error
  jaringan/5xx menampilkan tombol retry, bukan logout paksa.
- Request quiz yang mendapat `401` otomatis refresh sekali (single-flight per
  tab + lock antar-tab) lalu retry sekali.
- `superadmin` tidak didukung: login dengan role ini langsung di-logout dan
  ditampilkan pesan bahwa role tidak didukung.
- Admin mendapat menu **Kelola User** (`/host/users`) untuk mengelola akun host;
  role selalu dikunci `host`.

Karena cookie refresh dipakai lintas origin, backend harus mengirim
`SameSite=None; Secure` di production dan mengizinkan credentials untuk origin
frontend secara eksplisit (bukan `*`).

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output ke dist/
```

## Docker

Build image dan jalankan container (Node `serve`, port 7005):

```bash
docker build -t quizlive-frontend .
docker run -d -p 8080:7005 --name quizlive-frontend quizlive-frontend
```

atau dengan compose:

```bash
docker compose up -d --build
```

Multi-stage build: Node untuk build Vite, lalu `serve -s dist` untuk serving
(fallback SPA otomatis). Siap dipakai di Dokploy — cukup arahkan port ke `7005`.

## Halaman

| Route | Peran | Fungsi |
|---|---|---|
| `/` | umum | Landing page |
| `/host` | host | Daftar kuis (cari, buat, edit, hapus, mulai sesi) |
| `/host/quiz/new`, `/host/quiz/:id` | host | Editor kuis (drag-reorder soal, upload gambar, validasi) |
| `/host/live/:pin` | host | Lobby, preview, soal, ringkasan jawaban, leaderboard, podium |
| `/join`, `/join/:pin` | pemain | Form PIN + nickname |
| `/play/:pin` | pemain | Lobby, soal, hasil personal, podium |

## Catatan implementasi penting

- **Kredensial sesi** (`host_token` / `player_token`) disimpan di `sessionStorage` — refresh tidak kehilangan sesi (PRD §4).
- **Reconnect otomatis** WebSocket dengan backoff eksponensial; server mengirim `STATE_SYNC` setelah tersambung ulang.
- **Countdown memakai jam server** — offset dihitung dari `server_time_ms` (PRD §6.6), bukan jam device.
- **Frontend tidak pernah menghitung skor/kebenaran sendiri** — semua dari event server (`LEADERBOARD_UPDATE`, `ANSWER_SUMMARY`, dll).
- Upload gambar dengan progress bar; kolom URL eksternal tetap tersedia bila storage mati (PRD §9).
