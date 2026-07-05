---
title: Pelacakan Lokasi GPS
sidebar_position: 2
---

# Pelacakan Lokasi GPS Real-Time

<p align="center"><img src="/img/illustrations/illo-location.svg" alt="Ilustrasi lokasi GPS" width="240" /></p>

Informasi lengkap tentang sistem pelacakan GPS di SEKAR dan cara kerjanya.

## Apa itu Pelacakan GPS?

**Pelacakan GPS** adalah fitur yang memungkinkan supervisor memantau posisi Anda secara real-time di peta saat sedang bekerja. Sistem mencatat:

- **Posisi Anda** — Latitude dan longitude lokasi Anda
- **Waktu Update** — Kapan terakhir posisi diperbarui
- **Akurasi** — Seberapa akurat GPS membaca posisi
- **Area Kerja** — Area mana yang Anda sedang kerjakan

## Mengapa GPS Harus Aktif?

:::warning
**GPS harus tetap aktif selama bekerja karena:**

1. **Verifikasi Lokasi** — Membuktikan Anda bekerja di area yang ditugaskan
2. **Keamanan** — Membantu menemukan Anda jika ada keadaan darurat
3. **Penilaian Kinerja** — Merekam jangkauan area kerja
4. **Akuntabilitas** — Menunjukkan Anda hadir di lokasi kerja
:::

## Mengaktifkan GPS

### Langkah Pertama Kali

Saat pertama kali buka aplikasi SEKAR, akan ada pop-up meminta izin GPS:

1. Ketuk **"Izinkan"** atau **"Allow"**
2. Pilih **"Izinkan Selalu"** atau **"Allow While Using the App"**
3. GPS akan mulai merekam posisi Anda

### Jika Sudah Aktif Sebelumnya

<p align="center"><img src="/img/mobile/gps.png" alt="Indikator GPS" width="280" /></p>

*Indikator status GPS di aplikasi.*

Periksa apakah GPS aktif di layar Beranda:

- **🟢 Status Hijau** = GPS sedang merekam
- **🔴 Status Merah** = GPS tidak aktif

### Cara Mengaktifkan GPS Manual

1. Buka **Pengaturan** perangkat
2. Cari **"Lokasi"** atau **"Location"**
3. Aktifkan **"Lokasi"** atau **"Location Services"**
4. Pilih mode **"Akurasi Tinggi"** atau **"High Accuracy"**
   - Ini menggabungkan GPS + WiFi + data seluler untuk akurasi terbaik
   - Menggunakan lebih banyak baterai, tapi GPS lebih akurat

---

## Mode GPS

### 1. Akurasi Tinggi (High Accuracy)

```
Menggunakan: GPS + WiFi + Data Seluler
Akurasi: ±5-10 meter
Baterai: Cepat habis
Rekomendasi: Gunakan ini saat bekerja
```

**Keuntungan:**
- Lokasi sangat akurat
- GPS fix lebih cepat

**Kerugian:**
- Baterai cepat habis
- Tidak cocok untuk hari penuh jika baterai terbatas

### 2. Hemat Baterai (Battery Saver)

```
Menggunakan: WiFi + Data Seluler saja (tanpa GPS)
Akurasi: ±50-100 meter
Baterai: Hemat
Rekomendasi: Jangan gunakan untuk kerja SEKAR
```

**Keuntungan:**
- Baterai tahan lebih lama

**Kerugian:**
- Akurasi kurang baik
- Mungkin tidak akurat untuk radius 100m
- Supervisor tidak bisa tracking dengan akurat

:::note
**Pilihan Terbaik**: Mode Akurasi Tinggi adalah standar untuk SEKAR agar data GPS akurat.
:::

### 3. Device Only (GPS Saja)

```
Menggunakan: GPS saja
Akurasi: ±10-15 meter (tapi perlu waktu lebih lama)
Baterai: Sedang
Rekomendasi: Alternatif jika WiFi tidak tersedia
```

---

## Cara Kerja Pelacakan

### Timeline GPS dalam Sehari

```
06:00 | Anda Absen Masuk
      | → GPS mulai merekam posisi setiap 30-60 detik
      | → Laporan real-time disampaikan ke supervisor
      |
10:00 | Anda sedang di area kerja
      | → Supervisor bisa lihat posisi Anda di peta live
      |
14:00 | Anda Absen Keluar
      | → GPS berhenti merekam
      | → Sistem merangkum riwayat lokasi dalam laporan
```

### Akurasi GPS

GPS bekerja dengan akurasi berbeda-beda tergantung:

| Faktor | Pengaruh |
|--------|----------|
| **Cuaca** | Cerah: akurat ±5m, Mendung: ±10m, Hujan: ±15-20m |
| **Area Kerja** | Di terbuka: akurat, Di bawah pohon rimbun: kurang akurat |
| **Sinyal** | Sinyal kuat: akurat, Sinyal lemah: tidak akurat |
| **Waktu** | Pertama kali digunakan: perlu 30-60 detik |

:::warning
**Jika akurasi buruk:**
- Tunggu 1-2 menit untuk GPS fix
- Coba pindah ke area yang lebih terbuka
- Pastikan mode lokasi "Akurasi Tinggi"
:::

---

## Monitoring Oleh Supervisor

### Apa yang Bisa Dilihat Supervisor?

Supervisor (Korlap, Kepala Rayon, Manajemen) bisa melihat:

- **Peta Live** — Posisi tim Anda di peta real-time
- **Marker Lokasi** — Simbol lokasi setiap pekerja
- **Riwayat Lokasi** — Jalur perjalanan Anda sepanjang hari
- **Titik Aktivitas** — Tempat Anda mengambil foto laporan
- **Laporan Jangkauan** — Area mana saja yang sudah Anda kerjakan

