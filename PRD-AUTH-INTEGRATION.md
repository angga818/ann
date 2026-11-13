# PRD Integrasi Auth — Frontend Quiz (Admin & Host)

- **Status:** Spesifikasi integrasi
- **Untuk:** Frontend lain yang sudah memiliki fitur quiz tanpa auth
- **Bukan untuk:** Implementasi ulang fitur quiz
- **Dokumen backend:** `docs/AUTH.md` di repo `quiz-service`

---

## 1. Tujuan

Dokumen ini hanya menjelaskan **apa yang perlu ditambahkan** ke frontend quiz yang sudah ada agar bisa memakai auth/RBAC backend.

Frontend tujuan diasumsikan:

- sudah memiliki halaman host, editor quiz, lobby, game, join player, dan WebSocket;
- sudah memiliki API client dan konfigurasi API sendiri;
- **belum memiliki login, token, route protection, dan user management**.

Yang tidak dibahas di dokumen ini:

- base URL/API host dan konfigurasi env (sudah diketahui FE tujuan);
- cara membuat quiz, game engine, WebSocket, atau UI quiz yang sudah ada;
- perubahan backend.

---

## 2. Role yang didukung FE tujuan

| Role         | Perilaku di FE tujuan                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| `host`       | Hanya melihat/mengelola quiz miliknya; tidak bisa membuka user management      |
| `admin`      | Melihat/mengelola semua quiz; bisa membuka user management **untuk host saja** |
| `superadmin` | **Tidak diimplementasikan di FE tujuan.** Superadmin hanya ada di FE utama     |

Catatan:

- FE tujuan hanya perlu membangun UI untuk `admin` dan `host`.
- Jangan menampilkan user management untuk `host`.
- Jangan membuat form untuk assign role `admin`/`superadmin` di FE tujuan. Admin hanya membuat/mengelola `host`.
- Jika backend mengembalikan role `superadmin` saat login, perlakukan sebagai role di luar scope. Pilihan aman: tampilkan pesan “Role ini tidak didukung di aplikasi ini” lalu logout. Jangan diam-diam menampilkan fitur superadmin.

---

## 3. Yang Perlu Ditambahkan

### 3.1 Auth state & token

Tambahkan state auth global (context/store) dengan aturan:

- `access_token` disimpan **di memory**, bukan localStorage/sessionStorage.
- `refresh_token` **tidak dibaca/ditulis JavaScript**; browser menyimpannya sebagai cookie `HttpOnly`.
- Saat aplikasi dibuka:
  1. Coba `POST /auth/refresh` dengan `credentials: "include"`.
  2. Sukses → simpan access token + user.
  3. `401` → status unauthenticated → arahkan ke login.
  4. Error jaringan/5xx → status error + tombol retry; jangan langsung logout.
- Setiap request konten memakai header `Authorization: Bearer <access_token>`.
- Jika request terproteksi mendapat `401`:
  1. Panggil refresh sekali (single-flight; jangan paralel).
  2. Retry request awal satu kali.
  3. Jika refresh gagal `401` → hapus auth state → login.
- Jangan memanggil refresh untuk error `403`, `429`, atau network error.
- Logout:
  1. `POST /auth/logout` dengan credentials.
  2. Hapus auth state.
  3. Hapus data sesi host lokal jika ada.
  4. Arahkan ke login.

Opsional tetapi disarankan:

- Gunakan `navigator.locks` atau mekanisme single-flight agar beberapa tab tidak melakukan refresh bersamaan (refresh token dirotasi).
- Broadcast logout antar-tab agar tab lain langsung keluar.

### 3.2 Perubahan pada API client quiz

Gunakan API client yang sudah ada; jangan membuat base URL baru.

Yang ditambahkan:

- Request interceptor: tempel `Authorization: Bearer` jika access token ada.
- Response interceptor: tangani `401` seperti aturan 3.1.
- Auth request (`login`, `refresh`, `logout`) memakai `credentials: "include"`.
- Endpoint publik **tidak berubah** dan tidak perlu Bearer:
  - `GET /api/v1/sessions/:pin`
  - `POST /api/v1/sessions/:pin/join`
  - `GET/HEAD /api/v1/media/*`
  - WebSocket `/ws/game`
