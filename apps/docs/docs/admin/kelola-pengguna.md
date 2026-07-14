---
title: Kelola Pengguna & Peran
sidebar_position: 1
---

# Manajemen Pengguna dan Peran

Panduan untuk Admin mengelola akun pengguna dan peran dalam SEKAR.

## Apa itu Manajemen Pengguna?

Admin Data dan Admin Sistem memiliki akses untuk:

- **Membuat Akun Baru** — Register pekerja, supervisor, admin baru
- **Edit Profil** — Ubah nama, nomor telepon, foto, dll
- **Kelola Peran** — Assign peran (satgas, korlap, kepala_rayon, dll)
- **Deaktifasi Akun** — Disable akun yang resign/tidak aktif
- **Reset Password** — Reset password pekerja yang lupa

---

## Membuka Halaman Pengguna

![Kelola pengguna web](/img/web/users.png)

*Halaman manajemen pengguna di dashboard web.*

### Dari Dashboard Web

1. Login dengan akun Admin
2. Di sidebar, tap **"Pengguna"** atau **"Users"**
3. Daftar pengguna akan ditampilkan

---

## Daftar Pengguna

### Tampilan List Pengguna

```
DAFTAR PENGGUNA (87 total)

[Cari Pengguna]  [Filter] [+ BUAT PENGGUNA]

Nama               | Nomor       | Peran          | Status    | Aksi
─────────────────────────────────────────────────────────────────────
Ahmad Rizki        | 081234567890| Satgas         | ✓ Active  | Edit
Budi Santoso       | 081234567891| Satgas         | ✓ Active  | Edit
Citra Dewi         | 081234567892| Korlap         | ✓ Active  | Edit
Doni Hartono       | 081234567893| Linmas         | ✓ Active  | Edit
Kepala Rayon       | 081234567894| Kepala Rayon   | ✓ Active  | Edit
Admin Data         | 081234567895| Admin Data     | ✓ Active  | Edit
Superadmin         | 081234567896| Superadmin     | ✓ Active  | Edit
```

### Search & Filter

- **Search** — Cari nama atau nomor telepon
- **Filter by Role** — Tampilkan hanya satgas, korlap, admin, dll
- **Filter by Status** — Active, Inactive, Pending
- **Sort** — Nama A-Z, Terbaru dibuat, dll

---

## Membuat Pengguna Baru

### Langkah 1: Buka Form Buat Pengguna

1. Di halaman Pengguna, tap **"+ BUAT PENGGUNA"** atau **"+ Tambah"**
2. Form akan terbuka

### Langkah 2: Isi Informasi Dasar

```
┌──────────────────────────────────┐
│   FORM BUAT PENGGUNA BARU       │
├──────────────────────────────────┤
│ NAMA LENGKAP *                  │
│ [Ahmad Rizki Hamdani        ]    │
│                                 │
│ NOMOR TELEPON *                 │
│ [081234567890                ]   │
│                                 │
│ EMAIL (Optional)                │
│ [ahmad@example.com          ]    │
│                                 │
│ PASSWORD *                      │
│ [12345678                ]    │
│ [Rekomendasikan: 12345678 ]   │
│                                 │
│ [LANJUT KE PERAN]               │
└──────────────────────────────────┘
```

**Field yang Harus Diisi:**

- **Nama Lengkap** — Nama sesuai KTP/identitas resmi
- **Nomor Telepon** — Format: 081234567890
- **Password** — Sementara bisa gunakan 12345678, nanti user bisa ganti

### Langkah 3: Pilih Peran

```
PILIH PERAN PENGGUNA *

( ) Satgas - Field worker, melakukan aktivitas
( ) Linmas - Security staff
( ) Korlap - Field coordinator, manages teams
( ) Admin Data - Data management
( ) Kepala Rayon - Rayon head
( ) Top Management - Executive dashboard
( ) Admin System - System administration
( ) Superadmin - Full access
```

**Penjelasan Peran:**

| Peran | Akses | Digunakan Untuk |
|-------|-------|-----------------|
| **Satgas** | Absen, laporan aktivitas, lembur | Field workers |
| **Linmas** | Sama seperti satgas + monitoring | Security staff |
| **Korlap** | Monitoring tim, buat tugas, validasi laporan | Field coordinators |
| **Admin Data** | Kelola pengguna, data master | Data admins |
| **Kepala Rayon** | Dashboard rayon, laporan, analitik | Rayon heads |
| **Top Management** | Executive dashboard, company-wide analytics | Management |
| **Admin System** | System configuration, technical settings | IT staff |
| **Superadmin** | Full access to everything | System owner |

### Langkah 4: Assign ke Rayon/Area

![Rayon web](/img/web/rayons.png)

*Halaman manajemen rayon dan area.*

```
ASSIGN KE RAYON *

[Pilih Rayon ▼]
○ Rayon Pusat
○ Rayon Taman Aktif
○ Rayon Bungkul
○ Lainnya
```

Pilih rayon tempat pengguna akan bekerja.

### Langkah 5: Buat Akun

1. Periksa semua informasi sudah benar
2. Tap **"BUAT PENGGUNA"** atau **"Create User"**
3. Sistem akan membuat akun
4. Anda akan lihat konfirmasi:
   ```
   ✓ Akun Berhasil Dibuat!
   
   Nama: Ahmad Rizki Hamdani
   No. Telepon: 081234567890
   Peran: Satgas
   Rayon: Rayon Pusat
   Password: 12345678
   
   Bagikan kredensial ini kepada pengguna.
   ```

---

## Edit Pengguna

### Membuka Edit Pengguna

1. Di daftar pengguna, cari nama pengguna
2. Tap tombol **"Edit"** atau klik baris pengguna
3. Form edit akan terbuka

