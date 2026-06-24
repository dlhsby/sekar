---
title: Monitoring Tim Real-Time
sidebar_position: 1
---

# Monitoring Tim Secara Real-Time

Panduan lengkap untuk Korlap memantau posisi dan kehadiran tim di peta live.

## Apa itu Monitoring?

**Monitoring** adalah fitur untuk melihat posisi tim Anda secara real-time di peta. Sebagai Korlap, Anda bisa:

- **Lihat Posisi Real-Time** — Melihat lokasi setiap satgas/linmas di peta
- **Pantau Kehadiran** — Cek siapa yang sudah absen masuk/keluar
- **Lihat Riwayat Lokasi** — Track jalur perjalanan satgas sepanjang hari
- **Analisis Cakupan Kerja** — Lihat area mana saja yang sudah dikerjakan

---

## Membuka Monitoring

### Cara 1: Dari Menu

1. Buka tab **Menu** (☰)
2. Tap **"Monitoring"**
3. Peta live akan terbuka

### Cara 2: Dari Beranda

1. Buka tab **Beranda**
2. Scroll ke section **"Monitoring Tim"**
3. Tap untuk membuka peta live

---

## Tampilan Monitoring

### Peta Live

```
┌─────────────────────────────────┐
│ [🔍] Cari Area    [⚙️] Filter   │ ← Header
├─────────────────────────────────┤
│                                 │
│  ╔═══════════════════════════╗  │
│  ║                           ║  │
│  ║   [Peta dengan Marker]    ║  │
│  ║                           ║  │
│  ║  🟢 Ahmad (Satgas)        ║  │
│  ║     Taman Bungkul         ║  │
│  ║     07:15 ONLINE          ║  │
│  ║                           ║  │
│  ║  🔵 Budi (Satgas)         ║  │
│  ║     Area Parkir           ║  │
│  ║     OFFLINE               ║  │
│  ║                           ║  │
│  ║  🔴 (Offline: 5 orang)   ║  │
│  ║                           ║  │
│  ╚═══════════════════════════╝  │
│                                 │
│ [Tampilkan List]   [Terapkan] │
└─────────────────────────────────┘
```

### Elemen Peta

**Marker (Penanda):**
- 🟢 **Hijau** — Pekerja online, tercatat dan sedang bekerja
- 🔵 **Biru** — Pekerja sedang break/tidak aktif
- 🔴 **Merah** — Pekerja offline atau tidak tercatat

**Informasi per Marker:**
- Nama pekerja
- Peran (Satgas, Linmas)
- Area atau lokasi saat ini
- Status koneksi (ONLINE/OFFLINE)

---

## Filter & Pencarian

### Filter Monitoring

Di header peta, ada beberapa filter:

**1. Filter Status:**
- Online — Hanya tampilkan yang online
- Offline — Hanya tampilkan yang offline
- Semua — Tampilkan semua

**2. Filter Area:**
- Taman Bungkul
- Area Parkir
- Lainnya sesuai area di rayon Anda

**3. Filter Peran:**
- Satgas — Hanya tampilkan satgas
- Linmas — Hanya tampilkan linmas
- Semua — Semua peran

### Mencari Pekerja

1. Tap tombol **[🔍] Cari** di atas peta
2. Ketik nama pekerja
3. Pekerja yang dicari akan di-highlight di peta
4. Peta akan zoom ke lokasi pekerja tersebut

---

## Melihat Detail Pekerja

### Tap Marker untuk Detail

1. Tap **salah satu marker** (dot pekerja) di peta
2. Kartu detail pekerja akan muncul

### Informasi Detail

```
┌─────────────────────────────────┐
│ AHMAD RIZKI                     │
│ Satgas                          │
├─────────────────────────────────┤
│ STATUS: 🟢 ONLINE              │
│                                 │
│ LOKASI SAAT INI                 │
│ Taman Bungkul                   │
│ Latitude: -7.295479             │
│ Longitude: 112.762227           │
│ Akurasi: ±8m                    │
│                                 │
│ SHIFT HARI INI                  │
│ Shift 1 (06:00 - 14:00)        │
│                                 │
│ KEHADIRAN                       │
│ Masuk: 06:15 ✓ (tepat waktu)   │
│ Keluar: — (belum keluar)        │
│                                 │
│ [LIHAT RIWAYAT]  [HUBUNGI]     │
└─────────────────────────────────┘
```

**Informasi Ditampilkan:**
- Nama, peran, status koneksi
- Lokasi GPS saat ini dengan akurasi
- Shift hari ini
- Status kehadiran (masuk/keluar)
- Waktu update lokasi terakhir

---

## Riwayat Lokasi Pekerja

### Melihat Jalur Perjalanan

1. Dari kartu detail pekerja, tap **"[LIHAT RIWAYAT]"** atau **"Location History"**
2. Peta akan menampilkan jalur perjalanan

### Tampilan Riwayat

```
Jalur Perjalanan: Ahmad Rizki (24 Juni 2026)

[Peta dengan garis jalur]

▲ 06:15 — Absen Masuk di Taman Bungkul
▬ 06:30 — Bergerak ke Area Playground
● 06:45 — Stop di Area Playground (10 menit)
● 07:00 — Ambil Foto Laporan
▬ 07:15 — Bergerak ke Area Pohon
● 07:30 — Stop di Area Pohon (45 menit)
● 08:15 — Ambil Foto Laporan
▬ 08:30 — Bergerak kembali ke Gerbang
```

**Informasi Riwayat:**
- Garis jalur menunjukkan perjalanan
- Titik penting (lokasi stop, laporan, kehadiran)
- Waktu dan durasi di setiap lokasi
- Link ke laporan jika ada foto