- WebSocket host/player tetap memakai `host_token`/`player_token` masing-masing; jangan menambahkan Bearer ke URL WebSocket.

### 3.3 Halaman login

Tambahkan halaman login host/admin:

- Input username **atau** email + password.
- Tampilkan/galeri password (show/hide).
- Tombol submit dengan loading state.
- Tangani:
  - `401 INVALID_CREDENTIALS` → “Username/email atau password salah.”
  - `429 ACCOUNT_LOCKED` / `RATE_LIMITED` → pesan + hitung mundur jika `Retry-After` tersedia; jika tidak terbaca, tampilkan pesan generik.
  - `503 AUTH_UNAVAILABLE` / network → pesan layanan tidak tersedia.
- Jika sudah authenticated, redirect ke halaman tujuan.
- Setelah login sukses, kembali ke route asal yang dilindungi (simpan `from` di state/query; validasi agar tetap di area `/quiz/host`).

Jangan menyimpan password atau refresh token di storage.

### 3.4 Route protection

Tambahkan guard untuk area host/admin saja:

| Route                           | Proteksi                 |
| ------------------------------- | ------------------------ |
| `/quiz/host` dan turunannya     | Wajib login (host/admin) |
| `/quiz/host/users`              | Wajib admin              |
| `/quiz/join`, `/quiz/play/:pin` | Tetap publik             |
| `/quiz` (landing)               | Tetap publik             |

Perilaku guard:

- Saat bootstrap → tampilkan loading screen, jangan flicker ke halaman host.
- Unauthenticated → redirect login dengan `from`.
- Auth error (network) → tampilkan retry, bukan logout.
- Role tidak cukup untuk user management → tampilkan halaman 403/akses ditolak; backend tetap menolak `403`.

Jika FE tujuan sudah memiliki auth sendiri, **jangan membuat dua sistem login**. Adaptasi auth yang ada untuk memakai token quiz ini, atau jadikan auth quiz sebagai satu-satunya auth area quiz.

### 3.5 UI sadar role

Tambahkan user menu di area host:

- username/email, role badge;
- logout;
- ganti password (opsional tetapi disarankan);
- link “Kelola User” hanya untuk `admin`.

Perilaku:

- `host`: tidak melihat link/menu user management; hanya melihat quiz miliknya (backend sudah memfilter list).
- `admin`: melihat semua quiz; melihat menu “Kelola User”.
- `superadmin`: tidak didukung di FE tujuan (lihat §2).
- Error `403`/`404` dari endpoint quiz (mis. mengakses quiz milik host lain) ditampilkan sebagai pesan akses/not found, bukan crash.

### 3.6 User management (admin saja)

Tambahkan halaman user management yang hanya bisa dibuka `admin`.

Fitur minimum:

- List user `host` (backend otomatis membatasi admin ke host).
- Create user `host`:
  - username, email, password, role (role terkunci `host`).
- Edit user:
  - role hanya `host`;
  - status aktif/nonaktif.
- Reset password user.
- Revoke semua sesi user.
- Konfirmasi untuk revoke sesi dan perubahan status yang memutus akses.

Aturan validasi mengikuti backend:

- username 3–50 karakter, hanya huruf/angka/titik/underscore/strip;
- email valid, maksimal 255 karakter;
- password 12–128 karakter, tidak sama dengan username/email.

Batasan FE tujuan:

- Admin tidak boleh membuat/mengelola `admin` atau `superadmin`.
- Jangan menyediakan role selector selain `host`.
- Jika user yang diubah adalah diri sendiri dan token-nya terpengaruh (role/status/revoke), logout lalu login ulang.

### 3.7 Ganti password sendiri

Opsional tetapi disarankan di user menu:

- `POST /auth/change-password`.
- Field password lama, password baru, konfirmasi.
- Setelah sukses, backend mencabut refresh session; FE harus logout dan login ulang.
- Validasi password mengikuti aturan backend.

### 3.8 Endpoint auth yang dipakai

Gunakan kontrak backend di `docs/AUTH.md`. Ringkasan endpoint baru yang perlu dipanggil:

| Method | Path                                | Kebutuhan                  |
| ------ | ----------------------------------- | -------------------------- |
| POST   | `/api/v1/auth/login`                | Login, set refresh cookie  |
| POST   | `/api/v1/auth/refresh`              | Bootstrap + retry 401      |
| POST   | `/api/v1/auth/logout`               | Logout                     |
| GET    | `/api/v1/auth/me`                   | Opsional: validasi user    |
| POST   | `/api/v1/auth/change-password`      | Ganti password sendiri     |
| GET    | `/api/v1/users`                     | Admin: list host           |
| POST   | `/api/v1/users`                     | Admin: create host         |
| PATCH  | `/api/v1/users/:id`                 | Admin: role/status host    |
| POST   | `/api/v1/users/:id/reset-password`  | Admin: reset password host |
| POST   | `/api/v1/users/:id/revoke-sessions` | Admin: revoke sesi host    |

Jangan menambahkan endpoint superadmin-specific ke FE tujuan.

---

## 4. Perubahan pada Halaman Quiz yang Sudah Ada

Halaman quiz tidak perlu dirombak. Yang perlu disesuaikan:

1. **Host list / editor / session create**: gunakan API client yang sudah memiliki Bearer + refresh.
2. **Host session**: tetap memakai `host_token` untuk WebSocket, bukan Bearer.
3. **Player routes**: tidak berubah; tetap publik.
4. **Header area host**: tambahkan user menu/logout dan (untuk admin) link user management.
5. **Error state**: tambahkan penanganan `401` (redirect login), `403` (akses ditolak), `429` (rate limit), dan `5xx`/network.
6. **Token/session lokal**: jangan mencampur refresh token quiz dengan token auth lain. Jika FE sudah punya auth lain, pisahkan storage/context agar tidak saling menimpa.

---

## 5. Tambahan File/Komponen (contoh struktur)

Nama file boleh berbeda; yang penting tanggung jawabnya:

```text
src/lib/quiz/auth-store.*          access token + user in-memory
src/api/quiz-auth-api.*            login/refresh/logout/change-password/users
src/api/quiz-http.*                auth client + interceptor Bearer/refresh
src/components/quiz-auth/*         provider, guard auth, guard admin, loading/error
src/pages/quiz/auth/LoginPage.*   halaman login
src/pages/quiz/host/UsersPage.*   user management admin
src/pages/quiz/host/UserMenu.*    user menu + logout + ganti password
```

Jangan menambahkan dependency baru jika FE sudah punya HTTP client dan state management yang memadai.

---

## 6. Acceptance Criteria

- [ ] Membuka route host tanpa sesi → redirect login.
- [ ] Login valid → kembali ke route asal; access token dipakai di request berikutnya.
- [ ] Refresh halaman host → sesi dipulihkan lewat refresh cookie (tanpa login ulang).
- [ ] Access token kedaluwarsa/`401` → refresh + retry sekali; jika gagal → login.
- [ ] Logout → cookie/sesi lokal dibersihkan dan kembali ke login.
- [ ] `host` hanya melihat quiz miliknya dan tidak bisa membuka user management.
- [ ] `admin` melihat semua quiz dan bisa mengelola user `host`.
- [ ] Admin tidak bisa membuat/mengubah user menjadi `admin`/`superadmin`.
- [ ] Player join/play/media/WebSocket tetap berjalan tanpa login.
- [ ] Error `403`/`429`/network tidak menyebabkan crash atau logout paksa.
- [ ] Access token tidak pernah disimpan di storage atau dicetak ke log/analytics.
- [ ] Role `superadmin` tidak diekspos di FE tujuan.

---

## 7. Prasyarat & Catatan

- Origin FE tujuan harus terdaftar di `CORS_ORIGINS` backend.
- Auth request memakai `credentials: "include"`; refresh cookie `HttpOnly`, `Secure`, `SameSite=None` di production.
- Produksi wajib HTTPS. Jika browser memblokir third-party cookie, gunakan same-origin proxy atau sesuaikan kebijakan cookie; ini prasyarat deployment, bukan perubahan UI.
- Header `Retry-After`/`X-RateLimit-*` mungkin tidak terbaca cross-origin jika backend belum mengeksposnya; UI harus tetap punya pesan fallback.
- Backend tetap sumber kebenaran untuk ownership, role, dan validasi; UI hanya menyembunyikan aksi yang tidak relevan.
