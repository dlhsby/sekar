---
title: FAQ & Bantuan
sidebar_position: 9
---

# Pertanyaan Umum & Troubleshooting

<p align="center"><img src="/img/illustrations/illo-search.svg" alt="Ilustrasi pencarian" width="240" /></p>

Kumpulan pertanyaan yang sering diajukan dan solusi umum untuk masalah yang mungkin Anda hadapi.

## Untuk Semua Pengguna

### Login & Akun

**Q: Bagaimana cara login?**
A: Lihat halaman [Cara Login](./memulai/login.md) untuk panduan lengkap. Username bisa nama pengguna atau nomor telepon, password adalah password Anda.

**Q: Lupa password, apa yang harus dilakukan?**
A: Klik "Lupa Kata Sandi?" di halaman login. Atau hubungi admin untuk reset password.

**Q: Bisa ganti password di aplikasi?**
A: Ya, buka **Menu → Profil → Pengaturan → Ganti Kata Sandi**.

**Q: Nomor telepon sudah berubah, apa bisa update?**
A: Hubungi admin untuk update nomor telepon di sistem.

**Q: Akun saya tidak bisa login, kenapa?**
A: Kemungkinan:
- Password salah (coba reset)
- Akun belum diaktifkan (hubungi admin)
- Nomor telepon tidak terdaftar (hubungi admin untuk register)

---

### Koneksi & Offline

**Q: Apa artinya status "OFFLINE"?**
A: Aplikasi tidak terhubung ke internet. Anda masih bisa gunakan fitur lokal (lihat riwayat, buat draft), tapi data tidak bisa upload sampai koneksi kembali.

**Q: Bagaimana jika GPS offline saat absen?**
A: Anda tetap bisa absen. Data akan disimpan lokal dan upload saat koneksi kembali.

**Q: Berapa lama data offline bisa disimpan?**
A: Data offline disimpan hingga 7 hari. Usahakan sinkronisasi setiap hari.

**Q: Koneksi putus saat upload laporan, apa yang terjadi?**
A: Laporan akan disimpan sebagai draft lokal. Saat koneksi kembali, tap "Upload" untuk kirim ke server.

---

### Notifikasi & Pesan

**Q: Tidak menerima notifikasi, kenapa?**
A: Kemungkinan:
- Notifikasi dimatikan di pengaturan perangkat (buka Pengaturan → Notifikasi → SEKAR)
- Mode senyap/DND aktif
- Aplikasi tidak punya izin notifikasi

**Q: Bagaimana cara mengubah setting notifikasi?**
A: Menu → Profil → Pengaturan → Notifikasi. Atur notifikasi per tipe (tugas baru, laporan validated, etc).

---

## Untuk Satgas / Linmas / Korlap

### Absen & Kehadiran

**Q: GPS tidak akurat / katanya di luar radius, padahal saya di area.**
A: Kemungkinan:
- GPS perlu waktu untuk fix (tunggu 1-2 menit)
- Berada di bawah pohon rimbun (pindah ke tempat lebih terbuka)
- Ubah mode lokasi ke "Akurasi Tinggi" di pengaturan
- **Sistem tidak akan block absen**, data akan tercatat untuk supervisor.

**Q: Absen berhasil tapi tidak muncul di halaman Beranda.**
A: Tutup aplikasi sepenuhnya, buka lagi, dan refresh halaman.

**Q: Terlihat terlambat, padahal saya hadir lebih awal.**
A: Kemungkinan timing GPS tidak akurat. Komunikasikan dengan supervisor dan sampaikan bukti (screenshot waktu).

**Q: Bisa absen untuk teman yang belum datang?**
A: **Tidak**. Absen harus dilakukan pekerja yang bersangkutan. Jika temanmu belum datang, laporkan ke supervisor.

---

### Laporan & Tugas

**Q: Laporan saya ditolak, apa harus buat yang baru?**
A: Ya, buat laporan baru dengan perbaikan sesuai feedback supervisor (deskripsi lebih detail, foto lebih jelas, dll).

**Q: Foto laporan tidak bisa di-upload, "file terlalu besar".**
A: Aplikasi seharusnya auto-compress foto. Coba:
- Ambil ulang foto dengan resolusi lebih rendah
- Kurangi jumlah foto (buat laporan terpisah jika perlu banyak)

