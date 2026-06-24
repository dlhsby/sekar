---
title: Ekspor & Impor Data
sidebar_position: 1
---

# Ekspor dan Impor Data

Panduan untuk admin mengekspor dan mengimpor data dalam sistem SEKAR.

## Apa itu Ekspor & Impor?

- **Ekspor** — Mengeluarkan data dari SEKAR ke file (Excel, CSV, PDF)
- **Impor** — Memasukkan data dari file ke dalam SEKAR

Fitur ini berguna untuk:

- Backup & restore data
- Analisis data di Excel
- Batch update data
- Integrasi dengan sistem lain

---

## Ekspor Data

![Export web](/img/web/export.png)

*Halaman ekspor data.*

### Membuka Fitur Ekspor

1. Dashboard web → Menu **"Operasional"**
2. Pilih **"Ekspor Data"** atau **"Export"**

### Jenis Data yang Bisa Dieksport

- **Pengguna** — Daftar semua pengguna
- **Laporan** — Semua laporan aktivitas
- **Tugas** — Daftar tugas
- **Area** — Master area
- **Rayon** — Master rayon
- **Tanaman** — Katalog tanaman (untuk phase 3+)
- **Lembur** — History lembur pekerja

### Form Ekspor

```
┌──────────────────────────────────┐
│   EKSPOR DATA                   │
├──────────────────────────────────┤
│ JENIS DATA *                    │
│ [Pilih: Laporan Aktivitas ▼]    │
│                                 │
│ PERIODE *                       │
│ Dari: [24/06/2026 ▼]           │
│ Sampai: [24/06/2026 ▼]         │
│                                 │
│ FORMAT *                        │
│ ○ Excel (.xlsx)                │
│ ○ CSV (.csv)                   │
│ ○ PDF (.pdf)                   │
│                                 │
│ FILTER (Optional)               │
│ [Peran: Semua ▼]               │
│ [Status: Semua ▼]              │
│ [Rayon: Semua ▼]               │
│                                 │
│ [DOWNLOAD]  [BATAL]             │
└──────────────────────────────────┘
```

### Langkah-Langkah Ekspor

1. **Pilih Jenis Data** — Apa yang ingin dieksport
2. **Pilih Periode** — Tanggal range
3. **Pilih Format**:
   - **Excel** — Buat pivot table, filter di Excel
   - **CSV** — Untuk import ke sistem lain
   - **PDF** — Untuk cetak/report resmi
4. **Filter** (optional) — Ekspor hanya data tertentu
5. **Download** — File akan didownload ke perangkat

### Contoh Hasil Ekspor Excel

```
Laporan Aktivitas - Juni 2026

Tanggal     | Pekerja         | Aktivitas              | Status    | Rating
────────────────────────────────────────────────────────────────────────
24/06/2026  | Ahmad Rizki     | Pembersihan Area Gerbang | Disetujui | ⭐⭐⭐⭐⭐
24/06/2026  | Budi Santoso    | Pemeliharaan Tanaman    | Disetujui | ⭐⭐⭐⭐
24/06/2026  | Citra Dewi      | Perbaikan Kursi         | Ditolak   | ⭐⭐
```

---

## Impor Data

![Import web](/img/web/import.png)

*Halaman impor data.*

### Membuka Fitur Impor

1. Dashboard web → Menu **"Operasional"**
2. Pilih **"Impor Data"** atau **"Import"**

### Jenis Data yang Bisa Diimpor

- **Pengguna** — Batch create pengguna baru
- **Area** — Import daftar area dari file
- **KMZ** — Import boundary area dari Google Earth (.kmz file)

### Proses Impor

#### Langkah 1: Siapkan File

File harus dalam format yang benar:

**Untuk Pengguna (Excel/CSV):**
```
Nama Lengkap    | Nomor Telepon | Password  | Peran   | Rayon
────────────────────────────────────────────────────────────────
Ahmad Rizki     | 081234567890  | pwd123    | Satgas  | Pusat
Budi Santoso    | 081234567891  | pwd123    | Satgas  | Pusat
Citra Dewi      | 081234567892  | pwd123    | Korlap  | Pusat
```

