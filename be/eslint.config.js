const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const prettierConfig = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.js', // Ignore JS files at root (like this config file)
    ],
  },
  // Main TypeScript configuration
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      // Entity ids are a mix of random v4 and deterministic v5 (uuidv5 for seeded
      // areas + sheet-imported roster users). A version-pinned `@IsUUID('4')`
      // rejects every v5 id at runtime with a 400 — a bug unit tests miss because
      // fixtures use v4. Always use `@IsUUID()` / `@IsUUID('all')` for id refs.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='IsUUID'] > Literal[value=/^(1|2|3|4|5|v1|v2|v3|v4|v5)$/]",
          message:
            "Do not version-pin @IsUUID(): entity ids include deterministic UUID v5, so 'v4' rejects them (400). Use @IsUUID() or @IsUUID('all').",
        },
      ],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Test files configuration
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
