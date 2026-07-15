import '@testing-library/jest-dom';
// Initialize i18next (id default) so components using t() render real copy in tests
// instead of raw keys. Mirrors the app runtime; no provider needed (global instance).
import '@/lib/i18n/config';

// jsdom lacks the pointer-capture + scrollIntoView APIs that Radix UI
// (Select/Popover/Dropdown) calls when opening — polyfill them so option
// selection can be driven in tests.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3000';
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-google-maps-key';
process.env.NEXT_PUBLIC_APP_NAME = 'SEKAR';
process.env.NEXT_PUBLIC_APP_VERSION = '2.0.0';