:::note
Riwayat lokasi sangat berguna untuk:
- Verifikasi coverage area kerja
- Cek apakah pekerja sudah kerjakan area yang ditugaskan
- Lihat pola kerja pekerja
:::

---

## Kehadiran & Shift Hari Ini

### Summary Kehadiran Tim

Di halaman Monitoring, ada section untuk ringkasan kehadiran:

```
KEHADIRAN HARI INI (24 Juni 2026)

Shift 1 (06:00 - 14:00)
✓ Masuk: 8 / 10 orang
⏰ Terlambat: 2 orang
⏱️ Belum Masuk: 0 orang

Shift 2 (14:00 - 22:00)
✓ Masuk: 7 / 10 orang
⏰ Terlambat: 1 orang
⏱️ Belum Masuk: 2 orang

Shift 3 (22:00 - 06:00)
✓ Masuk: 5 / 6 orang
⏰ Terlambat: 0 orang
⏱️ Belum Masuk: 1 orang
```

Ini membantu Anda cepat lihat overview kehadiran sebelum cek detail per orang.

---

## Area Kerja & Boundaries

### Lihat Area Boundaries

Peta Monitoring menampilkan:

- **Garis Boundary** — Batas area kerja (digambar dengan garis polygon)
- **Nama Area** — Nama area yang ditampilkan
- **Warna Area** — Untuk membedakan area satu dengan lain

### Verifikasi Cakupan Kerja

Dengan melihat riwayat lokasi & boundaries:

1. Cek apakah jalur perjalanan satgas sudah cover area yang ditugaskan
2. Identifikasi area yang belum dikerjakan
3. Lihat foto laporan untuk verifikasi pekerjaan

:::tip
**Pro Tip:** Bandingkan riwayat lokasi dengan laporan aktivitas. Area yang dikerjakan harus ada foto laporan.
:::

---

## Komunikasi dari Monitoring

### Hubungi Satgas Langsung

Dari kartu detail pekerja, Anda bisa:

1. Tap tombol **"[HUBUNGI]"**
2. Pilih cara komunikasi:
   - **Chat** — Kirim pesan teks
   - **Telepon** — Hubungi langsung
   - **Kirim Notifikasi** — Notifikasi push ke pekerja

### Kirim Notifikasi Urgent

Jika perlu komunikasi cepat:

1. Tap pekerja di peta
2. Tap **"Kirim Notifikasi"** atau **"Send Alert"**
3. Ketik pesan (contoh: "Ahmad, selesaikan area playground dulu")
4. Pekerja akan dapat notifikasi push

---

## Export Data Monitoring

### Download Laporan Monitoring

Beberapa rayon memiliki fitur export:

1. Di halaman Monitoring, cari tombol **"Export"** atau **"Laporan"**
2. Pilih format:
   - **PDF** — Untuk cetak/laporan resmi
   - **Excel** — Untuk analisis lebih lanjut
3. Pilih tanggal range yang ingin diexport
4. Tap **"Download"**
5. File akan tersimpan di perangkat Anda

---

## Offline Monitoring

### Monitoring Saat Offline

Jika aplikasi/dashboard offline:

- Peta akan menampilkan **data terakhir** yang tersimpan lokal
- Posisi akan berupa **snapshot terakhir**, bukan real-time
- Status akan berubah otomatis saat koneksi kembali

Pastikan koneksi stabil saat melakukan monitoring penting.

---

## Troubleshooting Monitoring

### "Marker Pekerja Tidak Muncul di Peta"

**Penyebab:**
- Pekerja belum absen masuk
- Pekerja offline dan tidak rekam GPS
- Ada masalah konek

**Solusi:**
1. Cek apakah pekerja sudah absen masuk
2. Hubungi pekerja untuk cek status GPS
3. Refresh peta atau restart aplikasi
4. Pastikan koneksi internet stabil

### "Posisi Tidak Update (Stuck di Lokasi Lama)"

**Penyebab:**
- Koneksi internet pekerja terputus
- GPS tidak akurat di area tertutup
- Aplikasi macet di perangkat pekerja

**Solusi:**
1. Hubungi pekerja untuk cek koneksi
2. Minta pekerja restart aplikasi
3. Tunggu beberapa menit, biasanya update otomatis

### "Tidak Bisa Lihat Riwayat Lokasi"

**Penyebab:**
- Data riwayat belum tersimpan cukup
- Koneksi internet putus saat loading

**Solusi:**
1. Pastikan koneksi internet aktif
2. Tunggu beberapa saat
3. Refresh halaman
4. Hubungi admin jika masalah berlanjut

---

## Tips Monitoring Efektif

:::tip
**1. Monitor Rutin**
- Cek peta monitoring minimal 2-3 kali per shift
- Identifikasi area yang belum dikerjakan

**2. Verifikasi dengan Laporan**
- Bandingkan riwayat lokasi dengan laporan aktivitas
- Pastikan semua area ada dokumentasi

**3. Komunikasi Proaktif**
- Jika ada pekerja offline lama, hubungi langsung
- Jika ada area belum dikerjakan, tugaskan lagi

**4. Analisis Pola Kerja**
- Lihat riwayat lokasi untuk pahami efficiency pekerja
- Identifikasi area problem (sering dikerjakan tapi sering rusak lagi)

**5. Export & Report**
- Export data monitoring berkala untuk laporan ke kepala rayon
- Gunakan untuk analisis dan evaluasi kinerja
:::

---

**Butuh bantuan monitoring?** Lihat [FAQ & Bantuan](../faq.md) atau hubungi admin Anda.
