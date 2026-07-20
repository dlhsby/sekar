/**
 * Server-side page metadata (browser-tab titles + SEO descriptions), localized
 * id/en. Next.js `metadata` exports are static and can't read the client i18n
 * runtime, so route `layout.tsx`/`page.tsx` files use `generateMetadata()` with
 * `pageMetadata(key)` (see `server-metadata.ts`) which resolves the language from
 * the `sekar_lang` cookie. Default is Indonesian.
 *
 * This intentionally lives OUTSIDE `locales/` so it is not an i18next namespace
 * (no client bundle, not subject to the parity guardrail) — it is server data.
 * Keep the `id` and `en` key sets identical.
 */
export type PageMeta = { title: string; description: string };

export const PAGE_METADATA = {
  id: {
    root: {
      title: 'SEKAR - Sistem Evaluasi Kinerja Satgas RTH',
      description:
        'Platform monitoring dan evaluasi kinerja satgas RTH DLH Kota Surabaya. Pelacakan GPS real-time, manajemen tugas, jadwal shift, dan laporan aktivitas untuk pengelolaan taman dan ruang hijau.',
      ogLocale: 'id_ID',
    },
    login: { title: 'Masuk · SEKAR', description: 'Masuk ke dashboard SEKAR dengan username atau nomor ponsel Anda' },
    forgotPassword: { title: 'Lupa Sandi · SEKAR', description: 'Hubungi administrator Anda untuk mereset sandi SEKAR' },
    changePassword: { title: 'Ubah Sandi · SEKAR', description: 'Perbarui sandi SEKAR Anda' },
    monitoring: { title: 'Pemantauan Real-time · SEKAR', description: 'Pantau lokasi dan status real-time petugas lapangan RTH' },
    tasks: { title: 'Manajemen Tugas · SEKAR', description: 'Lihat dan kelola tugas pekerjaan satgas RTH' },
    activities: { title: 'Aktivitas · SEKAR', description: 'Lihat dan setujui laporan aktivitas satgas RTH' },
    overtime: { title: 'Lembur · SEKAR', description: 'Kelola dan setujui permintaan lembur satgas RTH' },
    users: { title: 'Manajemen Pengguna · SEKAR', description: 'Kelola pengguna dan penetapan peran di SEKAR' },
    locations: { title: 'Manajemen Lokasi · SEKAR', description: 'Kelola lokasi dan zona kerja di SEKAR' },
    districts: { title: 'Manajemen Rayon · SEKAR', description: 'Kelola rayon dan struktur organisasi RTH di SEKAR' },
    capacity: { title: 'Kapasitas Layanan · SEKAR', description: 'Kalender kapasitas layanan mingguan per rayon di SEKAR' },
    plants: { title: 'Tanaman · SEKAR', description: 'Katalog tanaman dan inventaris per area di SEKAR' },
    seeds: { title: 'Manajemen Bibit · SEKAR', description: 'Kelola inventaris bibit dan transaksi di SEKAR' },
    pruningRequests: { title: 'Permohonan Pemotongan · SEKAR', description: 'Kelola permohonan pemotongan pohon dari kecamatan' },
    notifications: { title: 'Notifikasi · SEKAR', description: 'Lihat notifikasi dan pembaruan SEKAR Anda' },
    profile: { title: 'Profil · SEKAR', description: 'Kelola profil dan preferensi pengguna SEKAR Anda' },
    settings: { title: 'Pengaturan · SEKAR', description: 'Kelola pengaturan sistem SEKAR' },
    import: { title: 'Import Data · SEKAR', description: 'Import data area, pengguna, dan jadwal ke SEKAR' },
    export: { title: 'Export Data · SEKAR', description: 'Export data dari SEKAR dalam format CSV atau XLSX' },
    kecamatanPortal: { title: 'SEKAR — Portal Kecamatan', description: 'Portal pengajuan permintaan pemotongan pohon kepada DLH Kota Surabaya' },
    pruningSubmit: { title: 'Ajukan Permohonan · SEKAR', description: 'Ajukan permohonan pemotongan pohon ke DLH Kota Surabaya' },
    iosDownload: { title: 'Unduh Aplikasi iOS · SEKAR', description: 'Unduh aplikasi mobile SEKAR untuk iOS.' },
    androidDownload: { title: 'Unduh Aplikasi Android · SEKAR', description: 'Unduh aplikasi mobile SEKAR untuk Android.' },
    androidX86Download: {
      title: 'Unduh Aplikasi Android (x86 / Emulator) · SEKAR',
      description:
        'Unduh varian x86/x86_64 aplikasi SEKAR untuk emulator dan PC (Android Studio, WSA, Google Play Games). HP biasa gunakan /android.',
    },
  },
  en: {
    root: {
      title: 'SEKAR - RTH Field-Staff Performance Evaluation System',
      description:
        'Performance monitoring and evaluation platform for DLH Surabaya RTH field staff. Real-time GPS tracking, task management, shift scheduling, and activity reporting for parks and green-space management.',
      ogLocale: 'en_US',
    },
    login: { title: 'Sign In · SEKAR', description: 'Sign in to the SEKAR dashboard with your username or phone number' },
    forgotPassword: { title: 'Forgot Password · SEKAR', description: 'Contact your administrator to reset your SEKAR password' },
    changePassword: { title: 'Change Password · SEKAR', description: 'Update your SEKAR password' },
    monitoring: { title: 'Real-time Monitoring · SEKAR', description: 'Monitor real-time locations and status of RTH field staff' },
    tasks: { title: 'Task Management · SEKAR', description: 'View and manage RTH field-staff work tasks' },
    activities: { title: 'Activities · SEKAR', description: 'View and approve RTH field-staff activity reports' },
    overtime: { title: 'Overtime · SEKAR', description: 'Manage and approve RTH field-staff overtime requests' },
    users: { title: 'User Management · SEKAR', description: 'Manage users and role assignments in SEKAR' },
    locations: { title: 'Location Management · SEKAR', description: 'Manage locations and work zones in SEKAR' },
    districts: { title: 'Rayon Management · SEKAR', description: 'Manage districts and the RTH organizational structure in SEKAR' },
    capacity: { title: 'Service Capacity · SEKAR', description: 'Weekly service-capacity calendar per rayon in SEKAR' },
    plants: { title: 'Plants · SEKAR', description: 'Plant catalog and per-area inventory in SEKAR' },
    seeds: { title: 'Seed Management · SEKAR', description: 'Manage seed inventory and transactions in SEKAR' },
    pruningRequests: { title: 'Pruning Requests · SEKAR', description: 'Manage tree-pruning requests from districts' },
    notifications: { title: 'Notifications · SEKAR', description: 'View your SEKAR notifications and updates' },
    profile: { title: 'Profile · SEKAR', description: 'Manage your SEKAR user profile and preferences' },
    settings: { title: 'Settings · SEKAR', description: 'Manage SEKAR system settings' },
    import: { title: 'Import Data · SEKAR', description: 'Import area, user, and schedule data into SEKAR' },
    export: { title: 'Export Data · SEKAR', description: 'Export data from SEKAR in CSV or XLSX format' },
    kecamatanPortal: { title: 'SEKAR — District Portal', description: 'Portal for submitting tree-pruning requests to DLH Surabaya' },
    pruningSubmit: { title: 'Submit Request · SEKAR', description: 'Submit a tree-pruning request to DLH Surabaya' },
    iosDownload: { title: 'Download iOS App · SEKAR', description: 'Download the SEKAR mobile app for iOS.' },
    androidDownload: { title: 'Download Android App · SEKAR', description: 'Download the SEKAR mobile app for Android.' },
    androidX86Download: {
      title: 'Download Android App (x86 / Emulator) · SEKAR',
      description:
        'Download the x86/x86_64 variant of the SEKAR app for emulators and PCs (Android Studio, WSA, Google Play Games). Regular phones use /android.',
    },
  },
};
