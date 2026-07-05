/**
 * Global manual mock for @sentry/react-native — the real package requires
 * TurboModule constants that don't exist in the jest environment. Applied
 * automatically for node_modules packages; crashReporting's own tests
 * override it per-case via jest.doMock with behavior-specific fakes.
 */
module.exports = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((cb) => cb({ setUser: jest.fn(), setTag: jest.fn() })),
};