**Q: Tidak terima notifikasi tugas baru dari korlap.**
A: Kemungkinan:
- Belum online saat korlap kirim tugas (sinkronisasi saat online)
- Notifikasi dimatikan
- Ada masalah teknis (cek daftar tugas di aplikasi)

**Q: Deadline tugas sudah lewat, apa boleh tetap submit?**
A: Boleh, tapi akan tercatat sebagai terlambat. Supervisor akan tahu.

---

### Lembur

**Q: Bagaimana cara mengajukan lembur?**
A: Lihat halaman [Mengajukan Lembur](./satgas/lembur.md) untuk panduan lengkap.

**Q: Ajuan lembur ditolak, kenapa?**
A: Cek feedback supervisor. Kemungkinan:
- Jadwal supervisor tidak memungkinkan
- Ada kebijakan lembur yang berbeda hari itu
- Perlu diskusi lebih lanjut

**Q: Boleh lembur tanpa ajuan sebelumnya?**
A: **Tidak disarankan**. Selalu ajukan terlebih dahulu. Jika terpaksa lembur tanpa ajuan, laporkan ke supervisor dengan penjelasan lengkap.

---

### Monitoring (Untuk Korlap)

**Q: Bisa lihat riwayat lokasi berapa lama?**
A: Biasanya 30-90 hari terakhir. Untuk data lebih lama, hubungi admin.

**Q: Marker pekerja tidak muncul di peta monitoring.**
A: Kemungkinan:
- Pekerja belum absen masuk
- Pekerja offline (GPS tidak aktif)
- Ada masalah server

---

## Untuk Kepala Rayon & Admin

### Dashboard & Laporan

**Q: Dashboard tidak menampilkan data terbaru.**
A: 
1. Refresh halaman (F5 atau pull-to-refresh)
2. Log out dan login lagi
3. Cek koneksi internet stabil
4. Restart browser jika masih gagal

**Q: Laporan saya berbeda dengan di dashboard pekerja, kenapa?**
A: Kemungkinan:
- Ada laporan yang belum divalidasi (status pending)
- Data belum sinkronisasi penuh (tunggu beberapa menit)
- Ada perbedaan timezone/waktu

**Q: Bagaimana cara export laporan untuk presentasi?**
A: Lihat halaman [Laporan & Analitik](./kepala-rayon/laporan.md). Export ke format PDF atau Excel.

---

### User Management

**Q: Tidak bisa membuat pengguna baru, "nomor sudah terdaftar".**
A: Nomor telepon harus unik. Cek di daftar pengguna apakah nomor sudah ada. Jika orang lain, hubungi admin untuk deactivate dulu.

**Q: Ingin ganti peran pengguna dari Satgas ke Korlap.**
A: Buka profil pengguna → Edit → Ubah peran ke Korlap → Simpan.

**Q: Bagaimana cara import banyak pengguna sekaligus?**
A: Lihat halaman [Kelola Pengguna](./admin/kelola-pengguna.md) untuk panduan import Excel.

---

## Troubleshooting Teknis

### Aplikasi Mobile

**Q: Aplikasi crash / sering force close.**
A: Solusi:
1. Restart aplikasi
2. Clear cache: Pengaturan → Aplikasi → SEKAR → Clear Cache
3. Uninstall dan install ulang
4. Hubungi admin jika masih crash (kirim error log)

**Q: Aplikasi berjalan lambat / lag.**
A: Solusi:
1. Tutup aplikasi lain yang berjalan
2. Clear cache aplikasi
3. Kurangi kecerahan layar (hemat power, lebih smooth)
4. Upgrade perangkat jika terlalu lama / spec rendah

**Q: Metro atau update stuck di progress bar.**
A: Solusi:
1. Tunggu 5-10 menit (jangan close)
2. Jika masih stuck, force stop aplikasi
3. Buka lagi

**Q: Storage penuh, aplikasi error.**
A: Solusi:
1. Buka Pengaturan → Penyimpanan
2. Hapus file/aplikasi yang tidak perlu
3. Restart perangkat
4. Buka aplikasi SEKAR lagi

---

### Dashboard Web

**Q: Halaman tidak load / loading forever.**
A: Solusi:
1. Refresh halaman (F5 atau Ctrl+Shift+R untuk hard refresh)
2. Clear browser cache
3. Gunakan browser lain (Chrome, Firefox, Safari)
4. Cek koneksi internet
5. Hubungi admin jika masih gagal

