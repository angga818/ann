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

Semua request REST dan WebSocket mengarah ke:

```
https://api.workilham.my.id
```

Didefinisikan di `src/lib/api.ts` (`API_BASE_URL`). Path relatif dari backend
(mis. `ws_url`, `cover_image_url`) otomatis digabungkan ke origin tersebut,
sesuai aturan URL pada PRD §3.

> Pastikan origin frontend Anda dimasukkan ke `CORS_ORIGINS` di backend,
> termasuk allowlist origin WebSocket.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output ke dist/
```

## Docker

Build image dan jalankan container nginx:

```bash
docker build -t quizlive-frontend .
docker run -d -p 8080:80 --name quizlive-frontend quizlive-frontend
```

atau dengan compose:

```bash
docker compose up -d --build
```

Frontend akan tersedia di `http://localhost:8080`. Image memakai multi-stage build
(Node untuk build Vite → nginx alpine untuk serving) dengan gzip, cache immutable
untuk asset ber-hash, dan fallback SPA.

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
