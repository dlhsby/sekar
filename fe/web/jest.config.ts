import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.ts and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.next/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/types/**',                  // Exclude TypeScript type definitions (no runtime code)
    '!src/app/**/page.tsx',           // Exclude Next.js pages (tested via E2E)
    '!src/app/**/layout.tsx',         // Exclude Next.js layouts
    '!src/app/**/loading.tsx',        // Exclude Next.js loading states
    '!src/app/**/error.tsx',          // Exclude Next.js error pages
    '!src/app/**/not-found.tsx',      // Exclude Next.js not-found pages
    '!src/components/maps/**',        // Mapbox GL requires WebGL — cannot run in jsdom
    '!src/sw/**',                     // Service worker — runs in browser SW context, not jsdom
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
