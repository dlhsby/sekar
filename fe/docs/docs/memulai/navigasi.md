---
title: Navigasi Aplikasi & Dashboard
sidebar_position: 3
---

# Navigasi Aplikasi & Dashboard Web SEKAR

Panduan untuk memahami tata letak dan navigasi di aplikasi mobile dan dashboard web SEKAR.

## Aplikasi Mobile SEKAR

<p align="center"><img src="/img/mobile/menu.png" alt="Menu aplikasi" width="280" /></p>

*Menu navigasi aplikasi mobile.*

### Tata Letak Utama

Aplikasi mobile SEKAR memiliki tiga area utama:

```
┌─────────────────────────────────┐
│  [← Back]  Halaman   [⊙ Status] │  ← Header
├─────────────────────────────────┤
│                                 │
│      KONTEN HALAMAN UTAMA       │
│      (berganti sesuai tab)      │
│                                 │
│                                 │
├─────────────────────────────────┤
│  🏠 Home  |  ☰ Menu  | 👤 Profil │  ← Bottom Tab Bar
└─────────────────────────────────┘
```

### Header (Di Paling Atas)

**Halaman Utama (Home, Menu, Profil):**
- Tombol **Kembali** (jika di halaman sub)
- Judul halaman
- **Status Koneksi** (Online/Offline/Sinkronisasi) di kanan

**Halaman Detail (Tugas, Laporan, dll):**
- Tombol **Kembali** (← panah) untuk kembali
- Nama halaman detail
- Status koneksi

### Bottom Tab Bar (Di Bagian Bawah)

Aplikasi SEKAR memiliki 3 tab utama yang selalu tersedia untuk semua peran:

#### 1. **Beranda (Home)** 🏠

Halaman utama yang menampilkan:

- **Kartu Kehadiran**: Waktu absen masuk/keluar hari ini
- **Status Lembur**: Jika ada lembur yang sedang berlangsung
- **Info Singkat**: Area yang ditugaskan, jadwal kerja hari ini
- **Tombol Floating**: Untuk akses cepat ke absen masuk/keluar

:::note
Di halaman Beranda, Anda bisa langsung tap tombol besar untuk absen masuk atau keluar tanpa perlu buka menu.
:::

#### 2. **Menu (☰)** 

Menu adalah launcher untuk semua fitur lainnya. Isi menu berbeda tergantung peran Anda:

**Untuk Satgas/Linmas (Pekerja):**
- Absen (Clock In/Out)
- Lembur
- Tugas
- Aktivitas
- Jadwal
- Profil

**Untuk Korlap (Koordinator):**
- Monitoring
- Kelola Tugas
- Validasi Laporan
- Analitik Tim
- Profil

**Untuk Kepala Rayon & Manajemen:**
- Monitoring
- Laporan
- Analitik
- Data Master
- Profil

:::tip
**Menu seperti aplikasi launcher** — ketuk ikon untuk membuka halaman fitur tersebut.
:::

#### 3. **Profil (👤)**

Halaman profil Anda dengan:

- Foto profil
- Nama lengkap dan nomor telepon
- Peran/jabatan
- Informasi rayon dan area
- **Pengaturan** — Ubah kata sandi, notifikasi, bahasa
- **Diagnostik** — Informasi teknis perangkat dan versi aplikasi
- **Keluar** — Logout dari aplikasi

---

## Dashboard Web SEKAR

![Dashboard web SEKAR](/img/web/dashboard.png)

*Tampilan dashboard web SEKAR.*

### Tata Letak Utama

Dashboard web memiliki struktur 3 bagian:

```
┌──────────────────────────────────────────────────┐
│  SEKAR Logo  │  Navigasi  │  [👤 Avatar] [⚙️ ⚪] │ ← Header
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────┐                                  │
│  │   Sidebar  │    KONTEN HALAMAN UTAMA         │
│  │            │                                  │
│  │  Dashboard │    (berbeda per halaman)       │
│  │  Users     │                                  │
│  │  Rayon     │                                  │
│  │  Laporan   │                                  │
│  │  dll       │                                  │
│  │            │                                  │
│  └────────────┘                                  │
└──────────────────────────────────────────────────┘
```

### Header Web

Di bagian atas dashboard web:

- **Logo SEKAR** di sebelah kiri
- **Judul Halaman** di tengah
- **Avatar Anda** di sebelah kanan (klik untuk menu)
- **Mode Gelap/Terang** toggle (bulatan ⚪)