**Q: Tombol atau form tidak responsif.**
A: Solusi:
1. Refresh halaman
2. Check browser console untuk error (F12 → Console)
3. Coba browser lain
4. Clear cache browser dan login ulang

**Q: Laporan atau data tidak muncul di dashboard.**
A: Solusi:
1. Refresh halaman
2. Cek filter (mungkin ada filter yang menyembuyikan data)
3. Cek koneksi dan coba lagi
4. Logout dan login ulang

---

### Database & Data

**Q: Data yang saya buat kemarin tidak ada hari ini.**
A: Kemungkinan:
- Data belum sinkronisasi (pastikan online saat buat data)
- Ada error saat save (cek pesan error)
- Salah refresh area/rayon saat cek

**Q: Laporan yang saya submit tidak muncul di supervisor.**
A: Kemungkinan:
- Laporan belum terupload (cek status di aplikasi)
- Koneksi putus saat upload
- Ada error teknis

**Solusi:**
1. Cek status laporan di aplikasi ("Menunggu Validasi" = terkirim)
2. Jika masih draft, tap "Upload/Kirim"
3. Cek laporan Anda di halaman pekerja (dari supervisor)
4. Hubungi admin jika tetap tidak muncul

---

## Performance & Optimasi

### Smartphone Lemot?

**Hemat Baterai & Improve Performance:**

1. **Kurangi Kecerahan** — Pengaturan → Display → auto brightness atau 30-40%
2. **Tutup Background Apps** — Swipe up recent apps, close yang tidak perlu
3. **Update Aplikasi** — Pastikan SEKAR punya versi terbaru
4. **Clear Cache** — Pengaturan → Apps → SEKAR → Clear Cache (bukan Clear Data)
5. **Disable Bluetooth** — Jika tidak digunakan
6. **Restart Perangkat** — Setiap 1-2 hari untuk reset memory

### GPS Boros Baterai?

**Tips Hemat Saat GPS Aktif:**

1. **Gunakan Power Bank** — Cheap insurance untuk full-day shifts
2. **Reduce GPS Poll Interval** — Ubah dari 30 detik → 60 detik (hubungi admin)
3. **Disable WiFi/BT** — Saat tidak perlu (hanya gunakan 4G/cellular)
4. **Dark Mode** — Gunakan dark theme di aplikasi jika ada
5. **Lower Screen Brightness** — Battery saving tanpa sacrifice GPS accuracy

---

## Contact Support

### Cara Menghubungi Support

**Untuk Masalah Teknis:**
- **Chat/WhatsApp**: [Nomor Support — hubungi admin]
- **Email**: support@sekar.dlhsby.go.id
- **Telepon**: [Hotline — hubungi admin]

**Untuk Masalah Operasional:**
- Hubungi supervisor/Korlap Anda
- Atau kepala rayon

**Berikan Informasi Berikut Saat Menghubungi Support:**
- Nama dan nomor telepon Anda
- Role/peran Anda
- Deskripsi masalah (detail, jangan vague)
- Langkah-langkah yang sudah coba
- Error message (jika ada, screenshot)
- Device & OS (Android vX.X, iOS vX.X, Windows vX.X)

---

## Tips Menggunakan SEKAR Efektif

:::tip
**1. Update Aplikasi Berkala**
- Check Google Play Store / App Store untuk update
- Selalu gunakan versi terbaru untuk bug fixes & features

**2. Synchronize Setiap Hari**
- Pastikan semua data sudah upload (status ONLINE)
- Jangan tunggu berhari-hari untuk sync offline data

**3. Dokumentasi Baik**
- Deskripsi laporan jelas & detail
- Foto berkualitas (cahaya cukup, jelas)
- Tautan laporan dengan tugas yang sesuai

**4. Komunikasi**
- Jika ada masalah, hubungi supervisor/admin segera
- Jangan silent fail, report masalah untuk debugging

**5. Data Security**
- Jangan bagikan password dengan orang lain
- Logout setelah selesai pakai dashboard web
- Jangan save password di browser public computer
:::

---

## Tetap Update

Dokumentasi ini diperbarui berkala seiring fitur baru. **Bookmark halaman ini** untuk referensi cepat, atau hubungi admin untuk update terbaru.

---

**Tidak menemukan solusi?** Hubungi tim support melalui kontak di atas. Kami siap membantu! 🙌
