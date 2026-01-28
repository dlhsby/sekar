module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-redux|@react-navigation|react-native-vector-icons|react-native-geolocation-service|react-native-image-picker|react-native-permissions|react-native-fs|@reduxjs|immer|react-native-svg)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/@env.js',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/types/**', // Exclude type definitions
    '!src/**/*EXAMPLE*.{ts,tsx}', // Exclude example files
    '!src/**/*Test.tsx', // Exclude test-like files that aren't actual tests
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Coverage thresholds - MVP baseline, increase as coverage improves
  // Current: ~45% statements, ~45% branches, ~43% functions, ~45% lines
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 30,
      functions: 30,
      lines: 30,
    },
    // Higher thresholds for critical modules (must maintain)
    'src/components/common/*.tsx': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    'src/store/slices/offlineSlice.ts': {
      statements: 90,
      branches: 70,
      functions: 90,
      lines: 90,
    },
    'src/utils/gpsUtils.ts': {
      statements: 85,
      branches: 75,
      functions: 80,
      lines: 85,
    },
    'src/services/media/mediaService.ts': {
      statements: 80,
      branches: 60,
      functions: 90,
      lines: 80,
    },
  },
};