### Sidebar (Menu Kiri)

Sidebar menampilkan menu navigasi utama. Isi berbeda tergantung peran Anda:

**Untuk Admin Data & Admin Sistem:**

```
📊 Dashboard
👥 Pengguna
📍 Rayon & Area
🌿 Data Master
  - Tanaman
  - Bibit
  - Aset
📋 Operasional
  - Laporan
  - Ekspor/Impor
```

**Untuk Kepala Rayon:**

```
📊 Dashboard
📋 Laporan
📈 Analitik
📍 Rayon Saya
🗺️ Monitoring
```

**Untuk Top Management:**

```
📊 Dashboard
📈 Analitik
📋 Laporan
👥 Pengguna
```

:::tip
Klik menu untuk membuka halaman tersebut. Halaman aktif akan disorot.
:::

### Konten Utama

Area tengah/kanan yang menampilkan:

- **Halaman Dashboard**: Grafik, statistik, kartu ringkasan
- **Daftar Data**: Tabel pengguna, laporan, area, dll
- **Form**: Untuk membuat/edit data
- **Detail**: Informasi lengkap suatu item

### Avatar & Pengaturan (Kanan Atas)

Klik avatar Anda untuk membuka menu:

- **Profil Saya** — Edit nama, foto, info pribadi
- **Pengaturan** — Notifikasi, bahasa, tema
- **Keluar** — Logout dari dashboard

---

## Navigasi Umum di Aplikasi Mobile

### Membuka Fitur dari Menu

1. Tap tab **Menu** (☰) di bagian bawah
2. Grid menu akan menampilkan berbagai fitur
3. Tap ikon fitur yang ingin dibuka
4. Tunggu halaman dimuat
5. Untuk kembali, tap tombol kembali (←) di header atau swipe dari tepi layar

### Membuka Laporan/Tugas dari List

1. Tap tab **Menu** > **Tugas** atau **Aktivitas**
2. Daftar akan menampilkan semua item
3. Tap item untuk membuka detailnya
4. Tap **Kembali** untuk kembali ke list

### Status Koneksi

Perhatikan status di header kanan atas:

- **🟢 ONLINE** — Aplikasi terhubung dengan server, semua fitur aktif
- **🔴 OFFLINE** — Aplikasi tidak terhubung, hanya bisa gunakan data lokal
- **🟡 SINKRONISASI** — Sedang mengunggah data ke server

:::warning
Jika status **OFFLINE**, pastikan koneksi internet aktif. Beberapa fitur mungkin tidak tersedia.
:::

---

## Navigasi Umum di Dashboard Web

### Berpindah Halaman

1. Klik menu di sidebar sebelah kiri
2. Halaman akan berganti
3. Gunakan browser back button (←) untuk kembali

### Membuka Data Detail

1. Klik halaman dari sidebar (misalnya "Pengguna")
2. Tabel atau list akan muncul
3. Klik baris atau tombol "Detail" untuk membuka detail item
4. Klik back atau klik menu lagi untuk kembali ke list

### Membuat Data Baru

1. Buka halaman (misalnya "Pengguna")
2. Cari tombol **"+ Baru"** atau **"+ Tambah"** (biasanya di atas tabel)
3. Form akan muncul
4. Isi data dan klik **"Simpan"**

### Filter & Pencarian

Di halaman list, Anda sering kali menemukan:

- **Kotak Pencarian** — Ketik untuk cari data
- **Filter Dropdown** — Pilih kriteria filter
- **Tombol Reset** — Untuk hapus semua filter

---

## Tips Navigasi

:::tip
**1. Perhatikan Status Koneksi** — Selalu cek apakah Anda online sebelum melakukan aksi penting.

**2. Gunakan Back Button** — Jangan tutup aplikasi, gunakan tombol kembali untuk navigasi normal.

**3. Menu vs Halaman Detail** — Menu adalah launcher, halaman detail adalah konten. Kembali dari detail akan bawa Anda ke menu atau halaman sebelumnya.

**4. Save Sebelum Keluar** — Jika mengedit data, pastikan klik "Simpan" sebelum kembali.
:::

---

**Butuh bantuan navigasi?** Lihat [FAQ & Bantuan](../faq.md) atau bagian panduan untuk peran Anda.
