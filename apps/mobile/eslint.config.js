const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const sekarDesign = require('eslint-plugin-sekar-design');
const reactHooks = require('eslint-plugin-react-hooks');

// ESLint 9+ flat config format
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '**/*.js.map',
      '**/*.config.js',
      '__tests__/**',
      '**/__tests__/**',
      // Generated token artifacts — produced by scripts/build-tokens.ts (ADR-036).
      'src/constants/generated/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js globals
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        // Jest globals
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'sekar-design': sekarDesign,
      'react-hooks': reactHooks,
    },
    rules: {
      // Basic rules for React Native
      'no-console': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Phase 3 M1-R 3-R1 — design-token discipline (ADR-036)
      'sekar-design/no-inline-hex-colors': 'error',
      'sekar-design/rn-no-shadow-radius': 'error',
      // i18n discipline — no hardcoded user-facing strings (CLAUDE.md §Internationalization)
      'sekar-design/no-untranslated-literal': 'error',
      // React Hooks discipline (registered 2026-06-09). rules-of-hooks is a hard
      // error (real bugs); exhaustive-deps is a warning (advisory — some omissions
      // are intentional and carry an inline disable).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Permanent allowlist — colors with no NB token equivalent or files that ARE the token source.
  // Full rationale in scripts/hex-allowlist.txt (ADR-036).
  {
    files: [
      // Token source files — hex is intentional
      'src/constants/nbTokens.ts',
      'src/utils/nbShadow.ts',
      // Map marker palette — #9333EA (outside_area) + specific status colors have no NB token
      'src/utils/mapUtils.ts',
      'src/components/monitoring/LocationTrail.tsx',
      // rayonCenterMarker #2563EB blue — no NB blue token
      'src/components/monitoring/BoundaryOverlay.tsx',
      // Documentation/example file — not production code
      'src/services/sync/INTEGRATION_EXAMPLE.tsx',
    ],
    rules: {
      'sekar-design/no-inline-hex-colors': 'off',
      'sekar-design/rn-no-shadow-radius': 'off',
    },
  },
  // Doc/example + dev-only files use literal strings intentionally — the i18n rule doesn't apply.
  {
    files: ['src/services/sync/INTEGRATION_EXAMPLE.tsx', 'src/navigation/TestNavigator.tsx'],
    rules: {
      'sekar-design/no-untranslated-literal': 'off',
    },
  },
  // Phase 3: Ban tracksViewChanges={true} in monitoring/ — it causes bitmap redraw thrash.
  // All monitoring markers must use tracksViewChanges={false} (the default).
  // Reference: Apr 24 stability fixes in UserMarker.tsx and ClusterMarker.tsx.
  {
    files: ['src/components/monitoring/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="tracksViewChanges"][value.expression.value=true], JSXAttribute[name.name="tracksViewChanges"]:not([value])',
          message:
            'tracksViewChanges={true} is forbidden in monitoring/ — it causes bitmap redraw thrash. Remove it (defaults to false).',
        },
      ],
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
