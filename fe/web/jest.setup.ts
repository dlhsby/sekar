import '@testing-library/jest-dom';
// Initialize i18next (id default) so components using t() render real copy in tests
// instead of raw keys. Mirrors the app runtime; no provider needed (global instance).
import '@/lib/i18n/config';

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3000';
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-google-maps-key';
process.env.NEXT_PUBLIC_APP_NAME = 'SEKAR';
process.env.NEXT_PUBLIC_APP_VERSION = '2.0.0';
