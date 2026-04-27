/**
 * Phase 3 — staff_kecamatan "My Requests" listing page (web).
 *
 * Web listing is deferred to Phase 4 polish. Mobile MyRequestsScreen is the
 * functional path for staff_kecamatan; the placeholder here just prevents a
 * 404 when the sidebar link resolves to this URL.
 *
 * See specs/phases/phase-3-plants-monitoring-rebuild/STATUS.md → "Open Items".
 */
export default function MyRequestsPlaceholder() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md w-full rounded-nb-md border-2 border-nb-black bg-white p-6 shadow-nb-md">
        <h1 className="text-nb-h2 font-bold uppercase tracking-tight mb-2">
          Permintaan Saya
        </h1>
        <p className="text-nb-body mb-4">
          Riwayat permintaan saat ini hanya tersedia di aplikasi mobile SEKAR.
          Versi web sedang dalam pengembangan dan akan tersedia pada fase
          berikutnya.
        </p>
        <p className="text-nb-body-sm text-nb-gray-600">
          Silakan buka aplikasi mobile untuk melihat riwayat permintaan Anda.
        </p>
      </div>
    </div>
  );
}
