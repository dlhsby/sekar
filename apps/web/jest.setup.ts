import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// `waitFor` (and every other async util) carries its OWN 1000 ms budget, which
// is NOT `testTimeout` — a suite can sit at testTimeout: 30000 and still fail in
// one second. With 167 suites running cores-1 wide, a react-query hook that
// settles instantly on an idle machine routinely misses that 1 s under CPU
// contention, which showed up as a DIFFERENT one or two suites failing per run
// while every one of them passed in isolation. Raising only the async-util
// budget keeps the real per-test ceiling where it was: a genuinely hung
// assertion still fails, just not because a neighbouring worker was busy.
configure({ asyncUtilTimeout: 5000 });
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
