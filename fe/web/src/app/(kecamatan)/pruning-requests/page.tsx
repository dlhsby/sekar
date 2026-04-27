/**
 * Phase 3 — staff_kecamatan submit page (web).
 *
 * The web submit flow is deferred to Phase 4 polish. For now, staff_kecamatan
 * users on web see a "use the mobile app" placeholder so they don't hit a 404
 * when the sidebar link in `lib/navigation.ts` resolves here.
 *
 * The mobile flow is fully functional (KecamatanNavigator → SubmitScreen).
 * See specs/phases/phase-3-plants-monitoring-rebuild/STATUS.md → "Open Items".
 */
export default function PruningSubmitPlaceholder() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md w-full rounded-nb-md border-2 border-nb-black bg-white p-6 shadow-nb-md">
        <h1 className="text-nb-h2 font-bold uppercase tracking-tight mb-2">
          Kirim Permintaan
        </h1>
        <p className="text-nb-body mb-4">
          Pengiriman permintaan pemotongan saat ini hanya tersedia di aplikasi
          mobile SEKAR. Versi web sedang dalam pengembangan dan akan tersedia
          pada fase berikutnya.
        </p>
        <p className="text-nb-body-sm text-nb-gray-600">
          Silakan unduh aplikasi mobile dan masuk dengan akun yang sama untuk
          mengirim permintaan.
        </p>
      </div>
    </div>
  );
}