### Form Edit Pengguna

Anda bisa edit:

- **Nama Lengkap** — Ubah nama
- **Nomor Telepon** — Ubah nomor (jika berganti SIM)
- **Email** — Tambah/ubah email
- **Peran** — Ubah dari satgas ke korlap, dll
- **Status** — Aktif atau inactive
- **Rayon** — Pindahkan ke rayon lain
- **Area Assignment** — Area yang ditugaskan (untuk satgas/linmas)

### Menyimpan Perubahan

1. Ubah field yang diperlukan
2. Tap **"SIMPAN"** atau **"Update"**
3. Perubahan akan tersimpan

---

## Reset Password

### Mengganti Password Pengguna

Jika pengguna lupa password:

1. Buka profil pengguna
2. Tap **"Reset Password"** atau **"Change Password"**
3. Masukkan password baru:
   ```
   Password Baru: 12345678
   Konfirmasi: 12345678
   ```
4. Tap **"Simpan"**
5. Password akan di-reset
6. Beritahu pengguna password barunya

:::note
Disarankan password reset sementara gunakan "12345678" atau format standar. Pengguna bisa ganti lagi di profile mereka sendiri.
:::

---

## Deaktifasi Akun

### Menonaktifkan Pengguna

Jika pengguna resign atau tidak aktif lagi:

1. Buka profil pengguna
2. Tap **"Deactivate"** atau **"Non-aktifkan"**
3. Sistem akan meminta konfirmasi:
   ```
   Nonaktifkan pengguna ini?
   [Ya, Nonaktifkan]  [Batal]
   ```
4. Tap **"Ya, Nonaktifkan"**
5. Status pengguna akan jadi **"Inactive"**
6. Pengguna tidak bisa login lagi

### Mengaktifkan Kembali

Jika pengguna perlu aktif lagi:

1. Filter untuk menampilkan inactive users
2. Buka profil pengguna
3. Tap **"Activate"** atau **"Aktifkan"**
4. Status akan berubah jadi **"Active"**

---

## Bulk Management

### Import Pengguna dari Excel

Jika ada banyak pengguna baru:

1. Cari tombol **"Import"** atau **"Upload CSV"** di halaman pengguna
2. Siapkan file Excel dengan kolom:
   ```
   Nama Lengkap | Nomor Telepon | Password | Peran | Rayon
   Ahmad Rizki  | 081234567890  | pwd123   | Satgas| Pusat
   Budi Santoso | 081234567891  | pwd123   | Satgas| Pusat
   Citra Dewi   | 081234567892  | pwd123   | Korlap| Pusat
   ```
3. Upload file
4. Sistem akan validate dan import
5. Report akan ditampilkan (success, error, dll)

### Bulk Edit Peran

![Area web](/img/web/areas.png)

*Halaman manajemen area.*

Jika ingin ubah peran banyak orang sekaligus:

1. Di list pengguna, select multiple users (checkbox)
2. Tap **"Bulk Edit"** atau **"Change Role"**
3. Pilih peran baru
4. Tap **"Apply"**
5. Semua selected users akan berubah peran

---

## Audit & Activity Log

### Melihat Activity Log Pengguna

Untuk security & compliance:

1. Buka profil pengguna
2. Cari tab **"Activity Log"** atau **"Audit Trail"**
3. Lihat history:
   ```
   24 Juni 2026, 07:15 - Ahmad Rizki login dari IP 192.168.1.100
   24 Juni 2026, 07:20 - Ahmad Rizki submit laporan aktivitas
   24 Juni 2026, 14:30 - Ahmad Rizki logout
   ```

---

## Troubleshooting User Management

### "Tidak Bisa Buat Pengguna Baru"

**Penyebab:**
- Nomor telepon sudah terdaftar
- Ada field yang tidak terisi

**Solusi:**
1. Cek apakah nomor sudah ada di sistem
2. Pastikan semua required field sudah diisi
3. Hubungi admin jika masih gagal

### "Pengguna Tidak Bisa Login"

**Penyebab:**
- Password salah
- Akun inactive
- Nomor telepon tidak terdaftar

**Solusi:**
1. Cek status akun (active/inactive)
2. Reset password pengguna
3. Verifikasi nomor telepon benar

### "Tidak Bisa Import Pengguna"

**Penyebab:**
- Format file salah
- Ada nomor telepon duplikat di file
- Column tidak sesuai

**Solusi:**
1. Pastikan format Excel benar (CSV atau XLSX)
2. Cek tidak ada duplikat nomor telepon
3. Pastikan column sesuai (Nama, No Telepon, Peran, dll)

---

## Tips Manajemen Pengguna

:::tip
**1. Password Standar**
- Untuk batch create, gunakan password standar (12345678)
- Pengguna bisa ganti sendiri di profile
- Jangan share password plaintext via chat

**2. Nomor Telepon Unik**
- Pastikan setiap pengguna punya nomor telepon unik
- Nomor adalah identifier penting di sistem
- Jangan create 2 akun dengan nomor sama

**3. Peran yang Tepat**
- Assign peran sesuai job description
- Jangan assign superadmin ke semua orang
- Review peran berkala (terutama saat promosi/resign)

**4. Rayon Assignment**
- Pastikan setiap pengguna assign ke rayon yang tepat
- Satgas hanya bisa lihat rayon mereka sendiri
- Admin bisa lihat semua rayon (tergantung role)

**5. Deactivation**
- Jangan delete akun, gunakan deactivate
- Ini untuk audit trail & compliance
- Jika perlu restore, bisa re-activate
:::

---

**Butuh bantuan user management?** Lihat [FAQ & Bantuan](../faq.md) atau hubungi admin sistem Anda.