**Untuk Area (Excel/CSV):**
```
Nama Area       | Tipe Area   | Rayon       | Luas (m2)
─────────────────────────────────────────────────────
Taman Bungkul   | Park        | Taman Aktif | 25000
Area Parkir     | Parking     | Pusat       | 5000
Area Bermain    | Playground  | Pusat       | 3000
```

#### Langkah 2: Upload File

1. Buka halaman **"Impor Data"**
2. Pilih jenis data yang ingin diimpor
3. Drag & drop file atau klik **"Pilih File"**
4. Pilih file Excel/CSV yang sudah disiapkan
5. Tap **"Validasi"** atau **"Preview"**

#### Langkah 3: Review & Validate

Sistem akan menampilkan preview:

```
VALIDASI DATA - PENGGUNA (3 rows)

✓ Row 1 - Ahmad Rizki - Valid
✓ Row 2 - Budi Santoso - Valid
✗ Row 3 - Citra Dewi - Error: No. telepon sudah terdaftar

Total Valid: 2
Total Error: 1

Lanjutkan import 2 rows yang valid? [Ya]  [Batal]
```

#### Langkah 4: Konfirmasi Import

1. Review hasil validasi
2. Jika ada error, kembali edit file
3. Tap **"Ya, Lanjutkan Import"**
4. Sistem akan import data
5. Report hasil import akan ditampilkan:
   ```
   ✓ Import Selesai
   
   Total rows processed: 3
   Success: 2
   Failed: 1
   
   Data yang berhasil sudah tersimpan di sistem.
   Cek log di bawah untuk detail error.
   ```

---

## Backup & Restore

### Backup Data

Beberapa sistem allow Anda membuat backup komprehensif:

1. Dashboard → **"Backup"** atau **"System"**
2. Tap **"Create Backup"**
3. Sistem akan backup semua data:
   - Pengguna
   - Laporan
   - Tugas
   - Area/Rayon
   - Logs
4. File backup akan tersimpan (biasanya di cloud storage)
5. Anda bisa download untuk disimpan lokal

### Restore Data

Jika perlu restore data:

1. **Hubungi Admin Sistem** — Restore adalah operasi sensitive
2. Admin akan verify sebelum melakukan restore
3. Restore akan mengembalikan data ke point tertentu

:::warning
**Backup adalah CRITICAL** — Lakukan backup berkala (minimal weekly).
:::

---

## KMZ Import (Area Boundaries)

### Import Area Boundaries dari Google Earth

Untuk import boundary area dari KMZ file:

1. Buka halaman **"Impor Data"** → **"KMZ/Shapefile"**
2. Siapkan file KMZ dari Google Earth
3. Upload file
4. Sistem akan parse boundaries
5. Review dan assign ke area di sistem
6. Konfirmasi untuk simpan

---

## Troubleshooting Ekspor & Impor

### "File Ekspor Terlalu Besar"

**Solusi:**
- Pilih periode lebih pendek (ex: 1 bulan instead of 1 tahun)
- Ekspor per jenis data terpisah (users, reports, tasks)
- Gunakan filter untuk reduce data (ex: 1 rayon saja)

### "Import Gagal, Banyak Error"

**Solusi:**
1. Cek format file (pastikan Excel atau CSV)
2. Cek column names sesuai requirement
3. Cek tidak ada nomor telepon duplikat
4. Edit file, hapus rows yang error
5. Upload ulang

### "Data Tidak Terimpor Setelah Upload"

**Penyebab:**
- File belum divalidasi
- Ada validation error
- Belum dikonfirmasi import

**Solusi:**
1. Pastikan Anda sudah tap "Lanjutkan" setelah validasi
2. Cek report hasil import
3. Verify data sudah ada di sistem

---

## Best Practices

:::tip
**1. Backup Berkala**
- Lakukan backup minimal seminggu sekali
- Simpan backup di lokasi aman (cloud/external drive)

**2. Validasi Sebelum Import**
- Jangan langsung import tanpa review
- Cek file di Excel dulu sebelum import
- Validate hasil import

**3. Dokumentasi**
- Catat kapan backup dilakukan
- Catat file ekspor yang penting
- Maintain audit trail

**4. Testing Import**
- Jika ada perubahan data besar, test di staging dulu
- Jangan langsung import ke production
- Verify hasil sebelum declare sukses
:::

---

**Butuh bantuan ekspor/impor?** Lihat [FAQ & Bantuan](../faq.md) atau hubungi admin sistem.