### Bagaimana Supervisor Memantau?

Supervisor membuka:

1. **Aplikasi SEKAR** → Tab **Menu** → **Monitoring**
2. Atau **Dashboard Web** → **Monitoring**
3. Peta akan menampilkan posisi tim secara real-time

---

## Privasi & Keamanan GPS

### Apakah GPS Tracking Privasi Saya?

:::note
**Ya, ini adalah bagian dari pekerjaan.** GPS digunakan untuk:

- ✓ Verifikasi Anda hadir di lokasi kerja
- ✓ Keamanan Anda di lapangan
- ✓ Dokumentasi area kerja
- ✓ Penilaian kinerja

**Data GPS tidak digunakan untuk tracking di luar jam kerja.**
:::

### Kapan GPS Berhenti Merekam?

GPS akan berhenti merekam otomatis ketika:

1. Anda **absen keluar**
2. Anda **logout** dari aplikasi
3. Shift Anda **berakhir**

Setelah itu, supervisor tidak bisa lagi melihat posisi Anda.

---

## Hemat Baterai Saat GPS Aktif

### Tips Menghemat Baterai dengan GPS On

:::tip
**1. Kurangi Kecerahan Layar** 
- Atur kecerahan otomatis atau manual lebih redup
- Hemat 30-40% baterai

**2. Tutup Aplikasi Lain**
- WiFi, Bluetooth, aplikasi background yang tidak perlu
- Hemat 10-20% baterai

**3. Ganti Charger Portable**
- Bawa Power Bank 20,000 mAh
- Bisa charge 2-3 kali dalam sehari

**4. Gunakan Airplane Mode**
- Jika bekerja di area terpencil tanpa sinyal
- Kurangi power consumption
- (Tapi GPS tetap aktif)

**5. Atur Update Interval**
- Di Pengaturan aplikasi, ubah interval GPS update
- Dari 30 detik → 60 detik (lebih hemat, tapi kurang real-time)
- Koordinasikan dengan supervisor
:::

### Estimasi Pemakaian Baterai

```
Kondisi                 | Durasi Baterai
GPS ON, Layar Terang    | 4-5 jam
GPS ON, Layar Sedang    | 6-8 jam
GPS ON, Layar Redup     | 8-10 jam
GPS ON + Power Bank     | Full day + extra
```

:::warning
**Catatan**: Durasi bervariasi tergantung tipe perangkat dan aplikasi lain yang jalan.
:::

---

## Offline & GPS

### Apakah GPS Bisa Digunakan Offline?

**Ya, GPS bisa bekerja offline.**

```
Kondisi Koneksi | GPS Bisa Aktif? | Data Tercatat? | Sync Kapan?
Internet ON     | ✓ Ya           | ✓ Real-time   | Otomatis
Internet OFF    | ✓ Ya           | ✓ Lokal       | Saat online lagi
```

**Cara Kerjanya:**

1. Saat **online**: GPS data langsung dikirim ke server
2. Saat **offline**: GPS data disimpan di perangkat lokal
3. Saat **online lagi**: Data offline otomatis terupload (background sync)

:::note
Supervisor tidak bisa lihat posisi Anda real-time saat offline, tapi data akan tercatat lengkap saat synchronize.
:::

---

## Troubleshooting GPS

### "GPS Tidak Menemukan Sinyal"

**Penyebab:**
- Perangkat baru, GPS perlu warm-up
- Area tertutup bangunan atau pohon rimbun
- Cuaca sangat buruk

**Solusi:**
1. Tunggu 2-3 menit di area terbuka
2. Pindah ke lokasi yang lebih terbuka (tidak ada pohon tinggi)
3. Restart aplikasi
4. Restart perangkat jika masih gagal

### "GPS Akurasi Buruk / Meloncat-loncat"

**Penyebab:**
- Area tertutup atau sinyal lemah
- Interference dari bangunan tinggi

**Solusi:**
1. Tunggu beberapa menit untuk GPS stabilize
2. Ubah mode ke "Akurasi Tinggi" di Pengaturan
3. Jika area selalu bermasalah, laporkan ke supervisor

### "Baterai Cepat Habis dengan GPS"

**Solusi:**
1. Bawa Power Bank
2. Kurangi kecerahan layar
3. Tutup aplikasi background lain
4. Ubah interval GPS ke 60 detik (lebih hemat)
5. Gunakan Dark Mode di aplikasi (jika ada)

### "GPS Terus Minta Izin"

**Solusi:**
1. Buka Pengaturan > Aplikasi > SEKAR > Izin
2. Aktifkan "Lokasi"
3. Pilih "Izinkan Selalu" atau "Izinkan Saat Menggunakan Aplikasi"
4. Restart aplikasi

---

## FAQ GPS

**Q: Apakah supervisor bisa lihat saya 24/7?**
A: Tidak. GPS hanya aktif saat Anda absen masuk. Setelah absen keluar atau logout, GPS berhenti merekam.

**Q: Bagaimana jika saya bekerja di bawah pohon rimbun?**
A: GPS akan tetap bekerja, tapi akurasi bisa berkurang. Supervisor akan lihat data yang ada.

**Q: Bisa nonaktifkan GPS saat bekerja?**
A: Tidak disarankan. GPS adalah bagian dari verifikasi kehadiran.

**Q: Data GPS disimpan berapa lama?**
A: Data GPS disimpan di server minimal 90 hari untuk laporan dan audit.

---

**Butuh bantuan GPS?** Lihat [FAQ & Bantuan](../faq.md) atau hubungi IT Anda.
