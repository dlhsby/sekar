import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import sekarDesign from "eslint-plugin-sekar-design";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: {
      "sekar-design": sekarDesign,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      // React Hook Form watch() is intentionally not memoizable - acceptable warning
      "react-hooks/incompatible-library": "off",
      // New error-level rule in react-hooks v7 (via eslint-config-next 16.2.9).
      // Flags 7 pre-existing init-from-fetch / sync-on-prop-change effects that
      // work correctly; refactoring them is post-UAT cleanup, not a release gate.
      "react-hooks/set-state-in-effect": "warn",
      // Next.js Image component doesn't work well with dynamic external images
      "@next/next/no-img-element": "warn",
      // Phase 3 M1-R 3-R1 — design-token discipline (ADR-036)
      "sekar-design/no-inline-hex-colors": "error",
      "sekar-design/no-tailwind-shadow-classes-with-blur": "error",
      "sekar-design/prefer-nb-shadow-utility": "error",
      // i18n discipline — no hardcoded user-facing strings (CLAUDE.md §Internationalization)
      "sekar-design/no-untranslated-literal": "error",
      // ...and no t(key, 'English') fallback: i18n:check compares key SETS, so a
      // fallback renders English to id users with the check still green.
      "sekar-design/no-i18n-literal-fallback": "error",
    },
  },
  // ClusterLayer — conditional map-canvas shadows must be inline (no utility class equivalent for dynamic values);
  // #fff cluster label text and #6B7280 unknown-status fallback have no NB token.
  {
    files: ["src/components/monitoring/ClusterLayer.tsx"],
    rules: {
      "sekar-design/prefer-nb-shadow-utility": "off",
      "sekar-design/no-inline-hex-colors": "off",
    },
  },
  // AreaDetailDrawer — directional drawer shadow cannot be expressed as a utility class.
  {
    files: ["src/components/monitoring/AreaDetailDrawer.tsx"],
    rules: {
      "sekar-design/prefer-nb-shadow-utility": "off",
    },
  },
  // Generated token artifacts — written by scripts/build-tokens.ts. Hand-edits are reverted by CI (ADR-036).
  {
    files: ["src/app/generated/**", "src/**/generated/**"],
    rules: {
      "sekar-design/no-inline-hex-colors": "off",
      "sekar-design/no-tailwind-shadow-classes-with-blur": "off",
      "sekar-design/prefer-nb-shadow-utility": "off",
    },
  },
  // Permanent allowlist — colors with no NB token equivalent or contexts where CSS vars cannot be used.
  // Full rationale in scripts/hex-allowlist.txt (ADR-036).
  {
    files: [
      // ImageResponse SVG generation — server-side rendering; CSS vars are not resolved in ImageResponse
      "src/app/icon.tsx",
      "src/app/apple-icon.tsx",
      // Next.js metadata themeColor — browser meta tag; must be a literal string, not a CSS var
      "src/app/layout.tsx",
      // Monitoring status palette — #9333EA (outside_area/purple) + map-tuned status colors have no NB token
      "src/lib/constants/monitoring.ts",
      "src/components/monitoring/StaffingSummaryCard.tsx",
      "src/components/monitoring/StatusCard.tsx",
      "src/components/monitoring/UserDetailPanel.tsx",
      "src/components/monitoring/LocationTimeline.tsx",
      // Test files — assertions validate rendered hex values
      "src/lib/api/__tests__/rayons.test.tsx",
    ],
    rules: {
      "sekar-design/no-inline-hex-colors": "off",
    },
  },
  // Test fixtures & e2e specs deliberately use literal strings — the i18n rule doesn't apply.
  {
    files: ["**/*.test.tsx", "**/*.test.ts", "**/*.spec.tsx", "**/*.spec.ts", "**/__tests__/**", "e2e/**"],
    rules: {
      "sekar-design/no-untranslated-literal": "off",
    },
  },
  // global-error.tsx is the root crash boundary: it renders its own <html>/<body>
  // and REPLACES the whole app (including the i18n provider), so t()/i18n are not
  // reliably available. It intentionally stays in the default language (Indonesian).
  {
    files: ["src/app/global-error.tsx"],
    rules: {
      "sekar-design/no-untranslated-literal": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
