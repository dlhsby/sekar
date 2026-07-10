/**
 * eslint-plugin-sekar-design
 *
 * Custom ESLint rules enforcing SEKAR design-token discipline:
 *  - no-inline-hex-colors: forbid raw hex literals; tokens come from generated/.
 *  - no-tailwind-shadow-classes-with-blur: forbid stock Tailwind shadow utilities (web).
 *  - prefer-nb-shadow-utility: forbid raw boxShadow / box-shadow in styles.
 *  - rn-no-shadow-radius: React Native — forbid shadowRadius > 0 (NB stamp invariant).
 *  - no-untranslated-literal: forbid hardcoded user-facing UI strings; use react-i18next
 *    t()/i18n.t() with id/en keys (CLAUDE.md §Internationalization).
 *
 * See specs/architecture/decisions/ADR-036-design-tokens-single-source.md
 * and specs/design-system/design-tokens.md §Layer 2 emitter rules.
 */
'use strict';

const noInlineHexColors = require('./rules/no-inline-hex-colors');
const noTailwindShadowClassesWithBlur = require('./rules/no-tailwind-shadow-classes-with-blur');
const preferNbShadowUtility = require('./rules/prefer-nb-shadow-utility');
const rnNoShadowRadius = require('./rules/rn-no-shadow-radius');
const noUntranslatedLiteral = require('./rules/no-untranslated-literal');

module.exports = {
  meta: {
    name: 'eslint-plugin-sekar-design',
    version: '0.1.0',
  },
  rules: {
    'no-inline-hex-colors': noInlineHexColors,
    'no-tailwind-shadow-classes-with-blur': noTailwindShadowClassesWithBlur,
    'prefer-nb-shadow-utility': preferNbShadowUtility,
    'rn-no-shadow-radius': rnNoShadowRadius,
    'no-untranslated-literal': noUntranslatedLiteral,
  },
};
