import type { SeedContext } from '../lib/context';

/**
 * Seed 20 activity types across 4 roles (8 satgas + 5 linmas + 4 korlap + 3 admin_data).
 */
export async function seedActivityTypes(ctx: SeedContext): Promise<void> {
  ctx.log('🔧 Seeding Activity Types…');

  // Local IDs for activity types — keep exact literals from source
  const AT_PERAWATAN_ID = 'ddc94ad6-a625-4c27-964f-10f3a79a6794';
  const AT_PENANAMAN_ID = 'a8cf5d46-1435-413b-ae03-8ea135bd5fb3';
  const AT_PERANTINGAN_ID = '8a890970-5fc8-4672-ae6f-b945cb80bba5';
  const AT_PENYIRAMAN_ID = '2eaed437-c662-4285-b9a7-8c7d5d0755b7';
  const AT_PENYULAMAN_ID = '70c75e9a-df48-4c71-89d5-91978112103f';
  const AT_POTONG_RUMPUT_ID = '715b8196-8473-4afe-9103-adb6c2ee7c50';
  const AT_ANGKUT_SAMPAH_ID = 'eef48fdc-e235-4a03-9fc4-517cff92c8bb';
  const AT_LAINNYA_SATGAS_ID = '4153cd86-c6bf-4f06-b536-5016a74114d5';

  const AT_PATROLI_ID = 'dd7efc02-36fe-4e70-b4b5-bfa163fc3bb0';
  const AT_INSIDEN_ID = '3a37e00b-7702-4296-b387-96964b45e251';
  const AT_PERIKSA_FASILITAS_ID = 'b4e7c1a2-3d5f-4e8a-9b0c-1d2e3f4a5b6c';
  const AT_HALAU_PKL_ID = 'c5f8d2b3-4e6a-4f9b-8c1d-2e3f4a5b6c7d';
  const AT_LAINNYA_LINMAS_ID = 'd6a9e3c4-5f7b-4a0c-9d2e-3f4a5b6c7d8e';

  const AT_CEK_KENDARAAN_ID = 'e7b0f4d5-6a8c-4b1d-8e3f-4a5b6c7d8e9f';
  const AT_PATROLI_KORLAP_ID = 'f8c1a5e6-7b9d-4c2e-9f4a-5b6c7d8e9f0a';
  const AT_CEK_ALAT_ID = 'a9d2b6f7-8c0e-4d3f-8a5b-6c7d8e9f0a1b';
  const AT_LAINNYA_KORLAP_ID = 'b0e3c7a8-9d1f-4e4a-9b6c-7d8e9f0a1b2c';

  const AT_CEK_ABSENSI_ID = 'c1f4d8b9-0e2a-4f5b-8c7d-8e9f0a1b2c3d';
  const AT_ENTRI_LAPORAN_ID = 'd2a5e9c0-1f3b-4a6c-9d8e-9f0a1b2c3d4e';
  const AT_LAINNYA_ADMIN_DATA_ID = 'e3b6f0d1-2a4c-4b7d-8e9f-0a1b2c3d4e5f';

  // Satgas activities (8)
  await ctx.qr.query(
    `
    INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
      ($1, 'Perawatan', 'perawatan', 'Perawatan tanaman dan area', ARRAY['satgas'], TRUE),
      ($2, 'Penanaman', 'penanaman', 'Penanaman tanaman baru', ARRAY['satgas'], TRUE),
      ($3, 'Perantingan', 'perantingan', 'Pemangkasan ranting pohon', ARRAY['satgas'], TRUE),
      ($4, 'Penyiraman', 'penyiraman', 'Penyiraman tanaman', ARRAY['satgas'], TRUE),
      ($5, 'Penyulaman', 'penyulaman', 'Penggantian tanaman mati', ARRAY['satgas'], TRUE),
      ($6, 'Potong Rumput', 'potong_rumput', 'Pemotongan rumput', ARRAY['satgas'], TRUE),
      ($7, 'Angkut Sampah', 'angkut_sampah', 'Pengangkutan sampah', ARRAY['satgas'], TRUE),
      ($8, 'Lainnya', 'lainnya_satgas', 'Aktivitas satgas lainnya', ARRAY['satgas'], TRUE)
    ON CONFLICT (code) DO NOTHING;
  `,
    [
      AT_PERAWATAN_ID,
      AT_PENANAMAN_ID,
      AT_PERANTINGAN_ID,
      AT_PENYIRAMAN_ID,
      AT_PENYULAMAN_ID,
      AT_POTONG_RUMPUT_ID,
      AT_ANGKUT_SAMPAH_ID,
      AT_LAINNYA_SATGAS_ID,
    ],
  );
  ctx.log('  ✓ Created 8 Satgas Activity Types');

  // Linmas activities (5)
  await ctx.qr.query(
    `
    INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
      ($1, 'Patroli', 'patroli', 'Patroli keamanan area', ARRAY['linmas'], TRUE),
      ($2, 'Insiden', 'insiden', 'Pelaporan insiden keamanan', ARRAY['linmas'], TRUE),
      ($3, 'Memeriksa Kondisi Fasilitas', 'periksa_fasilitas', 'Pemeriksaan kondisi fasilitas', ARRAY['linmas'], TRUE),
      ($4, 'Halau PKL', 'halau_pkl', 'Penertiban pedagang kaki lima', ARRAY['linmas'], TRUE),
      ($5, 'Lainnya', 'lainnya_linmas', 'Aktivitas linmas lainnya', ARRAY['linmas'], TRUE)
    ON CONFLICT (code) DO NOTHING;
  `,
    [AT_PATROLI_ID, AT_INSIDEN_ID, AT_PERIKSA_FASILITAS_ID, AT_HALAU_PKL_ID, AT_LAINNYA_LINMAS_ID],
  );
  ctx.log('  ✓ Created 5 Linmas Activity Types');

  // Korlap activities (4)
  await ctx.qr.query(
    `
    INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
      ($1, 'Pengecekan Kendaraan', 'cek_kendaraan', 'Pemeriksaan kendaraan operasional', ARRAY['korlap'], TRUE),
      ($2, 'Patroli', 'patroli_korlap', 'Patroli area kerja', ARRAY['korlap'], TRUE),
      ($3, 'Pengecekan Alat', 'cek_alat', 'Pemeriksaan peralatan kerja', ARRAY['korlap'], TRUE),
      ($4, 'Lainnya', 'lainnya_korlap', 'Aktivitas korlap lainnya', ARRAY['korlap'], TRUE)
    ON CONFLICT (code) DO NOTHING;
  `,
    [AT_CEK_KENDARAAN_ID, AT_PATROLI_KORLAP_ID, AT_CEK_ALAT_ID, AT_LAINNYA_KORLAP_ID],
  );
  ctx.log('  ✓ Created 4 Korlap Activity Types');

  // Admin Data activities (3)
  await ctx.qr.query(
    `
    INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
      ($1, 'Cek Absensi', 'cek_absensi', 'Pengecekan data absensi', ARRAY['admin_data'], TRUE),
      ($2, 'Cek dan Entri Laporan', 'entri_laporan', 'Pengecekan dan entri laporan', ARRAY['admin_data'], TRUE),
      ($3, 'Lainnya', 'lainnya_admin_data', 'Aktivitas admin data lainnya', ARRAY['admin_data'], TRUE)
    ON CONFLICT (code) DO NOTHING;
  `,
    [AT_CEK_ABSENSI_ID, AT_ENTRI_LAPORAN_ID, AT_LAINNYA_ADMIN_DATA_ID],
  );
  ctx.log('  ✓ Created 3 Admin Data Activity Types');
}
